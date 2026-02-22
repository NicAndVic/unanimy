"use client";

import { useEffect, useState } from "react";

type UsagePayload = {
  last_1h: Record<string, number>;
  today: Record<string, number>;
  last_7d_daily: Record<string, number>;
};

export default function StaffUsageClient() {
  const [data, setData] = useState<UsagePayload | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/staff/usage");
      const payload = (await response.json()) as UsagePayload;
      setData(payload);
    })();
  }, []);

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Google API usage</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border p-3">
          <h2 className="font-medium">Last 1 hour</h2>
          {Object.entries(data?.last_1h ?? {}).map(([endpoint, count]) => <p key={endpoint}>{endpoint}: {count}</p>)}
        </div>
        <div className="rounded border p-3">
          <h2 className="font-medium">Today</h2>
          {Object.entries(data?.today ?? {}).map(([endpoint, count]) => <p key={endpoint}>{endpoint}: {count}</p>)}
        </div>
      </div>
    </section>
  );
}
