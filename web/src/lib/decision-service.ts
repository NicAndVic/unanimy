import { supabaseAdmin } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api";
import { computeDecisionResult, type DecisionAlgorithm } from "@/lib/scoring";

export async function ensureDecisionNotExpired(decisionId: string) {
  const { data: decision, error } = await supabaseAdmin
    .from("decisions")
    .select("id, status, expires_at")
    .eq("id", decisionId)
    .maybeSingle();

  if (error || !decision) {
    throw new ApiError(404, "Decision not found.");
  }

  if (decision.status !== "open" || !decision.expires_at) {
    return decision;
  }

  if (new Date(decision.expires_at).getTime() > Date.now()) {
    return decision;
  }

  const closedAt = new Date().toISOString();
  const { error: closeError } = await supabaseAdmin
    .from("decisions")
    .update({ status: "closed", closed_at: closedAt })
    .eq("id", decisionId)
    .eq("status", "open");

  if (closeError) {
    throw new ApiError(500, "Failed to auto-close expired decision.");
  }

  return {
    ...decision,
    status: "closed",
  };
}

export async function computeAndCloseDecision(decisionId: string) {
  const { data: decision, error: decisionError } = await supabaseAdmin
    .from("decisions")
    .select("id, algorithm, allow_veto, status")
    .eq("id", decisionId)
    .maybeSingle();

  if (decisionError || !decision) {
    throw new ApiError(404, "Decision not found.");
  }

  const { data: decisionItems, error: itemsError } = await supabaseAdmin
    .from("decision_items")
    .select("id, snapshot")
    .eq("decision_id", decisionId)
    .order("display_order", { ascending: true });

  if (itemsError) {
    throw new ApiError(500, "Failed to load decision items.");
  }

  const { data: votes, error: votesError } = await supabaseAdmin
    .from("votes")
    .select("value, decision_item_id")
    .in(
      "decision_item_id",
      (decisionItems ?? []).map((item) => item.id),
    );

  if (votesError) {
    throw new ApiError(500, "Failed to load votes.");
  }

  const votesByOption = new Map<string, number[]>();
  for (const item of decisionItems ?? []) {
    votesByOption.set(item.id, []);
  }

  for (const vote of votes ?? []) {
    const existing = votesByOption.get(vote.decision_item_id);
    if (existing) existing.push(vote.value);
  }

  const scoring = computeDecisionResult({
    algorithm: decision.algorithm as DecisionAlgorithm,
    allowVeto: decision.allow_veto,
    options: [...votesByOption.entries()].map(([decisionItemId, values]) => ({
      decisionItemId,
      votes: values,
    })),
  });

  if (!scoring.winnerDecisionItemId) {
    throw new ApiError(400, "No decision items available to score.");
  }

  const winnerItem = (decisionItems ?? []).find((item) => item.id === scoring.winnerDecisionItemId);

  const { count: participantsCount } = await supabaseAdmin
    .from("participants")
    .select("id", { count: "exact", head: true })
    .eq("decision_id", decisionId);

  const { count: completedCount } = await supabaseAdmin
    .from("participants")
    .select("id", { count: "exact", head: true })
    .eq("decision_id", decisionId)
    .not("completed_at", "is", null);

  const summary = {
    winner: {
      decisionItemId: scoring.winnerDecisionItemId,
      snapshot: winnerItem?.snapshot ?? null,
    },
    counts: {
      participants: participantsCount ?? 0,
      completed: completedCount ?? 0,
    },
    algorithm: decision.algorithm,
  };

  const { error: resultError } = await supabaseAdmin.from("decision_results").upsert(
    {
      decision_id: decisionId,
      winning_decision_item_id: scoring.winnerDecisionItemId,
      summary_json: summary,
      computed_at: new Date().toISOString(),
    },
    { onConflict: "decision_id" },
  );

  if (resultError) {
    throw new ApiError(500, "Failed to save result.");
  }

  const { error: closeError } = await supabaseAdmin
    .from("decisions")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", decisionId);

  if (closeError) {
    throw new ApiError(500, "Failed to close decision.");
  }

  return {
    winningDecisionItemId: scoring.winnerDecisionItemId,
    summary,
  };
}
