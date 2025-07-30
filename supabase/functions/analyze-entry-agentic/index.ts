import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabaseClient.ts";
import { JOURNAL_ENTRIES_TABLE_NAME } from "../_shared/constants.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const RequestPayloadSchema = z.object({
  journal_entry_id: z.string(),
  transcript: z.string(),
  user_id: z.string(),
});

// A simple router to decide which workers to run.
// In the future, this will be a call to a router-agent.
function route(transcript: string): string[] {
  const workers = [
    "emotion-worker",
    "cbt-identifier-worker",
    "cbt-reframer-worker",
    "theme-worker",
  ];
  // Basic heuristic: if the transcript is very short, don't run all workers.
  if (transcript.split(" ").length < 10) {
    return ["emotion-worker"];
  }
  return workers;
}

async function invokeWorker(workerName: string, payload: object, supabase: any) {
  const { data, error } = await supabase.functions.invoke(workerName, {
    body: JSON.stringify(payload),
  });

  if (error) {
    console.error(`Error invoking ${workerName}:`, error);
    return { workerName, error: error.message };
  }

  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { journal_entry_id, transcript, user_id } = RequestPayloadSchema.parse(payload);

    const supabase = createSupabaseClient(req);
    const workersToRun = route(transcript);

    const workerPayload = { transcript, user_id };

    const workerPromises = workersToRun.map((workerName) =>
      invokeWorker(workerName, workerPayload, supabase)
    );

    const results = await Promise.all(workerPromises);

    // Merge results from all workers into a single analysis object
    const analysis = results.reduce((acc, result) => {
      if (result && !result.error && result.data) {
        // Spread the data from each worker into the accumulator
        Object.assign(acc, result.data);
      }
      return acc;
    }, {});

    // Persist the merged analysis to the database
    const { error: updateError } = await supabase
      .from(JOURNAL_ENTRIES_TABLE_NAME)
      .update({ analysis: analysis as any })
      .eq("id", journal_entry_id);

    if (updateError) {
      throw new Error(`Failed to save analysis: ${updateError.message}`);
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in orchestrator:", error);
    const errorMessage = error instanceof z.ZodError ? JSON.stringify(error.issues) : error.message;
    return new Response(JSON.stringify({ error: "Failed to process request", details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * analyze-entry-agentic
 * ---------------------------------------------------------------------------
 * Prototype Router-Worker orchestration edge function (Phase-1 Agentic Arch).
 * Initially mirrors legacy analysis logic but is wired for future worker
 * expansion. Keeps API identical to legacy analyze-entry so the client can
 * switch endpoints behind a flag without schema changes.
 * ---------------------------------------------------------------------------
 * Rules applied: Security First, Modular Architecture, Log Everything.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeEntryRequest { journal_session_id: string }

// ------------------------- Logger helper ------------------------- //
function log(level: 'info' | 'error', message: string, meta: Record<string, unknown> = {}) {
  console[level](`[agentic] ${message}`, meta);
}

// ------------------------- Main Handler -------------------------- //
Deno.serve(async (req: Request) => {
  const start = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- Auth ----------------------------------------------------------------
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Auth header required' }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace('Bearer ', '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authHeader } } });

    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401, headers: corsHeaders });
    }

    // --- Parse body -----------------------------------------------------------
    const body = await req.json() as AnalyzeEntryRequest;
    if (!body?.journal_session_id) {
      return new Response(JSON.stringify({ error: 'journal_session_id is required' }), { status: 400, headers: corsHeaders });
    }

    log('info', 'request_received', { userId: user.id, sessionId: body.journal_session_id });

    // --- Fetch session & context in parallel ---------------------------------
    const [sessionRes, principlesRes] = await Promise.all([
      supabase.from('journal_sessions').select('*').eq('id', body.journal_session_id).eq('user_id', user.id).single(),
      supabase.from('user_principles').select('principle').eq('user_id', user.id)
    ]);

    if (sessionRes.error) {
      return new Response(JSON.stringify({ error: 'Journal session not found' }), { status: 404, headers: corsHeaders });
    }

    const session = sessionRes.data as any;
    const userPrinciples = (principlesRes.data ?? []).map((p: any) => p.principle);

        // ---------------- Router (v0.2) ---------------- //
    // Simple heuristic: always run emotion & theme workers in addition to legacy summary.
    const workersToInvoke = ['legacy_gemini', 'emotion', 'theme', 'cbt_identifier'];
    if (session.reframed_text) {
      workersToInvoke.push('cbt_reframer');
    }
    log('info', 'router_decision', { workersToInvoke });

    // ---------------- Worker Invocation ---------------- //
    const workerResults = await Promise.all(workersToInvoke.map(async (w) => {
      try {
        if (w === 'legacy_gemini') {
          return legacyGeminiWorker(session, userPrinciples);
        }
        if (w === 'emotion') {
          const { data, error } = await supabase.functions.invoke('emotion-worker', {
            body: { transcript: session.original_transcript },
          });
          if (error) throw error;
          return { type: 'emotion', data } as WorkerResult;
        }
        if (w === 'theme') {
          const { data, error } = await supabase.functions.invoke('theme-worker', {
            body: { transcript: session.original_transcript },
          });
          if (error) throw error;
          return { type: 'theme', data } as WorkerResult;
        }
        if (w === 'cbt_identifier') {
          const { data, error } = await supabase.functions.invoke('cbt-identifier-worker', {
            body: { transcript: session.original_transcript },
          });
          if (error) throw error;
          return { type: 'cbt_identifier', data } as WorkerResult;
        }
        if (w === 'cbt_reframer') {
          const { data, error } = await supabase.functions.invoke('cbt-reframer-worker', {
            body: { original: session.original_transcript, reframed: session.reframed_text },
          });
          if (error) throw error;
          return { type: 'cbt_reframer', data } as WorkerResult;
        }
        return null;
      } catch (err) {
        log('error', 'worker_failed', { worker: w, err: err instanceof Error ? err.message : String(err) });
        return null;
      }
    }));

        // Merge worker outputs - start with legacy summary as base
    const legacyResp: any = workerResults.find(r => r && r.type === 'legacy')?.data || {};
    const emotionResp: any = workerResults.find(r => r && r.type === 'emotion')?.data || {};
    const themeResp: any = workerResults.find(r => r && r.type === 'theme')?.data || {};
    const cbtIdentifierResp: any = workerResults.find(r => r && r.type === 'cbt_identifier')?.data || {};
    const cbtReframerResp: any = workerResults.find(r => r && r.type === 'cbt_reframer')?.data || {};

    const normalizeArray = (val: any): string[] => Array.isArray(val) ? val : (typeof val === 'object' && val !== null ? Object.values(val) as string[] : []);
    const mergedMoods = normalizeArray(emotionResp.emotions ?? legacyResp.mood);
    const formatBreakdown = (data: any): string => {
      if (typeof data !== 'object' || data === null) return String(data ?? '');
      return Object.entries(data)
        .map(([key, val]) => {
          const title = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          const valueStr = Array.isArray(val) ? val.join(', ') : String(val);
          return `${title}: ${valueStr}`;
        })
        .join('\n');
    };

    const entryBreakdownStr = typeof legacyResp.entry_breakdown === 'string'
      ? legacyResp.entry_breakdown
      : formatBreakdown(legacyResp.entry_breakdown ?? {});

    const response = {
      ...legacyResp,
      entry_breakdown: entryBreakdownStr,
      mood: mergedMoods,
      emotions: mergedMoods,
      identified_themes: themeResp.themes ?? legacyResp.identified_themes ?? [],
      themes: themeResp.themes ?? legacyResp.identified_themes ?? [],
      cbt_insights: cbtIdentifierResp.insights ?? [],
      cbt_reframes: cbtReframerResp.reframes ?? [],
    } as const;

    // --- Centralized Persistence ------------------------------------------ //

    // 1. Persist full analysis to the journal_sessions table
    supabase.from('journal_sessions').update({ 
      ai_analysis: response,
      user_id: session.user_id, // RLS check
    }).eq('id', session.id).eq('user_id', session.user_id);

    // 2. Persist themes to the dedicated journal_themes table
    if (response.themes.length) {
      const themeInserts = response.themes.map((theme: string) => ({
        user_id: session.user_id, // RLS check
        entry_id: session.id,
        theme,
        embedding: [], // No embedding generated at this stage
      }));
      const { error } = await supabase.from('journal_themes').insert(themeInserts);
      if (error && error.code !== '23505') { // Ignore duplicate errors
        log('error', 'theme_insert_failed', { err: error.message });
      }
    }

    // 3. Upsert the structured insights into the entry_insights table
    const { error: insightsErr } = await supabase.from('entry_insights').upsert({
      entry_id: session.id,
      user_id: session.user_id, // RLS FIX: Add user_id to satisfy policy
      emotions: mergedMoods,
      themes: response.identified_themes,
      cbt: {
        insights: response.cbt_insights,
        reframes: response.cbt_reframes,
      },
    });
    if (insightsErr) {
      log('error', 'insights_upsert_failed', { err: insightsErr.message });
    }

    log('info', 'analysis_complete', { processingMs: Date.now() - start });

    return new Response(JSON.stringify(response), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    log('error', 'unhandled_exception', { err: err instanceof Error ? err.message : String(err) });
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500, headers: corsHeaders });
  }
});

