"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Camera, Check, CircleAlert, LocateFixed, MapPin, ShieldCheck, LogOut } from "lucide-react";
import { RoadScanMark } from "@/components/roadscan-mark";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { clearSession, getReports, getSavedUser, isAlgeriaCoordinate, Report, RoadScanUser, submitPotholeReport } from "@/lib/roadscan-api";

const ReportMap = dynamic(() => import("./ReportMap"), { ssr: false, loading: () => <div className="map-loading"><span className="map-loader"/>Loading Algeria map…</div> });
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStream = useRef<MediaStream | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationSource, setLocationSource] = useState<"device" | "">("");
  const [metadataState, setMetadataState] = useState<"idle" | "reading" | "found" | "missing">("idle");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<RoadScanUser | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const refreshReports = useCallback(async () => {
    setLoading(true);
    try { setReports(await getReports()); setLoadError(""); }
    catch (error) { setLoadError(error instanceof Error ? error.message : "Could not load reports."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshReports(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshReports]);
  useEffect(() => {
    const timer = window.setTimeout(() => setCurrentUser(getSavedUser()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);
  useEffect(() => () => { cameraStream.current?.getTracks().forEach((track) => track.stop()); }, []);
  useEffect(() => {
    if (cameraActive && videoRef.current && cameraStream.current) videoRef.current.srcObject = cameraStream.current;
  }, [cameraActive]);

  const mapReports = useMemo(() => reports.filter((report) => report.status !== "clear" && report.detection_count > 0 && isAlgeriaCoordinate(report.latitude, report.longitude)), [reports]);

  async function startCamera() {
    setFormError(""); setNotice("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setFormError("Live camera requires a secure page. Open RoadScan on localhost or HTTPS.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      cameraStream.current = stream;
      setCameraActive(true);
    } catch (error) {
      const message = error instanceof Error && error.name === "NotAllowedError"
        ? "Camera permission was denied. Allow camera access in your browser settings and try again."
        : "Could not open a camera. Check that a camera is available and not being used by another app.";
      setFormError(message);
    }
  }

  function stopCamera() {
    cameraStream.current?.getTracks().forEach((track) => track.stop());
    cameraStream.current = null;
    setCameraActive(false);
  }

  function readCaptureLocation(): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve(isAlgeriaCoordinate(coords.latitude, coords.longitude) ? { latitude: coords.latitude, longitude: coords.longitude } : null),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
      );
    });
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) { setFormError("Camera is still starting. Try again in a moment."); return; }
    setFormError(""); setNotice(""); setMetadataState("reading"); setLocationSource(""); setLatitude(""); setLongitude("");
    const locationPromise = readCaptureLocation();
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1920 / video.videoWidth, 1440 / video.videoHeight);
    canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) { setMetadataState("idle"); setFormError("Could not capture the image. Try again."); return; }
    if (blob.size > MAX_IMAGE_SIZE) { setMetadataState("idle"); setFormError("The camera image is over 10 MB. Retake it in a lower resolution."); return; }

    const photo = new File([blob], `roadscan-${Date.now()}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
    setFile(photo); setPreview(URL.createObjectURL(photo)); stopCamera();
    const coordinates = await locationPromise;
    if (coordinates) {
      setLatitude(coordinates.latitude.toFixed(6)); setLongitude(coordinates.longitude.toFixed(6));
      setLocationSource("device"); setMetadataState("found"); setNotice("Photo captured and current location attached.");
    } else {
      setMetadataState("missing"); setFormError("Photo captured. Location was unavailable, so use the location button below before submitting.");
    }
  }

  function useCurrentLocation() {
    setFormError(""); setNotice("");
    if (!navigator.geolocation) { setFormError("Location is not available in this browser. Allow location access or try another browser."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!isAlgeriaCoordinate(coords.latitude, coords.longitude)) { setFormError("Your current location is outside Algeria. Move to the report location and try again."); setLocating(false); return; }
        setLatitude(coords.latitude.toFixed(6)); setLongitude(coords.longitude.toFixed(6)); setLocationSource("device"); setMetadataState("found"); setNotice("Current location added."); setLocating(false);
      },
      () => { setFormError("Could not access your location. Allow location permission and try again."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFormError(""); setNotice("");
    if (!file) { setFormError("Take a live photo of the pothole to continue."); return; }
    const lat = Number(latitude.trim().replace(",", ".")), lon = Number(longitude.trim().replace(",", "."));
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !isAlgeriaCoordinate(lat, lon)) { setFormError("Add valid coordinates for a location in Algeria."); return; }
    setSubmitting(true);
    try {
      const response = await submitPotholeReport(file, lat, lon);
      toast.success("Pothole report submitted", { description: `Report RS-${String(response.report_id).padStart(4, "0")} is now on the map. Thank you.` });
      await refreshReports();
      setFile(null); setPreview(""); setLatitude(""); setLongitude(""); setLocationSource(""); setMetadataState("idle");
    } catch (error) { setFormError(error instanceof Error ? error.message : "Could not submit your report. Please try again."); }
    finally { setSubmitting(false); }
  }

  return (
    <main className="reporting-app">
      <header className="tool-header">
        <Link className="tool-brand" href="/" aria-label="RoadScan home"><span className="tool-brand-mark"><RoadScanMark/></span><span>Road<span>Scan</span></span></Link>
        <div className="tool-header-meta"><span className="map-live-dot"/>{loadError ? "Connecting…" : "Community map"}</div>
        <div className="tool-header-actions">{currentUser ? <><span className="signed-in-name">{currentUser.username}</span><button className="tool-admin-link" type="button" onClick={() => { clearSession(); setCurrentUser(null); }}><LogOut size={14}/> Sign out</button>{currentUser.role === "admin" && <Link className="tool-admin-link" href="/admin">Admin <ArrowRight size={14}/></Link>}</> : <Link className="tool-admin-link" href="/account">Sign in <ArrowRight size={14}/></Link>}</div>
      </header>

      <section className="tool-heading"><div><span className="tool-eyebrow">COMMUNITY ROAD REPORTING</span><h1>Report a pothole</h1><p>Share a photo and its location. Browse reports from across Algeria.</p></div><div className="tool-count"><span>{loading ? "—" : mapReports.length}</span><small>reported locations</small></div></section>

      <div className="report-map-grid">
        <section className="report-card" aria-labelledby="form-heading">
          <div className="card-heading"><span className="card-step">01</span><div><h2 id="form-heading">Add a report</h2><p>{currentUser ? "Take a live photo. We’ll attach your current location." : "Sign in, take a live photo, and attach its location."}</p></div></div>
          <form onSubmit={submitReport}>
            <div className={`photo-picker ${preview ? "photo-selected" : ""}`}>
              {preview ? <><Image src={preview} alt="Live camera photo of the pothole" fill unoptimized className="photo-preview"/><div className="photo-overlay"><span>{file?.name}</span><button type="button" aria-label="Retake pothole photo" onClick={() => { setFile(null); setPreview(""); setMetadataState("idle"); setLocationSource(""); setLatitude(""); setLongitude(""); void startCamera(); }}><Camera size={15}/> Retake</button></div></> : cameraActive ? <><video ref={videoRef} className="camera-live-view" autoPlay muted playsInline aria-label="Live camera preview"/><div className="camera-live-actions"><button type="button" className="camera-shutter" onClick={capturePhoto}><Camera size={16}/> Take photo</button><button type="button" className="camera-cancel" onClick={stopCamera}>Cancel</button></div></> : <button type="button" className="camera-open" onClick={startCamera}><span className="photo-icon"><Camera size={20}/></span><b>Open live camera</b><small>Take a fresh pothole photo</small></button>}
            </div>

            <div className="location-heading"><span className="form-label">Report location <em>*</em></span>{locationSource && <span className={`location-source source-${locationSource}`}><i/>Device GPS</span>}</div>
            <div className={`location-status ${metadataState === "found" || locationSource === "device" ? "location-found" : ""}`} role="status">
              {metadataState === "reading" ? <><span className="metadata-spinner"/> Capturing photo and location…</> : metadataState === "found" ? <><Check size={14}/> Current location attached to report</> : metadataState === "missing" ? <><CircleAlert size={14}/> Location unavailable. Use the fallback below.</> : <><MapPin size={14}/> Your location is attached separately from the photo.</>}
            </div>
            {metadataState === "missing" && <button className="location-fallback" type="button" onClick={useCurrentLocation} disabled={locating || cameraActive}>
              <span className="location-fallback-icon"><LocateFixed size={17}/></span>
              <span className="location-fallback-copy"><b>{locating ? "Finding your location…" : "Use my current location"}</b><small>Attach this device’s location to the report</small></span>
              <ArrowRight size={16} className="location-fallback-arrow"/>
            </button>}
            {formError && <div className="form-message form-error" role="alert"><CircleAlert size={15}/>{formError}</div>}
            {notice && <div className="form-message form-success" role="status"><Check size={15}/>{notice}</div>}
            <Button className="submit-report" type="submit" disabled={!currentUser || submitting || metadataState === "reading"}>{submitting ? "Submitting…" : currentUser ? "Submit pothole report" : "Sign in to submit a report"}<ArrowRight size={15}/></Button>
            <p className="location-privacy"><ShieldCheck size={12}/> Your browser asks before using the camera and location. Coordinates stay hidden in this form.</p>
          </form>
        </section>

        <section className="map-card" aria-labelledby="map-heading">
          <div className="map-card-top"><div><span className="card-step">02</span><div><h2 id="map-heading">Pothole map</h2><p>Submitted road issues across Algeria</p></div></div><span className="map-count"><i/>{loading ? "Loading" : `${mapReports.length} reports`}</span></div>
          {loadError && <div className="map-error"><CircleAlert size={14}/><span>Couldn’t load reports from the server.</span><button type="button" onClick={() => void refreshReports()}>Retry</button></div>}
          <div className="map-viewport"><ReportMap reports={reports}/></div>
          <div className="map-card-bottom"><span><i className="pin-legend"/> Detected pothole</span><span className="map-bottom-help">Select a pin for report details</span><span>Map data © OpenStreetMap</span></div>
        </section>
      </div>
      <footer className="tool-footer"><span>RoadScan <i>·</i> Algeria</span><span>Report only when safe to stop.</span>{currentUser?.role === "admin" && <Link href="/admin">Admin dashboard</Link>}</footer>
    </main>
  );
}
