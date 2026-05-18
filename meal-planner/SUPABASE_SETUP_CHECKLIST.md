# Sync Setup Checklist

If sync isn't working across devices, work through this list — open Settings → Sync diagnostics on each device first to see exactly what's failing.

---

## On every device — make sure you're on the latest version

When you push new code, the PWA needs to refresh to pick it up.

- [ ] On each device, fully close the app (force-quit / swipe away on phone)
- [ ] Reopen — you should see the **"New version available"** banner at the top
- [ ] Tap **Refresh**

If you never see the banner, the device might be running fully cached code from before update detection was added. Last resort: **uninstall the PWA and reinstall** from the browser.

---

## In Supabase — verify Realtime is enabled on the table

This is the most common cause of broken sync. Realtime is **not enabled by default**.

- [ ] Open your Supabase project
- [ ] Go to **Database → Replication** in the left sidebar
- [ ] Find the `planner_state` table
- [ ] Toggle **Enable** if it's off
- [ ] Make sure both **INSERT** and **UPDATE** events are checked

Without this, changes save to the database but realtime events never fire on other devices.

---

## In Supabase — verify RLS policies allow anon access

If Row Level Security is on with no policy, all writes silently fail.

- [ ] Go to **Authentication → Policies** in the left sidebar
- [ ] Find `planner_state` table
- [ ] You should have a policy like:
  - **Name:** "Allow anon access"
  - **Target:** anon
  - **USING:** `true`
  - **WITH CHECK:** `true`
  - **Operations:** SELECT, INSERT, UPDATE, DELETE

Or simpler — disable RLS on this table (it's just one shared household record so RLS isn't really protecting anything).

---

## In Vercel — verify environment variables are set

- [ ] Open your Vercel project → **Settings → Environment Variables**
- [ ] These three must all be present:
  - `VITE_SUPABASE_URL` — your Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` — your Supabase anon (public) key
  - `VITE_HOUSEHOLD_ID` — any string, identifies your shared data (`rhodri-becky` or similar)
- [ ] These must be set for **all environments** (Production, Preview, Development)
- [ ] After adding any new ones, **redeploy** — env vars only take effect on the next build

---

## On every device — run the diagnostic

Open the app → cog icon (top-left) → **Sync diagnostics** section.

Each device should show:

- **Supabase configured:** ✓ yes
- **Household ID:** the same value on all devices
- **Realtime:** `subscribed`
- **Last save:** a recent timestamp
- **Last load:** a recent timestamp

Then tap **Test write** on one device. If it succeeds, you should see "Realtime msgs received" go up on the other devices within a few seconds. If it doesn't:

- If "Realtime msgs received" stays at 0 on other devices → **Replication not enabled in Supabase** (see above)
- If "Test write" fails with permission error → **RLS policy missing or blocking** (see above)
- If a device shows "Supabase configured: NO" → **env vars not loaded** (force-quit and reopen, or reinstall PWA)

---

## Polling fallback

Even if Realtime is broken, the app polls Supabase every 20 seconds while open. So sync will work, just with up to 20s delay. If two devices have different data and you want one to catch up immediately, use **Pull from server now** in Settings.

---

## Last resort: hard reset one device

If a device has gotten really out of sync and you want it to match the server exactly:

- Settings → **Hard reset: replace local with server**

This wipes whatever's saved on that device and pulls a fresh copy from Supabase. Use this on the device with the stale data, NOT the device with the good data.
