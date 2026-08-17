import { NextResponse } from "next/server";

const HUNTER_KEY = process.env.HUNTER_API_KEY;

// How many businesses to enrich with contact-person lookups per search.
// Hunter's free tier is limited, so we cap this to keep usage predictable.
const ENRICH_LIMIT = 8;

function extractDomain(url) {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Free geocoding — turns "Lahore, Pakistan" into a bounding box.
// No API key required. Nominatim's usage policy just asks for a
// descriptive User-Agent, which we set below.
async function geocodeLocation(location) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    location
  )}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "LeadScout/1.0 (personal lead-gen tool)" },
  });
  const data = await res.json();
  if (!data || data.length === 0) return null;
  const [south, north, west, east] = data[0].boundingbox.map(Number);
  return { south, north, west, east };
}

// Free business search — no API key required. Overpass indexes
// OpenStreetMap data; coverage is best for well-mapped cities and
// weaker in smaller towns, but it costs nothing and has no card requirement.
async function overpassSearch(niche, bbox) {
  const { south, west, north, east } = bbox;
  const bboxStr = `${south},${west},${north},${east}`;
  const escaped = niche.replace(/["\\]/g, "");

  const query = `
    [out:json][timeout:25];
    (
      node["name"~"${escaped}",i](${bboxStr});
      way["name"~"${escaped}",i](${bboxStr});
      node["shop"~"${escaped}",i](${bboxStr});
      node["amenity"~"${escaped}",i](${bboxStr});
      node["office"~"${escaped}",i](${bboxStr});
    );
    out center tags 30;
  `;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query,
    headers: { "Content-Type": "text/plain" },
  });
  if (!res.ok) throw new Error(`Overpass error: ${res.status}`);
  const data = await res.json();
  return data.elements || [];
}

function elementToBusiness(el) {
  const t = el.tags || {};
  const addressParts = [
    t["addr:housenumber"],
    t["addr:street"],
    t["addr:city"],
  ].filter(Boolean);

  return {
    name: t.name || null,
    address: addressParts.length ? addressParts.join(" ") : t["addr:full"] || null,
    phone: t.phone || t["contact:phone"] || null,
    website: t.website || t["contact:website"] || null,
    rating: null,
    reviews: null,
  };
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
  const { niche, location } = await request.json();
  if (!niche || !location) {
    return NextResponse.json({ error: "niche and location are required" }, { status: 400 });
  }

  try {
    const bbox = await geocodeLocation(location);
    if (!bbox) {
      return NextResponse.json({ error: `Could not find location "${location}".` }, { status: 404 });
    }

    const elements = await overpassSearch(niche, bbox);
    const businesses = elements
      .map(elementToBusiness)
      .filter((b) => b.name); // drop unnamed nodes

    const enriched = await Promise.all(
      businesses.map(async (biz, i) => {
        let contacts = [];
        if (biz.website && i < ENRICH_LIMIT) {
          const domain = extractDomain(biz.website);
          if (domain) contacts = await hunterDomainSearch(domain);
        }
        return { ...biz, contacts };
      })
    );

    return NextResponse.json({ count: enriched.length, leads: enriched });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
