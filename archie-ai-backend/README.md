# Archie AI Backend

This is the Python/FastAPI backend service for The Architect mobile application. It handles Speech-to-Text transcription and AI-powered summary generation using Google Cloud services.

## 🏗️ Architecture

This backend follows the **BaaS First** architecture principle:
- **Single Purpose**: Only handles AI operations (Speech-to-Text, Summary Generation)
- **Stateless**: No database operations - all state managed by Supabase
- **Secure**: JWT authentication with Supabase tokens
- **Scalable**: Designed for Google Cloud Run deployment

## 🚀 Features

- **Speech-to-Text**: Convert audio recordings to text using Google Cloud Speech API
- **AI Summaries**: Generate encouraging reflections using Google Gemini
- **JWT Authentication**: Secure access using Supabase authentication tokens
- **Structured Logging**: Comprehensive JSON logging for monitoring
- **Health Checks**: Built-in health monitoring endpoints

## 🛠️ Setup

### Prerequisites

- Python 3.11+
- Google Cloud Account with Speech API enabled
- Google Gemini API access
- Supabase project with JWT secret

### Installation

1. **Clone and navigate to the backend directory:**
   ```bash
   cd archie-ai-backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your actual values
   ```

5. **Set up Google Cloud credentials:**
   ```bash
   # Download service account key from Google Cloud Console
   # Set GOOGLE_APPLICATION_CREDENTIALS to the key file path
   export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account-key.json"
   ```

### Environment Variables

```bash
# Required
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
GEMINI_API_KEY=your_gemini_api_key

# Optional
PORT=8000
HOST=0.0.0.0
ENVIRONMENT=development
LOG_LEVEL=INFO
```

## 🎯 API Endpoints

### Authentication
All endpoints require a valid Supabase JWT token in the Authorization header:
```
Authorization: Bearer <your-supabase-jwt-token>
```

### Speech-to-Text

**POST** `/api/speech/transcribe`
- Upload audio file for transcription
- Supports: WAV, MP3, FLAC, OGG, WebM
- Returns: transcript, confidence score, processing time

**GET** `/api/speech/formats`
- Get supported audio formats and recommendations

### AI Summary

**POST** `/api/ai/summarize`
- Generate encouraging summary from journal text
- Input: original text, reframed text, transformation count
- Returns: AI-generated reflection, tone, processing time

### Health Checks

**GET** `/`
- Basic health check

**GET** `/health`
- Detailed health check with service status

## 🏃‍♂️ Running Locally

```bash
# Development server with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production server
uvicorn main:app --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

Interactive API docs: `http://localhost:8000/docs`

## 🐳 Docker Deployment

### Build and run locally:
```bash
docker build -t archie-ai-backend .
docker run -p 8000:8000 --env-file .env archie-ai-backend
```

### Google Cloud Run Deployment:

1. **Build and push to Google Container Registry:**
   ```bash
   # Configure Docker for GCR
   gcloud auth configure-docker
   
   # Build and tag
   docker build -t gcr.io/YOUR_PROJECT_ID/archie-ai-backend .
   docker push gcr.io/YOUR_PROJECT_ID/archie-ai-backend
   ```

2. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy archie-ai-backend \
     --image gcr.io/YOUR_PROJECT_ID/archie-ai-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars SUPABASE_JWT_SECRET=your_secret,GEMINI_API_KEY=your_key
   ```

## 🔧 Integration with Frontend

Add the backend URL to your Expo app's environment variables:

```bash
# In your Expo app's .env
EXPO_PUBLIC_AI_BACKEND_URL=https://your-cloud-run-url
```

Use the `aiApiClient` in your React Native app to communicate with this backend.

## 📊 Monitoring & Logging

The backend uses structured JSON logging with the following log levels:
- **INFO**: Normal operations, requests, responses
- **WARNING**: Recoverable errors, validation failures  
- **ERROR**: System errors, API failures

Logs include:
- User ID for request tracking
- Processing times for performance monitoring
- Error details for debugging
- Request metadata for analytics

## 🛡️ Security

- **JWT Validation**: All requests require valid Supabase tokens
- **No User Data Storage**: Backend is stateless, no sensitive data stored
- **Input Validation**: Pydantic models validate all request data
- **Error Handling**: Sanitized error responses to prevent information leakage
- **CORS**: Configured for Expo development and production domains

## 🧪 Testing

```bash
# Run tests (when implemented)
pytest

# Test specific endpoint
curl -X POST "http://localhost:8000/api/ai/summarize" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"original_text": "I can'\''t do this", "reframed_text": "I choose not to do this right now"}'
```

## 📝 Development Notes

- **Modular Design**: Each service (speech, AI) is in separate router modules
- **Error Handling**: Comprehensive error handling with appropriate HTTP status codes
- **Type Safety**: Full TypeScript-style type hints with Pydantic
- **Scalability**: Designed for serverless deployment on Cloud Run
- **Monitoring**: Built-in health checks and structured logging

## 🆘 Troubleshooting

### Common Issues:

1. **"JWT Secret not configured"**
   - Ensure `SUPABASE_JWT_SECRET` is set in environment variables

2. **"Google Cloud authentication failed"**
   - Verify `GOOGLE_APPLICATION_CREDENTIALS` points to valid service account key
   - Ensure Speech API is enabled in your Google Cloud project

3. **"Gemini API not available"**
   - Check `GEMINI_API_KEY` is valid and has proper permissions

4. **CORS errors in Expo**
   - Verify your Expo development server URL is in the CORS origins list

For more help, check the application logs or contact the development team. 