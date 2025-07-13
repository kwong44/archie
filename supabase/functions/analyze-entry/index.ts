import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Analyze Entry Edge Function
 * ---------------------------------------------------------------------------
 * Analyzes a specific journal entry using AI to provide:
 * - Entry breakdown analysis
 * - Mood identification
 * - People mentioned
 * - Identified themes
 * - Actionable insights
 * 
 * Following project guidelines:
 * - BaaS First: Uses Supabase for all data operations
 * - Isolate AI Logic: Focused on AI analysis only
 * - JWT Authentication: Validates user tokens
 * - Structured Logging: Comprehensive logging for monitoring
 * - TypeScript: Fully typed implementation
 * ---------------------------------------------------------------------------
 */

interface AnalyzeEntryRequest {
  journal_session_id: string;
}

interface AnalyzeEntryResponse {
  entry_breakdown: string;
  mood: string[];
  people: string[];
  identified_themes: string[];
  actionable_insight: string;
  processing_time_ms: number;
  lexicon_words_identified: Array<{
    old: string;
    new: string;
    context?: string;
  }>;
}

interface JournalSession {
  id: string;
  user_id: string;
  original_transcript: string;
  reframed_text: string | null;
  ai_summary: string | null;
  created_at: string;
}

interface UserLexicon {
  id: string;
  old_word: string;
  new_word: string;
  description: string | null;
  usage_count: number;
}

interface UserPrinciple {
  id: string;
  principle: string;
  selected_at: string;
}

