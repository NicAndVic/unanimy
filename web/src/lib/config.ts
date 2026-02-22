import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000;

export async function getConfig<T>(key: string): Promise<T | null> {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  const { data, error } = await supabaseAdmin.from("app_config").select("value_json").eq("key", key).maybeSingle();
  if (error) {
    throw new Error(`Failed to load app config key: ${key}`);
  }

  const value = (data?.value_json ?? null) as T | null;
  cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
  return value;
}

export function invalidateConfigCache(key?: string) {
  if (key) {
    cache.delete(key);
    return;
  }
  cache.clear();
}
