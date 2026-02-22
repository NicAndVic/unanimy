import { getOrganizerKeyFromRequest, jsonError, organizerKeyMatches, parseUuidParam } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const decisionId = parseUuidParam(id, "decision id");
    const organizerKey = getOrganizerKeyFromRequest(request);

    if (!organizerKey) {
      return jsonError(401, "Missing organizer key.");
    }

    const { data: decision, error: decisionError } = await supabaseAdmin
      .from("decisions")
      .select("status, organizer_key_hash")
      .eq("id", decisionId)
      .maybeSingle();

    if (decisionError || !decision) {
      return jsonError(404, "Decision not found.");
    }

    if (!decision.organizer_key_hash || !organizerKeyMatches(organizerKey, decision.organizer_key_hash)) {
      return jsonError(403, "Invalid organizer key.");
    }

    if (decision.status === "closed") {
      return Response.json({ ok: true, alreadyClosed: true });
    }

    const { error: closeError } = await supabaseAdmin
      .from("decisions")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", decisionId)
      .eq("status", "open");

    if (closeError) {
      return jsonError(500, "Failed to close decision.");
    }

    return Response.json({ ok: true, alreadyClosed: false });
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return jsonError((error as Error & { status: number }).status, error.message);
    }
    return jsonError(500, "Unexpected server error.");
  }
}
