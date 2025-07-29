import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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
    const workersToInvoke = ['legacy_gemini', 'emotion', 'theme'];
    log('info', 'router_decision', { workersToInvoke });

    // ---------------- Worker Invocation ---------------- //
    const workerResults = await Promise.all(workersToInvoke.map(async (w) => {
            if (w === 'legacy_gemini') {
        return legacyGeminiWorker(session, userPrinciples);
      }
      if (w === 'emotion') {
        return emotionWorker(session.original_transcript);
      }
      if (w === 'theme') {
        return themeWorker(session, supabase);
      }
      return null;
    }));

        // Merge worker outputs - start with legacy summary as base
    const legacyResp: any = workerResults.find(r => r && r.type === 'legacy')?.data || {};
    const emotionResp: any = workerResults.find(r => r && r.type === 'emotion')?.data || {};
    const themeResp: any = workerResults.find(r => r && r.type === 'theme')?.data || {};

    const response = {
      ...legacyResp,
      emotions: emotionResp.emotions ?? legacyResp.mood ?? [],
      themes: themeResp.themes ?? legacyResp.identified_themes ?? [],
    };

    // async persist
    supabase.from('journal_sessions').update({ ai_analysis: response }).eq('id', session.id);

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

  // Persist each theme row with dummy zero-vector for now
  await Promise.all(themes.map((theme) =>
    supabase.from('journal_themes').insert({ user_id: session.user_id, entry_id: session.id, theme, embedding: '[]' })
  ));

  return { type: 'theme', data: { themes } };
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

  const prompt = `You are Archie's Router-Worker prototype. Return JSON with entry_breakdown, mood, people, identified_themes, actionable_insight {reflection_prompt, action_suggestion?}`;
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
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  try {
    return JSON.parse(rawText);
  } catch (_) {
    log('error', 'gemini_parse_error', { rawText });
    return { entry_breakdown: 'Parse error', mood: [], people: [], identified_themes: [], actionable_insight: { reflection_prompt: '...' } };
  }
}
