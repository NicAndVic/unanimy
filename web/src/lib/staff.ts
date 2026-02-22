import "server-only";

import { cookies } from "next/headers";

import { jsonError } from "@/lib/api";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const STAFF_SESSION_COOKIE = "staff-sb-access-token";

function parseCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  const pair = cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`));

  if (!pair) return null;
  const [, value] = pair.split("=");
  return value ? decodeURIComponent(value) : null;
}

export function getStaffSessionTokenFromRequest(request: Request) {
  return parseCookie(request.headers.get("cookie"), STAFF_SESSION_COOKIE);
}

export async function isStaffUser(userId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("staff_users").select("user_id").eq("user_id", userId).maybeSingle();

  if (error) {
    throw jsonError(500, "Failed to validate staff user.");
  }

  return Boolean(data);
}


export async function getStaffAuthState() {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE)?.value;
  if (!token) return { status: "unauthenticated" as const };

  const supabase = getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return { status: "unauthenticated" as const };
  const staff = await isStaffUser(user.id);
  if (!staff) return { status: "forbidden" as const, user };
  return { status: "staff" as const, user };
}
export async function getStaffUserFromCookies() {
  const authState = await getStaffAuthState();
  return authState.status === "staff" ? authState.user : null;
}

export async function requireStaffUser(request: Request) {
  const token = getStaffSessionTokenFromRequest(request);
  if (!token) {
    throw jsonError(401, "Not authenticated.");
  }

  const supabase = getSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    throw jsonError(401, "Invalid session.");
  }

  const staff = await isStaffUser(user.id);
  if (!staff) {
    throw jsonError(403, "Not authorized.");
  }

  return { user };
}
