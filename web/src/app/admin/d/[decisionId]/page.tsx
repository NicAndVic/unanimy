"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AdminDecisionResponse = {
  decision: {
    id: string;
    status: string;
    opened_at: string | null;
    expires_at: string | null;
    closed_at: string | null;
  };
  joinCode: string | null;
  counts: {
    participants: number;
    completed: number;
  };
  error?: string;
};

export default function DecisionAdminPage() {
  const params = useParams<{ decisionId: string }>();
  const searchParams = useSearchParams();
  const decisionId = params.decisionId;
  const queryKey = searchParams.get("k");

  const [organizerKey, setOrganizerKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminDecisionResponse | null>(null);

  useEffect(() => {
    const storageKey = `unanimy:orgkey:${decisionId}`;
    const saved = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
    const selectedKey = queryKey ?? saved;
    if (selectedKey) {
      localStorage.setItem(storageKey, selectedKey);
      setOrganizerKey(selectedKey);
      return;
    }

    setError("Missing organizer key. Use the organizer admin URL from decision creation.");
    setLoading(false);
  }, [decisionId, queryKey]);

  const loadAdminData = useCallback(async (key: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/decisions/${decisionId}?k=${encodeURIComponent(key)}`);
      const payload = (await response.json()) as AdminDecisionResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load admin decision data.");
      }
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [decisionId]);

  useEffect(() => {
    if (!organizerKey) return;
    void loadAdminData(organizerKey);
  }, [loadAdminData, organizerKey]);

  const isClosed = useMemo(() => data?.decision.status === "closed", [data?.decision.status]);

  async function closeDecisionNow() {
    if (!organizerKey) return;
    setClosing(true);
    setError(null);

    try {
      const response = await fetch(`/api/decisions/${decisionId}/close`, {
        method: "POST",
        headers: { "x-organizer-key": organizerKey },
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to close decision.");
      }
      await loadAdminData(organizerKey);
    } catch (closeError) {
      setError(closeError instanceof Error ? closeError.message : "Something went wrong.");
    } finally {
      setClosing(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Decision admin</CardTitle>
          <CardDescription>Organizer controls and status details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load admin page</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}

          {data ? (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge>Status: {isClosed ? "Closed" : "Open"}</Badge>
                <Badge variant="secondary">Join code: {data.joinCode ?? "Expired"}</Badge>
              </div>
              <p>Opened at: {data.decision.opened_at ?? "-"}</p>
              <p>Expires at: {data.decision.expires_at ?? "-"}</p>
              <p>Closed at: {data.decision.closed_at ?? "-"}</p>
              <p>
                Participants: {data.counts.participants} (completed {data.counts.completed})
              </p>
              <Button type="button" onClick={() => void closeDecisionNow()} disabled={closing || isClosed}>
                {isClosed ? "Already closed" : closing ? "Closing..." : "Close decision now"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
