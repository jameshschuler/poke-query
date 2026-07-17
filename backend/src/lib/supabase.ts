import { createClient } from "@supabase/supabase-js";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

const supabaseUrl = getRequiredEnv("SUPABASE_URL");
const supabasePublishableKey = getRequiredEnv("SUPABASE_PUBLISHABLE_KEY");

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

export function createSupabaseAuthClient() {
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

let supabaseAdminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseSecretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY is required for admin operations (for example DELETE /api/v1/users/me).",
    );
  }

  supabaseAdminClient = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdminClient;
}
