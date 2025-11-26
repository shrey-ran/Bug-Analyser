# Annotations API

Human annotation system for bug reports to create training data.

## Endpoints

### Create Annotation

```bash
POST /api/annotations
Content-Type: application/json

{
  "reportId": "report-123",
  "environment": "macOS Chrome 119",
  "actual": "Page crashes when submitting form",
  "expected": "Form should submit successfully",
  "category": "UI Bug",
  "solution": "Add error boundary and validation",
  "annotator": "john@example.com"
}
```

Response:
```json
{
  "message": "Annotation created successfully",
  "id": 1,
  "reportId": "report-123"
}
```

### Get Annotations for Report

```bash
GET /api/annotations/:reportId
```

### Export Training Data (Admin Only)

Export all annotations as JSONL format for ML training:

```bash
GET /api/annotations/export/all
X-Admin-Token: your-admin-token
```

Response: Downloads a `.jsonl` file with format:
```jsonl
{"id":"annotation_1","input":{"description":"...","stacktrace":"...","environment":{...},"screenshots":[]},"target":{"environment":"...","actualBehavior":"...","expectedBehavior":"...","bugCategory":"...","suggestedSolution":"..."},"metadata":{"reportId":"...","annotator":"...","annotatedAt":"..."}}
{"id":"annotation_2",...}
```

### List All Annotations (Admin Only)

```bash
GET /api/annotations?limit=100&offset=0
X-Admin-Token: your-admin-token
```

### Delete Annotation (Admin Only)

```bash
DELETE /api/annotations/:id
X-Admin-Token: your-admin-token
```

## Configuration

Set the admin token in your environment:

```bash
export ADMIN_TOKEN=your-secure-token-here
```

Or in docker-compose.yml:
```yaml
environment:
  - ADMIN_TOKEN=secure-admin-token-change-in-production
```

## Database Schema

Annotations are stored in SQLite:

```sql
CREATE TABLE annotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reportId TEXT NOT NULL,
  environment TEXT NOT NULL,
  actualBehavior TEXT NOT NULL,
  expectedBehavior TEXT NOT NULL,
  bugCategory TEXT NOT NULL,
  suggestedSolution TEXT NOT NULL,
  annotator TEXT,
  createdAt INTEGER NOT NULL
)
```

## Workflow

1. User submits bug report → stored with status "processing"
2. AI generates summary → status becomes "completed"
3. Human reviews and annotates → status becomes "annotated"
4. Export annotations for training → JSONL download
5. Use training data to improve model

## Example Usage

```bash
# Create annotation
curl -X POST http://localhost:4000/api/annotations \
  -H "Content-Type: application/json" \
  -d '{
    "reportId": "1762449215508_y8n71pwwa",
    "environment": "macOS Chrome 119",
    "actual": "Page crashes",
    "expected": "Page works",
    "category": "UI Bug",
    "solution": "Fix validation",
    "annotator": "reviewer@example.com"
  }'

# Export for training (requires admin token)
curl -X GET http://localhost:4000/api/annotations/export/all \
  -H "X-Admin-Token: secure-admin-token-change-in-production" \
  -o training_data.jsonl
```

## Security

- Export endpoint requires `X-Admin-Token` header
- Admin token must be set via `ADMIN_TOKEN` environment variable
- Token is validated for all admin operations
- Returns 401 if token missing, 403 if invalid
