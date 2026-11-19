"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { RoadScanMark } from "@/components/roadscan-mark";
import { AuthSession, loginAccount, registerAccount, saveSession } from "@/lib/roadscan-api";

export default function AccountPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const session: AuthSession = mode === "register"
        ? await registerAccount(email, username, password)
        : await loginAccount(email, password);
      saveSession(session); window.location.assign(session.user.role === "admin" ? "/admin" : "/");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Account request failed."); }
    finally { setBusy(false); }
  }

  return <main className="account-page"><Link className="account-back" href="/"><ArrowLeft size={15}/> Back to map</Link><section className="account-card"><Link className="tool-brand account-brand" href="/"><span className="tool-brand-mark"><RoadScanMark/></span><span>Road<span>Scan</span></span></Link><h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1><p>Sign in to submit reports and help improve roads across Algeria.</p><div className="account-tabs"><button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Sign in</button><button type="button" className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>Create account</button></div><form onSubmit={submit}>{mode === "register" && <label>Display name<input required minLength={2} maxLength={60} autoComplete="nickname" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Your name"/></label>}<label>Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"/></label><label>Password<input required type="password" minLength={8} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters"/></label>{error && <div className="account-error" role="alert">{error}</div>}<button className="account-submit" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}<ArrowRight size={15}/></button></form><small className="account-note">Your account is used to attach submitted reports to you.</small></section></main>;
}
