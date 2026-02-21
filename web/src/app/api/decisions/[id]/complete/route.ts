import { jsonError, parseUuidParam, requireParticipant } from "@/lib/api";
import { computeAndCloseDecision } from "@/lib/decision-service";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const decisionId = parseUuidParam(id, "decision id");
    const { participant } = await requireParticipant(decisionId, request);

    if (!participant.completed_at) {
      const { error } = await supabaseAdmin
        .from("participants")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", participant.id);

      if (error) {
        return jsonError(500, "Failed to mark participant complete.");
      }
    }

    const { count: totalCount } = await supabaseAdmin
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("decision_id", decisionId);

    const { count: completedCount } = await supabaseAdmin
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("decision_id", decisionId)
      .not("completed_at", "is", null);

    const allCompleted = (totalCount ?? 0) > 0 && totalCount === completedCount;

    if (allCompleted) {
      await computeAndCloseDecision(decisionId);
    }

    return Response.json({ ok: true, autoClosed: allCompleted });
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return jsonError((error as Error & { status: number }).status, error.message);
    }
    return jsonError(500, "Unexpected server error.");
  }
}
