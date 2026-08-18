import { supabaseAdmin } from "./supabaseServer";

const DAILY_CREDITS = 1000;

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// Reads the user's profile, resetting credits if it's a new day.
// Creates a profile row if one doesn't exist yet (first login).
export async function getProfile(userId) {
  let { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profile) {
    const { data: created } = await supabaseAdmin
      .from("profiles")
      .insert({ id: userId, credits: DAILY_CREDITS, credits_date: todayStr() })
      .select()
      .single();
    profile = created;
  }

  if (profile && profile.credits_date !== todayStr()) {
    const { data: reset } = await supabaseAdmin
      .from("profiles")
      .update({ credits: DAILY_CREDITS, credits_date: todayStr() })
      .eq("id", userId)
      .select()
      .single();
    profile = reset;
  }

  return profile;
}

// Attempts to spend `cost` credits. Returns the updated profile on
// success, or null if the user doesn't have enough credits.
export async function spendCredits(userId, cost) {
  const profile = await getProfile(userId);
  if (!profile || profile.credits < cost) return null;

  const { data: updated } = await supabaseAdmin
    .from("profiles")
    .update({ credits: profile.credits - cost })
    .eq("id", userId)
    .select()
    .single();

  return updated;
}
