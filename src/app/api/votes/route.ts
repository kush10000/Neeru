import { NextResponse } from "next/server";
import { voteSchema } from "@/lib/schemas";
import { getAdminClient, getUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = voteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid vote" }, { status: 400 });

  const { data, error } = await getAdminClient()
    .rpc("cast_vote", { p_user_id: userId, p_report_id: parsed.data.report_id, p_vote: parsed.data.vote })
    .single();

  if (error) {
    if (error.message === "report_not_active") {
      return NextResponse.json({ error: "This report has expired or been cleared." }, { status: 409 });
    }
    console.error("cast_vote failed", error.code, error.message);
    return NextResponse.json({ error: "Couldn't save your vote" }, { status: 500 });
  }

  return NextResponse.json(data);
}
