# Multimodal Bug Summarizer - Trainer Service

AI-powered bug report summarization service using FastAPI.

## Why Python?

This service is implemented in Python to leverage the rich ML ecosystem:

- **Transformers**: Hugging Face transformers library for state-of-the-art language models
- **Accelerate**: Distributed training and mixed precision support
- **Datasets**: Hugging Face datasets for efficient data loading and processing
- **PyTorch/TensorFlow**: Deep learning frameworks with extensive GPU support
- **Rich ecosystem**: scikit-learn, numpy, pandas for data preprocessing

## Features

- FastAPI-based REST API for real-time inference
- POST /inference endpoint for bug report processing
- Mock deterministic responses for development/testing
- CORS enabled for backend integration
- Training pipeline support with JSONL datasets

## Development

### Mock Inference Service (Development)

For development, run the mock inference service that returns deterministic responses:

```bash
# Install dependencies
pip install -r requirements.txt

# Run the mock server
python -m uvicorn main:app --reload --port 8000
```

The mock service is useful for:
- Frontend/backend integration testing
- Development without GPU resources
- CI/CD pipeline validation

### Local Training

To train a real model using annotated data:

```bash
# Basic training with default parameters
python train.py --dataset /data/annotated.jsonl --model google/flan-t5-small --epochs 3

# Training with GPU (recommended)
CUDA_VISIBLE_DEVICES=0 python train.py \
  --dataset /data/annotated.jsonl \
  --model google/flan-t5-small \
  --epochs 3 \
  --batch-size 8 \
  --learning-rate 5e-5

# CPU training (slower, for testing only)
python train.py \
  --dataset /data/annotated.jsonl \
  --model google/flan-t5-small \
  --epochs 3 \
  --batch-size 4 \
  --no-cuda
```

**Hardware Requirements:**
- **GPU (Recommended)**: NVIDIA GPU with 8GB+ VRAM for faster training
- **CPU Fallback**: Training supported on CPU but significantly slower (10-50x)
- **RAM**: 16GB+ recommended for loading models and datasets

**Dataset Format (JSONL):**
Each line should be a JSON object with `input` and `output` fields matching the annotation schema. Export from backend using:
```bash
curl -H "Authorization: Bearer <ADMIN_TOKEN>" \
  http://localhost:4000/api/annotations/export/all > annotated.jsonl
```

### Docker

```bash
# Build and run with Docker
docker build -t trainer-service .
docker run -p 8000:8000 trainer-service
```

### Docker Compose

The service is included in the main docker-compose.yml:

```bash
docker compose up trainer
```

## API Endpoints

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "service": "trainer"
}
```

### Inference

```bash
POST /inference
```

Request body:
```json
{
  "id": "report-123",
  "input": {
    "description": "Bug description",
    "stacktrace_text": "Error stack trace",
    "env": {
      "os": "macOS",
      "browser": "Chrome",
      "browserVersion": "119.0"
    },
    "image_paths": []
  }
}
```

Response:
```json
{
  "id": "report-123",
  "summary": {
    "environment": "OS: macOS, Browser: Chrome 119.0",
    "actualBehavior": "Mocked actual behavior — check stacktrace",
    "expectedBehavior": "Mocked expected behavior",
    "bugCategory": "mock-category",
    "suggestedSolution": "Mocked suggestion"
  },
  "model": {
    "name": "mock-trainer",
    "version": "0.1"
  },
  "timestamp": "2025-11-06T16:30:00.000Z"
}
```

## Testing

```bash
# Test the health endpoint
curl http://localhost:8000/health

# Test the inference endpoint
curl -X POST http://localhost:8000/inference \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-123",
    "input": {
      "description": "Test bug",
      "env": {"os": "macOS"}
    }
  }'
```

## Future Enhancements

- Replace mock responses with actual ML model
- Add image processing capabilities
- Implement model training pipeline
- Add response caching
- Batch inference support
