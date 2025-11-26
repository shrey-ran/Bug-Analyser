const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { listReports, db } = require('../db');

// Ensure exports directory exists
const exportsDir = path.join(__dirname, '../../exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

/**
 * Get dataset statistics
 */
router.get('/stats', (req, res) => {
  try {
    const allReports = listReports(10000, 0); // Get all reports
    
    const stats = {
      total_reports: allReports.length,
      analyzed_reports: allReports.filter(r => r.summary !== null).length,
      with_screenshots: allReports.filter(r => r.screenshots && r.screenshots.length > 0).length,
      with_stacktrace: allReports.filter(r => r.stacktrace && r.stacktrace.trim()).length,
      by_category: {},
      by_status: {},
      by_os: {},
      by_browser: {},
      model_distribution: {}
    };
    
    // Aggregate by category
    allReports.forEach(report => {
      if (report.summary && report.summary.bugCategory) {
        const category = report.summary.bugCategory;
        stats.by_category[category] = (stats.by_category[category] || 0) + 1;
      }
      
      if (report.status) {
        stats.by_status[report.status] = (stats.by_status[report.status] || 0) + 1;
      }
      
      if (report.os) {
        stats.by_os[report.os] = (stats.by_os[report.os] || 0) + 1;
      }
      
      if (report.browser) {
        stats.by_browser[report.browser] = (stats.by_browser[report.browser] || 0) + 1;
      }
      
      if (report.summary && report.summary.model && report.summary.model.name) {
        const model = report.summary.model.name;
        stats.model_distribution[model] = (stats.model_distribution[model] || 0) + 1;
      }
    });
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting dataset stats:', error);
    res.status(500).json({ error: 'Failed to get dataset statistics' });
  }
});

/**
 * Export dataset in various formats
 */
router.post('/export', async (req, res) => {
  try {
    const { format = 'json', includeImages = false, anonymize = true, minQuality = 'analyzed' } = req.body;
    
    // Get all reports
    let reports = listReports(10000, 0);
    
    // Filter by quality
    if (minQuality === 'analyzed') {
      reports = reports.filter(r => r.summary !== null);
    } else if (minQuality === 'resolved') {
      reports = reports.filter(r => r.status === 'resolved');
    }
    
    // Anonymize if requested
    if (anonymize) {
      reports = reports.map(report => anonymizeReport(report));
    }
    
    // Prepare dataset
    const dataset = {
      metadata: {
        name: "Multimodal Bug Report Dataset",
        version: "1.0.0",
        created_at: new Date().toISOString(),
        description: "A dataset of bug reports with AI-generated summaries, stack traces, and screenshots",
        total_samples: reports.length,
        license: "MIT",
        citation: "Please cite this dataset when using it in research",
        features: {
          text: ["title", "description", "stacktrace"],
          structured: ["environment", "bugCategory", "status"],
          multimodal: includeImages ? ["screenshots"] : []
        }
      },
      data: reports.map((report, index) => ({
        id: anonymize ? `sample_${index + 1}` : report.id,
        input: {
          title: report.title,
          description: report.description,
          stacktrace: report.stacktrace || null,
          environment: {
            os: report.os || report.environment?.os || null,
            browser: report.browser || report.environment?.browser || null,
            browserVersion: report.browserVersion || report.environment?.browserVersion || null
          },
          screenshots: includeImages ? (report.screenshots || []) : [],
          screenshot_count: (report.screenshots || []).length
        },
        output: report.summary ? {
          environment: report.summary.environment,
          actualBehavior: report.summary.actualBehavior,
          expectedBehavior: report.summary.expectedBehavior,
          bugCategory: report.summary.bugCategory,
          suggestedSolution: report.summary.suggestedSolution,
          model: report.summary.model
        } : null,
        metadata: {
          status: report.status,
          created_at: report.createdAt,
          has_stacktrace: !!(report.stacktrace && report.stacktrace.trim()),
          has_screenshots: (report.screenshots || []).length > 0
        }
      }))
    };
    
    // Handle PDF format separately
    if (format === 'pdf') {
      const timestamp = Date.now();
      const filename = `bug_dataset_${timestamp}.pdf`;
      
      // Generate PDF using pdf-lib
      const pdfBytes = await generatePDFDocument(dataset);
      
      // Save to exports directory
      const filepath = path.join(exportsDir, filename);
      fs.writeFileSync(filepath, pdfBytes);
      
      // Send PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(Buffer.from(pdfBytes));
      
      console.log(`[INFO] Dataset exported as PDF: ${filename} (${reports.length} samples)`);
      return;
    }
    
    // Export based on format (non-PDF)
    const timestamp = Date.now();
    let filename, content, contentType;
    
    if (format === 'json') {
      filename = `bug_dataset_${timestamp}.json`;
      content = JSON.stringify(dataset, null, 2);
      contentType = 'application/json';
    } else if (format === 'jsonl') {
      filename = `bug_dataset_${timestamp}.jsonl`;
      content = dataset.data.map(item => JSON.stringify(item)).join('\n');
      contentType = 'application/x-ndjson';
    } else if (format === 'csv') {
      filename = `bug_dataset_${timestamp}.csv`;
      content = convertToCSV(dataset.data);
      contentType = 'text/csv';
    } else {
      return res.status(400).json({ error: 'Unsupported format. Use json, jsonl, csv, or pdf' });
    }
    
    // Save to exports directory
    const filepath = path.join(exportsDir, filename);
    fs.writeFileSync(filepath, content);
    
    // Send file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
    
    console.log(`[INFO] Dataset exported: ${filename} (${reports.length} samples)`);
    
  } catch (error) {
    console.error('Error exporting dataset:', error);
    res.status(500).json({ error: 'Failed to export dataset', message: error.message });
  }
});

/**
 * Get list of available exported datasets
 */
router.get('/exports', (req, res) => {
  try {
    const files = fs.readdirSync(exportsDir);
    const exports = files.map(filename => {
      const filepath = path.join(exportsDir, filename);
      const stats = fs.statSync(filepath);
      return {
        filename,
        size: stats.size,
        created: stats.birthtime,
        download_url: `/api/dataset/download/${filename}`
      };
    }).sort((a, b) => b.created - a.created);
    
    res.json({ exports });
  } catch (error) {
    console.error('Error listing exports:', error);
    res.status(500).json({ error: 'Failed to list exports' });
  }
});

/**
 * Download a previously exported dataset
 */
router.get('/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(exportsDir, filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Export not found' });
    }
    
    res.download(filepath);
  } catch (error) {
    console.error('Error downloading export:', error);
    res.status(500).json({ error: 'Failed to download export' });
  }
});

