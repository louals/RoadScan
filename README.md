# RoadScan

RoadScan is a community pothole reporting app for Algeria. The Next.js frontend captures a fresh photo from the live camera, attaches browser geolocation separately, and shows detected reports on an Algeria-only Leaflet map. FastAPI stores reports in Supabase PostgreSQL and uses the signed-in user as the report owner.

## Local setup

The backend reads its ignored root `.env` file. Copy `.env.example` to `.env` and fill in database and Cloudinary settings. `JWT_SECRET_KEY` must be a random value of at least 32 characters. The frontend reads `frontend/.env.local`; use `NEXT_PUBLIC_API_URL=http://127.0.0.1:8001` for this setup.

Install and run the backend:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

Open Swagger at [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs).

Run the frontend in another terminal:

```sh
cd frontend
npm install
npm run dev
```

Open the app at [http://localhost:3000](http://localhost:3000). Browser access to device location requires permission and a secure context; localhost qualifies during development.

## First administrator

The additive SQL migrations are in `migrations/`. For a new database setup, run them in order. To promote an existing table-created user and set that account's password, run this from the repository root and follow the prompts:

```sh
source .venv/bin/activate
python scripts/bootstrap_admin.py
```

The script stores only an Argon2 password hash and sets the selected user's role to `admin`. Admin sign-in redirects to `/admin`; both the admin page and its reports endpoint check the role. Public map reports remain available to everyone.

## Deployment

Set backend environment variables in the hosting provider, including `DATABASE_URL`, Cloudinary credentials, `JWT_SECRET_KEY`, and `FRONTEND_ORIGINS` (comma-separated exact origins). Set `NEXT_PUBLIC_API_URL` to the public backend URL in the frontend hosting environment, then rebuild the frontend. Keep secrets out of `NEXT_PUBLIC_*` variables and out of git.
