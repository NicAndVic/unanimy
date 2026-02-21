import { jsonError, parseUuidParam, requireParticipant } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const decisionId = parseUuidParam(id, "decision id");
    await requireParticipant(decisionId, request);

    const { data: result, error: resultError } = await supabaseAdmin
      .from("decision_results")
      .select("winning_decision_item_id, summary_json")
      .eq("decision_id", decisionId)
      .maybeSingle();

    if (resultError || !result) {
      return jsonError(404, "Result not found yet.");
    }

    const summary = (result.summary_json ?? {}) as {
      winner?: { snapshot?: Record<string, unknown> };
      counts?: { participants?: number; completed?: number };
      algorithm?: string;
    };

    return Response.json({
      winner: summary.winner?.snapshot ?? null,
      counts: {
        participants: summary.counts?.participants ?? 0,
        completed: summary.counts?.completed ?? 0,
      },
      algorithm: summary.algorithm ?? null,
    });
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return jsonError((error as Error & { status: number }).status, error.message);
    }
    return jsonError(500, "Unexpected server error.");
  }
}
