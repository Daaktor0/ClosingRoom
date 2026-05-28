"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseKey) return null;
  if (!client) {
    client = createClient(supabaseUrl, supabaseKey);
  }
  return client;
}

export function getSupabaseConfigStatus() {
  return {
    configured: Boolean(supabaseUrl && supabaseKey),
    missing: [
      !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
      !supabaseKey ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" : null
    ].filter(Boolean) as string[]
  };
}
