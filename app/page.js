"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import Header from "../components/Header";

const NICHE_OPTIONS = [
  "Graphic design",
  "Social media handling",
  "WordPress development",
  "Shopify store setup",
  "SEO",
  "Guest posting",
  "Business growth",
];

const AREA_OPTIONS = ["Lahore, Pakistan", "Dubai, UAE", "London, UK", "New York, USA"];

const BUSINESS_TYPE_OPTIONS = [
  "Dentists",
  "Real estate agencies",
  "Restaurants",
  "Law firms",
  "Gyms and fitness studios",
];

function DropdownField({ label, options, value, onChange, customValue, onCustomChange, placeholder }) {
  const isCustom = value === "custom";
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        <option value="custom">Custom (type your own)</option>
      </select>
      {isCustom && (
        <input
          type="text"
          className="show"
          placeholder={placeholder}
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
        />
      )}
    </div>
  );
}

export default function Home() {
  const [session, setSession] = useState(null);

  const [niche, setNiche] = useState("");
  const [nicheCustom, setNicheCustom] = useState("");
  const [area, setArea] = useState("");
  const [areaCustom, setAreaCustom] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [businessTypeCustom, setBusinessTypeCustom] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [leads, setLeads] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  function resolvedNiche() {
    return niche === "custom" ? nicheCustom : niche;
  }
  function resolvedArea() {
    return area === "custom" ? areaCustom : area;
  }
  function resolvedBusinessType() {
    return businessType === "custom" ? businessTypeCustom : businessType;
  }

  async function runSearch(offset) {
    if (!session) {
      setError("Please log in to search for leads.");
      return;
    }
    const areaVal = resolvedArea();
    const typeVal = resolvedBusinessType();
    if (!areaVal || !typeVal) {
      setError("Pick an area and a business type first.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          niche: resolvedNiche(),
          area: areaVal,
          businessType: typeVal,
          offset,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      setLeads((prev) => (offset > 0 && prev ? [...prev, ...data.leads] : data.leads));
      setHasMore(data.hasMore);
      setNextOffset(data.nextOffset);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleScan(e) {
    e.preventDefault();
    runSearch(0);
  }

  function handleExplore() {
    runSearch(nextOffset);
  }

  return (
    <>
      <div className="wrap">
        <Header />

        <div className="hero">
          <div>
            <div className="eyebrow">Real businesses, real contacts</div>
            <h1>
              Find leads for <span>any service niche</span>, anywhere.
            </h1>

            <form className="search-panel" onSubmit={handleScan}>
              <DropdownField
                label="Service niche"
                options={NICHE_OPTIONS}
                value={niche}
                onChange={setNiche}
                customValue={nicheCustom}
                onCustomChange={setNicheCustom}
                placeholder="e.g. video editing"
              />
              <DropdownField
                label="Area"
                options={AREA_OPTIONS}
                value={area}
                onChange={setArea}
                customValue={areaCustom}
                onCustomChange={setAreaCustom}
                placeholder="e.g. Karachi, Pakistan"
              />
              <DropdownField
                label="Business type"
                options={BUSINESS_TYPE_OPTIONS}
                value={businessType}
                onChange={setBusinessType}
                customValue={businessTypeCustom}
                onCustomChange={setBusinessTypeCustom}
                placeholder="e.g. veterinary clinics"
              />
              <button className="scan-btn" type="submit" disabled={loading}>
                {loading && nextOffset === 0 ? "Scanning…" : "Scan"}
              </button>
            </form>

            {error && <div className="error">{error}</div>}
            {!session && (
              <div className="hint">
                <a href="/login">Log in</a> or <a href="/signup">sign up</a> to start scanning — every account gets 1000 free credits a day.
              </div>
            )}
          </div>

          <div className="radar-wrap">
            <div className="radar">
              <div className="radar-sweep" />
              <div className="blip" style={{ top: "22%", left: "62%", animationDelay: "0s" }} />
              <div className="blip" style={{ top: "55%", left: "78%", animationDelay: "0.4s" }} />
              <div className="blip" style={{ top: "70%", left: "36%", animationDelay: "0.8s" }} />
              <div className="blip" style={{ top: "36%", left: "24%", animationDelay: "1.2s" }} />
              <div className="blip" style={{ top: "48%", left: "50%", animationDelay: "1.6s" }} />
            </div>
          </div>
        </div>

        {leads && (
          <div className="results">
            <div className="results-head">
              <h2>Results</h2>
              <span className="count">{leads.length} businesses found</span>
            </div>

            {leads.length === 0 && <div className="empty">No businesses found for that search.</div>}

            <div className="grid">
              {leads.map((l, i) => (
                <div className="card" key={i}>
                  <div className="card-name">{l.name}</div>
                  {l.address && <div className="card-row">{l.address}</div>}
                  {l.website ? (
                    <div className="card-row">
                      <a href={l.website} target="_blank" rel="noreferrer">
                        {l.website.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                  ) : (
                    <div className="card-row">No website listed</div>
                  )}
                  <div className="card-row">{l.phone || "No number listed"}</div>

                  {Object.keys(l.socials || {}).length > 0 && (
                    <div className="social-pills">
                      {Object.entries(l.socials).map(([platform, handle]) => (
                        <span className="pill" key={platform}>
                          {platform}
                        </span>
                      ))}
                    </div>
                  )}

                  {l.contacts && l.contacts.length > 0 && (
                    <div className="social-pills">
                      {l.contacts.map((c, j) => (
                        <span className="pill" key={j}>
                          {c.email}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="explore-wrap">
                <button className="explore-btn" onClick={handleExplore} disabled={loading}>
                  {loading && nextOffset > 0 ? "Loading…" : "Explore 10 more results"}
                </button>
                <div className="explore-cost">Costs 10 credits</div>
              </div>
            )}
          </div>
        )}

        <footer>
          Artora LeadScout uses OpenStreetMap for business data and Hunter.io for public contact
          discovery. Respect each platform&apos;s terms of use and local data-privacy law when
          contacting leads.
        </footer>
      </div>
    </>
  );
}
