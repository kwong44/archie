import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { CbtReframerWorkerResponse } from "../_shared/types.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.12.0";

// Define the request payload schema
const RequestPayloadSchema = z.object({
  transcript: z.string(),
});

// Define the expected structure of the AI's JSON output
const CbtReframeResponseSchema = z.object({
  reframes: z.array(
    z.object({
      original_quote: z.string(),
      reframe: z.string(),
      justification: z.string(),
    })
  ),
});

async function getCbtReframePrompt(transcript: string): Promise<string> {
  return `Analyze the following journal entry. Identify sentences that represent negative or limiting beliefs. For each one, provide the original quote, a reframed, more empowering version of the sentence, and a justification for the reframe. Your response must be a JSON object with a single key "reframes", which is an array of objects. Each object in the array should have three keys: "original_quote", "reframe", and "justification".

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

    const prompt = await getCbtReframePrompt(transcript);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const cleanedJsonString = responseText.match(/\{.*\}/s)![0];
    const aiResponse = JSON.parse(cleanedJsonString);

    const validatedData = CbtReframeResponseSchema.parse(aiResponse);

    const responsePayload: CbtReframerWorkerResponse = {
      workerName: "cbt_reframer",
      data: { reframes: validatedData.reframes },
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
  const sysPrompt = `Compare the Original and Reframed text. For each significant reframing, return a valid JSON array of objects with these exact keys: "original_thought", "reframed_thought", "technique_used", "benefit".`;
  const userText = `Original: ${original}\n\nReframed: ${reframed}`;
  const reframes = await callLLM<ReframeItem>(sysPrompt, userText);
  return reframes;
}

// Generic helper to call Gemini flash and parse JSON array
async function callLLM<T>(sysPrompt: string, userText: string): Promise<T[]> {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY is not set');

  const fullPrompt = `${sysPrompt}\n\nTEXT:\n${userText}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024, response_mime_type: 'application/json' },
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
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
