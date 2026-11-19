"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { MapPin } from "lucide-react";
import { Report, formatReportDate, isAlgeriaCoordinate } from "@/lib/roadscan-api";

type Props = { reports: Report[] };

function reportPin() {
  return L.divIcon({
    className: "roadscan-map-pin",
    html: "<span><i></i></span>",
    iconSize: [24, 32],
    iconAnchor: [12, 30],
    popupAnchor: [0, -28],
  });
}

function popupContent(report: Report) {
  const container = document.createElement("div");
  container.className = "map-popup";
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
      zoom: 5.1,
      minZoom: 5.1,
      maxZoom: 18,
      maxBounds: algeriaBounds,
      maxBoundsViscosity: 1,
      scrollWheelZoom: true,
      zoomControl: true,
      attributionControl: true,
    });
    mapInstance.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      noWrap: true,
      bounds: algeriaBounds,
      minZoom: 5,
      maxZoom: 19,
    }).addTo(map);
    const layer = L.layerGroup().addTo(map);
    reportLayer.current = layer;

    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(element);
    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstance.current = null;
      reportLayer.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = reportLayer.current;
    if (!layer) return;
    layer.clearLayers();
    for (const report of mapReports) {
      L.marker([report.latitude, report.longitude], { icon: reportPin(), keyboard: true })
        .bindPopup(popupContent(report), { maxWidth: 220 })
        .addTo(layer);
    }
  }, [mapReports]);

  return (
    <div className="map-frame" aria-label="Map of submitted pothole reports in Algeria">
      <div ref={mapElement} className="leaflet-map" role="application" aria-label="Interactive map of Algeria" />
      <div className="map-attribution-note"><MapPin size={13} /> {mapReports.length} submitted {mapReports.length === 1 ? "location" : "locations"}</div>
    </div>
  );
}
