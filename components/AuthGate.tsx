"use client";

import { LockKeyhole, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, Field, SectionHeader, inputClass } from "@/components/ui";
import { getSupabaseClient, getSupabaseConfigStatus } from "@/lib/supabaseClient";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firmName, setFirmName] = useState("");
  const [booting, setBooting] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [authError, setAuthError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const config = getSupabaseConfigStatus();
  const supabase = getSupabaseClient();

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setBooting(false);
      return;
    }

    let active = true;

    async function boot() {
      const { data } = await client!.auth.getSession();
      if (!active) return;
      setSignedIn(Boolean(data.session));
      setBooting(false);
    }

    boot();
    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      setSignedIn(Boolean(session));
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setAuthError("");
    setNotice("");
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { firm_name: firmName.trim() } }
        });
        if (error) {
          setAuthError(error.message);
          return;
        }
        setPassword("");
        if (!data.session) {
          setNotice("Account created. Check your email to confirm, then sign in.");
          setMode("signin");
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setAuthError(error.message);
        return;
      }
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  if (!config.configured) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <Card className="w-full max-w-xl">
          <SectionHeader eyebrow="Supabase" title="Environment variables required" />
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            Add these variables locally and in Vercel, then restart/redeploy the app:
          </p>
          <pre className="mt-4 overflow-x-auto rounded-md border border-[var(--line)] bg-[var(--panel-strong)] p-3 text-xs">
{`NEXT_PUBLIC_SUPABASE_URL="https://ntalqqaazamrciwzitky.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-publishable-or-anon-key"`}
          </pre>
          <p className="mt-3 text-xs text-[var(--muted)]">Missing: {config.missing.join(", ")}</p>
        </Card>
      </main>
    );
  }

  if (booting) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <Card className="w-full max-w-md">
          <SectionHeader eyebrow="Supabase" title="Loading tracker" />
          <p className="text-sm text-[var(--muted)]">Checking your session...</p>
        </Card>
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <Card className="w-full max-w-md">
          <SectionHeader
            eyebrow="Secure tracker"
            title={mode === "signup" ? "Create your firm account" : "Sign in"}
            action={<LockKeyhole size={18} className="text-[var(--accent)]" />}
          />
          <form className="grid gap-3" onSubmit={submit}>
            {mode === "signup" ? (
              <Field label="Firm name">
                <input className={inputClass} value={firmName} onChange={(event) => setFirmName(event.target.value)} placeholder="e.g. Rao & Menon LLP" required />
              </Field>
            ) : null}
            <Field label="Email">
              <input className={inputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </Field>
            <Field label="Password">
              <input className={inputClass} type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
            </Field>
            {authError ? <p className="rounded-md border border-red-700/30 bg-red-700/10 p-2 text-sm text-[var(--danger)]">{authError}</p> : null}
            {notice ? <p className="rounded-md border border-[var(--line)] bg-[var(--panel-strong)] p-2 text-sm text-[var(--muted)]">{notice}</p> : null}
            <Button type="submit" disabled={submitting}>
              <LogIn size={16} /> {mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>
          <button
            type="button"
            className="mt-4 text-sm text-[var(--muted)] underline-offset-4 hover:underline"
            onClick={() => {
              setMode((value) => (value === "signin" ? "signup" : "signin"));
              setAuthError("");
              setNotice("");
            }}
          >
            {mode === "signup" ? "Already have an account? Sign in" : "New firm? Create an account"}
          </button>
        </Card>
      </main>
    );
  }

  return <>{children}</>;
}
