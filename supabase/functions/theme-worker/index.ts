import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { ThemeWorkerResponse } from "../_shared/types.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { callGemini } from "../_shared/llm.ts";

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

--- EXAMPLE 1 ---
Journal Entry:
"""
I'm so stressed about the upcoming deadline at work. I've been pulling late nights, but I still feel like I'm behind. On top of that, I had a disagreement with my partner about our vacation plans. It just feels like everything is piling up at once.
"""

JSON Response:
{
  "themes": [
    {
      "theme": "Work-Life Balance",
      "justification": "The user is struggling with a demanding work deadline and experiencing conflict in their personal life, indicating a challenge in balancing professional and personal responsibilities."
    },
    {
      "theme": "Stress and Pressure",
      "justification": "The user explicitly mentions feeling 'stressed' and 'behind' on a work project, highlighting feelings of pressure."
    }
  ]
}

--- EXAMPLE 2 ---
Journal Entry:
"""
I've been thinking a lot about my career path lately. I'm not sure if this is what I want to be doing for the next 20 years. It pays the bills, but I don't feel fulfilled. I'm considering going back to school or starting my own thing.
"""

JSON Response:
{
  "themes": [
    {
      "theme": "Career Dissatisfaction",
      "justification": "The user questions their current career path and expresses a lack of fulfillment, indicating dissatisfaction with their job."
    },
    {
      "theme": "Future Planning",
      "justification": "The user is contemplating major life changes like returning to school or entrepreneurship, showing a focus on long-term goals and personal growth."
    }
  ]
}

--- EXAMPLE 3 ---
Journal Entry:
"""
My best friend and I had a huge fight. I said some things I regret, and now they're not talking to me. I feel awful and lonely. I miss them a lot.
"""

JSON Response:
{
  "themes": [
    {
      "theme": "Interpersonal Conflict",
      "justification": "The user describes a 'huge fight' with their best friend, which is a clear example of conflict in a close relationship."
    },
    {
      "theme": "Regret and Guilt",
      "justification": "The user mentions saying 'things I regret' and feeling 'awful', pointing to feelings of guilt over their actions."
    },
    {
      "theme": "Loneliness",
      "justification": "The user explicitly states they feel 'lonely' and misses their friend, highlighting the emotional impact of the conflict."
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

    const prompt = await getThemePrompt(transcript);
    const validatedData = await callGemini(prompt, ThemeResponseSchema);

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

