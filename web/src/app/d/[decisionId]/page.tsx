"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SimpleToast } from "@/components/ui/simple-toast";
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
  joinCode: string | null;
  myVotes: Record<string, number>;
};

export default function DecisionVotingPage() {
  const params = useParams<{ decisionId: string }>();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<DecisionResponse | null>(null);
  const [voteMap, setVoteMap] = useState<Record<string, number>>({});
  const [completing, setCompleting] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [copyingCode, setCopyingCode] = useState(false);
  const [toastState, setToastState] = useState<{ open: boolean; title: string; description?: string; variant?: "default" | "destructive" }>({
    open: false,
    title: "",
  });

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
        setVoteMap(data.myVotes ?? {});
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    void loadDecision();
  }, [params.decisionId]);

  const options = useMemo(() => decision?.options ?? [], [decision?.options]);
  const activeOption = options[activeIndex];
  const votedCount = options.filter((option) => option.id in voteMap).length;
  const isLast = activeIndex === options.length - 1;
  const allVoted = options.length > 0 && options.every((option) => voteMap[option.id] !== undefined);

  useEffect(() => {
    if (activeIndex > Math.max(0, options.length - 1)) {
      setActiveIndex(Math.max(0, options.length - 1));
    }
  }, [activeIndex, options.length]);

  async function submitVote(decisionItemId: string, vote: number) {
    if (!token) return;

    const previousVote = voteMap[decisionItemId];
    setVoteMap((current) => ({ ...current, [decisionItemId]: vote }));

    try {
      const response = await fetch(`/api/decisions/${params.decisionId}/votes`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-participant-token": token,
        },
        body: JSON.stringify({ decisionItemId, vote }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save vote.");
      }
    } catch (voteError) {
      setVoteMap((current) => {
        const next = { ...current };
        if (typeof previousVote === "number") {
          next[decisionItemId] = previousVote;
        } else {
          delete next[decisionItemId];
        }
        return next;
      });
      setToastState({
        open: true,
        title: "Vote not saved",
        description: voteError instanceof Error ? voteError.message : "Unable to save your vote.",
        variant: "destructive",
      });
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

  async function copyJoinCode() {
    if (!decision?.joinCode) return;

    try {
      setCopyingCode(true);
      await navigator.clipboard.writeText(decision.joinCode);
      setToastState({
        open: true,
        title: "Join code copied",
        description: "Share it so others can join this decision.",
        variant: "default",
      });
    } catch {
      setToastState({
        open: true,
        title: "Failed to copy",
        description: "Copy is not available in this browser.",
        variant: "destructive",
      });
    } finally {
      setCopyingCode(false);
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
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Algorithm: {decision.decision.algorithm}</Badge>
              <Badge variant="secondary">Allow veto: {decision.decision.allow_veto ? "Yes" : "No"}</Badge>
              <Badge>{decision.joinCode ? `Join code: ${decision.joinCode}` : "Join code expired"}</Badge>
              {decision.joinCode ? (
                <Button type="button" size="sm" variant="outline" onClick={() => void copyJoinCode()} disabled={copyingCode}>
                  {copyingCode ? "Copying..." : "Copy"}
                </Button>
              ) : null}
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

        {activeOption ? (
          <Card>
            <CardHeader>
              <CardDescription>
                Option {activeIndex + 1} of {options.length}
              </CardDescription>
              <CardTitle className="text-lg">
                {(((activeOption.snapshot ?? {}).displayName as { text?: string } | undefined)?.text ??
                  (activeOption.snapshot ?? {}).name ??
                  "Unnamed option") as string}
              </CardTitle>
              <CardDescription>
                {typeof (activeOption.snapshot ?? {}).rating === "number"
                  ? `Rating ${(activeOption.snapshot ?? {}).rating as number}`
                  : "No rating available"}
                {((activeOption.snapshot ?? {}).formattedAddress ?? (activeOption.snapshot ?? {}).shortFormattedAddress) as string | undefined
                  ? ` - ${String((activeOption.snapshot ?? {}).formattedAddress ?? (activeOption.snapshot ?? {}).shortFormattedAddress)}`
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {voteChoices.map((choice) => (
                  <Button
                    key={choice.value}
                    type="button"
                    variant={voteMap[activeOption.id] === choice.value ? "default" : "outline"}
                    onClick={() => void submitVote(activeOption.id, choice.value)}
                  >
                    {choice.label}
                  </Button>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="flex items-center justify-between gap-3">
                <Button type="button" variant="outline" onClick={() => setActiveIndex((current) => Math.max(0, current - 1))} disabled={activeIndex === 0}>
                  Back
                </Button>
                <p className="text-sm text-muted-foreground">{votedCount} of {options.length} options voted</p>
                {!isLast ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveIndex((current) => Math.min(options.length - 1, current + 1))}
                    disabled={activeIndex >= options.length - 1}
                  >
                    Next
                  </Button>
                ) : (
                  <div className="w-16" />
                )}
              </div>

              {isLast ? (
                <div className="mt-4 space-y-1">
                  <Button onClick={() => void completeVoting()} disabled={completing || loading || !allVoted}>
                    {completing ? "Completing..." : "Complete voting"}
                  </Button>
                  {!allVoted ? <p className="text-sm text-muted-foreground">Vote on all options to complete.</p> : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : loading ? null : (
          <p className="text-muted-foreground">No options available yet.</p>
        )}

        <SimpleToast
          title={toastState.title}
          description={toastState.description}
          variant={toastState.variant}
          open={toastState.open}
          onOpenChange={(open) => setToastState((current) => ({ ...current, open }))}
        />
      </div>
    </main>
  );
}
