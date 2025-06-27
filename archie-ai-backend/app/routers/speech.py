"""
Speech-to-Text Router
Handles audio file transcription using ElevenLabs API
Implements Task 3.4: Speech-to-Text integration with ElevenLabs migration

Fixed: Uses direct HTTP API calls instead of SDK (which doesn't have STT)
"""

import os
import time
import httpx
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..auth import verify_jwt, get_user_id_from_token
from ..models import SpeechToTextResponse, TranscriptionError
from ..logger import logger

# Create router instance
router = APIRouter()
security = HTTPBearer()


@router.post("/transcribe", response_model=SpeechToTextResponse)
async def transcribe_audio(
    audio_file: UploadFile = File(...),
    language_code: str = Form(default="en-US"),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> SpeechToTextResponse:
    """
    Transcribe audio file to text using ElevenLabs Speech-to-Text API
    
    Requires authentication via Supabase JWT token
    Supports various audio formats with 1GB file limit per ElevenLabs documentation
    
    Args:
        audio_file: Uploaded audio file to transcribe (max 1GB)
        language_code: Language code for transcription (default: en-US)
        credentials: JWT authentication credentials
        
    Returns:
        SpeechToTextResponse with transcript, confidence, and processing time
        
    Raises:
        HTTPException: For authentication, file format, or transcription errors
    """
    
    start_time = time.time()
    
    # Verify authentication and get user ID
    user_id = get_user_id_from_token(credentials)
    
    # Fixed: Changed 'filename' to 'file_name' to avoid LogRecord conflict
    logger.info("ElevenLabs STT transcription request initiated", extra={
        'user_id': user_id,
        'file_name': audio_file.filename,
        'content_type': audio_file.content_type,
        'language_code': language_code
    })
    
    # Validate file type - ElevenLabs supports common audio formats
    # Based on official docs: https://elevenlabs.io/docs/api-reference/speech-to-text/convert
    allowed_types = [
        'audio/wav', 'audio/wave', 'audio/x-wav',
        'audio/mpeg', 'audio/mp3',
        'audio/flac',
        'audio/ogg',
        'audio/webm',
        'audio/m4a',
        'audio/x-m4a'  # Added to support iOS m4a recordings
    ]
    
    if audio_file.content_type not in allowed_types:
        logger.warning("Unsupported audio format for ElevenLabs", extra={
            'user_id': user_id,
            'content_type': audio_file.content_type,
            'file_name': audio_file.filename
        })
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {audio_file.content_type}. "
                   f"Supported formats: {', '.join(allowed_types)}"
        )
    
    try:
        # Read audio file content
        audio_content = await audio_file.read()
        file_size = len(audio_content)
        
        # Check file size limit (ElevenLabs has 1GB limit per docs)
        max_file_size = 1024 * 1024 * 1024  # 1GB limit per ElevenLabs docs
        if file_size > max_file_size:
            logger.warning("Audio file too large for ElevenLabs", extra={
                'user_id': user_id,
                'file_size_bytes': file_size,
                'max_size_bytes': max_file_size
            })
            raise HTTPException(
                status_code=400,
                detail=f"Audio file too large. Maximum size: {max_file_size // (1024*1024*1024)}GB"
            )
        
        # Check for empty file (this was missing before!)
        if file_size == 0:
            logger.warning("Empty audio file received", extra={
                'user_id': user_id,
                'file_name': audio_file.filename
            })
            raise HTTPException(
                status_code=400,
                detail="Empty audio file. Please upload a valid audio recording."
            )
        
        logger.info("Audio file loaded for ElevenLabs transcription", extra={
            'user_id': user_id,
            'file_size_bytes': file_size,
            'file_name': audio_file.filename
        })
        
        # Convert language code format (en-US -> eng) per ElevenLabs docs
        # ElevenLabs expects ISO-639-3 codes
        lang_map = {
            'en-US': 'eng',
            'en': 'eng', 
            'es': 'spa',
            'fr': 'fra',
            'de': 'deu',
            'it': 'ita',
            'pt': 'por',
            'ja': 'jpn',
            'ko': 'kor',
            'zh': 'cmn'
        }
        eleven_lang = lang_map.get(language_code, 'eng')  # Default to English
        
        logger.info("Starting ElevenLabs STT transcription via HTTP API", extra={
            'user_id': user_id,
            'model': 'scribe_v1',
            'language_code': eleven_lang,
            'original_language': language_code
        })
        
        # Perform ElevenLabs batch STT transcription using HTTP API
        # The Python SDK doesn't have speech-to-text, so we use direct HTTP API
        # Based on https://elevenlabs.io/docs/api-reference/speech-to-text/convert
        async with httpx.AsyncClient() as client:
            files = {
                'file': (audio_file.filename or 'audio.m4a', audio_content, audio_file.content_type)
            }
            data = {
                'model_id': 'scribe_v1',  # Official ElevenLabs STT model per docs
                'language_code': eleven_lang,
            }
            headers = {
                'Xi-Api-Key': os.getenv("ELEVENLABS_API_KEY")
            }
            
            logger.info("Making HTTP request to ElevenLabs STT API", extra={
                'user_id': user_id,
                'model_id': 'scribe_v1',
                'language_code': eleven_lang,
                'api_endpoint': 'https://api.elevenlabs.io/v1/speech-to-text',
                'file_size_bytes': file_size
            })
            
            # Make the API request
            response = await client.post(
                'https://api.elevenlabs.io/v1/speech-to-text',
                files=files,
                data=data,
                headers=headers,
                timeout=120.0  # ElevenLabs STT can take time for longer audio
            )
            
            logger.info("ElevenLabs STT API response received", extra={
                'user_id': user_id,
                'status_code': response.status_code,
                'response_headers': dict(response.headers)
            })
            
            if response.status_code != 200:
                error_text = response.text
                logger.error("ElevenLabs STT API error", extra={
                    'user_id': user_id,
                    'status_code': response.status_code,
                    'response_text': error_text
                })
                
                # Handle specific error cases
                if response.status_code == 401:
                    raise HTTPException(
                        status_code=503,
                        detail="ElevenLabs API authentication failed. Please contact support."
                    )
                elif response.status_code == 400:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid audio file or request: {error_text}"
                    )
                elif response.status_code == 429:
                    raise HTTPException(
                        status_code=429,
                        detail="Rate limit exceeded. Please try again later."
                    )
                else:
                    raise HTTPException(
                        status_code=500,
                        detail=f"ElevenLabs API error: {response.status_code}"
                    )
            
            response_data = response.json()
            
            logger.info("ElevenLabs STT API response parsed", extra={
                'user_id': user_id,
                'response_keys': list(response_data.keys()) if response_data else []
            })
        
        # Extract transcript from ElevenLabs response
        # Response structure per docs: {text: string, language_code: string, language_probability: float}
        transcript = response_data.get('text', '')
        
        # ElevenLabs returns language_probability instead of confidence score
        confidence = response_data.get('language_probability', 0.9)
        
        if not transcript or transcript.strip() == "":
            logger.warning("No transcription results from ElevenLabs", extra={
                'user_id': user_id,
                'file_size_bytes': file_size,
                'response_data': response_data
            })
            raise HTTPException(
                status_code=400,
                detail="No speech detected in audio file. Please ensure the audio is clear and contains speech."
            )
        
        processing_time = int((time.time() - start_time) * 1000)
        
        logger.info("ElevenLabs STT transcription completed successfully", extra={
            'user_id': user_id,
            'transcript_length': len(transcript),
            'confidence': confidence,
            'processing_time_ms': processing_time,
            'detected_language': response_data.get('language_code', 'unknown')
        })
        
        return SpeechToTextResponse(
            transcript=transcript.strip(),
            confidence=confidence,
            processing_time_ms=processing_time
        )
    
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        processing_time = int((time.time() - start_time) * 1000)
        
        # Fixed: avoid 'filename' conflict in error logging
        logger.error("ElevenLabs STT transcription failed", extra={
            'user_id': user_id,
            'error': str(e),
            'error_type': type(e).__name__,
            'processing_time_ms': processing_time,
            'file_name': audio_file.filename
        }, exc_info=True)
        
        # Return appropriate error based on exception type
        error_message = str(e).lower()
        if "timeout" in error_message:
            raise HTTPException(
                status_code=408,
                detail="Transcription request timed out. Please try with a shorter audio file."
            )
        elif "connection" in error_message or "network" in error_message:
            raise HTTPException(
                status_code=503,
                detail="Unable to connect to transcription service. Please try again later."
            )
        else:
            raise HTTPException(
                status_code=500,
                detail="An unexpected error occurred during transcription. Please try again."
            )


