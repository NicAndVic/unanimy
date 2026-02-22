"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabaseClient } from "@/lib/supabase/client";

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendMagicLink() {
    setLoading(true);
    setMessage(null);
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/staff/login` },
    });

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Check your email for the login link.");
  }

  async function applyCurrentSession() {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session?.access_token) {
      setMessage("No active session found yet. Open the magic link first.");
      return;
    }

    const response = await fetch("/api/staff/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: session.access_token }),
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Failed to establish staff session.");
      return;
    }

    router.push("/staff");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-md space-y-4 px-6 py-16">
      <h1 className="text-xl font-semibold">Staff login</h1>
      <Input type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
      <Button type="button" onClick={() => void sendMagicLink()} disabled={loading || !email}>
        {loading ? "Sending..." : "Send magic link"}
      </Button>
      <Button type="button" variant="outline" onClick={() => void applyCurrentSession()}>
        I already opened my magic link
      </Button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </main>
  );
}
