"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Header() {
  const [session, setSession] = useState(null);
  const [credits, setCredits] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setCredits(null);
      return;
    }
    fetch("/api/profile", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((d) => setCredits(d.credits ?? null))
      .catch(() => setCredits(null));
  }, [session]);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="header">
      <a href="/" className="brand">
        <span className="brand-dot" />
        Artora LeadScout
      </a>
      <div className="header-right">
        {session ? (
          <>
            {credits !== null && (
              <div className="credits">
                <span>{credits} / 1000 credits</span>
                <div className="credits-bar">
                  <div className="credits-fill" style={{ width: `${(credits / 1000) * 100}%` }} />
                </div>
              </div>
            )}
            <span className="user-email">{session.user.email}</span>
            <button className="btn" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <a href="/login" className="btn">
              Log in
            </a>
            <a href="/signup" className="btn btn-primary">
              Sign up
            </a>
          </>
        )}
      </div>
    </div>
  );
}
