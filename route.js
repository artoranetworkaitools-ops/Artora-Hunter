import { NextResponse } from "next/server";

const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY;
const HUNTER_KEY = process.env.HUNTER_API_KEY;

// How many businesses to enrich with contact-person lookups per search.
// Hunter's free tier is limited, so we cap this to keep costs predictable.
const ENRICH_LIMIT = 8;

function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function textSearch(query) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
    query
  )}&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places error: ${data.status} ${data.error_message || ""}`);
  }
  return data.results || [];
}

async function placeDetails(placeId) {
  const fields = "name,formatted_address,formatted_phone_number,website,rating,user_ratings_total";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.result || {};
}

async function hunterDomainSearch(domain) {
  if (!HUNTER_KEY) return [];
  try {
    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(
      domain
    )}&api_key=${HUNTER_KEY}&limit=3`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.data || !data.data.emails) return [];
    return data.data.emails.map((e) => ({
      name: [e.first_name, e.last_name].filter(Boolean).join(" ") || null,
      position: e.position || null,
      email: e.value,
      confidence: e.confidence,
    }));
  } catch {
    return [];
  }
}

export async function POST(request) {
  if (!GOOGLE_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  const { niche, location } = await request.json();
  if (!niche || !location) {
    return NextResponse.json({ error: "niche and location are required" }, { status: 400 });
  }

  try {
    const results = await textSearch(`${niche} in ${location}`);

    const businesses = await Promise.all(
      results.slice(0, 20).map((r) => placeDetails(r.place_id))
    );

    const enriched = await Promise.all(
      businesses.map(async (biz, i) => {
        let contacts = [];
        if (biz.website && i < ENRICH_LIMIT) {
          const domain = extractDomain(biz.website);
          if (domain) contacts = await hunterDomainSearch(domain);
        }
        return {
          name: biz.name || null,
          address: biz.formatted_address || null,
          phone: biz.formatted_phone_number || null,
          website: biz.website || null,
          rating: biz.rating || null,
          reviews: biz.user_ratings_total || null,
          contacts,
        };
      })
    );

    return NextResponse.json({ count: enriched.length, leads: enriched });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
