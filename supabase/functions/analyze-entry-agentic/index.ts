import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabaseClient.ts";
import { JOURNAL_ENTRIES_TABLE_NAME } from "../_shared/constants.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const RequestPayloadSchema = z.object({
  // Preferred modern payload
  journal_entry_id: z.string().optional(),
  transcript: z.string().optional(),
  user_id: z.string().optional(),
  // Legacy payload support
  journal_session_id: z.string().optional(),
}).refine((data: any) => {
  return data.journal_entry_id || data.journal_session_id;
}, {
  message: "journal_entry_id or journal_session_id is required",
});

/**
 * Calls the router-agent to dynamically decide which workers to run.
 * @param transcript The journal entry transcript.
 * @param supabase The Supabase client instance.
 * @returns A promise that resolves to an array of worker names.
 */
async function routeViaAgent(transcript: string, supabase: any): Promise<string[]> {
  console.log("Routing via agent for transcript...");
  try {
    const { data, error } = await supabase.functions.invoke("router-agent", {
      body: JSON.stringify({ transcript }),
    });

    if (error) {
      throw new Error(`Router-agent invocation failed: ${error.message}`);
    }

    if (!Array.isArray(data)) {
      throw new Error(`Router-agent returned invalid data: ${JSON.stringify(data)}`);
    }

    console.log("Router-agent decided to run:", data);
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in routeViaAgent:", errorMessage);
    // Fallback to a default, safe set of workers if the router fails
    return ["emotion-worker", "theme-worker"];
  }
}

async function invokeWorker(workerName: string, payload: object, supabase: any) {
  const { data, error } = await supabase.functions.invoke(workerName, {
    body: JSON.stringify(payload),
  });

  if (error) {
    console.error(`Error invoking ${workerName}:`, error);
    return { workerName, error: error.message };
  }

  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const parseResult = RequestPayloadSchema.parse(payload);
    const supabase = createSupabaseClient(req);

    // Support legacy requests that only send journal_session_id
    let journalEntryId = parseResult.journal_entry_id ?? parseResult.journal_session_id;
    let entryTranscript = parseResult.transcript;
    let entryUserId = parseResult.user_id;

    if (!entryTranscript || !entryUserId) {
      // Fetch missing data from DB
      const { data: sessionRow, error: fetchErr } = await supabase
        .from(JOURNAL_ENTRIES_TABLE_NAME)
        .select('original_transcript, user_id')
        .eq('id', journalEntryId)
        .single();
      if (fetchErr || !sessionRow) {
        throw new Error('Session not found or access denied');
      }
      if (!entryTranscript) entryTranscript = sessionRow.original_transcript;
      if (!entryUserId) entryUserId = sessionRow.user_id;
    }

    const workersToRun = await routeViaAgent(entryTranscript, supabase);
    const workerPayload = { transcript: entryTranscript };

    const workerPromises = workersToRun.map((workerName) =>
      invokeWorker(workerName, workerPayload, supabase)
    );

    const results = await Promise.all(workerPromises);

    // Merge results from all workers into a single analysis object
    const analysis = results.reduce((acc, result) => {
      if (result && !result.error && result.data) {
        // Spread the data from each worker into the accumulator
        Object.assign(acc, result.data);
      }
      return acc;
    }, {});

    // Persist the merged analysis to the database
    const { error: updateError } = await supabase
      .from(JOURNAL_ENTRIES_TABLE_NAME)
      .update({ ai_analysis: analysis as any })
      .eq("id", journalEntryId);

    if (updateError) {
      throw new Error(`Failed to save analysis: ${updateError.message}`);
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in orchestrator:", error);
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