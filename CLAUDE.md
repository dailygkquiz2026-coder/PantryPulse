# PantryPulse — Project Context for Claude Code

## What This App Is
AI-powered kitchen companion. Tracks pantry inventory → predicts low stock → manages shopping lists → suggests recipes → tracks nutrition. Built for Indian households (prices in INR).

## Tech Stack
- **Frontend**: React 19 + Vite + Tailwind CSS 4 + Framer Motion
- **Backend**: Firebase Firestore (NoSQL) + Firebase Auth (Google OAuth)
- **AI**: Google Gemini API (`@google/genai`) — receipt scanning, expiry prediction, recipe gen, restock prediction
- **Price Search**: Serper API (Google Shopping) via `api/price/search.ts` serverless
- **Mobile**: Capacitor (`appId: com.pantrypulse.app`) — Android built, iOS not yet configured
- **Deploy**: Vercel (serverless functions in `api/`) + Cloud Run (AI Studio)
- **Notifications**: Firebase Cloud Messaging (FCM) with VAPID key

## Key Files
- `src/App.tsx` — 1690-line main orchestrator, all tab logic, Firestore listeners
- `src/services/geminiService.ts` — all Gemini API calls
- `src/types.ts` — TypeScript interfaces
- `src/firebase.ts` — Firebase init + error handling
- `api/price/search.ts` — serverless price search (server-side SERPER_API_KEY)
- `firestore.rules` — well-structured security rules with field whitelisting
- `capacitor.config.ts` — `appId: com.pantrypulse.app`, `androidScheme: https`
- `public/privacy-policy.html` — exists but insufficient (needs full rewrite)

## Firestore Collections
`inventory`, `shoppingList`, `userProfiles`, `households`, `savedRecipes`, `calorieLogs`, `fcmTokens`, `userActivityLogs`, `aiUsageLogs`, `scanFailures`, `deletedItems`, `feedback`

## User Tiers
`vanilla` (free) | `pro` (paid) — stored in `userProfiles.tier`

## Feature Tabs
Pantry → Shop → Cook → Health → Settings → Dev (admin: dailygkquiz2026@gmail.com only)

---

## Planned: Swiggy Instamart MCP Integration
**Status**: On hold — waiting for MCP access from Swiggy.

**Architecture agreed**:
- `api/swiggy/mcp-bridge.ts` — Vercel serverless MCP client (tool dispatcher)
- `api/swiggy/auth.ts` — Swiggy OAuth token exchange, stores refresh token in Firestore
- `api/swiggy/session.ts` — per-user cart session management
- `src/services/swiggyInstamartService.ts` — frontend API wrapper
- `src/components/InstamartPanel.tsx` — search + results UI
- `src/components/InstamartCart.tsx` — cart drawer
- `src/components/OrderTracker.tsx` — live order status

**Data flow**: Shopping list → Gemini maps items to Instamart SKUs → MCP search_products → user reviews → add_to_cart → checkout → track_order → on delivery: auto-update Firestore inventory (reuse existing `handleConfirmRestock` logic)

**Auth strategy**: Option A = Swiggy OAuth (full order placement). Option B (MVP) = guest cart + deep-link to Swiggy app.

**Redirect URIs to register when MCP access arrives**:
- `https://<APP_URL>/api/swiggy/auth/callback` (production, from `APP_URL` env var)
- `https://pantrypulse-*.vercel.app/api/swiggy/auth/callback` (Vercel preview)
- `http://localhost:5173/api/swiggy/auth/callback` (local dev)
- `com.pantrypulse.app://auth/callback` (Android Capacitor — needs intent filter in AndroidManifest)

**New Firestore collection**: `swiggy_orders` — `{ id, uid, cartItems, status, placedAt, deliveredAt, totalAmount, autoRestocked }`

**New ENV vars needed**: `SWIGGY_CLIENT_ID`, `SWIGGY_CLIENT_SECRET`, `SWIGGY_MCP_SERVER_URL`

---

## App Store Readiness Audit (completed 2026-04-25)

### CRITICAL — Blocks Both App Stores
1. **Gemini API key is CLIENT-SIDE EXPOSED**
   - `vite.config.ts:45` bundles it into the JS bundle via `process.env.GEMINI_API_KEY`
   - `src/services/geminiService.ts:28` uses it directly in browser
   - **Fix**: Create `api/gemini/proxy.ts` serverless (same pattern as `api/price/search.ts`)

2. **No in-app account deletion** — mandatory for both Apple (since 2023) and Google Play (since Dec 2023)
   - **Fix**: Add "Delete Account" to Settings tab → delete all Firestore docs for uid + `user.delete()`

