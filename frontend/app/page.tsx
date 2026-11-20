"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, CircleAlert, LocateFixed, LogOut, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { RoadScanMark } from "@/components/roadscan-mark";
import { toast } from "sonner";
import { clearSession, getReports, getSavedUser, isAlgeriaCoordinate, Report, RoadScanUser, submitPotholeReport } from "@/lib/roadscan-api";
import "./report.css";

const ReportMap = dynamic(() => import("./ReportMap"), {
  ssr: false,
  loading: () => <div className="rs-map-loading"><span className="rs-spinner" />Loading map…</div>,
});
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
  const [userReady, setUserReady] = useState(false);
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
    const timer = window.setTimeout(() => { setCurrentUser(getSavedUser()); setUserReady(true); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);
  useEffect(() => () => { cameraStream.current?.getTracks().forEach((track) => track.stop()); }, []);
  useEffect(() => {
    if (cameraActive && videoRef.current && cameraStream.current) videoRef.current.srcObject = cameraStream.current;
  }, [cameraActive]);
  useEffect(() => {
    if (!cameraActive) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [cameraActive]);

  const mapReports = useMemo(() => reports.filter((report) => report.status !== "clear" && report.detection_count > 0 && isAlgeriaCoordinate(report.latitude, report.longitude)), [reports]);

  async function startCamera() {
    setFormError(""); setNotice("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setFormError("The camera needs a secure page. Open RoadScan on HTTPS or localhost.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      cameraStream.current = stream;
      setCameraActive(true);
    } catch (error) {
      setFormError(
        error instanceof Error && error.name === "NotAllowedError"
          ? "Camera access was blocked. Allow the camera in your browser settings, then try again."
          : "No camera available. Check that another app isn’t using it, then try again."
      );
    }
  }

  function stopCamera() {
    cameraStream.current?.getTracks().forEach((track) => track.stop());
    cameraStream.current = null;
    setCameraActive(false);
  }

  function resetShot() {
    setFile(null); setPreview(""); setMetadataState("idle"); setLocationSource(""); setLatitude(""); setLongitude("");
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
    if (!video || !video.videoWidth || !video.videoHeight) { setFormError("The camera is still starting. Try again in a moment."); return; }
    setFormError(""); setNotice(""); setMetadataState("reading"); setLocationSource(""); setLatitude(""); setLongitude("");
    const locationPromise = readCaptureLocation();
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1920 / video.videoWidth, 1440 / video.videoHeight);
    canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) { setMetadataState("idle"); setFormError("Couldn’t capture the photo. Try again."); return; }
    if (blob.size > MAX_IMAGE_SIZE) { setMetadataState("idle"); setFormError("The photo is over 10 MB. Retake it at a lower resolution."); return; }

    const photo = new File([blob], `roadscan-${Date.now()}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
    setFile(photo); setPreview(URL.createObjectURL(photo)); stopCamera();
    const coordinates = await locationPromise;
    if (coordinates) {
      setLatitude(coordinates.latitude.toFixed(6)); setLongitude(coordinates.longitude.toFixed(6));
      setLocationSource("device"); setMetadataState("found");
    } else {
      setMetadataState("missing"); setFormError("Your location wasn’t available. Tap “Use my current location” to continue.");
    }
  }

  function useCurrentLocation() {
    setFormError(""); setNotice("");
    if (!navigator.geolocation) { setFormError("This browser can’t share your location. Try another browser."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!isAlgeriaCoordinate(coords.latitude, coords.longitude)) { setFormError("Your location is outside Algeria. Go to the pothole and try again."); setLocating(false); return; }
        setLatitude(coords.latitude.toFixed(6)); setLongitude(coords.longitude.toFixed(6)); setLocationSource("device"); setMetadataState("found"); setLocating(false);
      },
      () => { setFormError("Location access was blocked. Allow location in your browser settings, then try again."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFormError(""); setNotice("");
    if (!file) { setFormError("Take a photo of the pothole first."); return; }
    const lat = Number(latitude.trim().replace(",", ".")), lon = Number(longitude.trim().replace(",", "."));
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !isAlgeriaCoordinate(lat, lon)) { setFormError("Attach a location in Algeria before sending."); return; }
    setSubmitting(true);
    try {
      const response = await submitPotholeReport(file, lat, lon);
      toast.success("Report sent", { description: `RS-${String(response.report_id).padStart(4, "0")} is now on the map. Thank you.` });
      await refreshReports();
      resetShot();
    } catch (error) { setFormError(error instanceof Error ? error.message : "Couldn’t send your report. Try again."); }
    finally { setSubmitting(false); }
  }

  const count = mapReports.length;
  const locationDone = metadataState === "found" || locationSource === "device";

  return (
    <main className="rs-app">
      <header className="rs-header">
        <Link className="rs-brand" href="/" aria-label="RoadScan home">
          <span className="rs-mark"><RoadScanMark /></span>
          <span className="rs-wordmark">Road<b>Scan</b></span>
        </Link>
        <div className="rs-user">
          {currentUser ? (
            <>
              <span className="rs-username">{currentUser.username}</span>
              {currentUser.role === "admin" && <Link className="rs-chip-btn" href="/admin"><ShieldCheck size={16} /><span className="rs-label">Admin</span></Link>}
              <button className="rs-chip-btn" type="button" aria-label="Sign out" onClick={() => { clearSession(); setCurrentUser(null); }}>
                <LogOut size={16} /><span className="rs-label">Sign out</span>
              </button>
            </>
          ) : userReady ? (
            <Link className="rs-chip-btn rs-chip-accent" href="/account">Sign in</Link>
          ) : null}
        </div>
      </header>

      <div className="rs-stage">
        <section className="rs-map-wrap" aria-label="Pothole map">
          <ReportMap reports={reports} />
          <div className="rs-count" role="status"><i />{loading ? "Loading reports…" : `${count} ${count === 1 ? "pothole" : "potholes"} reported`}</div>
          {loadError && (
            <div className="rs-map-error" role="alert">
              <CircleAlert size={16} /><span>Couldn’t load reports.</span>
              <button type="button" onClick={() => void refreshReports()}>Retry</button>
            </div>
          )}
        </section>

        <section className="rs-panel" aria-labelledby="report-heading">
          <div className="rs-grabber" aria-hidden="true" />
          <h1 id="report-heading">Report a pothole</h1>
          <p className="rs-lede">Take a photo where it is. We add your location and put it on the map for everyone in Algeria.</p>

          <form onSubmit={submitReport}>
            {!preview ? (
              <>
                {userReady && !currentUser ? (
                  <Link className="rs-primary" href="/account">Sign in to report</Link>
                ) : (
                  <button type="button" className="rs-primary" onClick={startCamera}><Camera size={22} />Open camera</button>
                )}
                <p className="rs-safe"><TriangleAlert size={16} />Report only when it’s safe to stop.</p>
              </>
            ) : (
              <>
                <div className="rs-shot">
                  <Image src={preview} alt="Photo of the pothole" fill unoptimized className="rs-shot-img" />
                  <button type="button" className="rs-retake" aria-label="Retake photo" onClick={() => { resetShot(); void startCamera(); }}>
                    <Camera size={16} />Retake
                  </button>
                </div>

                <ul className="rs-checks">
                  <li data-state="done"><span className="rs-dot"><Check size={16} /></span>Photo taken</li>
                  <li data-state={metadataState === "reading" ? "busy" : locationDone ? "done" : "warn"}>
                    <span className="rs-dot">
                      {metadataState === "reading" ? <span className="rs-spinner" /> : locationDone ? <Check size={16} /> : <CircleAlert size={16} />}
                    </span>
                    {metadataState === "reading" ? "Getting your location…" : locationDone ? "Location attached" : "Location not found"}
                  </li>
                </ul>

                {metadataState === "missing" && (
                  <button className="rs-secondary" type="button" onClick={useCurrentLocation} disabled={locating || cameraActive}>
                    <LocateFixed size={18} />{locating ? "Finding your location…" : "Use my current location"}
                  </button>
                )}
              </>
            )}

            {formError && <div className="rs-msg rs-msg-error" role="alert"><CircleAlert size={16} />{formError}</div>}
            {notice && <div className="rs-msg rs-msg-ok" role="status"><Check size={16} />{notice}</div>}

            {preview && (
              <button className="rs-primary" type="submit" disabled={!currentUser || submitting || metadataState === "reading"}>
                {submitting ? "Sending…" : currentUser ? "Send report" : "Sign in to send"}
              </button>
            )}
            <p className="rs-privacy">Your browser asks before using the camera and location.</p>
          </form>
        </section>
      </div>

      {cameraActive && createPortal(
        <div className="rs-cam" role="dialog" aria-modal="true" aria-label="Camera">
          <video ref={videoRef} className="rs-cam-view" autoPlay muted playsInline aria-label="Live camera preview" />
          <div className="rs-cam-top">
            <button type="button" className="rs-cam-close" onClick={stopCamera}><X size={18} />Close</button>
            <span className="rs-cam-hint">Frame the pothole clearly</span>
          </div>
          <div className="rs-cam-bottom">
            <button type="button" className="rs-cam-shutter" aria-label="Take photo" onClick={capturePhoto} />
          </div>
        </div>,
        document.body,
      )}
    </main>
  );
}