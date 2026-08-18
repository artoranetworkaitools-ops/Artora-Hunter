import { NextResponse } from "next/server";
import { getUserFromRequest } from "../../../lib/supabaseServer";
import { spendCredits } from "../../../lib/credits";

const HUNTER_KEY = process.env.HUNTER_API_KEY;
const SCAN_COST = 100;
const EXPLORE_COST = 10;
const PAGE_SIZE = 10;
const ENRICH_LIMIT = 8;

function extractDomain(url) {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function geocodeLocation(location) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    location
  )}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "ArtoraLeadScout/1.0 (lead-gen tool)" },
  });
  const data = await res.json();
  if (!data || data.length === 0) return null;
  const [south, north, west, east] = data[0].boundingbox.map(Number);
  return { south, north, west, east };
}

async function overpassSearch(businessType, bbox) {
  const { south, west, north, east } = bbox;
  const bboxStr = `${south},${west},${north},${east}`;
  const escaped = businessType.replace(/["\\]/g, "");

  const query = `
    [out:json][timeout:25];
    (
      node["name"~"${escaped}",i](${bboxStr});
      way["name"~"${escaped}",i](${bboxStr});
      node["shop"~"${escaped}",i](${bboxStr});
      node["amenity"~"${escaped}",i](${bboxStr});
      node["office"~"${escaped}",i](${bboxStr});
    );
    out center tags 50;
  `;

  const endpoints = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
  ];

  let lastError;
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: query,
        headers: { "Content-Type": "text/plain", Accept: "application/json" },
      });
      if (!res.ok) {
        lastError = new Error(`Overpass error: ${res.status}`);
        continue;
      }
      const data = await res.json();
      return data.elements || [];
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("All Overpass endpoints failed.");
}

function elementToBusiness(el) {
  const t = el.tags || {};
  const addressParts = [t["addr:housenumber"], t["addr:street"], t["addr:city"]].filter(Boolean);

  const socials = {};
  if (t["contact:facebook"]) socials.facebook = t["contact:facebook"];
  if (t["contact:instagram"]) socials.instagram = t["contact:instagram"];
  if (t["contact:twitter"]) socials.twitter = t["contact:twitter"];
  if (t["contact:linkedin"]) socials.linkedin = t["contact:linkedin"];

  return {
    name: t.name || null,
    address: addressParts.length ? addressParts.join(" ") : t["addr:full"] || null,
    phone: t.phone || t["contact:phone"] || null,
    website: t.website || t["contact:website"] || null,
    socials,
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
    }));
  } catch {
    return [];
  }
}

export async function POST(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Please log in to search for leads." }, { status: 401 });
  }

  const { niche, area, businessType, offset } = await request.json();
  if (!area || !businessType) {
    return NextResponse.json({ error: "area and businessType are required" }, { status: 400 });
  }

  const pageOffset = offset || 0;
  const isExplore = pageOffset > 0;
  const cost = isExplore ? EXPLORE_COST : SCAN_COST;

  const updatedProfile = await spendCredits(user.id, cost);
  if (!updatedProfile) {
    return NextResponse.json(
      { error: `Not enough credits. This search needs ${cost} credits.` },
      { status: 402 }
    );
  }

  try {
    const bbox = await geocodeLocation(area);
    if (!bbox) {
      return NextResponse.json({ error: `Could not find location "${area}".` }, { status: 404 });
    }

    const elements = await overpassSearch(businessType, bbox);
    const allBusinesses = elements.map(elementToBusiness).filter((b) => b.name);
    const page = allBusinesses.slice(pageOffset, pageOffset + PAGE_SIZE);

    const enriched = await Promise.all(
      page.map(async (biz, i) => {
        let contacts = [];
        if (biz.website && i < ENRICH_LIMIT) {
          const domain = extractDomain(biz.website);
          if (domain) contacts = await hunterDomainSearch(domain);
        }
        return { ...biz, niche: niche || null, contacts };
      })
    );

    return NextResponse.json({
      count: enriched.length,
      leads: enriched,
      hasMore: pageOffset + PAGE_SIZE < allBusinesses.length,
      nextOffset: pageOffset + PAGE_SIZE,
      creditsRemaining: updatedProfile.credits,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
