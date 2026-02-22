"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type ConfigRow = {
  key: string;
  value_json: unknown;
  updated_at: string;
  updated_by: string | null;
};

export default function StaffConfigClient() {
  const [rows, setRows] = useState<ConfigRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  async function load() {
    const response = await fetch("/api/staff/config");
    const payload = (await response.json()) as { rows: ConfigRow[] };
    setRows(payload.rows ?? []);
    const nextDrafts: Record<string, string> = {};
    for (const row of payload.rows ?? []) nextDrafts[row.key] = JSON.stringify(row.value_json, null, 2);
    setDrafts(nextDrafts);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(key: string) {
    const valueJson = JSON.parse(drafts[key] ?? "null");
    await fetch("/api/staff/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value_json: valueJson }),
    });
    await load();
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Config</h1>
      {rows.map((row) => (
        <div key={row.key} className="space-y-2 rounded border p-3">
          <p className="font-medium">{row.key}</p>
          <textarea
            className="min-h-36 w-full rounded border p-2 font-mono text-xs"
            value={drafts[row.key] ?? ""}
            onChange={(event) => setDrafts((prev) => ({ ...prev, [row.key]: event.target.value }))}
          />
          <p className="text-xs text-muted-foreground">Updated at {row.updated_at} by {row.updated_by ?? "-"}</p>
          <Button size="sm" onClick={() => void save(row.key)}>Save</Button>
        </div>
      ))}
    </section>
  );
}
