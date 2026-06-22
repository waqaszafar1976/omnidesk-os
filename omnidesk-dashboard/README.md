# Omnidesk Dashboard — Standalone Frontend

Colorful Monday/Salesforce-style dashboard for your Antigravity backend.

## What's inside

- React 18 + React Router 6
- Tailwind CSS + Radix UI primitives (shadcn-style)
- Recharts for charts
- Lucide for icons
- Axios for API calls
- Pre-wired to your Antigravity `/api/v1/*` endpoints with safe fallback to static data

## Folder structure to use

Place this folder next to your Antigravity backend:

```
Omnidesk OS/
├── backend/      ← your Antigravity backend
└── frontend/     ← this folder (rename omnidesk-dashboard → frontend)
```

## Setup (run once)

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env` and point `REACT_APP_API_URL` at your running backend
(default: `http://localhost:5000/api/v1`).

## Daily workflow

```bash
# Terminal 1 — start the backend (in /backend folder, however you run it)
npm run dev

# Terminal 2 — start the dashboard
cd frontend
npm start
```

Open `http://localhost:3000/dashboard` → log in with your seed credentials.

## CORS

Your backend MUST allow requests from `http://localhost:3000`. In Express:

```ts
import cors from 'cors';
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
```

## Backend endpoints the dashboard uses

All under `${REACT_APP_API_URL}`:

| Endpoint | Used by widget |
|---|---|
| `POST /auth/login` | Login modal |
| `GET  /analytics/kpis?view=admin\|user` | KPI cards |
| `GET  /analytics/usage-trend?range=7d` | Usage area chart |
| `GET  /analytics/workspace-distribution` | Pie chart + distribution cards |
| `GET  /analytics/top-workspaces?limit=4` | Top workspaces list |
| `GET  /analytics/recent-activity?limit=10` | Activity feed |
| `GET  /workspaces/default/members` | Team grid |
| `GET  /events?range=week` | Calendar events |
| `GET  /tasks?status=all` | My Tasks list |
| `GET  /pages?limit=5` | Recent Documents |

If any endpoint fails or returns empty, the UI falls back to demo static
data — the page never breaks.

## Where to edit what

| Task | File |
|---|---|
| Change a widget UI | `src/pages/DashboardPage.js` |
| Change API URLs / shape transforms | `src/lib/omnidesk-api.js` |
| Add/remove sidebar items | `Sidebar` component inside `DashboardPage.js` |
| Change color theme | `tailwind.config.js` + inline `from-X to-X` classes |
| Change static fallback data | top-of-file constants in `DashboardPage.js` |

## Production build

```bash
npm run build
```

Outputs to `build/`. Deploy that folder to Vercel, Netlify, Render, or any
static host.

## Troubleshooting

- **"Network error" on login** — backend not running, or `REACT_APP_API_URL` is wrong, or CORS not enabled.
- **Login succeeds but data is blank** — backend returned shape that doesn't match. Open browser DevTools → Network tab → inspect the failing call. Update the normalizer in `src/lib/omnidesk-api.js` (one line per field).
- **Yellow warning banner appears** — some endpoints returned errors. Other widgets use fallback static data. Check console for which endpoint failed.

Built with Emergent. Free to modify.
