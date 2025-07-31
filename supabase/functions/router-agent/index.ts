import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.12.0";

// Define the request payload schema
const RequestPayloadSchema = z.object({
  transcript: z.string(),
});

// Define the expected structure of the AI's JSON output
const RouterAgentResponseSchema = z.array(z.string());

/**
 * Generates the prompt for the router agent LLM call.
 * @param transcript The user's journal entry.
 * @returns The prompt string.
 */
async function getRouterPrompt(transcript: string): Promise<string> {
  return `You are a triage agent for a journaling application. Your task is to analyze a journal entry and decide which specialized analysis agents should be run.

Based on the content of the journal entry below, return a JSON array of the names of the workers that should be invoked.

The available workers are:
- "emotion-worker": Identifies core emotions.
- "cbt-identifier-worker": Detects cognitive distortions based on CBT principles. Call this if the user expresses negative self-talk, black-and-white thinking, or catastrophic predictions.
- "theme-worker": Identifies recurring life themes.
- "cbt-reframer-worker": reframes the user patterns from cbt-identifier-worker

Journal Entry:
"""
${transcript}
"""

Your response must be a valid JSON array of strings, and nothing else. Do not include any introductory text, code block syntax, or pleasantries.

JSON Response:`;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Parse and validate the request payload
    const payload = await req.json();
    const { transcript } = RequestPayloadSchema.parse(payload);

    // 2. Initialize the AI model
    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 3. Generate the prompt and get the AI response
    const prompt = await getRouterPrompt(transcript);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // 4. Clean and parse the JSON response from the AI
    const cleanedJsonString = responseText.match(/\s*[\[\{].*[\]\}]\s*/s)?.[0] || '[]';
    const aiResponse = JSON.parse(cleanedJsonString);

    // 5. Validate the AI's output against our schema
    const validatedData = RouterAgentResponseSchema.parse(aiResponse);

    // 6. Return the successful response
    return new Response(JSON.stringify(validatedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    // 7. Handle any errors that occur
    console.error("Error in router-agent:", error);
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
