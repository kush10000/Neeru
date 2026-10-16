import { after, NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/geocode";
import { createReportSchema } from "@/lib/schemas";
import { getAdminClient, getUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";

const RPC_ERRORS: Record<string, { status: number; message: string }> = {
  too_far_from_gps: { status: 422, message: "The pin must be within 500 m of your location." },
  rate_limited: { status: 429, message: "You've sent 5 reports in the last hour. Try again later." },
};

export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = createReportSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid report" }, { status: 400 });
  }
  const input = parsed.data;
  if (input.photo_path && !input.photo_path.startsWith(`${userId}/`)) {
    return NextResponse.json({ error: "Invalid photo" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .rpc("submit_report", {
      p_user_id: userId,
      p_lon: input.lon,
      p_lat: input.lat,
      p_gps_lon: input.gps_lon,
      p_gps_lat: input.gps_lat,
      p_severity: input.severity,
      p_note: input.note,
      p_photo_path: input.photo_path,
    })
    .single();

  if (error) {
    const known = RPC_ERRORS[error.message];
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    console.error("submit_report failed", error.code, error.message);
    return NextResponse.json({ error: "Couldn't save the report" }, { status: 500 });
  }

  if (data.outcome === "created") {
    // Fill in the place name after responding so the reporter isn't kept waiting.
    after(async () => {
      const place = await reverseGeocode([input.lon, input.lat]);
      if (place) await admin.from("reports").update({ place_name: place }).eq("id", data.report_id);
    });
  }

  return NextResponse.json({ id: data.report_id, outcome: data.outcome }, { status: 201 });
}
