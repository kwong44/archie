import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabaseClient.ts";
import { CbtIdentifierWorkerResponse } from "../_shared/types.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.12.0";

// Define the request payload schema
const RequestPayloadSchema = z.object({
  transcript: z.string(),
});

// Define the expected structure of the AI's JSON output
const CbtResponseSchema = z.object({
  distortions: z.array(
    z.object({
      distortion: z.string(),
      justification: z.string(),
      quote: z.string(),
    })
  ),
});

async function getCbtPrompt(transcript: string): Promise<string> {
  return `Analyze the following journal entry and identify any cognitive distortions present. For each distortion, provide the name of the distortion, a brief justification for why it's a distortion, and the exact quote from the text that demonstrates it. Your response must be a JSON object with a single key "distortions", which is an array of objects. Each object in the array should have three keys: "distortion", "justification", and "quote".

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

    const prompt = await getCbtPrompt(transcript);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const cleanedJsonString = responseText.match(/\{.*\}/s)![0];
    const aiResponse = JSON.parse(cleanedJsonString);

    const validatedData = CbtResponseSchema.parse(aiResponse);

    const responsePayload: CbtIdentifierWorkerResponse = {
      workerName: "cbt_identifier",
      data: { distortions: validatedData.distortions },
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
  const sysPrompt = `Identify cognitive distortions present in the text below. Return a valid JSON array where each object has these exact keys: "distortion", "quote", "explanation".`;
  const insights = await callLLM<Insight>(sysPrompt, text);
  return insights;
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
      generationConfig: { temperature: 0.2, maxOutputTokens: 512, response_mime_type: 'application/json' },
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
