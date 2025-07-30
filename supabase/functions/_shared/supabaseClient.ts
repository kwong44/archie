// supabase/functions/_shared/supabaseClient.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

export function createSupabaseClient(req: Request) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );
}
