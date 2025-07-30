import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * cbt-reframer-worker
 * ---------------------------------------------------------------------------
 * Compares original and reframed journal text and returns structured info
 * about each reframing instance.
 *
 * Request  (JSON): { original: string, reframed: string }
 * Response (JSON): { reframes: Array<{ original_thought: string; reframed_thought: string; technique_used: string; benefit: string }> }
 */

interface ReframerRequest { original?: string; reframed?: string }
interface ReframeItem {
  original_thought: string;
  reframed_thought: string;
  technique_used: string;
  benefit: string;
}
interface ReframerResponse { reframes: ReframeItem[] }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function log(level: "info" | "error", msg: string, meta: Record<string, unknown> = {}) {
  console[level](`[cbt-ref-worker] ${msg}`, meta);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const body = (await req.json()) as ReframerRequest;
    if (!body?.original || !body?.reframed) {
      return new Response(JSON.stringify({ error: "original and reframed required" }), { status: 400, headers: corsHeaders });
    }
    const reframes = await analyseReframes(body.original, body.reframed);
    const resp: ReframerResponse = { reframes };
    log("info", "reframes_generated", { count: reframes.length });
    return new Response(JSON.stringify(resp), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    log("error", "unhandled_exception", { err: err instanceof Error ? err.message : String(err) });
    return new Response(JSON.stringify({ error: "internal_error" }), { status: 500, headers: corsHeaders });
  }
});

async function analyseReframes(original: string, reframed: string): Promise<ReframeItem[]> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const prompt = `Compare the Original Thought and Reframed Thought below. For each important reframing, return JSON objects with keys: original_thought, reframed_thought, technique_used, benefit.`;
  const body = {
    contents: [
      { role: "system", parts: [{ text: prompt }] },
      { role: "user", parts: [{ text: `Original: ${original}\n\nReframed: ${reframed}` }] },
    ],
  };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const data = await res.json();
  try {
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
