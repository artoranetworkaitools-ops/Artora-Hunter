"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <main className="wrap">
        <div className="auth-panel">
          <h1 className="auth-title">Check your email</h1>
          <p className="sub">
            We sent a confirmation link to <strong>{email}</strong>. Click it, then come back and
            log in.
          </p>
          <a className="scan-btn" style={{ display: "inline-block", textAlign: "center", width: "100%" }} href="/login">
            Go to login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap">
      <div className="auth-panel">
        <h1 className="auth-title">Sign up</h1>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="text-field"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="text-field"
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button className="scan-btn" type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account? <a href="/login">Log in</a>
        </p>
      </div>
    </main>
  );
}
