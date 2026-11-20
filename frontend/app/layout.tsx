import type { Metadata } from "next";
import { Toaster } from "sonner";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import "./report.css";

export const metadata: Metadata = {
  title: "RoadScan | Algeria pothole map and reporting",
  description: "Report potholes in Algeria with a photo and location, or browse reported road issues on the map.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-[#121416] text-[#f3f2ee]">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}

