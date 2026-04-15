# 🛡️ Omni-SRE — Frontend Dashboard

> **React + Vite frontend for the Context-Aware Code Review & Security Agent**

[![Vite](https://img.shields.io/badge/Build-Vite-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev)
[![React](https://img.shields.io/badge/UI-React-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Auth-Supabase-22c55e?style=for-the-badge&logo=supabase)](https://supabase.com)

---

## 📂 Branch Structure

| Branch | Contains | Owner |
|---|---|---|
| `main` | Full stack (backend + frontend + infra) | Backend team |
| `frontend/ui-overhaul` | **Frontend only** (this branch) | Frontend / UI team |

> This branch contains **only** the React dashboard code. Backend services (`backend/`, `server/`, `ai-engine/`) live on the `main` branch and communicate with this frontend via RESTful APIs.

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Fill in your Supabase and API URL values
```

### 3. Start Development Server

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`.

---

## 🔗 API Connectivity

The frontend communicates with the backend through two channels:

### RESTful API (`src/services/api.js`)
- Uses `axios` with automatic Supabase JWT token injection
- Configurable via `VITE_API_URL` environment variable
- Endpoints: Workspaces, Repositories, Reviews, Incidents, Health

### Supabase Direct (`src/lib/supabase.js`)
- Direct database queries for real-time dashboard data
- Handles authentication (sign-up, sign-in, session management)
- Configurable via `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

---

## 📁 Project Structure

```
├── index.html              # Vite entry point
├── package.json            # Frontend dependencies
├── tsconfig.json           # TypeScript configuration
├── playwright.config.ts    # E2E test configuration
├── public/                 # Static assets (favicon, icons, logo)
├── src/
│   ├── main.jsx            # React DOM mount
│   ├── App.jsx             # Root component + routing
│   ├── index.css           # Global styles & design system
│   ├── style.css           # Additional styles
│   ├── lib/
│   │   └── supabase.js     # Supabase client initialization
│   ├── services/
│   │   └── api.js          # REST API layer (axios)
│   ├── pages/
│   │   ├── Auth.jsx        # Login / Sign-up
│   │   ├── Dashboard.jsx   # Main workspace dashboard
│   │   ├── NewReview.jsx   # Trigger new code review
│   │   ├── ReviewDetail.jsx# Review result viewer
│   │   ├── ReviewDashboard.jsx # Interactive demo
│   │   └── IncidentForm.jsx# Log security incident
│   └── assets/             # Images and SVGs
├── e2e/                    # Playwright E2E tests
└── tests/                  # Unit/integration tests
```

---

## 🧪 Testing

```bash
# Run E2E tests
npx playwright test

# Run with UI mode
npx playwright test --ui
```

---

*Omni-SRE: The Context-Aware SRE Agent.*