3. **Privacy policy is insufficient** (`public/privacy-policy.html`)
   - Missing: health data (weight/height/BMR/TDEE), location tracking, activity logging, AI image processing, data retention, third-party processors, user rights
   - **Fix**: Full rewrite covering all data types, all third parties (Gemini, Serper, Firebase), retention policy, deletion rights

4. **No Terms of Service** — required by both stores
   - **Fix**: Create `public/terms.html`

### HIGH — Should Fix Before Submission (Both Stores)
5. **No explicit health data consent** before first save of weight/height/BMR/TDEE
   - **Fix**: One-time consent modal on first use of Health tab

6. **User lat/long silently logged** in `userActivityLogs` (`src/App.tsx:295,341`)
   - **Fix**: Remove from logs OR add opt-out toggle + privacy disclosure

7. **No rate limiting** on `api/price/search.ts`
   - **Fix**: Add `upstash/ratelimit` or Vercel KV — 20 req/min per user

### HIGH — iOS Specific
8. **iOS Capacitor config not configured**
   - `capacitor.config.ts` has no `ios: {}` block
   - No `Info.plist` customisation
   - **Fix**: `npx cap add ios`, add permission strings to Info.plist:
     - `NSCameraUsageDescription` — "Used to scan grocery receipts and identify food items"
     - `NSPhotoLibraryUsageDescription` — "Used to upload grocery receipts and meal photos"
     - `NSLocationWhenInUseUsageDescription` — "Used to find nearby grocery prices"
     - `NSUserNotificationsUsageDescription` — "Used to alert you when pantry items are running low"

### HIGH — Android Specific (Extra beyond iOS list)
9. **No Network Security Config** — iOS has ATS by default; Android needs explicit XML
   - **Fix**: Create `android/app/src/main/res/xml/network_security_config.xml` (block cleartext), reference in AndroidManifest
10. **No adaptive icons** — required since Android 8
    - **Fix**: Create foreground + background layer icon assets
11. **Target SDK** — must be API 35 (Android 15) for 2025 submissions
    - **Fix**: Verify in `android/app/build.gradle`
12. **Predictive back gesture** — Android 13+
    - **Fix**: Add `android:enableOnBackInvokedCallback="true"` to AndroidManifest

### MEDIUM
13. **react-markdown XSS risk** — audit where recipe markdown is rendered; add `allowedElements` prop if user-supplied content is rendered
14. **VAPID key hardcoded** in `src/App.tsx:259` — move to `VITE_VAPID_KEY` env var (intentionally public per FCM design, but cleaner)
15. **No data retention policy** — deleted items stay in Firestore indefinitely; implement 90-day auto-purge

### What's Already Good ✓
- Firebase Security Rules well-structured (field whitelisting, enum validation, uid ownership, admin guard)
- `SERPER_API_KEY` correctly server-side only
- All external calls use HTTPS
- Server-side Firebase token verification in `api/price/search.ts`
- `Permissions-Policy` header correctly restricts camera/mic/geo
- No analytics/tracking SDKs in dependencies
- CSP in `vercel.json` is solid

### Apple Privacy Nutrition Labels (to declare in App Store Connect)
- **Data Linked to You**: Email (Google Sign-In), Health & Fitness (weight/height/BMR/calorie logs), Location (approx), Photos (meal/invoice scans), User ID
- **Data Not Linked to You**: Diagnostics (AI usage logs, scan failures)
- **Data Used to Track You**: None (no ad/analytics SDKs)

### Google Play Data Safety Form
- Declare same data types as Apple
- Declare third parties: Google/Firebase, Google Gemini API, Serper.dev
- "Encrypted in transit" → Yes (HTTPS)
- "Can users request deletion" → Yes (once account deletion is built)

### Priority Order
```
Week 1 (blockers):
  1. Move Gemini API key to api/gemini/proxy.ts
  2. Add account deletion to Settings tab
  3. Rewrite privacy policy
  4. Create Terms of Service

Week 2 (Apple/Play requirements):
  5. Health data consent modal
  6. Run npx cap add ios, configure Info.plist
  7. Rate limiting on api/price/search.ts
  8. Fill App Store Connect + Play Console data forms

Week 3 (polish):
  9. Remove/opt-out lat/long from userActivityLogs
  10. Data retention rules (90-day auto-purge)
  11. Network Security Config for Android
  12. Adaptive icons for Android
  13. TestFlight + Play Internal Testing beta
```
