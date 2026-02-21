import { jsonError, parseUuidParam, requireParticipant } from "@/lib/api";
import { computeAndCloseDecision } from "@/lib/decision-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const decisionId = parseUuidParam(id, "decision id");
    const { participant } = await requireParticipant(decisionId, request);

    if (participant.role !== "organizer") {
      return jsonError(403, "Only the organizer can close this decision.");
    }

    const result = await computeAndCloseDecision(decisionId);
    return Response.json({ ok: true, result });
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return jsonError((error as Error & { status: number }).status, error.message);
    }
    return jsonError(500, "Unexpected server error.");
  }
}
