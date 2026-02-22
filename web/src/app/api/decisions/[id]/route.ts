import { getOrganizerKeyFromRequest, jsonError, organizerKeyMatches, parseUuidParam, requireParticipant } from "@/lib/api";
import { ensureDecisionNotExpired } from "@/lib/decision-service";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const decisionId = parseUuidParam(id, "decision id");
    await ensureDecisionNotExpired(decisionId);

    const { data: decision, error: decisionError } = await supabaseAdmin
      .from("decisions")
      .select("id, decision_type, status, algorithm, allow_veto, opened_at, expires_at, closed_at, organizer_key_hash")
      .eq("id", decisionId)
      .maybeSingle();

    if (decisionError || !decision) {
      return jsonError(404, "Decision not found.");
    }

    const { data: joinCodeRow, error: joinCodeError } = await supabaseAdmin
      .from("decision_join_codes")
      .select("code, expires_at")
      .eq("decision_id", decisionId)
      .maybeSingle();

    if (joinCodeError) {
      return jsonError(500, "Failed to load decision join code.");
    }

    const joinCode = joinCodeRow && new Date(joinCodeRow.expires_at).getTime() > Date.now() ? joinCodeRow.code : null;

    const loadCounts = async () => {
      const { count: participantsCount } = await supabaseAdmin
        .from("participants")
        .select("id", { count: "exact", head: true })
        .eq("decision_id", decisionId);

      const { count: completedCount } = await supabaseAdmin
        .from("participants")
        .select("id", { count: "exact", head: true })
        .eq("decision_id", decisionId)
        .not("completed_at", "is", null);

      return {
        participants: participantsCount ?? 0,
        completed: completedCount ?? 0,
      };
    };

    const organizerKey = getOrganizerKeyFromRequest(request);
    if (organizerKey) {
      if (!decision.organizer_key_hash || !organizerKeyMatches(organizerKey, decision.organizer_key_hash)) {
        return jsonError(403, "Invalid organizer key.");
      }

      const counts = await loadCounts();

      return Response.json({
        decision: {
          id: decision.id,
          decision_type: decision.decision_type,
          status: decision.status,
          algorithm: decision.algorithm,
          allow_veto: decision.allow_veto,
          opened_at: decision.opened_at,
          expires_at: decision.expires_at,
          closed_at: decision.closed_at,
        },
        joinCode,
        counts,
      });
    }

    const { participant } = await requireParticipant(decisionId, request);

    const { data: options, error: optionsError } = await supabaseAdmin
      .from("decision_items")
      .select("id, display_order, snapshot")
      .eq("decision_id", decisionId)
      .order("display_order", { ascending: true });

    if (optionsError) {
      return jsonError(500, "Failed to load decision options.");
    }

    const optionIds = (options ?? []).map((option) => option.id);
    let myVotesRows: Array<{ decision_item_id: string; value: number }> = [];

    if (optionIds.length > 0) {
      const { data, error: myVotesError } = await supabaseAdmin
        .from("votes")
        .select("decision_item_id, value")
        .eq("participant_id", participant.id)
        .in("decision_item_id", optionIds);

      if (myVotesError) {
        return jsonError(500, "Failed to load participant votes.");
      }

      myVotesRows = data ?? [];
    }

    const myVotes = myVotesRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.decision_item_id] = row.value;
      return acc;
    }, {});

    const counts = await loadCounts();

    return Response.json({
      decision: {
        id: decision.id,
        decision_type: decision.decision_type,
        status: decision.status,
        algorithm: decision.algorithm,
        allow_veto: decision.allow_veto,
        opened_at: decision.opened_at,
        expires_at: decision.expires_at,
        closed_at: decision.closed_at,
      },
      options: options ?? [],
      joinCode,
      myVotes,
      counts,
    });
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return jsonError((error as Error & { status: number }).status, error.message);
    }
    return jsonError(500, "Unexpected server error.");
  }
}
