import { NextResponse } from "next/server";
import { getUserFromRequest } from "../../../lib/supabaseServer";
import { getProfile } from "../../../lib/credits";

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  const profile = await getProfile(user.id);
  return NextResponse.json({ credits: profile.credits, email: user.email });
}
