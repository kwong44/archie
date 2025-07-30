import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * cbt-identifier-worker
 * ---------------------------------------------------------------------------
 * Detects cognitive distortions in a journal transcript and returns structured
 * insights. No DB writes – pure analysis. (Modular Architecture rule)
 *
 * Request  (JSON): { transcript: string }
 * Response (JSON): { insights: Array<{ distortion: string; quote: string; explanation: string }> }
 */

interface RequestPayload { transcript?: string }
interface Insight { distortion: string; quote: string; explanation: string }
interface ResponsePayload { insights: Insight[] }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function log(level: "info" | "error", msg: string, meta: Record<string, unknown> = {}) {
  console[level](`[cbt-id-worker] ${msg}`, meta);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const body = (await req.json()) as RequestPayload;
    if (!body?.transcript) {
      return new Response(JSON.stringify({ error: "transcript is required" }), { status: 400, headers: corsHeaders });
    }

    const insights = await detectDistortions(body.transcript);
    const resp: ResponsePayload = { insights };
    log("info", "distortions_identified", { count: insights.length });
    return new Response(JSON.stringify(resp), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    log("error", "unhandled_exception", { err: err instanceof Error ? err.message : String(err) });
    return new Response(JSON.stringify({ error: "internal_error" }), { status: 500, headers: corsHeaders });
  }
});

async function detectDistortions(text: string): Promise<Insight[]> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const prompt = `Identify cognitive distortions present in the text below. Return JSON array where each item has keys: distortion, quote, explanation.`;
  const body = {
    contents: [
      { role: "system", parts: [{ text: prompt }] },
      { role: "user", parts: [{ text }] },
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
