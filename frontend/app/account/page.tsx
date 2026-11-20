"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CircleAlert, Eye, EyeOff, Lock, Mail, ShieldCheck, User } from "lucide-react";
import { RoadScanMark } from "@/components/roadscan-mark";
import {
  AuthSession,
  getAccessToken,
  getCurrentUser,
  getSavedUser,
  loginAccount,
  registerAccount,
  saveSession,
} from "@/lib/roadscan-api";
import { toast } from "sonner";
import "../report.css";

export default function AccountPage() {
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const token = getAccessToken();
    const savedUser = getSavedUser();

    if (token && savedUser) {
      window.location.replace(savedUser.role === "admin" ? "/admin" : "/");
      return;
    }

    if (token) {
      getCurrentUser()
        .then((user) => {
          if (!active) return;
          window.location.replace(user.role === "admin" ? "/admin" : "/");
        })
        .catch(() => {
          if (!active) return;
          setChecking(false);
        });
      return;
    }

    setChecking(false);
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const session: AuthSession =
        mode === "register"
          ? await registerAccount(email.trim(), username.trim(), password)
          : await loginAccount(email.trim(), password);

      saveSession(session);
      toast.success(
        mode === "register" ? "Account created successfully" : "Signed in successfully",
        { description: `Welcome, ${session.user.username}!` }
      );

      window.location.assign(session.user.role === "admin" ? "/admin" : "/");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Account request failed.";
      setError(message);
      toast.error("Authentication failed", { description: message });
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <main className="rs-account-app">
        <header className="rs-header">
          <Link className="rs-brand" href="/" aria-label="RoadScan home">
            <span className="rs-mark">
              <RoadScanMark />
            </span>
            <span className="rs-wordmark">
              Road<b>Scan</b>
            </span>
          </Link>
        </header>
        <div
          className="rs-account-main"
          style={{
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="rs-map-loading" style={{ position: "static", color: "var(--dim)" }}>
            <span className="rs-spinner" />
            <span>Checking session…</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="rs-account-app">
      <header className="rs-header">
        <Link className="rs-brand" href="/" aria-label="RoadScan home">
          <span className="rs-mark">
            <RoadScanMark />
          </span>
          <span className="rs-wordmark">
            Road<b>Scan</b>
          </span>
        </Link>
        <div className="rs-user">
          <Link className="rs-chip-btn" href="/">
            <ArrowLeft size={16} />
            <span className="rs-label">Public map</span>
          </Link>
        </div>
      </header>

      <div className="rs-account-main">
        <section className="rs-account-card" aria-labelledby="account-heading">
          <div className="rs-account-header">
            <h1 id="account-heading">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p>
              Sign in to report road defects and help improve road safety across Algeria.
            </p>
          </div>

          <div className="rs-account-tabs" role="tablist" aria-label="Account options">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={`rs-account-tab ${mode === "login" ? "active" : ""}`}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={`rs-account-tab ${mode === "register" ? "active" : ""}`}
              onClick={() => {
                setMode("register");
                setError("");
              }}
            >
              Create account
            </button>
          </div>

          <form className="rs-form" onSubmit={submit}>
            {mode === "register" && (
              <label className="rs-field">
                <span className="rs-field-label">Display name</span>
                <div className="rs-input-wrap">
                  <User size={16} className="rs-input-icon" />
                  <input
                    className="rs-input"
                    required
                    minLength={2}
                    maxLength={60}
                    autoComplete="nickname"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Your name"
                  />
                </div>
              </label>
            )}

            <label className="rs-field">
              <span className="rs-field-label">Email address</span>
              <div className="rs-input-wrap">
                <Mail size={16} className="rs-input-icon" />
                <input
                  className="rs-input"
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            </label>

            <label className="rs-field">
              <span className="rs-field-label">Password</span>
              <div className="rs-input-wrap">
                <Lock size={16} className="rs-input-icon" />
                <input
                  className="rs-input rs-input-has-toggle"
                  required
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  maxLength={128}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  className="rs-pw-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {error && (
              <div className="rs-msg rs-msg-error" role="alert">
                <CircleAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            <button className="rs-primary rs-account-submit" type="submit" disabled={busy}>
              {busy ? (
                <>
                  <span className="rs-spinner" />
                  <span>Please wait…</span>
                </>
              ) : (
                <>
                  <span>{mode === "login" ? "Sign in" : "Create account"}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="rs-account-footer-note">
            <ShieldCheck size={15} />
            <span>Your account is used to attach and verify submitted road reports.</span>
          </div>
        </section>
      </div>
    </main>
  );
}
