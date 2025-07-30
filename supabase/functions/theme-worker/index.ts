import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * theme-worker
 * ---------------------------------------------------------------------------
 * Identifies recurring life themes in a journal transcript. Returns a string[]
 * of themes. (No persistence – orchestrator is responsible.)
 * ---------------------------------------------------------------------------
 * Request  (JSON): { transcript: string, entry_id?: string, user_id?: string }
 * Response (JSON): { themes: string[] }
 */

interface ThemeRequest { transcript?: string }
interface ThemeResponse { themes: string[] }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function log(level: "info" | "error", msg: string, meta: Record<string, unknown> = {}) {
  console[level](`[theme-worker] ${msg}`, meta);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as ThemeRequest;
    if (!body?.transcript) {
      return new Response(JSON.stringify({ error: "transcript is required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const themes = await extractThemes(body.transcript);
    const resp: ThemeResponse = { themes };
    log("info", "themes_extracted", { count: themes.length });
    return new Response(JSON.stringify(resp), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    log("error", "unexpected_error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

async function extractThemes(text: string): Promise<string[]> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const prompt =
    `Identify 2-3 recurring life themes present in the following text.\n` +
    `Return a JSON array of short theme phrases.`;
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
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
