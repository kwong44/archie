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
        # Build a more sophisticated prompt with context
        transformations_made = ""
        if request.transformation_count and request.transformation_count > 0:
            transformations_made = f"\n\nThe user made {request.transformation_count} language transformation(s) during this session."
        
        principles_context = ""
        if request.user_principles and len(request.user_principles) > 0:
            principles_context = f"\n\nUser's core principles: {', '.join(request.user_principles)}"
        
        # Check if any actual reframing occurred
        text_changed = request.reframed_text != request.original_text
        
        prompt = f"""You are The Architect's AI Guide - a wise, encouraging mentor who helps people transform their language to reshape their reality.

A user just completed a reframing session where they examined their internal dialogue and consciously chose more empowering language.

ORIGINAL THOUGHTS:
"{request.original_text}"

REFRAMED THOUGHTS:
"{request.reframed_text or request.original_text}"{transformations_made}{principles_context}

Your role is to provide a personalized, insightful reflection (2-3 sentences) that:
1. Acknowledges their specific journey and growth
2. Highlights the power of their conscious language choices
3. Encourages continued practice of self-authorship
4. Connects their work to larger themes of personal empowerment

Be warm, wise, and specific to their actual experience. Focus on the mindset shift they're creating, not just generic encouragement."""

        logger.info("Sending prompt to Gemini", extra={
            'user_id': user_id,
            'prompt_length': len(prompt),
            'has_transformations': bool(request.transformation_count),
            'has_principles': bool(request.user_principles),
            'text_changed': text_changed
        })
        
        # Debug log the full prompt in development
        logger.debug("Full Gemini prompt", extra={
            'user_id': user_id,
            'prompt': prompt
        })

        response = model.generate_content(prompt)
        summary = response.text.strip()
        processing_time = int((time.time() - start_time) * 1000)
        
        logger.info("Gemini response received", extra={
            'user_id': user_id,
            'response_length': len(summary),
            'processing_time_ms': processing_time
        })
        
        logger.debug("Full Gemini response", extra={
            'user_id': user_id,
            'response': summary
        })
        
        return AISummaryResponse(
            summary=summary,
            tone="encouraging", 
            processing_time_ms=processing_time
        )
    
    except Exception as e:
        logger.error("AI summary failed", extra={'user_id': user_id, 'error': str(e)})
        raise HTTPException(status_code=500, detail="Summary generation failed")
