"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

function decodeJwtPayload(key: string): { role?: string } | null {
  const payload = key.split(".")[1];
  if (!payload || typeof atob !== "function") return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized)) as { role?: string };
  } catch {
    return null;
  }
}

function getKeyProblem(key: string | undefined): string | null {
  const value = key?.trim();
  if (!value) return null;
  if (value.startsWith("your-")) return "placeholder";
  if (value.startsWith("sb_secret_")) return "secret";

  const payload = decodeJwtPayload(value);
  if (payload?.role === "service_role") return "service_role";

  return null;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseKey || getKeyProblem(supabaseKey)) return null;
  if (!client) {
    client = createClient(supabaseUrl, supabaseKey);
  }
  return client;
}

export function getSupabaseConfigStatus() {
  const keyProblem = getKeyProblem(supabaseKey);
  return {
    configured: Boolean(supabaseUrl && supabaseKey && !keyProblem),
    missing: [
      !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
      !supabaseKey ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" : null
    ].filter(Boolean) as string[],
    invalid: [
      keyProblem === "placeholder" ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is still a placeholder" : null,
      keyProblem === "secret" ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is a secret key" : null,
      keyProblem === "service_role" ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is a service-role key" : null
    ].filter(Boolean) as string[]
  };
}
