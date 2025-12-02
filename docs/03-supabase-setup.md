# Supabase Setup

This document walks through the step-by-step setup of Supabase for the 90-Day Cash Flow Intelligence Engine.

---

## 1. Prerequisites

You’ll need:

- A Supabase account: https://supabase.com
- A new project (or an existing one you’re OK to use for this project)
- Access to the SQL editor in Supabase dashboard
- Local tools (optional):
  - `psql` CLI if you prefer running SQL from your terminal

---

## 2. Create a Supabase Project

1. Log in to Supabase.
2. Click **New project**.
3. Choose:
   - Name (e.g. `cashflow-intelligence`)
   - Database password
   - Region
4. Wait for the project to provision.

Once ready, note:

- **Project URL** (often called `SUPABASE_URL`)
- **anon public API key** (`SUPABASE_ANON_KEY`)
- (Optional) **service role key** (`SERVICE_ROLE_KEY`)

You’ll use these later for:

- n8n Supabase nodes
- The React dashboard `.env` file

---

## 3. Apply the Schema

You can apply the schema in two ways: **via Supabase SQL editor** or **via `psql`**.

### Option A: Using Supabase SQL Editor (Recommended)

1. In the Supabase dashboard, go to **SQL** → **New query**.
2. Open [`sql/schema.sql`](../sql/schema.sql) in your editor locally.
3. Copy the entire content and paste it into the Supabase SQL editor.
4. Click **Run**.

This will create all the necessary tables, indexes, and constraints.

### Option B: Using `psql`

1. Go to **Project Settings → Database** and copy the connection string.
2. From your terminal:

   ```bash
   psql "postgres://<user>:<password>@<host>:<port>/<database>" -f sql/schema.sql
