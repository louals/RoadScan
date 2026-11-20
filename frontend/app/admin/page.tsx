"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  CircleAlert,
  Clock3,
  ExternalLink,
  LogOut,
  MapPin,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  TriangleAlert,
  X,
  ZoomIn,
} from "lucide-react";
import {
  Report,
  RoadScanUser,
  clearSession,
  formatReportDate,
  getAdminReports,
  getCurrentUser,
} from "@/lib/roadscan-api";
import { RoadScanMark } from "@/components/roadscan-mark";
import { toast } from "sonner";
import "../report.css";

export default function AdminPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [admin, setAdmin] = useState<RoadScanUser | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Report | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminReports();
      setReports(data);
      setError("");
    } catch (reason) {
      const msg = reason instanceof Error ? reason.message : "Could not load reports.";
      setError(msg);
      toast.error("Failed to load reports", { description: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((user) => {
        if (!active) return;
        if (user.role !== "admin") {
          window.location.replace("/");
          return;
        }
        setAdmin(user);
        void refresh();
      })
      .catch(() => {
        if (active) window.location.replace("/account");
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  const pending = useMemo(() => reports.filter((r) => r.status === "detected"), [reports]);
  const clear = useMemo(() => reports.filter((r) => r.status === "clear"), [reports]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesQuery =
        !q ||
        `${report.defect_type || ""} ${report.id} ${report.latitude} ${report.longitude}`
          .toLowerCase()
          .includes(q);
      const matchesFilter = filter === "all" || report.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [reports, query, filter]);

  if (!admin) {
    return (
      <main className="rs-admin-app">
        <header className="rs-header">
          <Link className="rs-brand" href="/" aria-label="RoadScan home">
            <span className="rs-mark">
              <RoadScanMark />
            </span>
            <span className="rs-wordmark">
              Road<b>Scan</b>
            </span>
            <span className="rs-admin-badge">
              <ShieldCheck size={14} /> ADMIN
            </span>
          </Link>
        </header>
        <div
          className="rs-admin-content"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
          }}
        >
          <div className="rs-map-loading" style={{ position: "static", color: "var(--dim)" }}>
            <span className="rs-spinner" />
            <span>Verifying administrator access…</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="rs-admin-app">
      <header className="rs-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link className="rs-brand" href="/" aria-label="RoadScan home">
            <span className="rs-mark">
              <RoadScanMark />
            </span>
            <span className="rs-wordmark">
              Road<b>Scan</b>
            </span>
          </Link>
          <span className="rs-admin-badge">
            <ShieldCheck size={14} /> ADMIN
          </span>
        </div>

        <div className="rs-user">
          <button
            className="rs-chip-btn"
            type="button"
            onClick={() => {
              void refresh();
              toast.info("Refreshing reports…");
            }}
            disabled={loading}
            title="Refresh reports"
          >
            <RefreshCw size={15} className={loading ? "rs-spinner" : ""} />
            <span className="rs-label">Refresh</span>
          </button>

          <Link className="rs-chip-btn" href="/">
            <MapPin size={15} />
            <span className="rs-label">Public map</span>
          </Link>

          <div
            className="rs-chip-btn"
            style={{ cursor: "default", background: "var(--asphalt-3)" }}
            title={`Signed in as ${admin.username}`}
          >
            <span className="rs-admin-avatar">
              {admin.username.slice(0, 1).toUpperCase()}
            </span>
            <span className="rs-username">{admin.username}</span>
          </div>

          <button
            className="rs-chip-btn"
            type="button"
            aria-label="Sign out"
            title="Sign out"
            onClick={() => {
              clearSession();
              window.location.assign("/");
            }}
          >
            <LogOut size={15} />
            <span className="rs-label">Sign out</span>
          </button>
        </div>
      </header>

      <div className="rs-admin-content">
        <div className="rs-admin-breadcrumb">
          <span>ROADSCAN</span>
          <i>/</i>
          <span>ADMIN CONSOLE</span>
          <i>/</i>
          <b>REPORTS</b>
        </div>

        <div className="rs-admin-title-row">
          <div>
            <h1>Road defect reports</h1>
            <p>
              Review community submissions, inspect AI detections, and track Algeria road
              quality.
            </p>
          </div>
        </div>

        {error && (
          <div className="rs-msg rs-msg-error" role="alert">
            <CircleAlert size={16} />
            <span style={{ flex: 1 }}>{error}</span>
            <button
              type="button"
              className="rs-chip-btn"
              style={{ minHeight: 32, padding: "0 10px", fontSize: 12 }}
              onClick={() => void refresh()}
            >
              Retry
            </button>
          </div>
        )}

        <section className="rs-metrics-grid" aria-label="Overview metrics">
          <article className="rs-metric-card">
            <div className="rs-metric-top">
              <span>Total reports</span>
              <Activity size={16} />
            </div>
            <b>{loading ? "—" : reports.length}</b>
            <div className="rs-metric-bottom">
              <span>Community submissions</span>
            </div>
          </article>

          <article className="rs-metric-card">
            <div className="rs-metric-top">
              <span>Needs review</span>
              <TriangleAlert size={16} style={{ color: "var(--paint)" }} />
            </div>
            <b className="rs-highlight-amber">{loading ? "—" : pending.length}</b>
            <div className="rs-metric-bottom">
              <span>Detected road defects</span>
            </div>
          </article>

          <article className="rs-metric-card">
            <div className="rs-metric-top">
              <span>Clear scans</span>
              <Shield size={16} style={{ color: "var(--ok)" }} />
            </div>
            <b className="rs-highlight-green">{loading ? "—" : clear.length}</b>
            <div className="rs-metric-bottom">
              <span>No defects detected</span>
            </div>
          </article>

          <article className="rs-metric-card">
            <div className="rs-metric-top">
              <span>Latest submission</span>
              <Clock3 size={16} />
            </div>
            <b className="rs-text-small">
              {loading ? "—" : reports[0] ? formatReportDate(reports[0].created_at) : "—"}
            </b>
            <div className="rs-metric-bottom">
              <span>Most recent report</span>
            </div>
          </article>
        </section>

        <section className="rs-panel-card" aria-labelledby="reports-panel-heading">
          <div className="rs-panel-header">
            <div className="rs-panel-heading">
              <h2 id="reports-panel-heading">
                Community reports
                <span className="rs-panel-count-tag">{reports.length}</span>
              </h2>
              <p>Ordered by newest submission first</p>
            </div>

            <div className="rs-admin-toolbar">
              <div className="rs-search-bar">
                <Search size={15} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search ID, defect, coordinates…"
                  aria-label="Search reports"
                />
                {query && (
                  <button
                    type="button"
                    className="rs-search-clear"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <select
                className="rs-select"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filter report status"
              >
                <option value="all">All statuses ({reports.length})</option>
                <option value="detected">Needs review ({pending.length})</option>
                <option value="clear">Clear scans ({clear.length})</option>
              </select>
            </div>
          </div>

          <div className="rs-table-container">
            <table className="rs-table">
              <thead>
                <tr>
                  <th>REPORT</th>
                  <th>PHOTO</th>
                  <th>LOCATION</th>
                  <th>AI RESULT</th>
                  <th>CONFIDENCE</th>
                  <th>STATUS</th>
                  <th>SUBMITTED</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="rs-table-state">
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span className="rs-spinner" />
                        <span>Loading community reports…</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length ? (
                  filtered.map((report) => {
                    const confidencePct = Math.round(
                      report.confidence_score <= 1
                        ? report.confidence_score * 100
                        : report.confidence_score
                    );

                    return (
                      <tr key={report.id}>
                        <td>
                          <div className="rs-report-id">
                            <b>RS-{String(report.id).padStart(4, "0")}</b>
                            <small>#{report.id}</small>
                          </div>
                        </td>

                        <td>
                          {report.image_url ? (
                            <button
                              type="button"
                              className="rs-photo-thumb"
                              onClick={() => setSelectedPhoto(report)}
                              title="Click to view full photo"
                            >
                              <Image
                                src={report.image_url}
                                alt={`Report ${report.id}`}
                                width={44}
                                height={44}
                                unoptimized
                              />
                              <span>
                                <ZoomIn size={14} />
                              </span>
                            </button>
                          ) : (
                            <span className="rs-no-photo">No image</span>
                          )}
                        </td>

                        <td>
                          <a
                            className="rs-coord-link"
                            href={`https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=16/${report.latitude}/${report.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Open in OpenStreetMap"
                          >
                            <MapPin size={13} />
                            <span>
                              {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                            </span>
                            <ArrowUpRight size={12} style={{ color: "var(--dim)" }} />
                          </a>
                        </td>

                        <td>
                          <div className="rs-defect-badge">
                            <b>{report.defect_type || "Unknown"}</b>
                            <small>
                              {report.detection_count}{" "}
                              {report.detection_count === 1 ? "detection" : "detections"}
                            </small>
                          </div>
                        </td>

                        <td>
                          <div className="rs-confidence-meter">
                            <div className="rs-confidence-track">
                              <div
                                className="rs-confidence-fill"
                                style={{
                                  width: `${Math.min(confidencePct, 100)}%`,
                                  background:
                                    report.status === "clear" ? "var(--ok)" : "var(--paint)",
                                }}
                              />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700 }}>
                              {confidencePct}%
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`rs-status-tag ${
                              report.status === "clear"
                                ? "rs-status-clear"
                                : "rs-status-review"
                            }`}
                          >
                            <i />
                            {report.status === "clear" ? "Clear" : "Needs Review"}
                          </span>
                        </td>

                        <td style={{ color: "var(--dim)" }}>
                          {formatReportDate(report.created_at)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="rs-table-state">
                      {query || filter !== "all"
                        ? "No reports match the selected filters."
                        : "No community reports have been submitted yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rs-panel-footer">
            <span>
              Showing <b>{filtered.length}</b> of <b>{reports.length}</b> reports
            </span>
            <span>Report defect status is evaluated by the RoadScan AI detection model.</span>
          </div>
        </section>

        <footer className="rs-admin-footer">
          <span>RoadScan Vision · Administrator Portal</span>
          <Link href="/">
            Public community map <ArrowUpRight size={13} />
          </Link>
        </footer>
      </div>

      {selectedPhoto && (
        <div
          className="rs-lightbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Photo inspection"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="rs-lightbox-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="rs-lightbox-close"
              onClick={() => setSelectedPhoto(null)}
              aria-label="Close photo preview"
            >
              <X size={18} />
            </button>

            <div className="rs-lightbox-img-wrap">
              {selectedPhoto.image_url && (
                <Image
                  src={selectedPhoto.image_url}
                  alt={`Report ${selectedPhoto.id}`}
                  fill
                  unoptimized
                  style={{ objectFit: "contain" }}
                />
              )}
            </div>

            <div className="rs-lightbox-body">
              <div>
                <b style={{ fontSize: 16, color: "var(--paint)" }}>
                  RS-{String(selectedPhoto.id).padStart(4, "0")}
                </b>
                <span
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: "var(--dim)",
                    marginTop: 2,
                    textTransform: "capitalize",
                  }}
                >
                  {selectedPhoto.defect_type || "Road defect"} ·{" "}
                  {selectedPhoto.detection_count} detection(s)
                </span>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {selectedPhoto.image_url && (
                  <a
                    className="rs-chip-btn"
                    href={selectedPhoto.image_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={14} />
                    <span>Open full photo</span>
                  </a>
                )}
                <a
                  className="rs-chip-btn rs-chip-accent"
                  href={`https://www.openstreetmap.org/?mlat=${selectedPhoto.latitude}&mlon=${selectedPhoto.longitude}#map=16/${selectedPhoto.latitude}/${selectedPhoto.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin size={14} />
                  <span>View on map</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
