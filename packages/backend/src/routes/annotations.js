const express = require('express');
const router = express.Router();
const { getReportById, updateReportStatus } = require('../db');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize annotations database
const dbPath = path.join(dataDir, 'db.sqlite');
const db = new Database(dbPath);

// Create annotations table if it doesn't exist
const createAnnotationsTableSQL = `
  CREATE TABLE IF NOT EXISTS annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reportId TEXT NOT NULL,
    environment TEXT NOT NULL,
    actualBehavior TEXT NOT NULL,
    expectedBehavior TEXT NOT NULL,
    bugCategory TEXT NOT NULL,
    suggestedSolution TEXT NOT NULL,
    annotator TEXT,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (reportId) REFERENCES reports(id)
  )
`;

db.exec(createAnnotationsTableSQL);
db.exec('CREATE INDEX IF NOT EXISTS idx_annotations_reportId ON annotations(reportId)');

/**
 * Middleware to check admin token
 */
function checkAdminToken(req, res, next) {
  const adminToken = process.env.ADMIN_TOKEN;
  
  if (!adminToken) {
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'Admin token not configured'
    });
  }

  const providedToken = req.headers['x-admin-token'];

  if (!providedToken) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin token required'
    });
  }

  if (providedToken !== adminToken) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid admin token'
    });
  }

  next();
}

/**
 * POST /api/annotations
 * Create a new annotation for a bug report
 */
router.post('/', async (req, res) => {
  try {
    const {
      reportId,
      environment,
      actual,
      expected,
      category,
      solution,
      annotator
    } = req.body;

    // Validate required fields
    if (!reportId || !environment || !actual || !expected || !category || !solution) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'All fields are required: reportId, environment, actual, expected, category, solution'
      });
    }

    // Check if report exists
    const report = getReportById(reportId);
    if (!report) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Report not found'
      });
    }

    // Insert annotation
    const stmt = db.prepare(`
      INSERT INTO annotations 
      (reportId, environment, actualBehavior, expectedBehavior, bugCategory, suggestedSolution, annotator, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      reportId,
      environment,
      actual,
      expected,
      category,
      solution,
      annotator || 'anonymous',
      Date.now()
    );

    // Update report status to 'annotated'
    updateReportStatus(reportId, 'annotated');

    res.status(201).json({
      message: 'Annotation created successfully',
      id: result.lastInsertRowid,
      reportId
    });

  } catch (error) {
    console.error('Error creating annotation:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create annotation'
    });
  }
});

/**
 * GET /api/annotations/:reportId
 * Get all annotations for a specific report
 */
router.get('/:reportId', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM annotations WHERE reportId = ? ORDER BY createdAt DESC');
    const annotations = stmt.all(req.params.reportId);

    res.json(annotations.map(ann => ({
      id: ann.id,
      reportId: ann.reportId,
      environment: ann.environment,
      actualBehavior: ann.actualBehavior,
      expectedBehavior: ann.expectedBehavior,
      bugCategory: ann.bugCategory,
      suggestedSolution: ann.suggestedSolution,
      annotator: ann.annotator,
      createdAt: new Date(ann.createdAt).toISOString()
    })));

  } catch (error) {
    console.error('Error fetching annotations:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch annotations'
    });
  }
});

/**
 * GET /api/annotations/export
 * Export all annotations as JSONL format
 * Requires X-ADMIN-TOKEN header
 */
router.get('/export/all', checkAdminToken, (req, res) => {
  try {
    // Get all annotations with their associated reports
    const stmt = db.prepare(`
      SELECT 
        a.*,
        r.data as reportData
      FROM annotations a
      LEFT JOIN reports r ON a.reportId = r.id
      ORDER BY a.createdAt DESC
    `);

    const annotations = stmt.all();

    if (annotations.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'No annotations found'
      });
    }

    // Convert to JSONL format
    const jsonlLines = annotations.map(ann => {
      let reportData = {};
      try {
        reportData = ann.reportData ? JSON.parse(ann.reportData) : {};
      } catch (e) {
        console.error(`Failed to parse report data for annotation ${ann.id}`);
      }

      return JSON.stringify({
        id: `annotation_${ann.id}`,
        input: {
          description: reportData.description || '',
          stacktrace: reportData.stacktrace || '',
          environment: reportData.environment || {},
          screenshots: reportData.screenshots || []
        },
        target: {
          environment: ann.environment,
          actualBehavior: ann.actualBehavior,
          expectedBehavior: ann.expectedBehavior,
          bugCategory: ann.bugCategory,
          suggestedSolution: ann.suggestedSolution
        },
        metadata: {
          reportId: ann.reportId,
          annotator: ann.annotator,
          annotatedAt: new Date(ann.createdAt).toISOString()
        }
      });
    });

    const jsonlContent = jsonlLines.join('\n');

    // Set headers for JSONL download
    res.setHeader('Content-Type', 'application/jsonl');
    res.setHeader('Content-Disposition', `attachment; filename="annotations_${Date.now()}.jsonl"`);
    res.send(jsonlContent);

  } catch (error) {
    console.error('Error exporting annotations:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to export annotations'
    });
  }
});

/**
 * GET /api/annotations
 * Get all annotations (admin only)
 */
router.get('/', checkAdminToken, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const stmt = db.prepare('SELECT * FROM annotations ORDER BY createdAt DESC LIMIT ? OFFSET ?');
    const annotations = stmt.all(limit, offset);

    const countStmt = db.prepare('SELECT COUNT(*) as count FROM annotations');
    const { count } = countStmt.get();

    res.json({
      annotations: annotations.map(ann => ({
        id: ann.id,
        reportId: ann.reportId,
        environment: ann.environment,
        actualBehavior: ann.actualBehavior,
        expectedBehavior: ann.expectedBehavior,
        bugCategory: ann.bugCategory,
        suggestedSolution: ann.suggestedSolution,
        annotator: ann.annotator,
        createdAt: new Date(ann.createdAt).toISOString()
      })),
      total: count,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error fetching annotations:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch annotations'
    });
  }
});

/**
 * DELETE /api/annotations/:id
 * Delete an annotation (admin only)
 */
router.delete('/:id', checkAdminToken, (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM annotations WHERE id = ?');
    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Annotation not found'
      });
    }

    res.json({
      message: 'Annotation deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting annotation:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete annotation'
    });
  }
});

module.exports = router;
