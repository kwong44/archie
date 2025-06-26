"""
Text-to-Speech router – ElevenLabs
Handles AI follow-up question synthesis for Phase 2 implementation
"""
import os
import time
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from elevenlabs import ElevenLabs
from pydantic import BaseModel

from ..auth import get_user_id_from_token
from ..logger import logger

# Create router instance
router = APIRouter()
security = HTTPBearer()

# Initialize ElevenLabs client
eleven = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))


class TTSRequest(BaseModel):
    """Request model for Text-to-Speech synthesis"""
    text: str
    voice_id: str = "JBFqnCBsd6RMkjVDRZzb"  # Default voice ID


class TTSResponse(BaseModel):
    """Response model for Text-to-Speech synthesis"""
    audio_base64: str
    processing_time_ms: int
    voice_id: str


@router.post("/synthesize", response_model=TTSResponse)
async def synthesize_text(
    request: TTSRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TTSResponse:
    """
    Synthesize text to speech using ElevenLabs TTS API
    
    Designed for AI follow-up questions in Phase 2 of the journal workflow
    
    Args:
        request: TTS request containing text and optional voice_id
        credentials: JWT authentication credentials
        
    Returns:
        TTSResponse with base64-encoded audio and processing metrics
        
    Raises:
        HTTPException: For authentication, text validation, or synthesis errors
    """
    
    start_time = time.time()
    
    # Verify authentication and get user ID
    user_id = get_user_id_from_token(credentials)
    
    logger.info("ElevenLabs TTS synthesis request initiated", extra={
        'user_id': user_id,
        'text_length': len(request.text),
        'voice_id': request.voice_id
    })
    
    # Validate text length (ElevenLabs has limits)
    max_text_length = 5000  # Reasonable limit for AI follow-up questions
    if len(request.text) > max_text_length:
        logger.warning("Text too long for TTS synthesis", extra={
            'user_id': user_id,
            'text_length': len(request.text),
            'max_length': max_text_length
        })
        raise HTTPException(
            status_code=400,
            detail=f"Text too long. Maximum length: {max_text_length} characters"
        )
    
    if not request.text.strip():
        logger.warning("Empty text provided for TTS synthesis", extra={
            'user_id': user_id
        })
        raise HTTPException(
            status_code=400,
            detail="Text cannot be empty"
        )
    
    try:
        logger.info("Starting ElevenLabs TTS synthesis", extra={
            'user_id': user_id,
            'model': 'eleven_multilingual_v2',
            'voice_id': request.voice_id
        })
        
        # Perform ElevenLabs TTS synthesis
        audio_data = eleven.text_to_speech.convert(
            text=request.text,
            voice_id=request.voice_id,
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128"
        )
        
        processing_time = int((time.time() - start_time) * 1000)
        
        logger.info("ElevenLabs TTS synthesis completed successfully", extra={
            'user_id': user_id,
            'audio_size_bytes': len(audio_data) if audio_data else 0,
            'processing_time_ms': processing_time,
            'voice_id': request.voice_id
        })
        
        return TTSResponse(
            audio_base64=audio_data,  # ElevenLabs returns base64 by default
            processing_time_ms=processing_time,
            voice_id=request.voice_id
        )
        
    except Exception as e:
        processing_time = int((time.time() - start_time) * 1000)
        
        logger.error("ElevenLabs TTS synthesis failed", extra={
            'user_id': user_id,
            'error': str(e),
            'processing_time_ms': processing_time,
            'voice_id': request.voice_id
        }, exc_info=True)
        
        # Return appropriate error based on exception type
        error_message = str(e).lower()
        if "quota" in error_message or "limit" in error_message or "rate" in error_message:
            raise HTTPException(
                status_code=429,
                detail="TTS service temporarily unavailable. Please try again later."
            )
        elif "unauthorized" in error_message or "api key" in error_message:
            raise HTTPException(
                status_code=503,
                detail="TTS service configuration error. Please contact support."
            )
        elif "voice" in error_message and ("not found" in error_message or "invalid" in error_message):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid voice ID: {request.voice_id}. Please use a valid voice."
            )
        else:
            raise HTTPException(
                status_code=500,
                detail="TTS generation failed. Please try again."
            )


@router.get("/voices")
async def get_available_voices(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get list of available voices for TTS synthesis
    
    Args:
        credentials: JWT authentication credentials
        
    Returns:
        Dictionary containing available voices and their details
    """
    
    # Verify authentication
    user_id = get_user_id_from_token(credentials)
    
    logger.info("Fetching available TTS voices", extra={
        'user_id': user_id
    })
    
    try:
        # Get voices from ElevenLabs (this is a placeholder - actual implementation depends on ElevenLabs SDK)
        # For now, return a curated list of recommended voices
        return {
            "voices": [
                {
                    "voice_id": "JBFqnCBsd6RMkjVDRZzb", 
                    "name": "George",
                    "description": "Warm and encouraging male voice",
                    "recommended_for": "AI guidance and reflection"
                },
                {
                    "voice_id": "21m00Tcm4TlvDq8ikWAM",
                    "name": "Rachel", 
                    "description": "Clear and empathetic female voice",
                    "recommended_for": "Supportive conversations"
                },
                {
                    "voice_id": "AZnzlk1XvdvUeBnXmlld",
                    "name": "Domi",
                    "description": "Confident and inspiring female voice", 
                    "recommended_for": "Motivational content"
                }
            ],
            "default_voice": "JBFqnCBsd6RMkjVDRZzb",
            "provider": "ElevenLabs TTS API"
        }
        
    except Exception as e:
        logger.error("Failed to fetch TTS voices", extra={
            'user_id': user_id,
            'error': str(e)
        }, exc_info=True)
        
        # Return fallback voice list
        return {
            "voices": [
                {
                    "voice_id": "JBFqnCBsd6RMkjVDRZzb",
                    "name": "Default Voice",
                    "description": "Default ElevenLabs voice",
                    "recommended_for": "General use"
                }
            ],
            "default_voice": "JBFqnCBsd6RMkjVDRZzb",
            "provider": "ElevenLabs TTS API"
        } 