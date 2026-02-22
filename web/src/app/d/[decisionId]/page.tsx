"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getParticipantToken } from "@/lib/participantToken";

const voteChoices = [
  { label: "Preferred", value: 2 },
  { label: "Agree", value: 1 },
  { label: "Neutral", value: 0 },
  { label: "Prefer not", value: -1 },
  { label: "No way", value: -2 },
] as const;

type DecisionResponse = {
  decision: { algorithm: string; allow_veto: boolean };
  options: Array<{ id: string; snapshot?: Record<string, unknown> }>;
};

export default function DecisionVotingPage() {
  const params = useParams<{ decisionId: string }>();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<DecisionResponse | null>(null);
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const participantToken = getParticipantToken(params.decisionId);
    setToken(participantToken);

    if (!participantToken) {
      setLoading(false);
      return;
    }

    async function loadDecision() {
      try {
        const response = await fetch(`/api/decisions/${params.decisionId}`, {
          headers: { "x-participant-token": participantToken as string },
        });
        const data = (await response.json()) as DecisionResponse & { error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load decision.");
        }
        setDecision(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    void loadDecision();
  }, [params.decisionId]);

  const options = useMemo(() => decision?.options ?? [], [decision?.options]);

  async function submitVote(decisionItemId: string, vote: number) {
    if (!token) return;
    setSavedMap((current) => ({ ...current, [decisionItemId]: false }));

    const response = await fetch(`/api/decisions/${params.decisionId}/votes`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-participant-token": token,
      },
      body: JSON.stringify({ decisionItemId, vote }),
    });

    if (response.ok) {
      setSavedMap((current) => ({ ...current, [decisionItemId]: true }));
    }
  }

  async function completeVoting() {
    if (!token) return;
    setCompleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/decisions/${params.decisionId}/complete`, {
        method: "POST",
        headers: { "x-participant-token": token },
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to complete voting.");
      }
      router.push(`/d/${params.decisionId}/result`);
    } catch (completeError) {
      setError(completeError instanceof Error ? completeError.message : "Something went wrong.");
    } finally {
      setCompleting(false);
    }
  }

  if (!token) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6 py-10">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Join this decision first</CardTitle>
            <CardDescription>You need a participant token to vote.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/join">Go to join page</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Vote on options</h1>
          {decision ? (
            <div className="mt-2 flex gap-2">
              <Badge variant="secondary">Algorithm: {decision.decision.algorithm}</Badge>
              <Badge variant="secondary">Allow veto: {decision.decision.allow_veto ? "Yes" : "No"}</Badge>
            </div>
          ) : null}
        </div>

        {loading ? <p className="text-muted-foreground">Loading options...</p> : null}
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-4">
          {options.map((option) => {
            const snapshot = option.snapshot ?? {};
            const displayName = ((snapshot.displayName as { text?: string } | undefined)?.text ?? snapshot.name ?? "Unnamed option") as string;
            const rating = snapshot.rating as number | undefined;
            const address = (snapshot.formattedAddress ?? snapshot.shortFormattedAddress) as string | undefined;

            return (
              <Card key={option.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{displayName}</CardTitle>
                  <CardDescription>
                    {typeof rating === "number" ? `Rating ${rating}` : "No rating available"}
                    {address ? ` - ${address}` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {voteChoices.map((choice) => (
                      <Button key={choice.value} type="button" variant="outline" onClick={() => void submitVote(option.id, choice.value)}>
                        {choice.label}
                      </Button>
                    ))}
                  </div>
                  <Separator className="my-3" />
                  <p className="text-sm text-muted-foreground">{savedMap[option.id] ? "Saved" : "Pick a vote"}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button onClick={() => void completeVoting()} disabled={completing || loading}>
          {completing ? "Completing..." : "Complete voting"}
        </Button>
      </div>
    </main>
  );
}
