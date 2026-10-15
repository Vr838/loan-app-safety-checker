# Production Deployment Guide

This guide describes how to deploy the **Loan App Safety Checker** platform to modern cloud infrastructure: Next.js on **Vercel**, FastAPI on **Render** (or Railway), and a managed **PostgreSQL** database on Supabase or Neon.

---

## 1. Architecture & Hosting Topology

```
┌─────────────────────────────────┐
│     Next.js 14+ Frontend        │  ▶ Hosted on Vercel
│     (SSR, Edge CDN, React 19)   │  ▶ Environment: NEXT_PUBLIC_API_BASE_URL
└────────────────┬────────────────┘
                 │ HTTPS REST API
                 ▼
┌─────────────────────────────────┐
│     FastAPI Backend API         │  ▶ Hosted on Render / Railway
│     (Python 3.11, Uvicorn)      │  ▶ Worker: Async BackgroundTasks / CLI
└────────────────┬────────────────┘
                 │ Connection Pool (asyncpg)
                 ▼
┌─────────────────────────────────┐
│     Managed PostgreSQL 15+      │  ▶ Hosted on Supabase / Neon
│     (Schema, Alembic Migrations)│  ▶ Tables: apps, reviews, evidence, ...
└─────────────────────────────────┘
```

---

## 2. Step 1: Provisioning the Database (PostgreSQL)

1. Create a PostgreSQL 15+ project on [Supabase](https://supabase.com) or [Neon](https://neon.tech).
2. Retrieve the standard connection string:
   ```text
   postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres
   ```
3. Prepare the two required format strings:
   - **Async URL (used by FastAPI):**  
     `postgresql+asyncpg://postgres:[PASSWORD]@[HOST]:5432/postgres`
   - **Sync URL (used by Alembic migrations):**  
     `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`

---

## 3. Step 2: Deploying the Backend to Render or Railway

### 3.1 Render Web Service Setup
1. Create a new **Web Service** in Render connected to your GitHub repository.
2. Configure build and start settings:
   - **Root Directory:** `backend`
   - **Environment:** `Python`
   - **Build Command:**  
     ```bash
     pip install -r requirements.txt && alembic upgrade head
     ```
   - **Start Command:**  
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
3. Add Environment Variables in Render Dashboard:
   | Variable | Example Value | Description |
   | :--- | :--- | :--- |
   | `ENVIRONMENT` | `production` | Deployment mode |
   | `DATABASE_URL` | `postgresql+asyncpg://...` | Async SQLAlchemy connection |
   | `SYNC_DATABASE_URL` | `postgresql://...` | Sync Alembic connection |
   | `ADMIN_API_TOKEN` | `[RANDOM_64_CHAR_HEX]` | Secret token for admin scan triggers |
   | `CORS_ORIGINS` | `https://your-frontend.vercel.app` | Whitelist deployed Vercel domain |
   | `EXTERNAL_SEARCH_PROVIDER`| `local_registry` (or `serpapi`)| Evidence provider |
   | `SEARCH_API_KEY` | `[OPTIONAL_API_KEY]` | Search provider API key |

### 3.2 Smoke Testing the Backend
Once deployed, verify the live API:
```bash
curl -f https://your-backend.onrender.com/health
```
Ensure the response returns:
```json
{
  "status": "ok",
  "database_connected": true,
  "collector_ready": true
}
```

---

## 4. Step 3: Deploying the Frontend to Vercel

1. Import your GitHub repository into [Vercel](https://vercel.com).
2. Set the **Root Directory** to `frontend`.
3. Framework Preset will auto-detect as `Next.js`.
4. Configure Environment Variables in Vercel:
   | Variable | Value | Description |
   | :--- | :--- | :--- |
   | `NEXT_PUBLIC_API_BASE_URL` | `https://your-backend.onrender.com` | Base URL of deployed FastAPI backend |
5. Click **Deploy**. Vercel will build the production bundle and assign a public `.vercel.app` domain.
6. Return to Render and update `CORS_ORIGINS` to match your exact Vercel production domain.

---

## 5. Post-Deployment Verification Checklist

- [ ] Open `https://your-frontend.vercel.app` in your browser.
- [ ] Confirm overview cards display non-zero metrics (or trigger `POST /api/v1/scans/admin/trigger` using the admin token to populate apps).
- [ ] Test searching for an app and inspecting detailed evidence and complaint themes.
- [ ] Open developer tools Network tab to ensure no client requests are leaking `DATABASE_URL` or `ADMIN_API_TOKEN`.
- [ ] Test that `/health` returns `200 OK` under load.
