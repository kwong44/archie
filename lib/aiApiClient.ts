/**
 * AI API Client for Archie Mobile App
 * Handles secure communication with the Python/FastAPI AI backend
 * Implements Task 3.4 (Speech-to-Text) and Task 3.6 (AI Summaries)
 * 
 * Following backend interaction guidelines:
 * - Automatic JWT authentication with Supabase tokens
 * - Comprehensive error handling
 * - Structured logging for all requests
 */

import { supabase } from './supabase';
import { logger } from './logger';

import Constants from 'expo-constants';

// Get AI backend URL from Expo configuration
const AI_BACKEND_URL = Constants.expoConfig?.extra?.aiBackendUrl;

if (!AI_BACKEND_URL) {
  logger.error('AI_BACKEND_URL not configured in environment variables', {
    context: 'aiApiClient',
    error_type: 'configuration_error'
  });
}

/**
 * Gets the authentication header with current Supabase JWT token
 * Required for all AI backend API calls
 * 
 * @returns Promise<string> Authorization header value
 * @throws Error if no active session found
 */
async function getAuthHeader(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session?.access_token) {
    logger.error('No active session found for AI API request', {
      context: 'aiApiClient',
      error: error?.message,
      has_session: !!session
    });
    throw new Error('No active session found. User must be logged in.');
  }
  
  return `Bearer ${session.access_token}`;
}

/**
 * Speech-to-Text API Request Types
 */
export interface SpeechToTextRequest {
  audioUri: string;
  languageCode?: string;
}

export interface SpeechToTextResponse {
  transcript: string;
  confidence: number;
  processing_time_ms: number;
}

/**
 * AI Summary API Request Types  
 */
export interface AISummaryRequest {
  original_text: string;
  reframed_text?: string;
  transformation_count?: number;
  user_principles?: string[];
}

export interface AISummaryResponse {
  summary: string;
  tone: string;
  processing_time_ms: number;
}

/**
 * Text-to-Speech API Request Types (Phase 2)
 */
export interface TTSRequest {
  text: string;
  voice_id?: string;
}

export interface TTSResponse {
  audio_base64: string;
  processing_time_ms: number;
  voice_id: string;
}

/**
 * AI API Client
 * Provides methods for calling the Python AI backend
 */
