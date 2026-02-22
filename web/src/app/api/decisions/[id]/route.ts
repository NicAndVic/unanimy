import { jsonError, parseUuidParam, requireParticipant } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const decisionId = parseUuidParam(id, "decision id");
    const { participant } = await requireParticipant(decisionId, request);

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

    const { data: joinCodeRow, error: joinCodeError } = await supabaseAdmin
      .from("decision_join_codes")
      .select("code, expires_at")
      .eq("decision_id", decisionId)
      .maybeSingle();

    if (joinCodeError) {
      return jsonError(500, "Failed to load decision join code.");
    }

    const now = Date.now();
    const joinCode =
      joinCodeRow && new Date(joinCodeRow.expires_at).getTime() > now
        ? joinCodeRow.code
        : null;

    const { data: myVotesRows, error: myVotesError } = await supabaseAdmin
      .from("votes")
      .select("decision_item_id, value")
      .eq("participant_id", participant.id);

    if (myVotesError) {
      return jsonError(500, "Failed to load participant votes.");
    }

    const myVotes = (myVotesRows ?? []).reduce<Record<string, number>>((acc, row) => {
      acc[row.decision_item_id] = row.value;
      return acc;
    }, {});

    return Response.json({ decision, options: options ?? [], joinCode, myVotes });
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return jsonError((error as Error & { status: number }).status, error.message);
    }
    return jsonError(500, "Unexpected server error.");
  }
}
