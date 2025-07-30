import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * emotion-worker
 * ---------------------------------------------------------------------------
 * Stand-alone Edge Function that analyses a journal transcript and returns
 * an array of primary emotions detected. Implements the Worker-Agent pattern
 * from Phase 2 (Modular Architecture rule).
 *
 * Request (JSON): { transcript: string }
 * Response 200  (JSON): { emotions: string[] }
 * ---------------------------------------------------------------------------
 */

interface RequestPayload {
  transcript?: string;
}

interface EmotionResponse {
  emotions: string[];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function log(level: "info" | "error", message: string, meta: Record<string, unknown> = {}) {
  console[level](`[emotion-worker] ${message}`, meta);
}

Deno.serve(async (req: Request) => {
  const start = Date.now();

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as RequestPayload;
    if (!payload?.transcript) {
      return new Response(
        JSON.stringify({ error: "transcript is required" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const emotions = await detectEmotions(payload.transcript);

    const response: EmotionResponse = { emotions };

    log("info", "analysis_complete", {
      processingMs: Date.now() - start,
      emotionsCount: emotions.length,
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    log("error", "unhandled_exception", {
      err: err instanceof Error ? err.message : String(err),
    });
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

// ---------------------------------------------------------------------------
// Helper – call Gemini Flash and parse JSON array
// ---------------------------------------------------------------------------
async function detectEmotions(text: string): Promise<string[]> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY missing");

  const prompt =
    `Extract up to 5 primary emotional states present in the following text.\n` +
    `Return a JSON array of lowercase emotion names.`;

  const body = {
    contents: [
      { role: "system", parts: [{ text: prompt }] },
      { role: "user", parts: [{ text }] },
    ],
  };

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
      key,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const errTxt = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errTxt}`);
  }

  const data = await res.json();
  // naive parse – assumes model replies with raw JSON in the first candidate
  try {
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
