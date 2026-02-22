"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type RecentAdminLink = {
  decisionId: string;
  adminUrl: string;
  createdAt: string;
};

const RECENT_ADMIN_LINKS_KEY = "unanimy:admin:recent";

export default function AdminRecentPage() {
  const [links, setLinks] = useState<RecentAdminLink[]>([]);

  useEffect(() => {
    const parsed = JSON.parse(localStorage.getItem(RECENT_ADMIN_LINKS_KEY) ?? "[]") as RecentAdminLink[];
    setLinks(parsed);
  }, []);

  function removeLink(decisionId: string) {
    const next = links.filter((entry) => entry.decisionId !== decisionId);
    setLinks(next);
    localStorage.setItem(RECENT_ADMIN_LINKS_KEY, JSON.stringify(next));
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Recent admin links</CardTitle>
          <CardDescription>Quick access to organizer links for recently created decisions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {links.length === 0 ? <p className="text-sm text-muted-foreground">No recent admin links yet.</p> : null}
          {links.map((entry) => (
            <div key={entry.decisionId} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Decision {entry.decisionId}</p>
                <p className="text-xs text-muted-foreground">Created {new Date(entry.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={entry.adminUrl}>Open Admin</Link>
                </Button>
                <Button size="sm" variant="destructive" onClick={() => removeLink(entry.decisionId)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