// ------------------------- Workers ------------------------------- //

interface WorkerResult { type: string; data: any }

async function legacyGeminiWorker(session: any, principles: string[]): Promise<WorkerResult> {
  const req = {
    original_transcript: session.original_transcript,
    reframed_text: session.reframed_text || '',
    transformations_applied: (session.transformations_applied ?? []).map((t: any) => ({ old_word: t.old_word, new_word: t.new_word })),
    user_principles: principles,
  };
  const analysis = await callGeminiAnalysis(req);
    return {
    type: 'legacy',
    data: {
      ...analysis,
      processing_time_ms: 0,
      lexicon_words_identified: (session.transformations_applied ?? []).map((t: any) => ({ old: t.old_word, new: t.new_word })),
    }
  };
}

async function emotionWorker(transcript: string): Promise<WorkerResult> {
  const key = Deno.env.get('GEMINI_API_KEY');
  const prompt = `Extract up to 5 primary emotional states present in the following text. Return as JSON array of strings.`;
  const res = await callLLM(prompt, transcript);
  return { type: 'emotion', data: { emotions: res } };
}

async function themeWorker(session: any, supabase: any): Promise<WorkerResult> {
  const key = Deno.env.get('GEMINI_API_KEY');
  const prompt = `Identify 2-3 recurring life themes present in the following text. Return JSON array of strings.`;
  const themes: string[] = await callLLM(prompt, session.original_transcript);

    // Persist each theme row with dummy zero-vector for now with error logging
  for (const theme of themes) {
    const { error } = await supabase.from('journal_themes').insert({
      user_id: session.user_id,
      entry_id: session.id,
      theme,
      embedding: '[]',
    });
    if (error) {
      log('error', 'theme_insert_failed', { theme, err: error.message });
    }
  }

  return { type: 'theme', data: { themes } };
}