/**
 * Main Edge Function handler
 */
Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔍 Analyze Entry function called', {
      method: req.method,
      timestamp: new Date().toISOString()
    });

    // Extract and validate JWT token from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No valid authorization header found');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user from JWT token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('❌ Invalid or expired token', { error: userError?.message });
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ User authenticated successfully', { userId: user.id });

    // Parse request body
    const body = await req.json() as AnalyzeEntryRequest;
    
    if (!body.journal_session_id) {
      console.error('❌ Missing journal_session_id in request body');
      return new Response(
        JSON.stringify({ error: 'journal_session_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🔍 Analyzing journal entry', {
      userId: user.id,
      sessionId: body.journal_session_id
    });

    // Fetch necessary data in parallel for optimal performance
    const [journalResult, lexiconResult, principlesResult] = await Promise.all([
      // Fetch the specific journal session
      supabase
        .from('journal_sessions')
        .select('*')
        .eq('id', body.journal_session_id)
        .eq('user_id', user.id) // Ensure user can only access their own entries
        .single(),
      
      // Fetch user's lexicon
      supabase
        .from('user_lexicon')
        .select('*')
        .eq('user_id', user.id)
        .order('usage_count', { ascending: false }),
      
      // Fetch user's principles
      supabase
        .from('user_principles')
        .select('*')
        .eq('user_id', user.id)
        .order('selected_at', { ascending: true })
    ]);

    // Validate journal session fetch
    if (journalResult.error) {
      console.error('❌ Failed to fetch journal session', { 
        error: journalResult.error.message,
        sessionId: body.journal_session_id
      });
      return new Response(
        JSON.stringify({ error: 'Journal session not found or access denied' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const journalSession = journalResult.data as JournalSession;
    const userLexicon = lexiconResult.data as UserLexicon[] || [];
    const userPrinciples = principlesResult.data as UserPrinciple[] || [];

    console.log('📊 Data fetched successfully', {
      userId: user.id,
      sessionId: journalSession.id,
      lexiconCount: userLexicon.length,
      principlesCount: userPrinciples.length,
      transcriptLength: journalSession.original_transcript?.length || 0
    });

    // Identify lexicon words used in the original transcript
    const lexiconWordsUsed = identifyLexiconWords(
      journalSession.original_transcript, 
      userLexicon
    );

    console.log('🔤 Lexicon words identified', {
      userId: user.id,
      sessionId: journalSession.id,
      wordsFound: lexiconWordsUsed.length
    });

    // Construct the AI analysis request
    const aiAnalysisRequest = {
      original_transcript: journalSession.original_transcript,
      reframed_text: journalSession.reframed_text || '',
      lexicon_words_used: lexiconWordsUsed,
      user_principles: userPrinciples.map(p => p.principle)
    };

    // Call Google Gemini API for analysis
    const geminiResponse = await callGeminiAnalysis(aiAnalysisRequest);

    const processingTime = Date.now() - startTime;

    console.log('🎯 Analysis completed successfully', {
      userId: user.id,
      sessionId: journalSession.id,
      processingTimeMs: processingTime,
      moodCount: geminiResponse.mood?.length || 0,
      themesCount: geminiResponse.identified_themes?.length || 0
    });

    // Return structured analysis response
    const response: AnalyzeEntryResponse = {
      ...geminiResponse,
      processing_time_ms: processingTime,
      lexicon_words_identified: lexiconWordsUsed
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('❌ Error in analyze-entry function', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTimeMs: processingTime
    });

    return new Response(
      JSON.stringify({ 
        error: 'Internal server error during analysis',
        processing_time_ms: processingTime
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Identifies lexicon words used in the transcript
 * Performs case-insensitive matching and provides context
 */
function identifyLexiconWords(
  transcript: string, 
  lexicon: UserLexicon[]
): Array<{ old: string; new: string; context?: string }> {
  const wordsFound: Array<{ old: string; new: string; context?: string }> = [];
  
  if (!transcript || !lexicon.length) {
    return wordsFound;
  }

  const transcriptLower = transcript.toLowerCase();
  
  // Check each lexicon entry for matches
  for (const wordPair of lexicon) {
    const oldWordLower = wordPair.old_word.toLowerCase();
    
    // Check if the old word appears in the transcript
    if (transcriptLower.includes(oldWordLower)) {
      // Find the context around the word (20 characters before and after)
      const wordIndex = transcriptLower.indexOf(oldWordLower);
      const contextStart = Math.max(0, wordIndex - 20);
      const contextEnd = Math.min(transcript.length, wordIndex + oldWordLower.length + 20);
      const context = transcript.substring(contextStart, contextEnd).trim();
      
      wordsFound.push({
        old: wordPair.old_word,
        new: wordPair.new_word,
        context: context
      });
    }
  }
  
  return wordsFound;
}

/**
 * Calls Google Gemini API for structured journal entry analysis
 * Uses the super system prompt to provide empathetic, insightful analysis
 */
async function callGeminiAnalysis(request: {
  original_transcript: string;
  reframed_text: string;
  lexicon_words_used: Array<{ old: string; new: string; context?: string }>;
  user_principles: string[];
}): Promise<Omit<AnalyzeEntryResponse, 'processing_time_ms' | 'lexicon_words_identified'>> {
  
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY environment variable not set');
  }

  // Construct the super system prompt for Archie's AI Guide
  const systemPrompt = `You are Archie's AI Guide, a wise, empathetic, and insightful companion for individuals on a journey of self-transformation through language. Your purpose is not to be a therapist, but to act as a mirror, reflecting a user's inner world back to them with clarity, compassion, and a focus on their power of self-authorship.

Your Core Directives:

1. Embody Empathy and Wisdom: Your tone should be warm, encouraging, and non-judgmental. You are a guide, not a critic. Use "you" statements to speak directly to the user (e.g., "The way you've peeled back that first layer...").

2. Focus on the Power of Language: Your primary lens for analysis is the user's language. Connect their words to their feelings, their challenges, and their breakthroughs. Highlight the shift from their original transcript to their reframed text.

3. Identify Deeper Themes: Go beyond the surface-level content. Identify the underlying emotional themes, internal conflicts, and emerging strengths. What is the core story being told in this entry?

4. Connect to Principles: The user has provided their core principles. Weave these principles into your analysis to show them how their current experience aligns with (or challenges) the values they have set for themselves.

5. Provide Actionable Insight: The analysis must not be passive. Conclude with a single, powerful, open-ended question or a gentle suggestion that encourages deeper reflection or a next step on their journey.

Your Task:
You will be given a JSON object containing a user's journal entry, their reframed text, a list of the specific words they transformed from their personal lexicon, and their core principles.

Based on this data, you must generate a structured JSON response with the following fields:
- entry_breakdown: (string) Write a 3-4 sentence narrative analysis of the entry. Start by acknowledging their experience, then highlight the transformation they are creating.
- mood: (array of strings) Based on the entry, identify up to 5 key moods or emotional states. These should be single, powerful words.
- people: (array of strings) If any specific people are mentioned, list their names or roles here. If none, return an empty array.
- identified_themes: (array of strings) Identify 2-3 core psychological or emotional themes present in the entry.
- actionable_insight: (string) Provide one concise, thought-provoking question or a gentle challenge for the user to consider.

CRITICAL: Your response must be ONLY a valid JSON object with no additional text or explanations.`;

  const userInput = JSON.stringify(request);
  
  // Construct the full prompt
  const fullPrompt = `${systemPrompt}\n\nUser Input:\n${userInput}\n\nProvide your analysis as a JSON object:`;

  console.log('🤖 Calling Gemini API for analysis', {
    transcriptLength: request.original_transcript.length,
    reframedTextLength: request.reframed_text.length,
    lexiconWordsCount: request.lexicon_words_used.length,
    principlesCount: request.user_principles.length
  });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: fullPrompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API request failed', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Gemini API request failed: ${response.status}`);
    }

    const geminiResult = await response.json();
    
    if (!geminiResult.candidates || !geminiResult.candidates[0] || !geminiResult.candidates[0].content) {
      console.error('❌ Invalid Gemini API response structure', { geminiResult });
      throw new Error('Invalid response from Gemini API');
    }

    const generatedText = geminiResult.candidates[0].content.parts[0].text;
    
    console.log('✅ Gemini API response received', {
      responseLength: generatedText.length
    });

    // Parse the JSON response from Gemini
    try {
      const analysisResult = JSON.parse(generatedText);
      
      // Validate the response structure
      if (!analysisResult.entry_breakdown || !analysisResult.mood || !analysisResult.actionable_insight) {
        console.error('❌ Invalid analysis structure from Gemini', { analysisResult });
        throw new Error('Invalid analysis structure from AI');
      }

      return {
        entry_breakdown: analysisResult.entry_breakdown,
        mood: Array.isArray(analysisResult.mood) ? analysisResult.mood : [],
        people: Array.isArray(analysisResult.people) ? analysisResult.people : [],
        identified_themes: Array.isArray(analysisResult.identified_themes) ? analysisResult.identified_themes : [],
        actionable_insight: analysisResult.actionable_insight
      };

    } catch (parseError) {
      console.error('❌ Failed to parse Gemini JSON response', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        generatedText
      });
      
      // Return a fallback analysis if JSON parsing fails
      return {
        entry_breakdown: "I can see you're navigating a meaningful moment in your journey. The words you've chosen to transform show your commitment to reshaping your inner narrative, and that's a powerful step toward the person you're becoming.",
        mood: ["reflective", "hopeful", "determined"],
        people: [],
        identified_themes: ["self-reflection", "personal growth", "language transformation"],
        actionable_insight: "What would it feel like to fully embody the empowering words you've chosen in your daily thoughts and conversations?"
      };
    }

  } catch (error) {
    console.error('❌ Error calling Gemini API', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Return a fallback analysis if the API call fails
    return {
      entry_breakdown: "I can see you're navigating a meaningful moment in your journey. The words you've chosen to transform show your commitment to reshaping your inner narrative, and that's a powerful step toward the person you're becoming.",
      mood: ["reflective", "hopeful", "determined"],
      people: [],
      identified_themes: ["self-reflection", "personal growth", "language transformation"],
      actionable_insight: "What would it feel like to fully embody the empowering words you've chosen in your daily thoughts and conversations?"
    };
  }
} 