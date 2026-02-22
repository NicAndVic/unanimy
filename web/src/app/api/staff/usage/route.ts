import { requireStaffUser } from "@/lib/staff";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    await requireStaffUser(request);
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: hourData }, { data: todayData }, { data: weekData }] = await Promise.all([
      supabaseAdmin.from("api_usage_events").select("endpoint").gte("created_at", hourAgo),
      supabaseAdmin.from("api_usage_events").select("endpoint").gte("created_at", startOfDay.toISOString()),
      supabaseAdmin.from("api_usage_events").select("endpoint,created_at").gte("created_at", sevenDaysAgo),
    ]);

    const toCounts = (rows: Array<{ endpoint: string }> | null | undefined) => {
      const counts: Record<string, number> = {};
      for (const row of rows ?? []) {
        counts[row.endpoint] = (counts[row.endpoint] ?? 0) + 1;
      }
      return counts;
    };

    const dailyTotals: Record<string, number> = {};
    for (const row of weekData ?? []) {
      const day = row.created_at.slice(0, 10);
      dailyTotals[day] = (dailyTotals[day] ?? 0) + 1;
    }

    return Response.json({
      last_1h: toCounts(hourData),
      today: toCounts(todayData),
      last_7d_daily: dailyTotals,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
