const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { insertReport, getReportById, listReports, updateReportSummary, updateReportStatus } = require('./db');
const { callInference } = require('./internal');
const annotationsRouter = require('./routes/annotations');
const datasetRouter = require('./routes/dataset');

const app = express();
const PORT = process.env.PORT || 4000;
const TRAINER_URL = process.env.TRAINER_URL || 'http://localhost:8000';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${timestamp}_${originalName}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend' });
});

// Mount annotations router
app.use('/api/annotations', annotationsRouter);

// Mount dataset export router
app.use('/api/dataset', datasetRouter);

// GET all reports
app.get('/api/reports', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const reports = listReports(limit, offset);
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch reports'
    });
  }
});

// POST new bug report
app.post('/api/reports', upload.fields([
  { name: 'screenshots', maxCount: 10 },
  { name: 'stacktrace', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, description, os, browser, browserVersion, stacktrace } = req.body;

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Title and description are required'
      });
    }

    // Get uploaded files
    const screenshots = req.files?.screenshots || [];
    const stacktraceFile = req.files?.stacktrace?.[0];

    // Validate at least one of stacktrace or screenshot
    if (!stacktrace && screenshots.length === 0 && !stacktraceFile) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please provide either a stacktrace or at least one screenshot'
      });
    }

    // Parse environment if present
    let environment = null;
    try {
      if (req.body.env) {
        environment = JSON.parse(req.body.env);
      } else {
        environment = {
          os: os || null,
          browser: browser || null,
          browserVersion: browserVersion || null
        };
      }
    } catch (e) {
      environment = {
        os: os || null,
        browser: browser || null,
        browserVersion: browserVersion || null
      };
    }

    // Generate unique ID
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create bug report object
    const bugReport = {
      id,
      title,
      description,
      environment,
      stacktrace: stacktrace || (stacktraceFile ? stacktraceFile.path : null),
      screenshots: screenshots.map(file => ({
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype
      })),
      createdAt: new Date().toISOString(),
      status: 'processing',
      summary: null
    };

    // Store in database
    insertReport(bugReport);

    // Call inference service asynchronously (fire-and-forget)
    callInference(TRAINER_URL, bugReport)
      .then(() => {
        console.log(`Inference processing started for report ${bugReport.id}`);
      })
      .catch(error => {
        console.error(`Inference call failed for report ${bugReport.id}:`, error.message);
      });

    // Return success response immediately
    res.status(201).json({
      message: 'Bug report submitted successfully',
      id: bugReport.id,
      status: bugReport.status
    });

  } catch (error) {
    console.error('Error processing bug report:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process bug report'
    });
  }
});

// GET single report by ID
app.get('/api/reports/:id', (req, res) => {
  try {
    const report = getReportById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Report not found'
      });
    }

    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch report'
    });
  }
});

// Accept a report (placeholder endpoint)
app.post('/api/reports/:id/accept', (req, res) => {
  try {
    const report = getReportById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Report not found'
      });
    }

    updateReportStatus(req.params.id, 'accepted');
    const updatedReport = getReportById(req.params.id);

    res.json({
      message: 'Report accepted successfully',
      report: updatedReport
    });
  } catch (error) {
    console.error('Error accepting report:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to accept report'
    });
  }
});

// Update report status (e.g., resolved, rejected, accepted)
app.post('/api/reports/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const report = getReportById(req.params.id);

    if (!report) {
      return res.status(404).json({ error: 'Not found', message: 'Report not found' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Validation failed', message: 'Status is required' });
    }

    updateReportStatus(req.params.id, status);
    const updated = getReportById(req.params.id);

    res.json({ message: 'Status updated', report: updated });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Internal server error', message: 'Failed to update status' });
  }
});

// Trigger a re-analysis for a report (fire-and-forget)
app.post('/api/reports/:id/reanalyze', (req, res) => {
  try {
    const existing = getReportById(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Not found', message: 'Report not found' });
    }

  // Reset summary and status in DB (clear summary first, then set processing)
  updateReportSummary(req.params.id, null);
  updateReportStatus(req.params.id, 'processing');

    // Fetch the fresh report object from DB (summary will be null)
    const report = getReportById(req.params.id);

    // Fire-and-forget inference call
    callInference(TRAINER_URL, report)
      .then(() => console.log(`Re-analysis started for ${req.params.id}`))
      .catch(err => console.error(`Re-analysis failed for ${req.params.id}:`, err.message));

    res.json({ message: 'Re-analysis queued', report });
  } catch (error) {
    console.error('Error triggering re-analysis:', error);
    res.status(500).json({ error: 'Internal server error', message: 'Failed to queue re-analysis' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'File size exceeds 10MB limit'
      });
    }
    return res.status(400).json({
      error: 'Upload error',
      message: err.message
    });
  }

  res.status(err.status || 500).json({
    error: err.name || 'Internal server error',
    message: err.message || 'An unexpected error occurred'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Trainer URL: ${TRAINER_URL}`);
});

module.exports = app;
