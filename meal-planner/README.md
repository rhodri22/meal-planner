# Meal Planner

A personal meal planning app — recipe library, weekly planner, shopping list, and pantry tracker. Syncs in real time across all your devices.

---

## Setup overview

1. Create a free Supabase project (database + real-time sync)
2. Push the code to GitHub
3. Deploy to Vercel (one click, auto-detects Vite)
4. Add your Supabase credentials to Vercel's environment variables
5. Install the PWA on each device

---

## Step 1 — Supabase (database + real-time sync)

### 1a. Create a project

1. Go to [supabase.com](https://supabase.com) and sign up for free
2. Click **New project**, give it a name (e.g. `meal-planner`), set a database password, choose a region close to you
3. Wait ~2 minutes for it to provision

### 1b. Create the table

1. In your project, click **SQL Editor** in the left sidebar
2. Paste and run this SQL:

```sql
create table planner_state (
  id text primary key,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- Allow all reads and writes (access is gated by your HOUSEHOLD_ID secret)
alter table planner_state enable row level security;
create policy "Allow all"
  on planner_state for all
  using (true) with check (true);

-- Enable real-time on this table
alter publication supabase_realtime add table planner_state;
```

3. Click **Run**. You should see "Success. No rows returned."

### 1c. Copy your credentials

1. Go to **Project Settings** (gear icon) → **API**
2. Copy:
   - **Project URL** (looks like `https://xxxxxxxxxxxx.supabase.co`)
   - **anon / public** key (long JWT string under "Project API keys")

### 1d. Generate a Household ID

This is a random secret that groups all your devices together. Any random string works.

Generate one at [uuidgenerator.net](https://www.uuidgenerator.net) — copy the UUID it gives you.

---

## Step 2 — GitHub

1. Create a free account at [github.com](https://github.com) if you don't have one
2. Click **New repository** → name it `meal-planner` → **Create repository**
3. Open a terminal in this project folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/meal-planner.git
git push -u origin main
```

---

## Step 3 — Vercel deploy

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New → Project**
3. Import your `meal-planner` repo
4. **Before clicking Deploy**, expand **Environment Variables** and add these three:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | Your Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `VITE_HOUSEHOLD_ID` | The UUID you generated |

5. Click **Deploy**

Vercel gives you a URL like `https://meal-planner-abc.vercel.app`. Open this URL on every device — they all sync automatically because they share the same credentials.

---

## Step 4 — Install on each device (PWA)

### iPhone / iPad (Safari only)
1. Open your Vercel URL in **Safari** (must be Safari, not Chrome)
2. Tap the **Share** button (box with arrow pointing up)
3. Scroll down → **Add to Home Screen**
4. Tap **Add**

### Android (Chrome)
1. Open your Vercel URL in Chrome
2. Tap **⋮** (three dots) → **Add to Home screen** or **Install app**
3. Tap **Add**

---

## How sync works

- All devices connect to the same Supabase row via your `HOUSEHOLD_ID`
- Changes sync within ~1 second across all devices
- A small dot in the top-right corner shows sync status:
  - 🟢 Green — synced
  - 🟡 Amber spinning — saving
  - 🔴 Red — offline (saves locally, syncs automatically when back online)
- `localStorage` is kept as an offline cache so the app works without internet

---

## Pushing future updates

```bash
git add .
git commit -m "describe your change"
git push
```

Vercel redeploys automatically.

---

## Local development

```bash
cp .env.local.example .env.local
# fill in your Supabase URL, key, and household ID

npm install
npm run dev
```

Open `http://localhost:5173`.
