const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Extract text from an image using OCR
 * Currently returns empty string unless USE_OCR environment variable is set
 * 
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<string>} Extracted text from the image
 */
async function extractTextFromImage(imagePath) {
  // Check if OCR is enabled
  if (process.env.USE_OCR !== 'true') {
    console.log('[OCR] OCR disabled. Set USE_OCR=true to enable.');
    return '';
  }

  // Check if image file exists
  if (!fs.existsSync(imagePath)) {
    console.error(`[OCR] Image file not found: ${imagePath}`);
    return '';
  }

  return new Promise((resolve) => {
    try {
      // Spawn tesseract process
      const tesseract = spawn('tesseract', [imagePath, 'stdout']);
      
      let output = '';
      let errorOutput = '';

      // Collect stdout data
      tesseract.stdout.on('data', (data) => {
        output += data.toString();
      });

      // Collect stderr data
      tesseract.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      // Handle process completion
      tesseract.on('close', (code) => {
        if (code === 0) {
          console.log(`[OCR] Successfully extracted text from ${path.basename(imagePath)}`);
          resolve(output.trim());
        } else {
          console.error(`[OCR] Tesseract failed with code ${code}: ${errorOutput}`);
          resolve('');
        }
      });

      // Handle process errors
      tesseract.on('error', (error) => {
        if (error.code === 'ENOENT') {
          console.error('[OCR] Tesseract not found. Please install tesseract-ocr.');
        } else {
          console.error(`[OCR] Error running tesseract: ${error.message}`);
        }
        resolve('');
      });

      // Set timeout to prevent hanging
      setTimeout(() => {
        tesseract.kill();
        console.error('[OCR] Tesseract process timeout');
        resolve('');
      }, 30000); // 30 second timeout

    } catch (error) {
      console.error(`[OCR] Failed to extract text from image: ${error.message}`);
      resolve('');
    }
  });
}

/**
 * Normalize stack trace by removing absolute paths and version numbers
 * This helps with better matching and categorization of similar bugs
 * 
 * @param {string} stackText - Raw stack trace text
 * @returns {string} Normalized stack trace
 */
function normalizeStacktrace(stackText) {
  if (!stackText || typeof stackText !== 'string') {
    return '';
  }

  let normalized = stackText;

  // Strip absolute paths (Windows and Unix-like systems)
  // Windows: C:\Users\path\to\file or D:/path/to/file
  // Unix: /home/user/path/to/file or /var/www/path
  normalized = normalized.replace(/[A-Za-z]:[/\\][^\s\n)]+/g, '<PATH>');
  normalized = normalized.replace(/\/[^\s\n)]+\.(js|ts|jsx|tsx|py|java|cpp|c|go|rb|php)/g, '<PATH>');
  
  // Replace common absolute path patterns
  normalized = normalized.replace(/file:\/\/\/[^\s\n)]+/g, '<PATH>');
  
  // Replace version numbers with <VER>
  // Matches patterns like: 1.2.3, v1.2.3, 10.0.1-beta, etc.
  normalized = normalized.replace(/\b\d+\.\d+(\.\d+)?(-[\w.]+)?\b/g, '<VER>');
  
  // Replace hex memory addresses
  normalized = normalized.replace(/\b0x[0-9a-fA-F]+\b/g, '<ADDR>');
  
  // Replace line and column numbers in stack traces
  // Matches patterns like: :123 or :123:45
  normalized = normalized.replace(/:(\d+)(:\d+)?(?=\)|\s|$)/g, ':<LINE>');
  
  // Normalize whitespace
  normalized = normalized.trim();
  
  // Remove duplicate blank lines
  normalized = normalized.replace(/\n\s*\n\s*\n/g, '\n\n');

  return normalized;
}

/**
 * Batch extract text from multiple images
 * 
 * @param {Array<string>} imagePaths - Array of image file paths
 * @returns {Promise<Array<string>>} Array of extracted text
 */
async function extractTextFromImages(imagePaths) {
  if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
    return [];
  }

  const promises = imagePaths.map(path => extractTextFromImage(path));
  return Promise.all(promises);
}

/**
 * Combine stack trace with OCR text from screenshots
 * 
 * @param {string} stacktrace - Stack trace text
 * @param {Array<string>} imagePaths - Paths to screenshot images
 * @returns {Promise<string>} Combined and normalized text
 */
async function preprocessBugData(stacktrace, imagePaths = []) {
  let combinedText = stacktrace || '';

  if (imagePaths.length > 0) {
    const ocrTexts = await extractTextFromImages(imagePaths);
    const validOcrTexts = ocrTexts.filter(text => text.length > 0);
    
    if (validOcrTexts.length > 0) {
      combinedText += '\n\n[OCR from screenshots]\n' + validOcrTexts.join('\n\n');
    }
  }

  return normalizeStacktrace(combinedText);
}

module.exports = {
  extractTextFromImage,
  extractTextFromImages,
  normalizeStacktrace,
  preprocessBugData
};
