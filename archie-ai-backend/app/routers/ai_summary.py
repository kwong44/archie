"""
AI Summary Router - Handles AI-powered summary generation using Google Gemini
Implements Task 3.6: AI Guide's Reflection generation
"""
import os
import time
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import google.generativeai as genai

from ..auth import verify_jwt, get_user_id_from_token
from ..models import AISummaryRequest, AISummaryResponse
from ..logger import logger

router = APIRouter()
security = HTTPBearer()

# Configure Gemini API
gemini_api_key = os.getenv("GEMINI_API_KEY")
if gemini_api_key:
    genai.configure(api_key=gemini_api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')
else:
    model = None

@router.post("/summarize", response_model=AISummaryResponse)
async def generate_summary(
    request: AISummaryRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> AISummaryResponse:
    """Generate encouraging AI summary using Gemini"""
    
    start_time = time.time()
    user_id = get_user_id_from_token(credentials)
    
    logger.info("AI summary generation started", extra={'user_id': user_id})
    
    if not model:
        raise HTTPException(status_code=503, detail="AI service unavailable")
    
    try:
        prompt = f"""You are The Architect's AI Guide. A user just completed a reframing session.

Original text: "{request.original_text}"
Reframed text: "{request.reframed_text or request.original_text}"

Provide a brief, encouraging 2-3 sentence reflection that celebrates their practice of conscious language transformation."""

        response = model.generate_content(prompt)
        summary = response.text.strip()
        processing_time = int((time.time() - start_time) * 1000)
        
        return AISummaryResponse(
            summary=summary,
            tone="encouraging", 
            processing_time_ms=processing_time
        )
    
    except Exception as e:
        logger.error("AI summary failed", extra={'user_id': user_id, 'error': str(e)})
        raise HTTPException(status_code=500, detail="Summary generation failed")
