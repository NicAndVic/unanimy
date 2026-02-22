import { getConfig } from "@/lib/config";
import { supabaseAdmin } from "@/lib/supabase/admin";

const API_BASE = "https://places.googleapis.com/v1";

export const SEARCH_FIELD_MASK =
  "places.id,places.displayName,places.location,places.rating,places.userRatingCount,places.priceLevel,places.primaryType";

export const DETAILS_FIELD_MASK =
  "id,displayName,formattedAddress,location,rating,userRatingCount,priceLevel,regularOpeningHours,websiteUri,googleMapsUri";

type CacheRecord = {
  place_id: string;
  field_mask: string;
  payload: unknown;
  expires_at: string;
};

async function getGoogleCacheTtlMs(key: "places_search" | "place_details") {
  const config = await getConfig<Record<string, number>>("google_cache_ttl_seconds");
  const seconds = config?.[key] ?? (key === "places_search" ? 900 : 86400);
  return seconds * 1000;
}

async function getCached(placeId: string, fieldMask: string) {
  const { data, error } = await supabaseAdmin
    .from("google_place_cache")
    .select("place_id, field_mask, payload, expires_at")
    .eq("place_id", placeId)
    .eq("field_mask", fieldMask)
    .maybeSingle<CacheRecord>();

  if (error || !data) return null;
  return new Date(data.expires_at).getTime() > Date.now() ? data.payload : null;
}

async function setCache(placeId: string, fieldMask: string, payload: unknown, ttlMs: number) {
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  await supabaseAdmin.from("google_place_cache").upsert(
    {
      place_id: placeId,
      field_mask: fieldMask,
      payload,
      expires_at: expiresAt,
      cached_at: new Date().toISOString(),
    },
    { onConflict: "place_id,field_mask" },
  );
}

function getApiKey() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    throw new Error("Missing GOOGLE_PLACES_API_KEY.");
  }
  return key;
}

async function logApiUsage(input: {
  endpoint: string;
  status?: number;
  latencyMs: number;
  decisionId?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await supabaseAdmin.from("api_usage_events").insert({
      provider: "google",
      endpoint: input.endpoint,
      status: input.status ?? null,
      latency_ms: input.latencyMs,
      decision_id: input.decisionId ?? null,
      meta: input.meta ?? null,
    });
  } catch {
    // intentionally ignored
  }
}

async function googleFetch(path: string, init: RequestInit, fieldMask: string, endpoint: string, decisionId?: string) {
  const startedAt = Date.now();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": getApiKey(),
      "X-Goog-FieldMask": fieldMask,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  void logApiUsage({ endpoint, status: response.status, latencyMs: Date.now() - startedAt, decisionId });

  if (!response.ok) {
    throw new Error(`Google Places request failed (${response.status}).`);
  }

  return response.json();
}

export async function searchNearbyWithCache(input: {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  maxResultCount: number;
  decisionId?: string;
}) {
  const cacheKey = `nearby:${input.latitude.toFixed(5)},${input.longitude.toFixed(5)},${input.radiusMeters},${input.maxResultCount}`;
  const cached = await getCached(cacheKey, SEARCH_FIELD_MASK);
  if (cached) return cached as { places?: Array<Record<string, unknown>> };

  const payload = await googleFetch(
    "/places:searchNearby",
    {
      method: "POST",
      body: JSON.stringify({
        includedTypes: ["restaurant"],
        maxResultCount: input.maxResultCount,
        locationRestriction: {
          circle: {
            center: { latitude: input.latitude, longitude: input.longitude },
            radius: input.radiusMeters,
          },
        },
      }),
    },
    SEARCH_FIELD_MASK,
    "places_search",
    input.decisionId,
  );

  await setCache(cacheKey, SEARCH_FIELD_MASK, payload, await getGoogleCacheTtlMs("places_search"));
  return payload as { places?: Array<Record<string, unknown>> };
}

export async function getPlaceDetailsWithCache(placeId: string, decisionId?: string) {
  const cached = await getCached(placeId, DETAILS_FIELD_MASK);
  if (cached) return cached as Record<string, unknown>;

  const payload = await googleFetch(`/places/${placeId}`, { method: "GET" }, DETAILS_FIELD_MASK, "place_details", decisionId);
  await setCache(placeId, DETAILS_FIELD_MASK, payload, await getGoogleCacheTtlMs("place_details"));
  return payload as Record<string, unknown>;
}
