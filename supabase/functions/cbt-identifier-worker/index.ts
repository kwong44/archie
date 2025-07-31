import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { CbtIdentifierWorkerResponse } from "../_shared/types.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { callGemini } from "../_shared/llm.ts";

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

--- EXAMPLE 1 ---
Journal Entry:
"""
I completely bombed my presentation. I'm such a failure at public speaking. I should just give up because I'll never be good at this.
"""

JSON Response:
{
  "distortions": [
    {
      "distortion": "Labeling",
      "justification": "The user labels themselves as a 'failure' based on a single event, which is an extreme and unhelpful generalization.",
      "quote": "I'm such a failure at public speaking."
    },
    {
      "distortion": "Fortune Telling",
      "justification": "The user predicts the future negatively without evidence by saying they'll 'never be good at this'.",
      "quote": "I'll never be good at this."
    }
  ]
}

--- EXAMPLE 2 ---
Journal Entry:"""
My partner didn't text me back right away. They must be mad at me. I probably did something wrong. This always happens to me in relationships.
"""

JSON Response:
{
  "distortions": [
    {
      "distortion": "Mind Reading",
      "justification": "The user assumes they know what their partner is thinking without evidence.",
      "quote": "They must be mad at me."
    },
    {
      "distortion": "Personalization",
      "justification": "The user assumes they are the cause of their partner's behavior without evidence.",
      "quote": "I probably did something wrong."
    },
    {
      "distortion": "Overgeneralization",
      "justification": "The user takes one instance and applies it to all relationships.",
      "quote": "This always happens to me in relationships."
    }
  ]
}

--- EXAMPLE 3 ---
Journal Entry:
"""
I made a small mistake in the report. My boss is going to fire me for sure. I'll end up homeless and alone. I can't handle this stress.
"""

JSON Response:
{
  "distortions": [
    {
      "distortion": "Catastrophizing",
      "justification": "The user escalates a small mistake to an extreme, unlikely outcome.",
      "quote": "I made a small mistake in the report. My boss is going to fire me for sure. I'll end up homeless and alone."
    },
    {
      "distortion": "Should Statements",
      "justification": "The user puts unreasonable expectations on themselves by assuming they should be perfect.",
      "quote": "I made a small mistake in the report."
    },
    {
      "distortion": "Emotional Reasoning",
      "justification": "The user assumes that because they feel stressed, the situation must be catastrophic.",
      "quote": "I can't handle this stress."
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

    const prompt = await getCbtPrompt(transcript);
    const validatedData = await callGemini(prompt, CbtResponseSchema);

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