/**
 * Helper: Anonymize sensitive information from a report
 */
function anonymizeReport(report) {
  const anonymized = { ...report };
  
  // Remove or hash sensitive fields
  delete anonymized.id;
  
  // Anonymize stack traces (remove file paths, user names, etc.)
  if (anonymized.stacktrace) {
    anonymized.stacktrace = anonymized.stacktrace
      .replace(/\/Users\/[^/]+/g, '/Users/***')
      .replace(/\/home\/[^/]+/g, '/home/***')
      .replace(/C:\\Users\\[^\\]+/g, 'C:\\Users\\***')
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '***.***.***.***'); // IP addresses
  }
  
  // Anonymize description (remove emails, URLs with personal info)
  if (anonymized.description) {
    anonymized.description = anonymized.description
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '***@***.com');
  }
  
  return anonymized;
}

/**
 * Helper: Convert dataset to CSV format
 */
function convertToCSV(data) {
  if (data.length === 0) return '';
  
  const headers = [
    'title',
    'description',
    'stacktrace',
    'os',
    'browser',
    'bugCategory',
    'status',
    'actualBehavior',
    'expectedBehavior',
    'suggestedSolution',
    'has_screenshots',
    'model'
  ];
  
  const rows = data.map(item => {
    return [
      escapeCSV(item.input.title),
      escapeCSV(item.input.description),
      escapeCSV(item.input.stacktrace || ''),
      escapeCSV(item.input.environment.os || ''),
      escapeCSV(item.input.environment.browser || ''),
      escapeCSV(item.output?.bugCategory || ''),
      escapeCSV(item.metadata.status),
      escapeCSV(item.output?.actualBehavior || ''),
      escapeCSV(item.output?.expectedBehavior || ''),
      escapeCSV(item.output?.suggestedSolution || ''),
      item.metadata.has_screenshots,
      escapeCSV(item.output?.model?.name || '')
    ];
  });
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

function escapeCSV(str) {
  if (str === null || str === undefined) return '';
  str = String(str);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Helper: Generate PDF document using pdf-lib
 */
async function generatePDFDocument(dataset) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const fontSize = 10;
  const titleFontSize = 24;
  const headingFontSize = 14;
  const margin = 50;
  const pageWidth = 595; // A4 width in points
  const pageHeight = 842; // A4 height in points
  const maxWidth = pageWidth - (margin * 2);
  
  // Title Page
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin - 50;
  
  // Title
  page.drawText(sanitizeText(dataset.metadata.name), {
    x: margin,
    y: yPosition,
    size: titleFontSize,
    font: fontBold,
    color: rgb(0.15, 0.38, 0.92),
  });
  
  yPosition -= 40;
  
  // Description
  const descLines = wrapText(dataset.metadata.description, maxWidth, fontSize, font);
  descLines.forEach(line => {
    page.drawText(line, {
      x: margin,
      y: yPosition,
      size: fontSize,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    });
    yPosition -= 15;
  });
  
  yPosition -= 20;
  
  // Metadata
  page.drawText(`Version: ${sanitizeText(dataset.metadata.version)}`, {
    x: margin,
    y: yPosition,
    size: fontSize,
    font: font,
  });
  yPosition -= 20;
  
  page.drawText(`Created: ${new Date(dataset.metadata.created_at).toLocaleString()}`, {
    x: margin,
    y: yPosition,
    size: fontSize,
    font: font,
  });
  yPosition -= 20;
  
  page.drawText(`Total Samples: ${dataset.metadata.total_samples}`, {
    x: margin,
    y: yPosition,
    size: fontSize,
    font: font,
  });
  yPosition -= 20;
  
  page.drawText(`License: ${sanitizeText(dataset.metadata.license)}`, {
    x: margin,
    y: yPosition,
    size: fontSize,
    font: font,
  });
  
  // Add reports
  for (let i = 0; i < dataset.data.length; i++) {
    const report = dataset.data[i];
    const hasOutput = report.output !== null;
    
    // New page for each report
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    yPosition = pageHeight - margin;
    
    // Report title
    page.drawText(`${i + 1}. ${truncateText(report.input.title, 60)}`, {
      x: margin,
      y: yPosition,
      size: headingFontSize,
      font: fontBold,
      color: rgb(0.12, 0.25, 0.69),
    });
    yPosition -= 25;
    
    // Status
    const status = hasOutput ? 'ANALYZED' : 'PENDING';
    page.drawText(status, {
      x: margin,
      y: yPosition,
      size: 9,
      font: fontBold,
      color: hasOutput ? rgb(0.02, 0.37, 0.27) : rgb(0.57, 0.25, 0.09),
    });
    yPosition -= 25;
    
    // Description
    page.drawText('DESCRIPTION', {
      x: margin,
      y: yPosition,
      size: 9,
      font: fontBold,
      color: rgb(0.4, 0.4, 0.4),
    });
    yPosition -= 15;
    
    const descriptionLines = wrapText(report.input.description, maxWidth - 20, fontSize - 1, font);
    for (const line of descriptionLines.slice(0, 5)) { // Limit lines
      if (yPosition < margin + 50) break;
      page.drawText(line, {
        x: margin + 10,
        y: yPosition,
        size: fontSize - 1,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      });
      yPosition -= 14;
    }
    
    yPosition -= 10;
    
    // Environment
    if (report.input.environment.os || report.input.environment.browser) {
      page.drawText('ENVIRONMENT', {
        x: margin,
        y: yPosition,
        size: 9,
        font: fontBold,
        color: rgb(0.4, 0.4, 0.4),
      });
      yPosition -= 15;
      
      if (report.input.environment.os) {
        page.drawText(`OS: ${sanitizeText(report.input.environment.os)}`, {
          x: margin + 10,
          y: yPosition,
          size: fontSize - 1,
          font: font,
          color: rgb(0.12, 0.25, 0.69),
        });
        yPosition -= 14;
      }
      
      if (report.input.environment.browser) {
        const browserText = `Browser: ${sanitizeText(report.input.environment.browser)} ${sanitizeText(report.input.environment.browserVersion || '')}`;
        page.drawText(browserText, {
          x: margin + 10,
          y: yPosition,
          size: fontSize - 1,
          font: font,
          color: rgb(0.12, 0.25, 0.69),
        });
        yPosition -= 14;
      }
      
      yPosition -= 10;
    }
    
    // Stack Trace (truncated)
    if (report.input.stacktrace && yPosition > margin + 100) {
      page.drawText('STACK TRACE', {
        x: margin,
        y: yPosition,
        size: 9,
        font: fontBold,
        color: rgb(0.4, 0.4, 0.4),
      });
      yPosition -= 15;
      
      const stackLines = report.input.stacktrace.split('\n').slice(0, 8);
      for (const line of stackLines) {
        if (yPosition < margin + 50) break;
        const truncated = truncateText(line, 85);
        page.drawText(truncated, {
          x: margin + 10,
          y: yPosition,
          size: 8,
          font: font,
          color: rgb(0.06, 0.72, 0.51),
        });
        yPosition -= 12;
      }
      
      yPosition -= 10;
    }
    
    // AI Analysis
    if (hasOutput && yPosition > margin + 100) {
      page.drawText('AI ANALYSIS', {
        x: margin,
        y: yPosition,
        size: 9,
        font: fontBold,
        color: rgb(0.4, 0.4, 0.4),
      });
      yPosition -= 15;
      
      // Bug Category
      page.drawText(`Category: ${sanitizeText(report.output.bugCategory || 'N/A')}`, {
        x: margin + 10,
        y: yPosition,
        size: fontSize,
        font: fontBold,
        color: rgb(0.31, 0.27, 0.95),
      });
      yPosition -= 20;
      
      // Suggested Solution
      if (report.output.suggestedSolution && yPosition > margin + 50) {
        page.drawText('Solution:', {
          x: margin + 10,
          y: yPosition,
          size: fontSize - 1,
          font: fontBold,
        });
        yPosition -= 14;
        
        const solutionLines = wrapText(report.output.suggestedSolution, maxWidth - 20, fontSize - 2, font);
        for (const line of solutionLines.slice(0, 6)) {
          if (yPosition < margin + 40) break;
          page.drawText(line, {
            x: margin + 10,
            y: yPosition,
            size: fontSize - 2,
            font: font,
            color: rgb(0.02, 0.37, 0.27),
          });
          yPosition -= 13;
        }
      }
    }
    
    // Page number
    page.drawText(`Page ${pdfDoc.getPageCount()}`, {
      x: pageWidth / 2 - 20,
      y: 30,
      size: 8,
      font: font,
      color: rgb(0.6, 0.6, 0.6),
    });
  }
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// Helper functions
function wrapText(text, maxWidth, fontSize, font) {
  // Sanitize text to remove unsupported characters
  const sanitized = sanitizeText(text);
  const words = sanitized.split(' ');
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    try {
      const width = font.widthOfTextAtSize(testLine, fontSize);
      
      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    } catch (err) {
      // Skip words that can't be encoded
      console.warn('Skipping word with unsupported characters:', word);
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

function truncateText(text, maxLength) {
  const sanitized = sanitizeText(text);
  if (sanitized.length <= maxLength) return sanitized;
  return sanitized.substring(0, maxLength - 3) + '...';
}

function sanitizeText(text) {
  if (!text) return '';
  // Remove or replace characters that WinAnsi encoding doesn't support
  return String(text)
    .replace(/[\u0000-\u001F\u007F-\uFFFF]/g, '') // Remove non-printable and non-ASCII chars
    .replace(/[^\x20-\x7E]/g, '') // Keep only basic ASCII printable characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

module.exports = router;
