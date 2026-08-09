# Dashboard Walkthrough

The application lives directly in `dashboard-react/` and has four routes.

## Dashboard

Displays the persisted current balance, frozen forecast as-of date, base/worst runway, next-30-day net cash, forecast tracks and alert examples. When Supabase configuration is absent, all values are deterministic fixtures and the layout visibly says **Synthetic demo**.

## Scenarios

Compares an immutable baseline run with a selected scenario run. Minimum-cash and runway deltas are calculated from the loaded series; the page does not use hard-coded business-impact claims.

## Working Capital

Displays stored AR/AP aging data. The reference view does not claim that collection probability or future payment behavior has been statistically validated.

## Case Study

Explains component ownership and evidence boundaries. It links to repository evidence rather than presenting invented time savings, early-warning windows or client outcomes.

## Data behavior

The frontend reads `daily_actuals`, `forecast_runs`, `daily_forecasts`, `scenarios`, `alert_events` and working-capital records. It does not recalculate a forecast in the browser. The `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables select configured mode; otherwise deterministic synthetic data is used.

Verify changes with `npm run typecheck`, `npm run build`, and a rendered browser pass through Dashboard and Scenarios.
