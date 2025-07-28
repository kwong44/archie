import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Generate Summary Edge Function
 * Handles AI-powered summary generation using Google Gemini API
 * 
 * Replaces: archie-ai-backend/app/routers/ai_summary.py
 * 
 * Features:
 * - AI reflection generation with user context
 * - Short, cool descriptions for entry cards
 * - Google Gemini integration with structured prompts
 * - User principles and transformation tracking
 * - Comprehensive error handling and logging
 * - JWT authentication via Supabase
 */

// Google Gemini API configuration
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const MAX_TEXT_LENGTH = 10000; // Reasonable limit for journal entries
const MAX_PRINCIPLES = 10; // Limit on user principles

/**
 * Request interface for AI summary generation
 */
interface SummaryRequest {
  original_text: string;
  reframed_text?: string;
  transformation_count?: number;
  user_principles?: string[];
}

/**
 * Response interface for AI summary results
 */
interface SummaryResponse {
  summary: string;
  description: string; // Short, cool description for entry cards (1 short sentence)
  tone: string;
  processing_time_ms: number;
}

/**
 * Error response interface
 */
interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
}

/**
 * Validates the summary request input
 * Ensures all required fields are present and within limits
 */
function validateSummaryRequest(data: any): { valid: boolean; error?: string; request?: SummaryRequest } {
  console.log('🔍 Validating summary request', {
    hasOriginalText: Boolean(data.original_text),
    hasReframedText: Boolean(data.reframed_text),
    transformationCount: data.transformation_count,
    principlesCount: data.user_principles?.length || 0
  });
  
  // Check required fields
  if (!data.original_text || typeof data.original_text !== 'string') {
    return {
      valid: false,
      error: 'original_text is required and must be a string'
    };
  }
  
  // Check text length limits
  if (data.original_text.length > MAX_TEXT_LENGTH) {
    return {
      valid: false,
      error: `original_text too long. Maximum length: ${MAX_TEXT_LENGTH} characters`
    };
  }
  
  if (data.original_text.trim().length === 0) {
    return {
      valid: false,
      error: 'original_text cannot be empty'
    };
  }
  
  // Validate optional reframed_text
  if (data.reframed_text && data.reframed_text.length > MAX_TEXT_LENGTH) {
    return {
      valid: false,
      error: `reframed_text too long. Maximum length: ${MAX_TEXT_LENGTH} characters`
    };
  }
  
  // Validate transformation_count
  if (data.transformation_count !== undefined && 
      (typeof data.transformation_count !== 'number' || data.transformation_count < 0)) {
    return {
      valid: false,
      error: 'transformation_count must be a non-negative number'
    };
  }
  
  // Validate user_principles
  if (data.user_principles) {
    if (!Array.isArray(data.user_principles)) {
      return {
        valid: false,
        error: 'user_principles must be an array'
      };
    }
    
    if (data.user_principles.length > MAX_PRINCIPLES) {
      return {
        valid: false,
        error: `Too many principles. Maximum: ${MAX_PRINCIPLES}`
      };
    }
    
    // Check each principle is a string
    for (const principle of data.user_principles) {
      if (typeof principle !== 'string' || principle.trim().length === 0) {
        return {
          valid: false,
          error: 'All principles must be non-empty strings'
        };
      }
    }
  }
  
  return {
    valid: true,
    request: {
      original_text: data.original_text,
      reframed_text: data.reframed_text || data.original_text,
      transformation_count: data.transformation_count || 0,
      user_principles: data.user_principles || []
    }
  };
}

/**
 * Builds the AI prompt for Gemini based on user context
 * Creates a sophisticated prompt that generates both summary and description
 */
