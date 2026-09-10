# VizLoop Fullstack Deployment Guide (Vercel + GitHub)

This guide provides step-by-step instructions for deploying the **VizLoop** fullstack application to **Vercel** connected directly to your **GitHub** repository (`https://github.com/Dev-Nurul08/vizloop.git`).

---

## 1. Architecture Overview

VizLoop is built as a production-grade fullstack application:

- **Frontend**: React 19, Three.js 3D Execution View, Monaco Editor, Lucide Icons, and Vanilla CSS styled with Vite.
- **Backend API Layer**: Vercel Serverless Functions in `api/`:
  - `GET /api/health` — Service health check & environment state.
  - `GET/POST /api/trace` — Server-side code execution trace builder.
  - `GET/POST /api/assessment` — Assessment session creation and server-side scoring.
  - `GET/POST /api/progress` — Learner profile and progress synchronization.
- **Database Schema**: Production PostgreSQL / Supabase schema in `database/migrations/001_initial_schema.sql`.

---

## 2. GitHub Repository Preparation

Ensure your local repository is committed and pushed to GitHub:

```bash
# Check remote configuration
git remote -v
# Output should point to: https://github.com/Dev-Nurul08/vizloop.git

# Verify clean workspace and latest push
git status
git push origin main
```

---

## 3. Deploying to Vercel via GitHub

### Step 1: Connect Repository to Vercel
1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **"Add New..."** -> **"Project"**.
3. Select **GitHub** as your Git provider.
4. Import your repository: `Dev-Nurul08/vizloop`.

### Step 2: Configure Project Settings
- **Framework Preset**: `Vite`
- **Root Directory**: `./` (default)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 3: Configure Environment Variables
In the Vercel Project Setup screen (or under **Settings -> Environment Variables**), add the following environment variables:

| Variable Name | Type | Value / Purpose |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Client | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Client | `public-anon-key-for-browser` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-Only | `server-only-service-role-key` |
| `DATABASE_URL` | Server-Only | `postgresql://user:password@host:5432/vizloop` |
| `SANDBOX_API_KEY` | Server-Only | `server-only-sandbox-key` |
| `POSTHOG_KEY` | Client | `public-product-analytics-key` |
| `SENTRY_DSN` | Client/Server | `error-monitoring-dsn` |

### Step 4: Deploy
Click **"Deploy"**. Vercel will:
1. Clone the repository from GitHub `main`.
2. Install dependencies (`npm install`).
3. Build the frontend (`npm run build` -> outputting to `dist`).
4. Mount the serverless functions in `api/`.
5. Provide a production URL (e.g., `https://vizloop.vercel.app`).

---

## 4. Database Setup (Supabase / Managed PostgreSQL)

1. Create a project on [Supabase](https://supabase.com) or any managed PostgreSQL host.
2. Open the **SQL Editor**.
3. Execute the schema migration script located at `database/migrations/001_initial_schema.sql`.
4. Copy your project connection strings into your Vercel Environment Variables.

---

## 5. Verification & Testing

After deployment, test your live Vercel application:

### Frontend Check
- Open your Vercel deployment URL (`https://<your-project>.vercel.app`).
- Navigate through the Splash Screen, Learning Hub, 3D Visualizer, Skill Assessment, and Games Hub.

### Backend Serverless API Check
- Test Health API: `https://<your-project>.vercel.app/api/health`
- Test Trace API: `POST https://<your-project>.vercel.app/api/trace` with JSON `{"code": "for (let i = 1; i <= 5; i++) { console.log(i); }"}`
- Test Assessment API: `GET https://<your-project>.vercel.app/api/assessment`

---

## 6. Continuous Deployment (CI/CD)

Any future `git push origin main` will automatically trigger a production deployment on Vercel!
