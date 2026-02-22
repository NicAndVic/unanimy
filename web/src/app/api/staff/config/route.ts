import { invalidateConfigCache } from "@/lib/config";
import { requireStaffUser } from "@/lib/staff";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    await requireStaffUser(request);
    const { data, error } = await supabaseAdmin
      .from("app_config")
      .select("key, value_json, updated_at, updated_by")
      .order("key", { ascending: true });

    if (error) return Response.json({ error: "Failed to load config." }, { status: 500 });
    return Response.json({ rows: data ?? [] });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { user } = await requireStaffUser(request);
    const body = await request.json();
    if (typeof body?.key !== "string" || body.key.length === 0 || !Object.hasOwn(body, "value_json")) {
      return Response.json({ error: "key and value_json are required." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("app_config")
      .upsert(
        {
          key: body.key,
          value_json: body.value_json,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        },
        { onConflict: "key" },
      )
      .select("key, value_json, updated_at, updated_by")
      .single();

    if (error) return Response.json({ error: "Failed to save config." }, { status: 500 });
    invalidateConfigCache(body.key);
    return Response.json({ row: data });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
