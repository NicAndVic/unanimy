"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DecisionRow = {
  id: string;
  status: string;
  opened_at: string | null;
  expires_at: string | null;
  closed_at: string | null;
  decision_type: string;
  algorithm: string;
  allow_veto: boolean;
};

export default function StaffDecisionsClient() {
  const [rows, setRows] = useState<DecisionRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("open");
  const [sort, setSort] = useState("opened_at");

  async function load() {
    const params = new URLSearchParams({ q, status, sort, order: "desc" });
    const response = await fetch(`/api/staff/decisions?${params.toString()}`);
    const payload = (await response.json()) as { rows: DecisionRow[] };
    setRows(payload.rows ?? []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function closeDecision(id: string) {
    await fetch(`/api/staff/decisions/${id}/close`, { method: "POST" });
    await load();
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Decisions</h1>
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search by id prefix or join code" value={q} onChange={(event) => setQ(event.target.value)} className="max-w-sm" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded border px-2">
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="any">Any</option>
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded border px-2">
          <option value="opened_at">opened_at</option>
          <option value="expires_at">expires_at</option>
          <option value="closed_at">closed_at</option>
        </select>
        <Button onClick={() => void load()}>Apply</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr><th>ID</th><th>Status</th><th>Type</th><th>Opened</th><th>Expires</th><th /></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td>{row.id}</td><td>{row.status}</td><td>{row.decision_type}</td><td>{row.opened_at ?? "-"}</td><td>{row.expires_at ?? "-"}</td>
                <td>{row.status === "open" ? <Button size="sm" onClick={() => void closeDecision(row.id)}>Close</Button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
