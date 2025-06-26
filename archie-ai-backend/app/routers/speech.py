"""
Speech-to-Text Router
Handles audio file transcription using Google Cloud Speech API
Implements Task 3.4: Speech-to-Text integration
"""

import os
import time
import tempfile
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.cloud import speech

from ..auth import verify_jwt, get_user_id_from_token
from ..models import SpeechToTextResponse, TranscriptionError
from ..logger import logger

# Create router instance
router = APIRouter()
security = HTTPBearer()

# Initialize Google Cloud Speech client
speech_client = speech.SpeechClient()


@router.post("/transcribe", response_model=SpeechToTextResponse)
async def transcribe_audio(
    audio_file: UploadFile = File(...),
    language_code: str = Form(default="en-US"),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> SpeechToTextResponse:
    """
    Transcribe audio file to text using Google Cloud Speech API
    
    Requires authentication via Supabase JWT token
    Supports various audio formats (wav, mp3, flac, etc.)
    
    Args:
        audio_file: Uploaded audio file to transcribe
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
    
    logger.info("Speech transcription request initiated", extra={
        'user_id': user_id,
        'filename': audio_file.filename,
        'content_type': audio_file.content_type,
        'language_code': language_code
    })
    
    # Validate file type
    allowed_types = [
        'audio/wav', 'audio/wave', 'audio/x-wav',
        'audio/mpeg', 'audio/mp3',
        'audio/flac',
        'audio/ogg',
        'audio/webm'
    ]
    
    if audio_file.content_type not in allowed_types:
        logger.warning("Unsupported audio format", extra={
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
        
        logger.info("Audio file loaded for transcription", extra={
            'user_id': user_id,
            'file_size_bytes': file_size,
            'filename': audio_file.filename
        })
        
        # Configure transcription settings
        audio = speech.RecognitionAudio(content=audio_content)
        
        # Determine encoding from content type
        encoding_map = {
            'audio/wav': speech.RecognitionConfig.AudioEncoding.LINEAR16,
            'audio/wave': speech.RecognitionConfig.AudioEncoding.LINEAR16,
            'audio/x-wav': speech.RecognitionConfig.AudioEncoding.LINEAR16,
            'audio/mpeg': speech.RecognitionConfig.AudioEncoding.MP3,
            'audio/mp3': speech.RecognitionConfig.AudioEncoding.MP3,
            'audio/flac': speech.RecognitionConfig.AudioEncoding.FLAC,
            'audio/ogg': speech.RecognitionConfig.AudioEncoding.OGG_OPUS,
            'audio/webm': speech.RecognitionConfig.AudioEncoding.WEBM_OPUS
        }
        
        encoding = encoding_map.get(audio_file.content_type, 
                                   speech.RecognitionConfig.AudioEncoding.LINEAR16)
        
        config = speech.RecognitionConfig(
            encoding=encoding,
            sample_rate_hertz=16000,  # Standard sample rate
            language_code=language_code,
            enable_automatic_punctuation=True,
            enable_word_confidence=True,
            model="latest_long"  # Best model for longer audio
        )
        
        logger.info("Starting Google Cloud Speech transcription", extra={
            'user_id': user_id,
            'encoding': encoding.name,
            'language_code': language_code
        })
        
        # Perform transcription
        response = speech_client.recognize(config=config, audio=audio)
        
        if not response.results:
            logger.warning("No transcription results returned", extra={
                'user_id': user_id,
                'file_size_bytes': file_size
            })
            raise HTTPException(
                status_code=400,
                detail="No speech detected in audio file. Please ensure the audio is clear and contains speech."
            )
        
        # Extract the best transcript
        result = response.results[0]
        alternative = result.alternatives[0]
        transcript = alternative.transcript
        confidence = alternative.confidence
        
        processing_time = int((time.time() - start_time) * 1000)
        
        logger.info("Speech transcription completed successfully", extra={
            'user_id': user_id,
            'transcript_length': len(transcript),
            'confidence': confidence,
            'processing_time_ms': processing_time
        })
        
        return SpeechToTextResponse(
            transcript=transcript,
            confidence=confidence,
            processing_time_ms=processing_time
        )
    
    except Exception as e:
        processing_time = int((time.time() - start_time) * 1000)
        
        logger.error("Speech transcription failed", extra={
            'user_id': user_id,
            'error': str(e),
            'processing_time_ms': processing_time,
            'filename': audio_file.filename
        }, exc_info=True)
        
        # Return appropriate error based on exception type
        if "quota" in str(e).lower() or "limit" in str(e).lower():
            raise HTTPException(
                status_code=429,
                detail="Transcription service temporarily unavailable. Please try again later."
            )
        elif "billing" in str(e).lower():
            raise HTTPException(
                status_code=503,
                detail="Transcription service configuration error. Please contact support."
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
    Get list of supported audio formats for transcription
    
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
            }
        ],
        "recommendations": {
            "sample_rate": "16000 Hz for best results",
            "channels": "Mono preferred",
            "max_file_size": "10 MB",
            "max_duration": "60 seconds for real-time processing"
        }
    } 