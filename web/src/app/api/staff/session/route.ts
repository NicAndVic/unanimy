import { STAFF_SESSION_COOKIE, isStaffUser } from "@/lib/staff";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accessToken = body?.accessToken;
    if (typeof accessToken !== "string" || accessToken.length < 20) {
      return Response.json({ error: "Invalid access token." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) return Response.json({ error: "Invalid session." }, { status: 401 });
    const isStaff = await isStaffUser(user.id);
    if (!isStaff) return Response.json({ error: "Not authorized." }, { status: 403 });

    const response = Response.json({ ok: true });
    response.headers.append("Set-Cookie", `${STAFF_SESSION_COOKIE}=${encodeURIComponent(accessToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
    return response;
  } catch {
    return Response.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

export async function DELETE() {
  const response = Response.json({ ok: true });
  response.headers.append("Set-Cookie", `${STAFF_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return response;
}
