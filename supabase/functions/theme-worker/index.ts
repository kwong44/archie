import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { ThemeWorkerResponse } from "../_shared/types.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.12.0";

// Define the request payload schema
const RequestPayloadSchema = z.object({
  transcript: z.string(),
});

// Define the expected structure of the AI's JSON output
const ThemeResponseSchema = z.object({
  themes: z.array(
    z.object({
      theme: z.string(),
      justification: z.string(),
    })
  ),
});

async function getThemePrompt(transcript: string): Promise<string> {
  return `Analyze the following journal entry and identify the main themes or topics. For each theme, provide a brief justification based on the text. Your response must be a JSON object with a single key "themes", which is an array of objects. Each object in the array should have two keys: "theme" and "justification".

Do not include any introductory text or pleasantries. Only return the JSON object.

Journal Entry:
"""
${transcript}
"""

JSON Response:`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { transcript } = RequestPayloadSchema.parse(payload);

    if (!transcript) {
      return new Response(JSON.stringify({ error: "Missing transcript" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = await getThemePrompt(transcript);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const cleanedJsonString = responseText.match(/\{.*\}/s)![0];
    const aiResponse = JSON.parse(cleanedJsonString);

    const validatedData = ThemeResponseSchema.parse(aiResponse);

    const responsePayload: ThemeWorkerResponse = {
      workerName: "theme",
      data: { themes: validatedData.themes },
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    let errorMessage = "An unexpected error occurred.";
    if (error instanceof z.ZodError) {
      errorMessage = JSON.stringify(error.issues);
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return new Response(JSON.stringify({ error: "Failed to process request", details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

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
  const sysPrompt =
    `Identify 2-3 recurring life themes present in the following text.\n` +
    `Return a JSON array of short theme phrases.`;

  const themes = await callLLM(sysPrompt, text);
  return themes;
}

// Generic helper to call Gemini flash and parse JSON array
async function callLLM(sysPrompt: string, userText: string): Promise<string[]> {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY is not set');

  const fullPrompt = `${sysPrompt}\n\nTEXT:\n${userText}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 256, response_mime_type: 'application/json' },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errorBody}`);
  }

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
