# 90-Day Cash Flow Intelligence Engine 💸

***
![alt text](https://img.shields.io/badge/React-19-blue?logo=react)

![alt text](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)

![alt text](https://img.shields.io/badge/Supabase-Postgres-green?logo=supabase)

![alt text](https://img.shields.io/badge/Tailwind-CSS-38bdf8?logo=tailwindcss)

![alt text](https://img.shields.io/badge/License-MIT-gray)


Stop flying blind. A composable financial operating system that replaces fragile Excel models with automated, scenario-based cash flow forecasting.

***

## Overview

The Cash Flow Intelligence Engine is a modern dashboard designed for CFOs and Founders. It ingests transactional data (Bank, Stripe, Payroll), detects burn patterns, and projects cash health 90 days into the future.

Unlike static spreadsheets, this application allows for dynamic **Scenario Planning** (e.g., "What if we hire 5 engineers next month?") and real-time **Working Capital** analysis.

## Key Features

- ⚡ **90-Day Horizon:** Automated baseline forecasts with "Best Case" and "Worst Case" volatility bands.  
- 🔮 **Scenario Planner:** Run "What-if" simulations to see the immediate impact of hiring, churn, or marketing spend on your runway.  
- 📊 **Working Capital Health:** Visual analysis of Accounts Receivable (AR) and Accounts Payable (AP) aging buckets to predict cash drag.  
- 🛡️ **Resilient Data Layer:** Waterfall loading approach fetching processed forecasts from Supabase; client-side ETL fallback; offline simulation data backup.  
- 🎨 **High-End Fintech UI:** Dark-mode-first aesthetic, responsive charts, collapsible navigation built with Tailwind CSS and Recharts.  

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite  
- **Styling:** Tailwind CSS (Slate/Dark theme), Lucide React (Icons)  
- **Visualization:** Recharts (Area, Line, Bar charts)  
- **Backend:** Supabase (PostgreSQL, Row Level Security)  
- **Data Pipeline:** n8n (for cron jobs and categorization automations)  

## Architecture

The system follows a composable "Modern Data Stack" approach:  

- **Ingestion:** Automated workflows (n8n) fetch data from Plaid (banks), Stripe (revenue), and QuickBooks (invoices).  
- **Storage:** Raw transactions and processed forecasts stored in Supabase.  
- **Intelligence:** Calculates runway, net burn, and probability-weighted collections.  
- **Presentation:** React renders actionable insights and dashboards.

## Database Schema (Supabase)

Core tables powering the app:  

- `daily_actuals`: Historical closing balances  
- `forecast_runs`: Versioned forecast executions  
- `daily_forecasts`: 90-day projection data rows  
- `scenarios`: User-defined simulation scenarios  
- `alert_events`: Triggers for low runway or large expenses  
- `bank_transactions`: Raw source data for client-side calculations  

## Getting Started

### Prerequisites

- Node.js 18+  
- npm or yarn  

### Installation

```bash
git clone https://github.com/yourusername/cashflow-intelligence.git
cd cashflow-intelligence
npm install
```

### Environment Setup

Create a `.env` file at root (optional if using hardcoded demo keys):  
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Running the Application

```bash
npm run dev
```

Open the app in your browser at [http://localhost:5173](http://localhost:5173).

## Usage Guide

- **Dashboard:** Monitor "Runway" KPI. Below 60 days triggers warnings.  
- **Scenarios:** Go to `/scenarios` to create new scenarios, adjust growth/burn parameters, and view forecast overlays.  
- **Working Capital:** View AR Aging chart to detect slowing collections (shift to 60-90 day bucket) signaling cash flow risks.

## Contributing

Contributions are welcome! To contribute:  

- Fork the repo  
- Create your feature branch (`git checkout -b feature/AmazingFeature`)  
- Commit your changes (`git commit -m 'Add some AmazingFeature'`)  
- Push to the branch (`git push origin feature/AmazingFeature`)  
- Open a Pull Request for review  

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.

***

Built for the Finance of the Future.
***

