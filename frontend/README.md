# RoadScan frontend

Next.js App Router frontend built from the `nextjs-shadcn-tailwind-skeleton` template. Citizens can submit a road photo and coordinates, browse detected issues on a Leaflet map constrained to Algeria, and optionally use GPS coordinates read from the photo's metadata. The separate `/admin` route provides a read-only report review preview.

## Run locally

1. Start the FastAPI service from the repository root:

   ```bash
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```

2. Configure the browser-visible API URL and start the frontend:

   ```bash
   cd frontend
   cp .env.example .env.local
   npm ci
   npm run dev
   ```

  Open [http://localhost:3000](http://localhost:3000) for the public community map and report form, or [http://localhost:3000/admin](http://localhost:3000/admin) for the admin preview.

`NEXT_PUBLIC_API_URL` must point to the address the user's browser can reach. The frontend uses the live camera for fresh photos and attaches browser geolocation to the report separately (a browser camera capture does not reliably embed GPS in the image). Coordinates and the photo are submitted as `multipart/form-data` to `POST /api/v1/predict`; `GET /api/v1/reports` populates the map. Only positive detections with coordinates inside Algeria are shown as public map pins.

## Deployment

Set `NEXT_PUBLIC_API_URL` to the public HTTPS API URL at frontend build time. Set backend `FRONTEND_ORIGINS` to a comma-separated allowlist of deployed frontend origins (for example, `https://roadscan.example.com`). Keep database and Cloudinary credentials on the backend; never add them to `NEXT_PUBLIC_*` variables.

The public submission flow is anonymous; no account is required. The admin page is currently a read-only preview because the backend has no authentication, authorization, or report review endpoints. Add server-side admin authentication and role checks before exposing `/admin` as an operational admin tool.
