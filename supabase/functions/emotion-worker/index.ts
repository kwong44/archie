import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.js";
import { USER_TABLE_NAME } from "../_shared/constants.ts";
import { createSupabaseClient } from "../_shared/supabaseClient.ts";
import { Emotion, EmotionWorkerResponse } from "../_shared/types.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.12.0";

// Define the request payload schema
const RequestPayloadSchema = z.object({
  transcript: z.string(),
  user_id: z.string(),
});

// Define the expected structure of the AI's JSON output
const EmotionResponseSchema = z.object({
  emotions: z.array(
    z.object({
      emotion: z.string(),
      justification: z.string(),
    })
  ),
});

async function getEmotionPrompt(transcript: string): Promise<string> {
  return `Analyze the following journal entry and identify the core emotions present. For each emotion, provide a brief justification based on the text. Your response must be a JSON object with a single key "emotions", which is an array of objects. Each object in the array should have two keys: "emotion" and "justification".

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
    const { transcript, user_id } = RequestPayloadSchema.parse(payload);

    if (!transcript || !user_id) {
      return new Response(JSON.stringify({ error: "Missing transcript or user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createSupabaseClient(req);
    const { data: user, error: userError } = await supabase
      .from(USER_TABLE_NAME)
      .select("id")
      .eq("id", user_id)
      .single();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = await getEmotionPrompt(transcript);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const cleanedJsonString = responseText.match(/\{.*\}/s)![0];
    const aiResponse = JSON.parse(cleanedJsonString);

    const validatedData = EmotionResponseSchema.parse(aiResponse);

    const responsePayload: EmotionWorkerResponse = {
      workerName: "emotion",
      data: { emotions: validatedData.emotions },
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

  const sysPrompt =
    `Extract up to 5 primary emotional states present in the following text.\n` +
    `Return a JSON array of lowercase emotion names.`;

  const emotions = await callLLM(sysPrompt, text);

  return emotions;
}

// Generic helper to call Gemini flash and parse JSON array
async function callLLM(sysPrompt: string, userText: string): Promise<string[]> {
  const key = Deno.env.get('GEMINI_API_KEY');
  const fullPrompt = `${sysPrompt}\n\nTEXT:\n${userText}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // FIX: Combine system and user prompt into a single user-role prompt
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
  // With response_mime_type, we can be more confident in the JSON structure
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return []; // Return empty on the rare occasion it's still not valid JSON
  }
}
