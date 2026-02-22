import { makeParticipantToken, jsonError } from "@/lib/api";
import { ensureDecisionNotExpired } from "@/lib/decision-service";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";

    if (!/^[A-Z0-9]{5}$/.test(code)) {
      return jsonError(400, "code must be a 5-character alphanumeric string.");
    }

    const { data: joinCode, error: joinError } = await supabaseAdmin
      .from("decision_join_codes")
      .select("decision_id, expires_at")
      .eq("code", code)
      .maybeSingle();

    if (joinError || !joinCode) {
      return jsonError(404, "Join code not found.");
    }

    if (new Date(joinCode.expires_at).getTime() < Date.now()) {
      return jsonError(410, "Join code has expired.");
    }

    const decisionState = await ensureDecisionNotExpired(joinCode.decision_id);
    if (decisionState.status !== "open") {
      return jsonError(409, "Decision is closed.");
    }

    const participantToken = makeParticipantToken();
    const { error: participantError } = await supabaseAdmin.from("participants").insert({
      decision_id: joinCode.decision_id,
      participant_token: participantToken,
      role: "member",
    });

    if (participantError) {
      return jsonError(500, "Failed to join decision.");
    }

    return Response.json({
      decisionId: joinCode.decision_id,
      participantToken,
    });
  } catch {
    return jsonError(500, "Unexpected server error.");
  }
}
