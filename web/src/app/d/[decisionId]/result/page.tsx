"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getParticipantToken } from "@/lib/participantToken";

type ResultResponse = {
  winner: Record<string, unknown> | null;
  counts: { participants: number; completed: number };
  algorithm: string | null;
};

export default function DecisionResultPage() {
  const params = useParams<{ decisionId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultResponse | null>(null);
  const [hasToken, setHasToken] = useState(true);

  useEffect(() => {
    const token = getParticipantToken(params.decisionId);
    if (!token) {
      setHasToken(false);
      setLoading(false);
      return;
    }

    async function loadResult() {
      try {
        const response = await fetch(`/api/decisions/${params.decisionId}/result`, {
          headers: { "x-participant-token": token as string },
        });
        const data = (await response.json()) as ResultResponse & { error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load result.");
        }
        setResult(data);
      } catch (resultError) {
        setError(resultError instanceof Error ? resultError.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    void loadResult();
  }, [params.decisionId]);

  if (!hasToken) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6 py-10">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Join this decision first</CardTitle>
            <CardDescription>You need to join to see the result.</CardDescription>
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

  const winner = result?.winner ?? null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Decision result</h1>
      {loading ? <p className="mt-4 text-muted-foreground">Loading result...</p> : null}
      {error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Unable to load result</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {result && winner ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{String((winner.displayName as { text?: string } | undefined)?.text ?? winner.name ?? "Winner")}</CardTitle>
            <CardDescription>
              {(winner.formattedAddress as string | undefined) ?? (winner.shortFormattedAddress as string | undefined) ?? "Address unavailable"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {typeof winner.rating === "number" ? <p>Rating: {winner.rating}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Participants: {result.counts.participants}</Badge>
              <Badge variant="secondary">Completed: {result.counts.completed}</Badge>
              <Badge variant="secondary">Algorithm: {result.algorithm ?? "n/a"}</Badge>
            </div>
            {typeof winner.googleMapsUri === "string" ? (
              <Button asChild>
                <a href={winner.googleMapsUri} target="_blank" rel="noreferrer">
                  Open in Maps
                </a>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
