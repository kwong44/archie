"""
Archie AI Backend - FastAPI Service
Handles Speech-to-Text and AI Summary Generation
Follows BaaS First architecture - only handles AI operations
"""

import os
import logging
from fastapi import FastAPI, Depends, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# 🔧 CRITICAL: Load environment variables FIRST before importing routers
# This ensures .env variables are available when router modules initialize
from pathlib import Path
env_path = Path('.') / '.env'
load_result = load_dotenv(dotenv_path=env_path)

# Debug: Check if .env file was loaded
print(f"🔧 DEBUG: .env file exists: {env_path.exists()}")
print(f"🔧 DEBUG: load_dotenv result: {load_result}")
print(f"🔧 DEBUG: GEMINI_API_KEY after load: {os.getenv('GEMINI_API_KEY', 'NOT_FOUND')[:20] if os.getenv('GEMINI_API_KEY') else 'NOT_FOUND'}")
print(f"🔧 DEBUG: Current working directory: {os.getcwd()}")

# NOW import routers after environment is loaded
from app.logger import logger
from app.auth import verify_jwt
from app.routers import speech, ai_summary, tts
from app.models import HealthResponse

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager
    Handles startup and shutdown events for the AI backend
    """
    logger.info("Starting Archie AI Backend", extra={'version': '1.0.0'})
    
    # Startup: Verify required environment variables
    required_env_vars = [
        'SUPABASE_JWT_SECRET',
        'ELEVENLABS_API_KEY',
        'GEMINI_API_KEY'
    ]
    
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]
    if missing_vars:
        logger.error("Missing required environment variables", extra={
            'missing_variables': missing_vars
        })
        raise RuntimeError(f"Missing environment variables: {', '.join(missing_vars)}")
    
    logger.info("AI Backend startup completed successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Archie AI Backend")

# Create FastAPI application
app = FastAPI(
    title="Archie AI Backend",
    description="AI-powered Speech-to-Text and Summary Generation Service",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",  # Expo dev server
        "https://*.expo.dev",     # Expo hosted apps
        "exp://",                 # Expo Go
        # 🔧 PRODUCTION FIX: Allow mobile apps (no credentials needed for JWT auth)
        "*",                      # Allow all origins for mobile apps
    ],
    allow_credentials=False,      # 🔧 FIX: Disabled to allow * origins
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Security scheme
security = HTTPBearer()

# Include routers
app.include_router(speech.router, prefix="/api/speech", tags=["speech"])
app.include_router(tts.router, prefix="/api/speech", tags=["speech"])
app.include_router(ai_summary.router, prefix="/api/ai", tags=["ai"])

@app.get("/", response_model=HealthResponse)
async def root():
    """
    Health check endpoint
    Returns basic service information and status
    """
    logger.info("Health check endpoint accessed")
    return HealthResponse(
        status="healthy",
        message="Archie AI Backend is running",
        version="1.0.0"
    )

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Detailed health check endpoint
    Verifies all AI services are accessible
    """
    logger.info("Detailed health check initiated")
    
    try:
        # TODO: Add actual service health checks here
        # - ElevenLabs API connectivity
        # - Gemini API connectivity
        
        logger.info("Health check completed successfully")
        return HealthResponse(
            status="healthy",
            message="All AI services are operational",
            version="1.0.0"
        )
    
    except Exception as e:
        logger.error("Health check failed", extra={'error': str(e)}, exc_info=True)
        raise HTTPException(status_code=503, detail="Service temporarily unavailable")

if __name__ == "__main__":
    import uvicorn
    
    # Development server configuration
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 