import { requireStaffUser } from "@/lib/staff";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    await requireStaffUser(request);
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "open";
    const q = url.searchParams.get("q")?.trim();
    const sort = ["opened_at", "expires_at", "closed_at"].includes(url.searchParams.get("sort") ?? "")
      ? (url.searchParams.get("sort") as "opened_at" | "expires_at" | "closed_at")
      : "opened_at";
    const order = url.searchParams.get("order") === "asc" ? "asc" : "desc";
    const limit = Math.min(Number.parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);

    let query = supabaseAdmin
      .from("decisions")
      .select("id, status, opened_at, expires_at, closed_at, decision_type, algorithm, allow_veto")
      .order(sort, { ascending: order === "asc" })
      .limit(limit);

    if (status === "open" || status === "closed") query = query.eq("status", status);

    if (q) {
      if (/^[0-9a-f-]{8,}$/i.test(q)) {
        query = query.ilike("id", `${q}%`);
      } else {
        const { data: codes } = await supabaseAdmin.from("decision_join_codes").select("decision_id").eq("code", q.toUpperCase()).limit(1);
        const ids = (codes ?? []).map((row) => row.decision_id);
        if (ids.length === 0) return Response.json({ rows: [] });
        query = query.in("id", ids);
      }
    }

    const { data, error } = await query;
    if (error) return Response.json({ error: "Failed to load decisions." }, { status: 500 });
    return Response.json({ rows: data ?? [] });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
