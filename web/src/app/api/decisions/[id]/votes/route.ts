import { jsonError, parseUuidParam, requireParticipant } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/admin";

const voteMap: Record<string, number> = {
  Preferred: 2,
  Agree: 1,
  Neutral: 0,
  PreferNot: -1,
  NoWay: -2,
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const decisionId = parseUuidParam(id, "decision id");
    const { participant } = await requireParticipant(decisionId, request);

    const body = await request.json();
    const decisionItemId = typeof body?.decisionItemId === "string" ? body.decisionItemId : "";
    const vote = body?.vote;
    const value = typeof vote === "number" ? vote : voteMap[String(vote)];

    if (!decisionItemId || typeof value !== "number" || ![-2, -1, 0, 1, 2].includes(value)) {
      return jsonError(400, "decisionItemId and vote are required (vote in -2..2 or label). ");
    }

    const { data: decisionItem, error: itemError } = await supabaseAdmin
      .from("decision_items")
      .select("id")
      .eq("id", decisionItemId)
      .eq("decision_id", decisionId)
      .maybeSingle();

    if (itemError || !decisionItem) {
      return jsonError(404, "Decision item not found for this decision.");
    }

    const { error: voteError } = await supabaseAdmin.from("votes").upsert(
      {
        participant_id: participant.id,
        decision_item_id: decisionItemId,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "participant_id,decision_item_id" },
    );

    if (voteError) {
      return jsonError(500, "Failed to save vote.");
    }

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return jsonError((error as Error & { status: number }).status, error.message);
    }
    return jsonError(500, "Unexpected server error.");
  }
}
