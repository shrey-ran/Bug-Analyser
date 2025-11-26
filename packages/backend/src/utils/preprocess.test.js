const {
  extractTextFromImage,
  normalizeStacktrace,
  extractTextFromImages,
  preprocessBugData
} = require('./preprocess');
const fs = require('fs');

// Mock child_process spawn
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

const { spawn } = require('child_process');

describe('preprocess utilities', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });
  
  describe('normalizeStacktrace', () => {
    test('should return empty string for null or undefined input', () => {
      expect(normalizeStacktrace(null)).toBe('');
      expect(normalizeStacktrace(undefined)).toBe('');
      expect(normalizeStacktrace('')).toBe('');
    });

    test('should replace Windows absolute paths', () => {
      const input = 'Error at C:\\Users\\john\\project\\src\\index.js:10';
      const result = normalizeStacktrace(input);
      expect(result).toContain('<PATH>');
      expect(result).not.toContain('C:\\Users');
    });

    test('should replace Unix absolute paths', () => {
      const input = 'Error at /home/user/app/src/components/Button.jsx:45';
      const result = normalizeStacktrace(input);
      expect(result).toContain('<PATH>');
      expect(result).not.toContain('/home/user');
    });

    test('should replace version numbers', () => {
      const input = 'React 18.2.0 at node_modules/react/1.2.3/index.js';
      const result = normalizeStacktrace(input);
      expect(result).toContain('<VER>');
      expect(result).not.toContain('18.2.0');
      expect(result).not.toContain('1.2.3');
    });

    test('should replace line numbers', () => {
      const input = 'at Module._compile (internal/modules/cjs/loader.js:1138:30)';
      const result = normalizeStacktrace(input);
      expect(result).toContain('<LINE>');
      expect(result).not.toContain(':1138:30');
    });

    test('should replace hex memory addresses', () => {
      const input = 'Segmentation fault at 0x7fff5fbff000';
      const result = normalizeStacktrace(input);
      expect(result).toContain('<ADDR>');
      expect(result).not.toContain('0x7fff5fbff000');
    });

    test('should handle complete stack trace', () => {
      const input = `TypeError: Cannot read property 'name' of undefined
    at Object.<anonymous> (C:\\project\\src\\app.js:15:20)
    at Module._compile (internal/modules/cjs/loader.js:1138:30)
    at node:internal/modules/cjs/loader:1364:14
    at React 18.2.0`;
      
      const result = normalizeStacktrace(input);
      
      expect(result).toContain('TypeError');
      expect(result).toContain('<PATH>');
      expect(result).toContain('<LINE>');
      expect(result).toContain('<VER>');
      expect(result).not.toContain('C:\\project');
      expect(result).not.toContain(':15:20');
      expect(result).not.toContain('18.2.0');
    });

    test('should normalize whitespace', () => {
      const input = 'Error\n\n\n\nMultiple blank lines';
      const result = normalizeStacktrace(input);
      expect(result).not.toMatch(/\n\n\n/);
    });
  });

  describe('extractTextFromImage', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.useFakeTimers();
      delete process.env.USE_OCR;
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should return empty string when USE_OCR is not set', async () => {
      const result = await extractTextFromImage('/path/to/image.png');
      expect(result).toBe('');
      expect(spawn).not.toHaveBeenCalled();
    });

    test('should return empty string when USE_OCR is false', async () => {
      process.env.USE_OCR = 'false';
      const result = await extractTextFromImage('/path/to/image.png');
      expect(result).toBe('');
      expect(spawn).not.toHaveBeenCalled();
    });

    test('should return empty string when image file does not exist', async () => {
      process.env.USE_OCR = 'true';
      const result = await extractTextFromImage('/nonexistent/image.png');
      expect(result).toBe('');
    });

    test('should call tesseract when USE_OCR is true and file exists', async () => {
      process.env.USE_OCR = 'true';
      
      // Mock fs.existsSync to return true
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      
      // Mock spawn to return a fake process
      const mockProcess = {
        stdout: {
          on: jest.fn((event, handler) => {
            if (event === 'data') {
              handler(Buffer.from('Extracted text from image'));
            }
          })
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn((event, handler) => {
          if (event === 'close') {
            handler(0); // Exit code 0 (success)
          }
        }),
        kill: jest.fn()
      };
      
      spawn.mockReturnValue(mockProcess);
      
      const result = await extractTextFromImage('/tmp/test.png');
      
      expect(spawn).toHaveBeenCalledWith('tesseract', ['/tmp/test.png', 'stdout']);
      expect(result).toBe('Extracted text from image');
      
      // Cleanup
      fs.existsSync.mockRestore();
    });

    test('should handle tesseract errors gracefully', async () => {
      process.env.USE_OCR = 'true';
      
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, handler) => {
          if (event === 'error') {
            handler({ code: 'ENOENT', message: 'tesseract not found' });
          }
        }),
        kill: jest.fn()
      };
      
      spawn.mockReturnValue(mockProcess);
      
      const result = await extractTextFromImage('/tmp/test.png');
      expect(result).toBe('');
      
      fs.existsSync.mockRestore();
    });
  });

  describe('extractTextFromImages', () => {
    test('should return empty array for empty input', async () => {
      const result = await extractTextFromImages([]);
      expect(result).toEqual([]);
    });

    test('should handle null or undefined input', async () => {
      const result1 = await extractTextFromImages(null);
      const result2 = await extractTextFromImages(undefined);
      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });
  });

  describe('preprocessBugData', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      delete process.env.USE_OCR;
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should normalize stacktrace without images', async () => {
      const stacktrace = 'Error at C:\\Users\\test\\app.js:10';
      const result = await preprocessBugData(stacktrace, []);
      
      expect(result).toContain('<PATH>');
      expect(result).not.toContain('C:\\Users');
    });

    test('should handle empty stacktrace', async () => {
      const result = await preprocessBugData('', []);
      expect(result).toBe('');
    });

    test('should combine stacktrace with OCR when enabled', async () => {
      process.env.USE_OCR = 'true';
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      
      const mockProcess = {
        stdout: {
          on: jest.fn((event, handler) => {
            if (event === 'data') {
              handler(Buffer.from('Error message from screenshot'));
            }
          })
        },
        stderr: { on: jest.fn() },
        on: jest.fn((event, handler) => {
          if (event === 'close') {
            handler(0);
          }
        }),
        kill: jest.fn()
      };
      
      spawn.mockReturnValue(mockProcess);
      
      const stacktrace = 'Original error';
      const result = await preprocessBugData(stacktrace, ['/tmp/screenshot.png']);
      
      expect(result).toContain('Original error');
      expect(result).toContain('[OCR from screenshots]');
      expect(result).toContain('Error message from screenshot');
      
      fs.existsSync.mockRestore();
    });
  });
});
