import { jsonError, parseUuidParam, requireParticipant } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const decisionId = parseUuidParam(id, "decision id");
    await requireParticipant(decisionId, request);

    const { data: decision, error: decisionError } = await supabaseAdmin
      .from("decisions")
      .select("id, decision_type, status, algorithm, allow_veto, opened_at, closed_at")
      .eq("id", decisionId)
      .maybeSingle();

    if (decisionError || !decision) {
      return jsonError(404, "Decision not found.");
    }

    const { data: options, error: optionsError } = await supabaseAdmin
      .from("decision_items")
      .select("id, display_order, snapshot")
      .eq("decision_id", decisionId)
      .order("display_order", { ascending: true });

    if (optionsError) {
      return jsonError(500, "Failed to load decision options.");
    }

    return Response.json({ decision, options: options ?? [] });
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return jsonError((error as Error & { status: number }).status, error.message);
    }
    return jsonError(500, "Unexpected server error.");
  }
}