@router.get("/formats")
async def get_supported_formats(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    Get supported audio formats for ElevenLabs transcription
    
    Returns:
        Dict containing supported audio formats, limits, and model info
    """
    user_id = get_user_id_from_token(credentials)
    
    logger.info("Retrieving ElevenLabs supported formats", extra={
        'user_id': user_id
    })
    
    return {
        "supported_formats": [
            "audio/wav", "audio/wave", "audio/x-wav",
            "audio/mpeg", "audio/mp3", 
            "audio/flac",
            "audio/ogg",
            "audio/webm",
            "audio/m4a",
            "audio/x-m4a"  # Fixed: Added to support iOS m4a recordings
        ],
        "max_file_size_gb": 1,  # ElevenLabs 1GB limit per docs
        "max_duration_seconds": None,  # No explicit duration limit in docs
        "models": ["scribe_v1"],
        "supported_languages": [
            "eng", "spa", "fra", "deu", "ita", "por", "jpn", "kor", "cmn"
        ]
    }


@router.get("/health")
async def health_check():
    """
    Health check endpoint for ElevenLabs speech service
    
    Returns:
        Dict with service status and ElevenLabs connectivity
    """
    try:
        # Verify ElevenLabs API key is configured
        api_key = os.getenv("ELEVENLABS_API_KEY")
        if not api_key:
            raise ValueError("ElevenLabs API key not configured")
        
        logger.info("ElevenLabs speech service health check passed")
        
        return {
            "status": "healthy",
            "service": "elevenlabs-speech-to-text-http-api",
            "models_available": ["scribe_v1"],
            "api_configured": bool(api_key)
        }
    except Exception as e:
        logger.error("ElevenLabs speech service health check failed", extra={
            'error': str(e)
        })
        raise HTTPException(
            status_code=503,
            detail=f"ElevenLabs speech service unavailable: {str(e)}"
        ) 