function buildGeminiPrompt(request: SummaryRequest): string {
  console.log('✨ Building Gemini prompt for summary and description', {
    hasPrinciples: request.user_principles?.length || 0,
  });
  
  // Build context about user principles
  let principlesContext = '';
  if (request.user_principles && request.user_principles.length > 0) {
    principlesContext = `\n\nUser's core principles: ${request.user_principles.join(', ')}`;
  }

  const prompt = `You are The Architect's AI Guide — a compassionate, insightful mentor devoted to helping people reshape their reality by transforming their language.

A user has just shared a stream-of-consciousness entry capturing their current INNER THOUGHTS:
"""
${request.original_text}
"""${principlesContext}

Your mission is to craft TWO outputs:

1. SUMMARY — 5-6 vivid, engaging sentences that:
   • Reflect the core emotional themes and language patterns you notice.
   • Highlight at least one empowering insight or opportunity hidden in their words.
   • Pose 1-2 thoughtful, open-ended QUESTIONS that nudge deeper self-reflection.
   • If principles are provided, show how their reflections intersect with those principles.
   • Use warm, contemporary language that feels like a supportive coach.

2. DESCRIPTION — ONE punchy sentence (max 18 words) that captures the entry’s essence and entices the user to revisit it.

Reply ONLY with valid JSON in this exact shape:
{
  "summary": "...",
  "description": "..."
}`;
  
  console.log('📝 Prompt built successfully', {
    promptLength: prompt.length,
    includesPrinciples: principlesContext.length > 0
  });
  
  return prompt;
}

/**
 * Calls Google Gemini API for AI summary and description generation
 * Uses the gemini-1.5-flash model for fast, high-quality responses
 */
async function generateWithGemini(request: SummaryRequest): Promise<{ summary: string; description: string }> {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  
  if (!geminiApiKey) {
    console.error('❌ Gemini API key not configured');
    throw new Error('Gemini API not configured');
  }
  
  const prompt = buildGeminiPrompt(request);
  
  console.log('🤖 Starting Gemini AI generation for summary and description', {
    model: 'gemini-1.5-flash',
    promptLength: prompt.length
  });
  
  try {
    // Prepare request payload for Gemini API
    const requestPayload = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024
      }
    };
    
    // Make API request to Gemini
    const response = await fetch(`${GEMINI_API_URL}?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });
    
    console.log('📡 Gemini API response received', {
      status: response.status,
      statusText: response.statusText
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API error', {
        status: response.status,
        error: errorText
      });
      
      // Handle specific error cases
      if (response.status === 400) {
        throw new Error('Invalid request to Gemini API');
      } else if (response.status === 401 || response.status === 403) {
        throw new Error('Gemini API authentication failed');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded for Gemini API');
      } else {
        throw new Error(`Gemini API error: ${response.status}`);
      }
    }
    
    const responseData = await response.json();
    
    console.log('✅ Gemini API response parsed', {
      hasCandidates: Boolean(responseData.candidates),
      candidatesCount: responseData.candidates?.length || 0
    });
    
    // Extract the generated text from Gemini response
    const candidates = responseData.candidates;
    if (!candidates || candidates.length === 0) {
      console.warn('⚠️ No candidates in Gemini response', { responseData });
      throw new Error('No response generated from AI');
    }
    
    const firstCandidate = candidates[0];
    const content = firstCandidate.content;
    
    if (!content || !content.parts || content.parts.length === 0) {
      console.warn('⚠️ No content in Gemini candidate', { firstCandidate });
      throw new Error('Empty response from AI');
    }
    
    const generatedText = content.parts[0].text;
    
    if (!generatedText || generatedText.trim().length === 0) {
      console.warn('⚠️ Empty generated text from Gemini');
      throw new Error('AI generated empty response');
    }

    console.log('🎉 AI generation completed successfully', {
      generatedTextLength: generatedText.length
    });

    // Parse the JSON response from Gemini
    // Handle both raw JSON and markdown-wrapped JSON responses
    try {
      let jsonText = generatedText.trim();
      
      // Check if response is wrapped in markdown code blocks
      if (jsonText.startsWith('```json') || jsonText.startsWith('```')) {
        console.log('🔧 Detected markdown-wrapped JSON, extracting content');
        
        // Remove markdown code block formatting
        jsonText = jsonText
          .replace(/^```json\s*/i, '')  // Remove opening ```json
          .replace(/^```\s*/, '')       // Remove opening ``` (fallback)
          .replace(/\s*```\s*$/, '')    // Remove closing ```
          .trim();
          
        console.log('📝 Extracted JSON content', {
          originalLength: generatedText.length,
          extractedLength: jsonText.length,
          extractedPreview: jsonText.substring(0, 100)
        });
      }
      
      const parsed = JSON.parse(jsonText);
      
      if (!parsed.summary || !parsed.description) {
        console.warn('⚠️ Missing summary or description in AI response', { 
          parsed,
          hasKeys: Object.keys(parsed)
        });
        throw new Error('Incomplete response from AI');
      }

      console.log('✅ Successfully parsed summary and description', {
        summaryLength: parsed.summary.length,
        descriptionLength: parsed.description.length,
        summaryPreview: parsed.summary.substring(0, 50),
        descriptionPreview: parsed.description.substring(0, 30)
      });

      return {
        summary: parsed.summary.trim(),
        description: parsed.description.trim()
      };

    } catch (parseError) {
      console.error('❌ Failed to parse AI JSON response', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        generatedTextLength: generatedText.length,
        generatedTextPreview: generatedText.substring(0, 200),
        fullGeneratedText: generatedText // Include full text for debugging
      });
      
      // Enhanced fallback: try to extract JSON manually from malformed response
      try {
        console.log('🔄 Attempting manual JSON extraction as fallback');
        
        // Look for JSON patterns in the text
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extractedJson = jsonMatch[0];
          console.log('📦 Found JSON pattern', { extractedJson: extractedJson.substring(0, 100) });
          
          const parsed = JSON.parse(extractedJson);
          if (parsed.summary && parsed.description) {
            console.log('✅ Manual extraction successful');
            return {
              summary: parsed.summary.trim(),
              description: parsed.description.trim()
            };
          }
        }
             } catch (manualError) {
         console.warn('⚠️ Manual extraction also failed', { 
           manualError: manualError instanceof Error ? manualError.message : String(manualError)
         });
      }
      
      // Final fallback to safe default values
      console.log('🔄 Using safe fallback summary and description');
      return {
        summary: 'Your practice of reframing language is a powerful step toward conscious self-authorship. Keep building this muscle of mindful language.',
        description: 'Mindful language transformation session'
      };
    }
    
  } catch (error) {
    console.error('❌ Gemini generation failed', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw error;
  }
}

