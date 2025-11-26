const axios = require('axios');
const Joi = require('joi');
const { updateReportSummary, updateReportStatus, getReportById } = require('./db');
const { preprocessBugData } = require('./utils/preprocess');

// Schema for validating the inference response
const summarySchema = Joi.object({
  environment: Joi.string().required(),
  actualBehavior: Joi.string().required(),
  expectedBehavior: Joi.string().required(),
  bugCategory: Joi.string().required(),
  rootCause: Joi.string().required(),
  suggestedSolution: Joi.string().required(),
  model: Joi.string().optional(),
  timestamp: Joi.string().optional()
});

/**
 * Call the inference service to generate a summary for a bug report
 * @param {string} trainerUrl - The URL of the trainer service
 * @param {Object} report - The bug report object
 * @returns {Promise<void>}
 */
async function callInference(trainerUrl, report) {
  try {
    console.log(`Calling inference service for report ${report.id}`);

    // Preprocess stacktrace and screenshots
    const imagePaths = report.screenshots?.map(s => s.path) || [];
    const preprocessedText = await preprocessBugData(report.stacktrace || '', imagePaths);

    // Prepare the payload
    const payload = {
      id: report.id,
      input: {
        description: report.description || '',
        stacktrace_text: preprocessedText,
        env: report.environment || {},
        image_paths: imagePaths
      }
    };

    // Call the inference endpoint
    const response = await axios.post(`${trainerUrl}/inference`, payload, {
      timeout: 60000, // 60 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`Inference response received for report ${report.id}`);

    // Try to parse and validate the response
    let summary;
    let rawOutput = response.data;

    // Handle different response formats
    if (typeof rawOutput === 'string') {
      try {
        rawOutput = JSON.parse(rawOutput);
      } catch (parseError) {
        console.error(`Failed to parse inference response for report ${report.id}:`, parseError.message);
        // Save as needs human review with raw output
        await updateReportStatus(report.id, 'needs-human-review');
        console.log(`Report ${report.id} marked as needs-human-review (invalid JSON)`);
        return;
      }
    }

    // Extract summary from response (handle different response structures)
    if (rawOutput.summary) {
      summary = rawOutput.summary;
    } else if (rawOutput.environment && rawOutput.actualBehavior) {
      summary = rawOutput;
    } else {
      console.error(`Invalid inference response structure for report ${report.id}`);
      await updateReportStatus(report.id, 'needs-human-review');
      console.log(`Report ${report.id} marked as needs-human-review (invalid structure)`);
      return;
    }

    // Validate the summary against the schema
    const { error, value } = summarySchema.validate(summary, { stripUnknown: true });

    if (error) {
      console.error(`Invalid inference response schema for report ${report.id}:`, error.message);
      await updateReportStatus(report.id, 'needs-human-review');
      console.log(`Report ${report.id} marked as needs-human-review (validation failed)`);
      return;
    }

    // Add metadata to summary
    const summaryWithMetadata = {
      ...value,
      model: value.model || rawOutput.model || 'AI Model',
      timestamp: value.timestamp || rawOutput.timestamp || new Date().toISOString()
    };

    // Update the database with the summary
    const updated = updateReportSummary(report.id, summaryWithMetadata);

    if (updated) {
      console.log(`Report ${report.id} summary saved successfully, status set to 'completed'`);
    } else {
      console.error(`Failed to update report ${report.id} in database`);
    }

  } catch (error) {
    console.error(`Error calling inference service for report ${report.id}:`, error.message);

    // Handle different error types
    if (error.code === 'ECONNREFUSED') {
      console.error(`Trainer service is not available at ${trainerUrl}`);
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.error(`Inference request timed out for report ${report.id}`);
    }

    // Mark report as needs human review
    try {
      await updateReportStatus(report.id, 'needs-human-review');
      console.log(`Report ${report.id} marked as needs-human-review (inference failed)`);
    } catch (dbError) {
      console.error(`Failed to update status for report ${report.id}:`, dbError.message);
    }
  }
}

/**
 * Batch process multiple reports
 * @param {string} trainerUrl - The URL of the trainer service
 * @param {Array} reports - Array of report objects
 * @returns {Promise<void>}
 */
async function batchInference(trainerUrl, reports) {
  const promises = reports.map(report => callInference(trainerUrl, report));
  await Promise.allSettled(promises);
}

module.exports = {
  callInference,
  batchInference
};