async function cbtIdentifierWorker(transcript: string): Promise<WorkerResult> {
  try {
    const prompt = `Analyze the following journal entry for common cognitive distortions. 
      Return a JSON array of objects with the following structure:
      [{
        "distortion": "Name of the cognitive distortion (e.g., 'All-or-Nothing Thinking', 'Overgeneralization')",
        "quote": "The exact quote from the text that contains the distortion",
        "explanation": "Brief explanation of why this is a cognitive distortion"
      }]`;
      
    const insights = await callLLM(prompt, transcript);
    return { 
      type: 'cbt_identifier', 
      data: { insights: Array.isArray(insights) ? insights : [] } 
    };
  } catch (error) {
    log('error', 'cbt_identifier_failed', { error: error instanceof Error ? error.message : String(error) });
    return { type: 'cbt_identifier', data: { insights: [] } };
  }
}

async function cbtReframerWorker(originalText: string, reframedText: string): Promise<WorkerResult> {
  try {
    const prompt = `Compare the original and reframed journal entries below. 
      For each significant reframing, provide a structured analysis:
      {
        "original_thought": "Original thought from the text",
        "reframed_thought": "The reframed version",
        "technique_used": "CBT technique used (e.g., cognitive restructuring, evidence-based thinking)",
        "benefit": "How this reframing could be beneficial"
      }`;
      
    const comparisonPrompt = `Original: ${originalText}\n\nReframed: ${reframedText}`;
    const reframes = await callLLM(prompt, comparisonPrompt);
    
    return { 
      type: 'cbt_reframer', 
      data: { reframes: Array.isArray(reframes) ? reframes : [] } 
    };
  } catch (error) {
    log('error', 'cbt_reframer_failed', { error: error instanceof Error ? error.message : String(error) });
    return { type: 'cbt_reframer', data: { reframes: [] } };
  }
}

// Generic helper to call Gemini flash and parse JSON array
async function callLLM(sysPrompt: string, userText: string): Promise<any> {
  const key = Deno.env.get('GEMINI_API_KEY');
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${sysPrompt}\nTEXT:\n${userText}` }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 256 },
    })
  });
  if (!resp.ok) return [];
  const json = await resp.json();
  const txt = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
  try { return JSON.parse(txt); } catch { return [] }
}

// --- Reuse existing Gemini analysis util (copy/paste minimal) ---- //
async function callGeminiAnalysis(request: {
  original_transcript: string;
  reframed_text: string;
  transformations_applied: Array<{ old_word: string; new_word: string }>;
  user_principles: string[];
}) {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY not set');

  const prompt = `You are Archie's Router-Worker prototype. Respond ONLY with pure JSON (no markdown fences) containing exactly these keys: entry_breakdown, mood, people, identified_themes, actionable_insight. The actionable_insight object must have reflection_prompt and may have action_suggestion {title, description}.`;
  const userJson = JSON.stringify(request);

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${prompt}\nUSER_INPUT:\n${userJson}` }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini API error ${res.status}`);
  const json = await res.json();
  let rawText = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  rawText = rawText.trim();
  if (rawText.startsWith('```')) {
    rawText = rawText.replace(/```[a-zA-Z]*\n?/,'').replace(/```$/,'');
  }
    let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    log('error', 'gemini_parse_error', { rawText });
    parsed = { entry_breakdown: 'Parse error', mood: [], people: [], identified_themes: [], actionable_insight: { reflection_prompt: '...' } };
  }
  return parsed;
}