/**
 * Main Edge Function handler
 * Processes AI summary generation requests with comprehensive validation
 */
Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  
  console.log('🚀 Generate Summary Edge Function invoked', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }
  
  // Only accept POST requests
  if (req.method !== 'POST') {
    console.warn('⚠️ Invalid request method', { method: req.method });
    return new Response(
      JSON.stringify({ error: 'method_not_allowed', message: 'Only POST requests are allowed' }),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  try {
    // Parse JSON request body
    const requestData = await req.json();
    
    console.log('📄 Request data parsed', {
      hasOriginalText: Boolean(requestData.original_text),
      hasReframedText: Boolean(requestData.reframed_text),
      transformationCount: requestData.transformation_count,
      principlesCount: requestData.user_principles?.length || 0
    });
    
    // Validate request data
    const validation = validateSummaryRequest(requestData);
    if (!validation.valid) {
      console.warn('⚠️ Summary request validation failed', { error: validation.error });
      return new Response(
        JSON.stringify({
          error: 'invalid_request',
          message: validation.error
        } as ErrorResponse),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    const summaryRequest = validation.request!;
    
    // Generate AI summary and description with Gemini
    const { summary, description } = await generateWithGemini(summaryRequest);
    
    const processingTime = Date.now() - startTime;
    
    console.log('🎉 Summary and description generation completed successfully', {
      summaryLength: summary.length,
      descriptionLength: description.length,
      processingTimeMs: processingTime
    });
    
    // Return successful summary response
    const response: SummaryResponse = {
      summary,
      description,
      tone: 'encouraging',
      processing_time_ms: processingTime
    };
    
    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('❌ Summary generation request failed', {
      error: error instanceof Error ? error.message : String(error),
      processingTimeMs: processingTime
    });
    
    // Return appropriate error response
    let statusCode = 500;
    let errorType = 'summary_generation_failed';
    let errorMessage = 'An unexpected error occurred during summary generation';
    
    if (error instanceof Error) {
      if (error.message.includes('authentication') || error.message.includes('API key')) {
        statusCode = 503;
        errorType = 'service_unavailable';
        errorMessage = 'AI service temporarily unavailable';
      } else if (error.message.includes('Rate limit')) {
        statusCode = 429;
        errorType = 'rate_limit_exceeded';
        errorMessage = error.message;
      } else if (error.message.includes('Invalid request') || error.message.includes('Empty response')) {
        statusCode = 400;
        errorType = 'invalid_input';
        errorMessage = error.message;
      }
    }
    
    return new Response(
      JSON.stringify({
        error: errorType,
        message: errorMessage,
        details: { processing_time_ms: processingTime }
      } as ErrorResponse),
      {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}); 