import { NextResponse, type NextRequest } from "next/server";
import { isDeleteConfirmed } from "@/lib/domain/profile";
import { deleteAccount } from "@/lib/server/delete-account";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// RF-05: elimina la cuenta de quien tiene la sesión. Solo POST JSON desde el mismo origen.
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json"))
    return NextResponse.json({ error: "bad_request" }, { status: 415 });

  const body = (await request.json().catch(() => null)) as { confirm?: unknown } | null;
  if (typeof body?.confirm !== "string" || !isDeleteConfirmed(body.confirm))
    return NextResponse.json({ error: "not_confirmed" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const result = await deleteAccount({
    async groupIds() {
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);
      if (error) throw new Error("groups");
      return (data ?? []).map((m) => m.group_id);
    },
    async leaveGroup(groupId) {
      const { error } = await supabase.rpc("leave_group", { p_group: groupId });
      if (error) throw new Error("leave");
    },
    async deleteUser() {
      const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
      if (error) throw new Error("delete");
    },
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
