import { makeJoinCode, makeParticipantToken, jsonError } from "@/lib/api";
import { getPlaceDetailsWithCache, searchNearbyWithCache } from "@/lib/google-places";
import { supabaseAdmin } from "@/lib/supabase/admin";

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const latitude = body?.location?.latitude;
    const longitude = body?.location?.longitude;
    const radiusMeters = body?.radiusMeters ?? 2500;
    const maxOptions = body?.maxOptions ?? 8;

    if (!asNumber(latitude) || !asNumber(longitude)) {
      return jsonError(400, "location.latitude and location.longitude are required numbers.");
    }

    if (!asNumber(radiusMeters) || radiusMeters < 100 || radiusMeters > 50000) {
      return jsonError(400, "radiusMeters must be a number between 100 and 50000.");
    }

    if (!Number.isInteger(maxOptions) || maxOptions < 2 || maxOptions > 20) {
      return jsonError(400, "maxOptions must be an integer between 2 and 20.");
    }

    const algorithm = body?.algorithm === "most_satisfied" ? "most_satisfied" : "collective";
    const allowVeto = body?.allowVeto !== false;
    const sortBy = ["rating", "review_count", "distance"].includes(body?.sortBy) ? body.sortBy : "rating";

    const nearby = await searchNearbyWithCache({
      latitude,
      longitude,
      radiusMeters,
      maxResultCount: maxOptions,
    });

    const places = (nearby.places ?? []).slice(0, maxOptions);
    if (places.length === 0) {
      return jsonError(404, "No restaurant options found for this area.");
    }

    const detailsPayloads = await Promise.all(
      places.map(async (place) => {
        const placeId = place.id;
        if (typeof placeId !== "string") return null;
        const details = await getPlaceDetailsWithCache(placeId);
        return { placeId, details };
      }),
    );

    const validDetails = detailsPayloads.filter((value): value is { placeId: string; details: Record<string, unknown> } => Boolean(value));

    const { data: decision, error: decisionError } = await supabaseAdmin
      .from("decisions")
      .insert({
        decision_type: "restaurants",
        algorithm,
        allow_veto: allowVeto,
        status: "open",
        opened_at: new Date().toISOString(),
        max_options: maxOptions,
        sort_by: sortBy,
        criteria_json: {
          location: { latitude, longitude },
          radiusMeters,
        },
      })
      .select("id")
      .single();

    if (decisionError || !decision) {
      return jsonError(500, "Failed to create decision.");
    }

    const participantToken = makeParticipantToken();
    const { error: organizerError } = await supabaseAdmin.from("participants").insert({
      decision_id: decision.id,
      participant_token: participantToken,
      role: "organizer",
    });

    if (organizerError) {
      return jsonError(500, "Failed to create organizer participant.");
    }

    const itemRows: Array<{ id: string; provider_item_id: string }> = [];
    for (const place of validDetails) {
      const details = place.details;
      const displayName = details.displayName as { text?: string } | undefined;
      const location = details.location as { latitude?: number; longitude?: number } | undefined;
      const { data: item, error: itemError } = await supabaseAdmin
        .from("items")
        .upsert(
          {
            provider: "google_places",
            provider_item_id: place.placeId,
            name: displayName?.text ?? null,
            primary_type: (details.primaryType as string | undefined) ?? null,
            lat: location?.latitude ?? null,
            lng: location?.longitude ?? null,
            latlng_cached_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "provider,provider_item_id" },
        )
        .select("id, provider_item_id")
        .single();

      if (itemError || !item) {
        return jsonError(500, "Failed to upsert canonical item.");
      }
      itemRows.push(item);
    }

    const decisionItemRows = itemRows.map((item, index) => {
      const detail = validDetails.find((row) => row.placeId === item.provider_item_id);
      return {
        decision_id: decision.id,
        item_id: item.id,
        display_order: index,
        snapshot: detail?.details ?? {},
        updated_at: new Date().toISOString(),
      };
    });

    const { data: decisionItems, error: decisionItemsError } = await supabaseAdmin
      .from("decision_items")
      .insert(decisionItemRows)
      .select("id, item_id, snapshot, display_order");

    if (decisionItemsError) {
      return jsonError(500, "Failed to create decision items.");
    }

    const code = makeJoinCode();
    const { error: codeError } = await supabaseAdmin.from("decision_join_codes").upsert(
      {
        decision_id: decision.id,
        code,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      },
      { onConflict: "decision_id" },
    );

    if (codeError) {
      return jsonError(500, "Failed to create join code.");
    }

    return Response.json(
      {
        decisionId: decision.id,
        joinCode: code,
        participantToken,
        options: decisionItems ?? [],
      },
      { status: 201 },
    );
  } catch {
    return jsonError(500, "Unexpected server error.");
  }
}