export const aiApiClient = {
  
  /**
   * Convert audio file to text using Google Cloud Speech API
   * Implements Task 3.4: Speech-to-Text integration
   * 
   * @param request SpeechToTextRequest with audio URI and options
   * @returns Promise<SpeechToTextResponse> Transcript with confidence and timing
   */
  async transcribeAudio(request: SpeechToTextRequest): Promise<SpeechToTextResponse> {
    const startTime = Date.now();
    
    logger.info('Speech-to-text request initiated', {
      context: 'aiApiClient',
      operation: 'transcribeAudio',
      audioUri: request.audioUri,
      languageCode: request.languageCode || 'en-US'
    });
    
    if (!AI_BACKEND_URL) {
      throw new Error('AI backend not configured');
    }
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Read the audio file and create a blob
      const response = await fetch(request.audioUri);
      const audioBlob = await response.blob();
      
      formData.append('audio_file', audioBlob, 'recording.wav');
      formData.append('language_code', request.languageCode || 'en-US');
      
      logger.info('Sending audio file to AI backend for transcription', {
        context: 'aiApiClient',
        operation: 'transcribeAudio',
        audioSize: audioBlob.size,
        languageCode: request.languageCode || 'en-US'
      });
      
      // Make API request
      const apiResponse = await fetch(`${AI_BACKEND_URL}/api/speech/transcribe`, {
        method: 'POST',
        headers: {
          'Authorization': await getAuthHeader(),
          // Don't set Content-Type - let fetch set it with boundary for FormData
        },
        body: formData,
      });
      
      if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => ({}));
        logger.error('Speech transcription API request failed', {
          context: 'aiApiClient',
          operation: 'transcribeAudio',
          status: apiResponse.status,
          statusText: apiResponse.statusText,
          error: errorData
        });
        
        throw new Error(
          errorData.detail || `Transcription failed: ${apiResponse.status}`
        );
      }
      
      const result: SpeechToTextResponse = await apiResponse.json();
      const requestTime = Date.now() - startTime;
      
      logger.info('Speech transcription completed successfully', {
        context: 'aiApiClient',
        operation: 'transcribeAudio',
        transcriptLength: result.transcript.length,
        confidence: result.confidence,
        processingTimeMs: result.processing_time_ms,
        totalRequestTimeMs: requestTime
      });
      
      return result;
      
    } catch (error) {
      const requestTime = Date.now() - startTime;
      
      logger.error('Speech transcription request failed', {
        context: 'aiApiClient',
        operation: 'transcribeAudio',
        error: error instanceof Error ? error.message : String(error),
        totalRequestTimeMs: requestTime
      });
      
      throw error;
    }
  },
  
  /**
   * Generate encouraging AI summary from journal text
   * Implements Task 3.6: AI Guide's Reflection generation
   * 
   * @param request AISummaryRequest with text and context
   * @returns Promise<AISummaryResponse> AI-generated encouraging summary
   */
  async generateSummary(request: AISummaryRequest): Promise<AISummaryResponse> {
    const startTime = Date.now();
    
    logger.info('AI summary generation request initiated', {
      context: 'aiApiClient',
      operation: 'generateSummary',
      originalTextLength: request.original_text.length,
      hasReframedText: !!request.reframed_text,
      transformationCount: request.transformation_count || 0,
      hasPrinciples: !!request.user_principles?.length
    });
    
    if (!AI_BACKEND_URL) {
      throw new Error('AI backend not configured');
    }
    
    try {
      const response = await fetch(`${AI_BACKEND_URL}/api/ai/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': await getAuthHeader(),
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('AI summary API request failed', {
          context: 'aiApiClient',
          operation: 'generateSummary',
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        throw new Error(
          errorData.detail || `Summary generation failed: ${response.status}`
        );
      }
      
      const result: AISummaryResponse = await response.json();
      const requestTime = Date.now() - startTime;
      
      logger.info('AI summary generated successfully', {
        context: 'aiApiClient',
        operation: 'generateSummary',
        summaryLength: result.summary.length,
        tone: result.tone,
        processingTimeMs: result.processing_time_ms,
        totalRequestTimeMs: requestTime
      });
      
      return result;
      
    } catch (error) {
      const requestTime = Date.now() - startTime;
      
      logger.error('AI summary generation request failed', {
        context: 'aiApiClient',
        operation: 'generateSummary',
        error: error instanceof Error ? error.message : String(error),
        totalRequestTimeMs: requestTime
      });
      
      throw error;
    }
  },
  
  /**
   * Get supported audio formats for transcription
   * Useful for validating files before upload
   * 
   * @returns Promise<any> Supported formats and recommendations
   */
  async getSupportedFormats(): Promise<any> {
    logger.info('Fetching supported audio formats', {
      context: 'aiApiClient',
      operation: 'getSupportedFormats'
    });
    
    if (!AI_BACKEND_URL) {
      throw new Error('AI backend not configured');
    }
    
    try {
      const response = await fetch(`${AI_BACKEND_URL}/api/speech/formats`, {
        method: 'GET',
        headers: {
          'Authorization': await getAuthHeader(),
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get formats: ${response.status}`);
      }
      
      const result = await response.json();
      
      logger.info('Audio formats fetched successfully', {
        context: 'aiApiClient',
        operation: 'getSupportedFormats',
        formatCount: result.supported_formats?.length || 0
      });
      
      return result;
      
    } catch (error) {
      logger.error('Failed to fetch supported formats', {
        context: 'aiApiClient',
        operation: 'getSupportedFormats',
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  },
  
  /**
   * Health check for the AI backend
   * Useful for monitoring and debugging
   * 
   * @returns Promise<any> Backend health status
   */
  async healthCheck(): Promise<any> {
    logger.info('AI backend health check initiated', {
      context: 'aiApiClient',
      operation: 'healthCheck'
    });
    
    if (!AI_BACKEND_URL) {
      throw new Error('AI backend not configured');
    }
    
    try {
      const response = await fetch(`${AI_BACKEND_URL}/health`, {
        method: 'GET',
        headers: {
          'Authorization': await getAuthHeader(),
        },
      });
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      logger.info('AI backend health check completed', {
        context: 'aiApiClient',
        operation: 'healthCheck',
        status: result.status
      });
      
      return result;
      
    } catch (error) {
      logger.error('AI backend health check failed', {
        context: 'aiApiClient',
        operation: 'healthCheck',
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  },

  /**
   * Convert text to speech using ElevenLabs TTS API (Phase 2)
   * For AI follow-up questions and guidance
   * 
   * @param request TTSRequest with text and optional voice_id
   * @returns Promise<TTSResponse> Base64-encoded audio data
   */
  async synthesizeText(request: TTSRequest): Promise<TTSResponse> {
    const startTime = Date.now();
    
    logger.info('TTS synthesis request initiated', {
      context: 'aiApiClient',
      operation: 'synthesizeText',
      textLength: request.text.length,
      voiceId: request.voice_id || 'default'
    });
    
    if (!AI_BACKEND_URL) {
      throw new Error('AI backend not configured');
    }
    
    try {
      const response = await fetch(`${AI_BACKEND_URL}/api/speech/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': await getAuthHeader(),
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('TTS synthesis API request failed', {
          context: 'aiApiClient',
          operation: 'synthesizeText',
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        throw new Error(
          errorData.detail || `TTS synthesis failed: ${response.status}`
        );
      }
      
      const result: TTSResponse = await response.json();
      const requestTime = Date.now() - startTime;
      
      logger.info('TTS synthesis completed successfully', {
        context: 'aiApiClient',
        operation: 'synthesizeText',
        audioSizeBytes: result.audio_base64.length,
        voiceId: result.voice_id,
        processingTimeMs: result.processing_time_ms,
        totalRequestTimeMs: requestTime
      });
      
      return result;
      
    } catch (error) {
      const requestTime = Date.now() - startTime;
      
      logger.error('TTS synthesis request failed', {
        context: 'aiApiClient',
        operation: 'synthesizeText',
        error: error instanceof Error ? error.message : String(error),
        totalRequestTimeMs: requestTime
      });
      
      throw error;
    }
  },

  /**
   * Get available voices for TTS synthesis (Phase 2)
   * 
   * @returns Promise<any> Available voices and their details
   */
  async getAvailableVoices(): Promise<any> {
    logger.info('Fetching available TTS voices', {
      context: 'aiApiClient',
      operation: 'getAvailableVoices'
    });
    
    if (!AI_BACKEND_URL) {
      throw new Error('AI backend not configured');
    }
    
    try {
      const response = await fetch(`${AI_BACKEND_URL}/api/speech/voices`, {
        method: 'GET',
        headers: {
          'Authorization': await getAuthHeader(),
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get voices: ${response.status}`);
      }
      
      const result = await response.json();
      
      logger.info('TTS voices fetched successfully', {
        context: 'aiApiClient',
        operation: 'getAvailableVoices',
        voiceCount: result.voices?.length || 0
      });
      
      return result;
      
    } catch (error) {
      logger.error('Failed to fetch TTS voices', {
        context: 'aiApiClient',
        operation: 'getAvailableVoices',
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }
}; 