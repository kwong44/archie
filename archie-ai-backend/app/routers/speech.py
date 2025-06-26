"""
Speech-to-Text Router
Handles audio file transcription using ElevenLabs API
Implements Task 3.4: Speech-to-Text integration with ElevenLabs migration
"""

import os
import time
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from elevenlabs import ElevenLabs

from ..auth import verify_jwt, get_user_id_from_token
from ..models import SpeechToTextResponse, TranscriptionError
from ..logger import logger

# Create router instance
router = APIRouter()
security = HTTPBearer()

# Initialize ElevenLabs client
eleven = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))


@router.post("/transcribe", response_model=SpeechToTextResponse)
async def transcribe_audio(
    audio_file: UploadFile = File(...),
    language_code: str = Form(default="en-US"),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> SpeechToTextResponse:
    """
    Transcribe audio file to text using ElevenLabs Speech-to-Text API
    
    Requires authentication via Supabase JWT token
    Supports various audio formats with 60-second limit
    
    Args:
        audio_file: Uploaded audio file to transcribe (max 60 seconds)
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
    
    logger.info("ElevenLabs STT transcription request initiated", extra={
        'user_id': user_id,
        'filename': audio_file.filename,
        'content_type': audio_file.content_type,
        'language_code': language_code
    })
    
    # Validate file type - ElevenLabs supports common audio formats
    allowed_types = [
        'audio/wav', 'audio/wave', 'audio/x-wav',
        'audio/mpeg', 'audio/mp3',
        'audio/flac',
        'audio/ogg',
        'audio/webm',
        'audio/m4a'
    ]
    
    if audio_file.content_type not in allowed_types:
        logger.warning("Unsupported audio format for ElevenLabs", extra={
            'user_id': user_id,
            'content_type': audio_file.content_type,
            'filename': audio_file.filename
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
        
        # Check file size limit (ElevenLabs has limits)
        max_file_size = 10 * 1024 * 1024  # 10MB limit
        if file_size > max_file_size:
            logger.warning("Audio file too large for ElevenLabs", extra={
                'user_id': user_id,
                'file_size_bytes': file_size,
                'max_size_bytes': max_file_size
            })
            raise HTTPException(
                status_code=400,
                detail=f"Audio file too large. Maximum size: {max_file_size // (1024*1024)}MB"
            )
        
        logger.info("Audio file loaded for ElevenLabs transcription", extra={
            'user_id': user_id,
            'file_size_bytes': file_size,
            'filename': audio_file.filename
        })
        
        logger.info("Starting ElevenLabs STT transcription", extra={
            'user_id': user_id,
            'model': 'eleven_multilingual_v1',
            'language_code': language_code
        })
        
        # Perform ElevenLabs batch STT transcription
        response = eleven.speech_to_text.convert(
            audio=audio_content,
            model_id="eleven_multilingual_v1",  # ElevenLabs multilingual model
            language=language_code
        )
        
        # Extract transcript and confidence from ElevenLabs response
        transcript = response.text if hasattr(response, 'text') else str(response)
        confidence = getattr(response, 'score', 0.9)  # Default confidence if not provided
        
        if not transcript or transcript.strip() == "":
            logger.warning("No transcription results from ElevenLabs", extra={
                'user_id': user_id,
                'file_size_bytes': file_size
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
            'processing_time_ms': processing_time
        })
        
        return SpeechToTextResponse(
            transcript=transcript.strip(),
            confidence=confidence,
            processing_time_ms=processing_time
        )
    
    except Exception as e:
        processing_time = int((time.time() - start_time) * 1000)
        
        logger.error("ElevenLabs STT transcription failed", extra={
            'user_id': user_id,
            'error': str(e),
            'processing_time_ms': processing_time,
            'filename': audio_file.filename
        }, exc_info=True)
        
        # Return appropriate error based on exception type
        error_message = str(e).lower()
        if "quota" in error_message or "limit" in error_message or "rate" in error_message:
            raise HTTPException(
                status_code=429,
                detail="Transcription service temporarily unavailable. Please try again later."
            )
        elif "unauthorized" in error_message or "api key" in error_message:
            raise HTTPException(
                status_code=503,
                detail="Transcription service configuration error. Please contact support."
            )
        elif "audio" in error_message and ("format" in error_message or "invalid" in error_message):
            raise HTTPException(
                status_code=400,
                detail="Invalid audio format or corrupted file. Please try a different audio file."
            )
        else:
            raise HTTPException(
                status_code=500,
                detail="Transcription failed. Please try again with a different audio file."
            )


@router.get("/formats")
async def get_supported_formats(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    Get list of supported audio formats for ElevenLabs transcription
    
    Args:
        credentials: JWT authentication credentials
        
    Returns:
        Dictionary containing supported audio formats and their details
    """
    
    # Verify authentication
    verify_jwt(credentials)
    
    return {
        "supported_formats": [
            {
                "format": "WAV",
                "mime_types": ["audio/wav", "audio/wave", "audio/x-wav"],
                "description": "Waveform Audio Format - recommended for best quality"
            },
            {
                "format": "MP3",
                "mime_types": ["audio/mpeg", "audio/mp3"],
                "description": "MPEG Audio Layer 3 - widely supported"
            },
            {
                "format": "FLAC",
                "mime_types": ["audio/flac"],
                "description": "Free Lossless Audio Codec - high quality"
            },
            {
                "format": "OGG",
                "mime_types": ["audio/ogg"],
                "description": "Ogg Vorbis format"
            },
            {
                "format": "WebM",
                "mime_types": ["audio/webm"],
                "description": "WebM audio format"
            },
            {
                "format": "M4A",
                "mime_types": ["audio/m4a"],
                "description": "MPEG-4 Audio format"
            }
        ],
        "recommendations": {
            "sample_rate": "16000 Hz or higher for best results",
            "channels": "Mono or stereo supported",
            "max_file_size": "10 MB",
            "max_duration": "60 seconds (ElevenLabs limit)",
            "provider": "ElevenLabs Speech-to-Text API"
        }
    } 