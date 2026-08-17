"use client";

import { useState } from "react";

const BLIP_POSITIONS = [
  { top: "20%", left: "60%" },
  { top: "55%", left: "78%" },
  { top: "70%", left: "35%" },
  { top: "35%", left: "25%" },
  { top: "48%", left: "50%" },
];

function toCSV(leads) {
  const rows = [["Business", "Address", "Phone", "Website", "Rating", "Contact Name", "Position", "Email"]];
  leads.forEach((l) => {
    if (l.contacts.length === 0) {
      rows.push([l.name, l.address, l.phone, l.website, l.rating, "", "", ""]);
    } else {
      l.contacts.forEach((c) => {
        rows.push([l.name, l.address, l.phone, l.website, l.rating, c.name || "", c.position || "", c.email]);
      });
    }
  });
  return rows.map((r) => r.map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
}

export default function Home() {
  const [niche, setNiche] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [leads, setLeads] = useState(null);

  async function handleScan(e) {
    e.preventDefault();
    if (!niche || !location) return;
    setLoading(true);
    setError(null);
    setLeads(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, location }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setLeads(data.leads);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    if (!leads || leads.length === 0) return;
    const blob = new Blob([toCSV(leads)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leadscout-${niche}-${location}.csv`.replace(/\s+/g, "-").toLowerCase();
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="wrap">
      <header className="header">
        <div className="brand">
          <span className="brand-dot" />
          LeadScout
        </div>
        <span className="tag">live search · no stored data</span>
      </header>

      <section className="hero">
        <div>
          <div className="eyebrow">Real businesses, real contacts</div>
          <h1>
            Find leads for <span>any niche</span>, in any city.
          </h1>
          <p className="sub">
            Enter a niche and a location. LeadScout pulls real, currently-listed businesses
            and surfaces publicly available decision-maker contacts where they exist —
            no guessing, no scraped junk.
          </p>

          <form className="form" onSubmit={handleScan}>
            <div className="field">
              <label htmlFor="niche">Niche</label>
              <input
                id="niche"
                placeholder="e.g. dentists, roofers, yoga studios"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="location">Location</label>
              <input
                id="location"
                placeholder="e.g. Lahore, Pakistan"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <button className="scan-btn" type="submit" disabled={loading}>
              {loading ? "Scanning…" : "Scan"}
            </button>
          </form>

          {error && <div className="error">{error}</div>}
          <div className="hint">
            Needs GOOGLE_PLACES_API_KEY (required) and HUNTER_API_KEY (optional, for contact emails) —
            see the README.
          </div>
        </div>

        <div className="radar-wrap">
          <div className="radar">
            <div className="radar-sweep" />
            {BLIP_POSITIONS.map((pos, i) => (
              <div
                key={i}
                className="blip"
                style={{ top: pos.top, left: pos.left, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="results">
        {leads && (
          <>
            <div className="results-head">
              <h2>Results</h2>
              <span className="count">{leads.length} businesses found</span>
              <button className="export-btn" onClick={handleExport}>
                Export CSV
              </button>
            </div>

            {leads.length === 0 && <div className="empty">No businesses found for that search.</div>}

            {leads.map((l, i) => (
              <div className="lead-card" key={i}>
                <div className="lead-top">
                  <div>
                    <div className="lead-name">{l.name}</div>
                    <div className="lead-meta">
                      {l.address && <>{l.address}<br /></>}
                      {l.phone && <>{l.phone}<br /></>}
                      {l.website && (
                        <a href={l.website} target="_blank" rel="noreferrer">
                          {l.website.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                    </div>
                  </div>
                  {l.rating && (
                    <div className="rating">
                      ★ {l.rating} ({l.reviews || 0})
                    </div>
                  )}
                </div>

                {l.contacts && l.contacts.length > 0 ? (
                  <div className="contacts">
                    {l.contacts.map((c, j) => (
                      <span className="contact-pill" key={j}>
                        {c.name || "Unnamed"} {c.position ? `· ${c.position}` : ""} · {c.email}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="no-contacts">No public contact email found for this domain.</div>
                )}
              </div>
            ))}
          </>
        )}
      </section>

      <footer>
        LeadScout uses Google Places for business data and Hunter.io for public contact
        discovery. Respect each platform's terms of use and local data-privacy law when
        contacting leads.
      </footer>
    </main>
  );
}
