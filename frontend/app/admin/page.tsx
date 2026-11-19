"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, CircleAlert, Clock3, ExternalLink, MapPin, RefreshCw, Search, Shield, TriangleAlert , Activity } from "lucide-react";
import { Report, RoadScanUser, formatReportDate, getAdminReports, getCurrentUser } from "@/lib/roadscan-api";
import { RoadScanMark } from "@/components/roadscan-mark";

export default function AdminPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [admin, setAdmin] = useState<RoadScanUser | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setReports(await getAdminReports()); setError(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load reports."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    getCurrentUser().then((user) => {
      if (!active) return;
      if (user.role !== "admin") { window.location.replace("/"); return; }
      setAdmin(user);
      void refresh();
    }).catch(() => { if (active) window.location.replace("/account"); });
    return () => { active = false; };
  }, [refresh]);

  const pending = reports.filter((report) => report.status === "detected");
  const clear = reports.filter((report) => report.status === "clear");
  const filtered = useMemo(() => reports.filter((report) => {
    const matchesQuery = `${report.defect_type} ${report.id} ${report.latitude} ${report.longitude}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (filter === "all" || report.status === filter);
  }), [reports, query, filter]);

  if (!admin) return <main className="admin-app"><div className="admin-content"><p>Checking administrator access…</p></div></main>;

  return (
    <main className="admin-app">
      <header className="admin-header"><Link className="admin-brand" href="/"><span className="admin-brand-icon"><RoadScanMark/></span><span>RoadScan <small>ADMIN</small></span></Link><Link className="back-public" href="/"><ArrowLeft size={15}/> Public map</Link><div className="admin-user"><span className="admin-avatar">{admin.username.slice(0, 1).toUpperCase()}</span><span>{admin.username}</span></div></header>
      <div className="admin-content">
        <div className="admin-breadcrumb">ROADSCAN <span>/</span> ADMIN <span>/</span> <b>REPORTS</b></div>
        <div className="admin-title-row"><div><h1>Report review</h1><p>Review road issues submitted by the community.</p></div><button className="refresh-admin" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} className={loading ? "refresh-spin" : ""}/> Refresh</button></div>
        {error && <div className="admin-error"><CircleAlert size={16}/>{error}<button onClick={() => void refresh()}>Retry</button></div>}
        <section className="admin-metrics"><article><span>Total reports</span><b>{loading ? "—" : reports.length}</b><small><Activity size={12}/> Community submissions</small></article><article><span>Needs review</span><b className="attention-number">{loading ? "—" : pending.length}</b><small><TriangleAlert size={12}/> Detected road defects</small></article><article><span>Clear scans</span><b>{loading ? "—" : clear.length}</b><small><Shield size={12}/> No defect detected</small></article><article><span>Latest submission</span><b className="latest-value">{reports[0] ? formatReportDate(reports[0].created_at) : "—"}</b><small><Clock3 size={12}/> Most recent report</small></article></section>
        <section className="admin-reports-panel"><div className="admin-list-heading"><div><h2>Community reports <span>{reports.length}</span></h2><p>Newest submissions first</p></div><div className="admin-controls"><label className="admin-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports" aria-label="Search reports"/></label><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter report status"><option value="all">All statuses</option><option value="detected">Needs review</option><option value="clear">Clear</option></select></div></div>
          <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>REPORT</th><th>PHOTO</th><th>LOCATION</th><th>AI RESULT</th><th>CONFIDENCE</th><th>STATUS</th><th>SUBMITTED</th></tr></thead><tbody>{loading ? <tr><td colSpan={7} className="admin-table-state">Loading community reports…</td></tr> : filtered.length ? filtered.map((report) => <tr key={report.id}><td><b className="admin-report-id">RS-{String(report.id).padStart(4, "0")}</b><small>#{report.id}</small></td><td>{report.image_url ? <a className="admin-photo" href={report.image_url} target="_blank" rel="noreferrer"><Image src={report.image_url} alt={`Submitted report ${report.id}`} width={40} height={40} unoptimized/><ExternalLink size={12}/></a> : <span className="no-photo">No image</span>}</td><td><a className="admin-coordinate" href={`https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=16/${report.latitude}/${report.longitude}`} target="_blank" rel="noreferrer"><MapPin size={13}/><span>{report.latitude.toFixed(5)},<br/>{report.longitude.toFixed(5)}</span><ArrowUpRight size={12}/></a></td><td><b className="admin-defect">{report.defect_type || "Unknown"}</b><small>{report.detection_count} {report.detection_count === 1 ? "detection" : "detections"}</small></td><td><div className="admin-confidence"><span><i style={{width: `${Math.min(report.confidence_score <= 1 ? report.confidence_score * 100 : report.confidence_score, 100)}%`}}/></span>{Math.round(report.confidence_score <= 1 ? report.confidence_score * 100 : report.confidence_score)}%</div></td><td><span className={`admin-status ${report.status === "clear" ? "admin-status-clear" : "admin-status-review"}`}><i/>{report.status === "clear" ? "Clear" : "Review"}</span></td><td className="admin-date">{formatReportDate(report.created_at)}</td></tr>) : <tr><td colSpan={7} className="admin-table-state">{query || filter !== "all" ? "No reports match these filters." : "No community reports have been submitted yet."}</td></tr>}</tbody></table></div>
          <div className="admin-table-footer">Showing {filtered.length} of {reports.length} reports <span>Report status is assigned by the current prediction service.</span></div>
        </section>
        <footer className="admin-footer"><span>RoadScan Vision · Admin preview</span><Link href="/">Back to public community map <ArrowUpRight size={13}/></Link></footer>
      </div>
    </main>
  );
}
