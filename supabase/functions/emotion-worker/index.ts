import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { USER_TABLE_NAME } from "../_shared/constants.ts";
import { createSupabaseClient } from "../_shared/supabaseClient.ts";
import { EmotionWorkerResponse } from "../_shared/types.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { callGemini } from "../_shared/llm.ts";

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

--- EXAMPLE 1 ---
Journal Entry:
"""
I can't believe I messed up that presentation. I feel like such an idiot. Everyone was probably laughing at me. I just want to hide.
"""

JSON Response:
{
  "emotions": [
    {
      "emotion": "Shame",
      "justification": "The user feels like an 'idiot' and expresses a desire to hide, which are classic signs of shame."
    },
    {
      "emotion": "Anxiety",
      "justification": "The user is worried about what others think ('Everyone was probably laughing at me'), indicating social anxiety."
    }
  ]
}

--- EXAMPLE 2 ---
Journal Entry:
"""
I'm so frustrated with this project. Nothing is working out, and I feel like I'm constantly hitting a wall. It's making me so angry and I just want to give up.
"""

JSON Response:
{
  "emotions": [
    {
      "emotion": "Frustration",
      "justification": "The user explicitly states they are 'frustrated' and feels like they are 'hitting a wall'."
    },
    {
      "emotion": "Anger",
      "justification": "The user mentions feeling 'angry' about the project's lack of progress."
    }
  ]
}

--- EXAMPLE 3 ---
Journal Entry:
"""
Today was amazing! I finally got the promotion I've been working so hard for. I'm so proud of myself and just incredibly happy and excited for what's next.
"""

JSON Response:
{
  "emotions": [
    {
      "emotion": "Pride",
      "justification": "The user explicitly states they are 'so proud of myself' after achieving a goal."
    },
    {
      "emotion": "Joy",
      "justification": "The user describes the day as 'amazing' and feels 'incredibly happy'."
    },
    {
      "emotion": "Excitement",
      "justification": "The user is 'excited for what's next', indicating anticipation for the future."
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

    const prompt = await getEmotionPrompt(transcript);
    const validatedData = await callGemini(prompt, EmotionResponseSchema);

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

