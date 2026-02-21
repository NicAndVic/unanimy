import { supabaseAdmin } from "@/lib/supabase/admin";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function jsonError(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

export function parseUuidParam(value: string | undefined, name: string) {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ApiError(400, `Invalid ${name}.`);
  }
  return value;
}

export async function requireParticipant(decisionId: string, request: Request) {
  const token = request.headers.get("x-participant-token");
  if (!token) {
    throw new ApiError(401, "Missing x-participant-token header.");
  }

  const { data: participant, error } = await supabaseAdmin
    .from("participants")
    .select("id, decision_id, role, completed_at")
    .eq("participant_token", token)
    .eq("decision_id", decisionId)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, "Failed to validate participant token.");
  }

  if (!participant) {
    throw new ApiError(403, "Invalid participant token for decision.");
  }

  return { token, participant };
}

const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeJoinCode(length = 5) {
  let output = "";
  for (let i = 0; i < length; i += 1) {
    output += JOIN_CODE_ALPHABET[Math.floor(Math.random() * JOIN_CODE_ALPHABET.length)];
  }
  return output;
}

export function makeParticipantToken() {
  return crypto.randomUUID().replace(/-/g, "");
}
