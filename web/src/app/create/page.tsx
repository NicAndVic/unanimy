"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SimpleToast } from "@/components/ui/simple-toast";
import { setParticipantToken } from "@/lib/participantToken";

type CreateResponse = {
  decisionId: string;
  joinCode: string;
  participantToken: string;
  organizerKey: string;
  adminUrl: string;
  expiresAt: string;
};

type RecentAdminLink = {
  decisionId: string;
  adminUrl: string;
  createdAt: string;
};

const RECENT_ADMIN_LINKS_KEY = "unanimy:admin:recent";

function addRecentAdminLink(link: RecentAdminLink) {
  const parsed = JSON.parse(localStorage.getItem(RECENT_ADMIN_LINKS_KEY) ?? "[]") as RecentAdminLink[];
  const deduped = parsed.filter((entry) => entry.decisionId !== link.decisionId);
  const next = [link, ...deduped].slice(0, 20);
  localStorage.setItem(RECENT_ADMIN_LINKS_KEY, JSON.stringify(next));
}

export default function CreatePage() {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radiusMeters, setRadiusMeters] = useState("2000");
  const [maxOptions, setMaxOptions] = useState("10");
  const [algorithm, setAlgorithm] = useState<"collective" | "most_satisfied">("collective");
  const [allowVeto, setAllowVeto] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("Join code copied to clipboard.");
  const [created, setCreated] = useState<CreateResponse | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator) || !("permissions" in navigator)) {
      return;
    }

    void navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (status.state !== "granted") {
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLatitude(position.coords.latitude.toFixed(6));
            setLongitude(position.coords.longitude.toFixed(6));
          },
          () => {},
          { timeout: 5000 },
        );
      })
      .catch(() => {});
  }, []);

  const canSubmit = useMemo(() => !loading && latitude && longitude, [latitude, loading, longitude]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/decisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          location: {
            latitude: Number(latitude),
            longitude: Number(longitude),
          },
          radiusMeters: Number(radiusMeters),
          maxOptions: Number(maxOptions),
          algorithm,
          allowVeto,
        }),
      });

      const data = (await response.json()) as CreateResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create decision.");
      }

      setParticipantToken(data.decisionId, data.participantToken);
      localStorage.setItem(`unanimy:adminUrl:${data.decisionId}`, data.adminUrl);
      localStorage.setItem(`unanimy:orgkey:${data.decisionId}`, data.organizerKey);
      addRecentAdminLink({
        decisionId: data.decisionId,
        adminUrl: data.adminUrl,
        createdAt: new Date().toISOString(),
      });
      setCreated(data);
      setToastMessage("Decision ready. Save your organizer admin URL.");
      setToastOpen(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function copyJoinCode() {
    if (!created) return;
    await navigator.clipboard.writeText(created.joinCode);
    setToastMessage("Join code copied to clipboard.");
    setToastOpen(true);
  }

  async function copyOrganizerUrl() {
    if (!created) return;
    await navigator.clipboard.writeText(created.adminUrl);
    setToastMessage("Organizer admin URL copied to clipboard.");
    setToastOpen(true);
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setToastMessage("Location updated from your device.");
        setToastOpen(true);
      },
      (geoError) => {
        setError(geoError.message || "Unable to get your location.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Create a decision</CardTitle>
          <CardDescription>Pick a location and settings to start group voting.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not create decision</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input id="latitude" type="number" step="any" value={latitude} onChange={(event) => setLatitude(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input id="longitude" type="number" step="any" value={longitude} onChange={(event) => setLongitude(event.target.value)} required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Button type="button" variant="outline" onClick={useMyLocation}>
                  Use my location
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="radiusMeters">Radius (meters)</Label>
                <Input id="radiusMeters" type="number" value={radiusMeters} onChange={(event) => setRadiusMeters(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxOptions">Max options</Label>
                <Input id="maxOptions" type="number" value={maxOptions} onChange={(event) => setMaxOptions(event.target.value)} required />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="algorithm">Algorithm</Label>
                <select
                  id="algorithm"
                  value={algorithm}
                  onChange={(event) => setAlgorithm(event.target.value as "collective" | "most_satisfied")}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="collective">Collective satisfaction</option>
                  <option value="most_satisfied">Most people satisfied</option>
                </select>
              </div>
              <label className="flex items-end gap-2 rounded-md border p-3 text-sm">
                <input checked={allowVeto} onChange={(event) => setAllowVeto(event.target.checked)} type="checkbox" />
                Allow veto votes
              </label>
            </div>

            <Button type="submit" disabled={!canSubmit}>
              {loading ? "Creating..." : "Create decision"}
            </Button>
          </form>

          {created ? (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Join code</span>
                  <Badge className="text-base tracking-widest">{created.joinCode}</Badge>
                  <Button type="button" variant="outline" onClick={copyJoinCode}>
                    Copy
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href={`/d/${created.decisionId}`}>Open voting page</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={created.adminUrl}>Open admin page</Link>
                  </Button>
                  <Button type="button" variant="outline" onClick={copyOrganizerUrl}>
                    Copy admin link
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href={`/join?code=${created.joinCode}`}>Join on another device</Link>
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <SimpleToast
        title={created ? "Decision ready" : "Update"}
        description={toastMessage}
        open={toastOpen}
        onOpenChange={setToastOpen}
      />
    </main>
  );
}
