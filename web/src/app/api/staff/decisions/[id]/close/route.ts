import { computeAndCloseDecision } from "@/lib/decision-service";
import { parseUuidParam } from "@/lib/api";
import { requireStaffUser } from "@/lib/staff";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireStaffUser(request);
    const params = await context.params;
    const decisionId = parseUuidParam(params.id, "id");

    const { data: decision, error } = await supabaseAdmin.from("decisions").select("status").eq("id", decisionId).maybeSingle();
    if (error || !decision) return Response.json({ error: "Decision not found." }, { status: 404 });
    if (decision.status === "closed") return Response.json({ ok: true, alreadyClosed: true });

    await computeAndCloseDecision(decisionId);
    return Response.json({ ok: true, alreadyClosed: false });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
