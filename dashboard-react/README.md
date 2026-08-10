# CashFlow90 Dashboard

React 19, TypeScript, Vite, Tailwind CSS and Recharts presentation layer for persisted cashflow forecast results.

```bash
npm ci
npm run typecheck
npm run build
npm run dev
```

Use Node 22 or newer. To connect a Supabase project, create an uncommitted `.env.local`:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Without both values the dashboard intentionally renders deterministic synthetic fixtures and labels them as synthetic. The browser does not calculate forecasts; it reads immutable `forecast_runs` and `daily_forecasts` produced by the Python service. Production deployment still requires an approved tenant authorization/RLS design.
