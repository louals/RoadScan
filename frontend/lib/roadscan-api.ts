export type Report = {
  id: number;
  latitude: number;
  longitude: number;
  defect_type: string;
  confidence_score: number;
  detection_count: number;
  description?: string | null;
  image_url?: string | null;
  status: string;
  created_at?: string | null;
};

export type Prediction = {
  status: string;
  report_id: number;
  image_url?: string;
  defect_type: string;
  confidence_score: number;
  detection_count: number;
  detections: unknown[];
};

export type RoadScanUser = { id: number; email: string; username: string; points: number; level: string; role: "admin" | "citizen"; created_at?: string | null };
export type AuthSession = { access_token: string; token_type: "bearer"; expires_in: number; user: RoadScanUser };

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export async function getReports(): Promise<Report[]> {
  const pageSize = 100;
  const reports: Report[] = [];
  for (let skip = 0; ; skip += pageSize) {
    const response = await fetch(`${API_URL}/api/v1/reports?skip=${skip}&limit=${pageSize}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load reports (${response.status}).`);
    const page: Report[] = await response.json();
    reports.push(...page);
    if (page.length < pageSize) return reports;
  }
}

export async function getCurrentUser(): Promise<RoadScanUser> {
  const token = getAccessToken();
  if (!token) throw new Error("Sign in to continue.");
  const response = await fetch(`${API_URL}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { clearSession(); throw new Error(data.detail || "Your session has expired."); }
  return data as RoadScanUser;
}

export async function getAdminReports(): Promise<Report[]> {
  const token = getAccessToken();
  if (!token) throw new Error("Sign in as an administrator.");
  const response = await fetch(`${API_URL}/api/v1/admin/reports?skip=0&limit=250`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `Could not load admin reports (${response.status}).`);
  return data as Report[];
}

export async function submitPotholeReport(file: File, latitude: number, longitude: number): Promise<Prediction> {
  const token = getAccessToken();
  if (!token) throw new Error("Sign in before submitting a report.");
  const body = new FormData();
  body.append("file", file);
  body.append("latitude", String(latitude));
  body.append("longitude", String(longitude));
  const response = await fetch(`${API_URL}/api/v1/predict`, { method: "POST", body, headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `Report submission failed (${response.status}).`);
  return data as Prediction;
}

export function getAccessToken() { return typeof window === "undefined" ? null : window.sessionStorage.getItem("roadscan_access_token"); }
export function getSavedUser(): RoadScanUser | null {
  if (typeof window === "undefined") return null;
  try { const value = window.sessionStorage.getItem("roadscan_user"); return value ? JSON.parse(value) as RoadScanUser : null; } catch { return null; }
}
export function saveSession(session: AuthSession) {
  window.sessionStorage.setItem("roadscan_access_token", session.access_token);
  window.sessionStorage.setItem("roadscan_user", JSON.stringify(session.user));
}
export function clearSession() { window.sessionStorage.removeItem("roadscan_access_token"); window.sessionStorage.removeItem("roadscan_user"); }
export async function registerAccount(email: string, username: string, password: string): Promise<AuthSession> {
  return authRequest("/api/v1/auth/register", { email, username, password });
}
export async function loginAccount(email: string, password: string): Promise<AuthSession> {
  const body = new URLSearchParams({ username: email, password });
  return authRequest("/api/v1/auth/login", body, true);
}
async function authRequest(path: string, body: object | URLSearchParams, form = false): Promise<AuthSession> {
  const response = await fetch(`${API_URL}${path}`, { method: "POST", headers: form ? { "Content-Type": "application/x-www-form-urlencoded" } : { "Content-Type": "application/json" }, body: form ? body.toString() : JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `Account request failed (${response.status}).`);
  return data as AuthSession;
}

export function formatReportDate(value?: string | null) {
  if (!value) return "Just now";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Recently" : new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function isAlgeriaCoordinate(latitude: number, longitude: number) {
  return latitude >= 18.9 && latitude <= 37.2 && longitude >= -8.7 && longitude <= 12.1;
}
