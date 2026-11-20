"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { Report, formatReportDate, isAlgeriaCoordinate } from "@/lib/roadscan-api";

type Props = { reports: Report[] };

function reportPin() {
  return L.divIcon({
    className: "rs-pin",
    html: "<span><i></i></span>",
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    popupAnchor: [0, -32],
  });
}

function popupContent(report: Report) {
  const container = document.createElement("div");
  container.className = "rs-pop";
  if (report.image_url) {
    const image = document.createElement("img");
    image.src = report.image_url;
    image.alt = "Submitted road issue";
    container.append(image);
  }
  const title = document.createElement("b");
  title.textContent = report.defect_type || "Pothole";
  const description = document.createElement("p");
  description.textContent = report.description || `${report.detection_count} road defect${report.detection_count === 1 ? "" : "s"} reported`;
  const date = document.createElement("small");
  date.textContent = formatReportDate(report.created_at);
  container.append(title, description, date);
  return container;
}

export default function ReportMap({ reports }: Props) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const reportLayer = useRef<L.LayerGroup | null>(null);
  const mapReports = useMemo(() => reports.filter((report) =>
    report.status !== "clear" && report.detection_count > 0 && isAlgeriaCoordinate(report.latitude, report.longitude)
  ), [reports]);

  useEffect(() => {
    const element = mapElement.current;
    if (!element) return;

    const algeriaBounds = L.latLngBounds([18.85, -8.75], [37.2, 12.15]);
    const map = L.map(element, {
      center: [28.2, 2.7],
      zoom: 5,
      zoomSnap: 0.1,
      maxZoom: 18,
      maxBounds: algeriaBounds.pad(0.1),
      maxBoundsViscosity: 1,
      scrollWheelZoom: true,
      zoomControl: false,
      attributionControl: true,
    });
    L.control.zoom({ position: "topright" }).addTo(map);
    mapInstance.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      noWrap: true,
      minZoom: 3,
      maxZoom: 19,
    }).addTo(map);
    const layer = L.layerGroup().addTo(map);
    reportLayer.current = layer;

    // Fit all of Algeria on any screen size (phones included), and don't allow zooming out past it.
    let isDestroyed = false;
    let rafId: number | null = null;

    const fitAlgeria = () => {
      if (isDestroyed || !mapInstance.current) return;
      const container = map.getContainer();
      if (!container || !container.clientWidth || !container.clientHeight) return;
      if (!map.getPane("mapPane")) return;

      try {
        map.invalidateSize();
        map.fitBounds(algeriaBounds, { animate: false });
        map.setMinZoom(map.getZoom());
      } catch {
        // Ignore transient layout or DOM detachment errors
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      if (isDestroyed || !mapInstance.current) return;
      try {
        map.invalidateSize();
      } catch {
        // Ignore
      }
    });
    resizeObserver.observe(element);

    map.whenReady(() => {
      if (isDestroyed) return;
      rafId = requestAnimationFrame(fitAlgeria);
    });

    return () => {
      isDestroyed = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      try {
        map.remove();
      } catch {
        // Ignore cleanup errors if map was already detached
      }
      mapInstance.current = null;
      reportLayer.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = reportLayer.current;
    if (!layer || !mapInstance.current) return;
    layer.clearLayers();
    for (const report of mapReports) {
      L.marker([report.latitude, report.longitude], { icon: reportPin(), keyboard: true })
        .bindPopup(popupContent(report), { maxWidth: 240 })
        .addTo(layer);
    }
  }, [mapReports]);

  return (
    <div className="rs-map-frame" aria-label="Map of submitted pothole reports in Algeria">
      <div ref={mapElement} className="rs-map" role="application" aria-label="Interactive map of Algeria" />
    </div>
  );
}