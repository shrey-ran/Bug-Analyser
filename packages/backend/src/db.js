const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const dbPath = path.join(dataDir, 'db.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

// Create reports table if it doesn't exist
const createTableSQL = `
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    data JSON NOT NULL,
    summary JSON,
    status TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  )
`;

db.exec(createTableSQL);

// Create index on createdAt for faster sorting
db.exec('CREATE INDEX IF NOT EXISTS idx_reports_createdAt ON reports(createdAt DESC)');

/**
 * Insert a new report into the database
 * @param {Object} reportObj - The report object to store
 * @returns {Object} The inserted report with all fields
 */
function insertReport(reportObj) {
  const stmt = db.prepare(`
    INSERT INTO reports (id, data, summary, status, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `);

  const createdAt = Date.now();
  const dataJSON = JSON.stringify(reportObj);
  
  stmt.run(
    reportObj.id,
    dataJSON,
    null, // summary starts as null
    reportObj.status || 'processing',
    createdAt
  );

  return {
    id: reportObj.id,
    data: reportObj,
    summary: null,
    status: reportObj.status || 'processing',
    createdAt
  };
}

/**
 * Get a report by ID
 * @param {string} id - The report ID
 * @returns {Object|null} The report object or null if not found
 */
function getReportById(id) {
  const stmt = db.prepare('SELECT * FROM reports WHERE id = ?');
  const row = stmt.get(id);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    ...JSON.parse(row.data),
    summary: row.summary ? JSON.parse(row.summary) : null,
    status: row.status,
    createdAt: new Date(row.createdAt).toISOString()
  };
}

/**
 * List reports with pagination
 * @param {number} limit - Maximum number of reports to return
 * @param {number} offset - Number of reports to skip
 * @returns {Array} Array of report objects
 */
function listReports(limit = 20, offset = 0) {
  const stmt = db.prepare(`
    SELECT * FROM reports
    ORDER BY createdAt DESC
    LIMIT ? OFFSET ?
  `);

  const rows = stmt.all(limit, offset);

  return rows.map(row => ({
    id: row.id,
    ...JSON.parse(row.data),
    summary: row.summary ? JSON.parse(row.summary) : null,
    status: row.status,
    createdAt: new Date(row.createdAt).toISOString()
  }));
}

/**
 * Update the summary for a report
 * @param {string} id - The report ID
 * @param {Object} summary - The summary object
 * @returns {boolean} True if updated, false if not found
 */
function updateReportSummary(id, summary) {
  const stmt = db.prepare(`
    UPDATE reports
    SET summary = ?, status = ?
    WHERE id = ?
  `);

  const summaryJSON = JSON.stringify(summary);
  const result = stmt.run(summaryJSON, 'completed', id);

  return result.changes > 0;
}

/**
 * Update the status of a report
 * @param {string} id - The report ID
 * @param {string} status - The new status
 * @returns {boolean} True if updated, false if not found
 */
function updateReportStatus(id, status) {
  const stmt = db.prepare('UPDATE reports SET status = ? WHERE id = ?');
  const result = stmt.run(status, id);

  return result.changes > 0;
}

/**
 * Get total count of reports
 * @returns {number} Total number of reports
 */
function getReportsCount() {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM reports');
  const result = stmt.get();
  return result.count;
}

// Close database on process exit
process.on('exit', () => {
  db.close();
});

process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

module.exports = {
  db,
  insertReport,
  getReportById,
  listReports,
  updateReportSummary,
  updateReportStatus,
  getReportsCount
};
