# Deploy Dayflow

Dayflow uses two services: the Vite frontend and a Spring Boot API backed by MySQL. Vercel can host the frontend; the Java API and MySQL database need a separate host.

## Frontend on Vercel

Create a Vercel project from the GitHub repository and set its Root Directory to the folder containing this `package.json`.

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE_URL` set to the public HTTPS base URL of the deployed API, with no trailing slash

For local development, leave `VITE_API_BASE_URL` empty. Vite then proxies `/api` requests to `http://localhost:8080`.

## API and database

Build the API service from `backend/dayflow-api/Dockerfile`. Provision a MySQL 8 database and set these API environment variables:

- `DB_URL`: JDBC URL for the hosted MySQL database
- `DB_USER`: database username
- `DB_PASSWORD`: database password
- `APP_CORS_ALLOWED_ORIGINS`: comma-separated exact frontend origins, including the production Vercel domain
- `SESSION_COOKIE_SECURE=true`
- `SESSION_COOKIE_SAME_SITE=None` when the frontend and API are on different sites

Use HTTPS for both services. The API needs outbound access to the database and must be reachable from the browser at `VITE_API_BASE_URL`.

## Before launch

1. Deploy the API and database first, then confirm `GET /api/health` returns successfully over HTTPS.
2. Set the Vercel `VITE_API_BASE_URL` and API CORS/cookie settings to the deployed origins.
3. Deploy the Vercel frontend and verify account creation, sign-in, and saving a transaction.

Never commit `.env` files, database passwords, or production credentials. `.env.example` contains only frontend variable names and safe local defaults.
