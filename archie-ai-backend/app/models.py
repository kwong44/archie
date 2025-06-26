"""
Pydantic Models for Request/Response Validation
Defines the data structures for the AI backend API
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check response model"""
    status: str = Field(..., description="Service health status")
    message: str = Field(..., description="Health status message")
    version: str = Field(..., description="Service version")


class SpeechToTextRequest(BaseModel):
    """Request model for speech-to-text conversion"""
    audio_format: str = Field(..., description="Audio file format (wav, mp3, etc.)")
    language_code: str = Field(default="en-US", description="Language code for transcription")
    sample_rate: Optional[int] = Field(default=None, description="Audio sample rate in Hz")


class SpeechToTextResponse(BaseModel):
    """Response model for speech-to-text conversion"""
    transcript: str = Field(..., description="Transcribed text from audio")
    confidence: float = Field(..., description="Transcription confidence score (0-1)")
    processing_time_ms: int = Field(..., description="Processing time in milliseconds")


class AISummaryRequest(BaseModel):
    """Request model for AI summary generation"""
    original_text: str = Field(..., description="Original journal text to summarize")
    reframed_text: Optional[str] = Field(default=None, description="Reframed version of the text")
    transformation_count: int = Field(default=0, description="Number of transformations applied")
    user_principles: Optional[List[str]] = Field(default=None, description="User's selected principles")


class AISummaryResponse(BaseModel):
    """Response model for AI summary generation"""
    summary: str = Field(..., description="AI-generated encouraging summary")
    tone: str = Field(default="encouraging", description="Tone of the summary")
    processing_time_ms: int = Field(..., description="Processing time in milliseconds")


class ErrorResponse(BaseModel):
    """Error response model"""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Additional error details")


class TranscriptionError(BaseModel):
    """Specific error model for transcription failures"""
    error: str = Field(default="transcription_failed", description="Error type")
    message: str = Field(..., description="Error message")
    audio_format: Optional[str] = Field(default=None, description="Audio format that failed")
    file_size_bytes: Optional[int] = Field(default=None, description="Size of the audio file")


class AISummaryError(BaseModel):
    """Specific error model for AI summary generation failures"""
    error: str = Field(default="summary_generation_failed", description="Error type")
    message: str = Field(..., description="Error message")
    text_length: Optional[int] = Field(default=None, description="Length of input text")
    model_used: Optional[str] = Field(default=None, description="AI model that was used") 