import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { CbtReframerWorkerResponse } from "../_shared/types.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { callGemini } from "../_shared/llm.ts";

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

--- EXAMPLE 1 ---
Journal Entry:
"""
I completely failed my presentation. I'm terrible at public speaking and should just avoid it completely.
"""

JSON Response:
{
  "reframes": [
    {
      "original_quote": "I completely failed my presentation. I'm terrible at public speaking and should just avoid it completely.",
      "reframe": "My presentation didn't go as well as I hoped, but that doesn't define my abilities. Every great speaker has had challenging moments, and this is an opportunity for me to learn and improve.",
      "justification": "This reframe avoids all-or-nothing thinking, acknowledges the difficulty without self-judgment, and turns it into a growth opportunity."
    }
  ]
}

--- EXAMPLE 2 ---
Journal Entry:
"""
My partner is always upset with me. I can never do anything right in this relationship.
"""

JSON Response:
{
  "reframes": [
    {
      "original_quote": "My partner is always upset with me. I can never do anything right in this relationship.",
      "reframe": "We've had some challenges in our relationship recently, but that doesn't mean everything is negative. We have many good moments too, and we can work through our issues together.",
      "justification": "This reframe removes the absolutes ('always', 'never'), acknowledges the current difficulties while providing balance, and emphasizes the potential for positive change."
    }
  ]
}

--- EXAMPLE 3 ---
Journal Entry:
"""
I made a mistake at work today. I'm going to get fired for sure. I'll never find another job with this economy.
"""

JSON Response:
{
  "reframes": [
    {
      "original_quote": "I made a mistake at work today. I'm going to get fired for sure. I'll never find another job with this economy.",
      "reframe": "I made a mistake at work today, but everyone makes mistakes. I can learn from this experience and take steps to prevent it from happening again. Even if the worst happened, I have valuable skills that are in demand.",
      "justification": "This reframe acknowledges the mistake without catastrophizing, focuses on learning and growth, and counters the fear of the future with a realistic assessment of the user's value."
    }
  ]
}

--- YOUR TASK ---
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

    const prompt = await getCbtReframePrompt(transcript);
    const validatedData = await callGemini(prompt, CbtReframeResponseSchema);

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

