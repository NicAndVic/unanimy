"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setParticipantToken } from "@/lib/participantToken";

type JoinResponse = {
  decisionId: string;
  participantToken: string;
};

export default function JoinPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initial = searchParams.get("code");
    if (initial) {
      setCode(initial.toUpperCase());
    }
  }, [searchParams]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.toUpperCase() }),
      });

      const data = (await response.json()) as JoinResponse & { error?: string };
      if (!response.ok) {
        if (response.status === 404 || response.status === 410) {
          throw new Error("That code is invalid or expired. Ask the organizer for a fresh code.");
        }
        throw new Error(data.error ?? "Could not join decision.");
      }

      setParticipantToken(data.decisionId, data.participantToken);
      router.push(`/d/${data.decisionId}`);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-6 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Join a decision</CardTitle>
          <CardDescription>Enter the 5-character code from the organizer.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Decision code</Label>
              <Input
                id="code"
                maxLength={5}
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                placeholder="ABCDE"
                required
              />
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to join</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" disabled={loading || code.length !== 5}>
              {loading ? "Joining..." : "Join decision"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
