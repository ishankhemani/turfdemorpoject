# Security Guide — Elite Arena POS

## Overview
This document describes the security controls implemented in the Elite Arena Turf POS
application deployed at https://turfdemo.netlify.app.

---

## 1. Transport Security

| Control | Value |
|---|---|
| Protocol | HTTPS enforced via Netlify (automatic TLS) |
| HSTS | `max-age=63072000; includeSubDomains; preload` (2 years) |
| Upgrade Insecure Requests | Enabled via CSP |

---

## 2. Content Security Policy (XSS Prevention)

The full CSP is set in `netlify.toml`. Key directives:

| Directive | Allowed Sources |
|---|---|
| `default-src` | `'self'` |
| `script-src` | `'self'` `'unsafe-inline'` (React/Vite bundles) |
| `style-src` | `'self'` `'unsafe-inline'` Google Fonts |
| `connect-src` | `'self'` `*.supabase.co` `wss://*.supabase.co` |
| `img-src` | `'self'` `data:` `blob:` `*.supabase.co` |
| `frame-ancestors` | `'none'` (anti-clickjacking) |
| `object-src` | `'none'` (no plugins) |
| `base-uri` | `'self'` |
| `form-action` | `'self'` |

> **Note on `unsafe-inline`**: Required because Vite injects critical CSS and React uses
> inline event handlers. Script bundles are all `'self'`-hosted so XSS via inline injection
> is prevented at the script level.

---

## 3. Anti-Clickjacking

```
X-Frame-Options: DENY
frame-ancestors 'none'   (CSP)
```

Both are set for defence-in-depth — older browsers honour `X-Frame-Options`,
modern browsers honour CSP `frame-ancestors`.

---

## 4. CSRF Prevention

- **Supabase Auth**: Uses `flowType: 'pkce'` (Proof Key for Code Exchange). This
  cryptographically binds the auth code to the session, preventing token interception
  and replay attacks on OAuth flows.
- **SPA Architecture**: No server-rendered HTML forms, so traditional CSRF is not applicable.
  Supabase API calls use Bearer tokens in the `Authorization` header (not cookies),
  which are not automatically sent by cross-site requests.

---

## 5. XSS Prevention

- **React JSX**: React escapes all dynamic values by default in JSX. Never use
  `dangerouslySetInnerHTML` with user-supplied content.
- **Sanitization utilities** (`src/lib/sanitize.ts`): Use `escapeHtml()`, `stripHtml()`,
  `sanitizeUrl()`, and `sanitizeText()` when handling user-supplied content outside JSX
  (e.g., third-party DOM libraries, chart labels, CSV exports).
- **CSP**: Prevents exfiltration even if XSS were introduced.

---

## 6. CORS

The `netlify.toml` sets `Access-Control-Allow-Origin: https://turfdemo.netlify.app`
(not wildcard `*`) so browser pre-flight checks only allow requests from the app origin.

### Supabase CORS — MANUAL STEP REQUIRED ⚠️

You **must** configure allowed origins in Supabase:

1. Go to https://supabase.com/dashboard
2. Select your project (`knbymtdgsuwipmztofsd`)
3. Navigate to **Settings → API**
4. Under **"Allowed Origins"**, add: `https://turfdemo.netlify.app`
5. Click **Save**

Without this step, Supabase's own CORS headers will block browser API calls.

---

## 7. Supabase Row Level Security (RLS) — CRITICAL ⚠️

The Supabase anon key is intentionally exposed client-side (it's a publishable key).
Security depends entirely on **RLS policies** restricting data access.

**Every table must have RLS enabled:**

```sql
-- Enable RLS on a table
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Example policy: users can only see their own data
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

-- Admin policy (restrict to admin role)
CREATE POLICY "Admins can view all bookings"
  ON bookings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

**To audit RLS status on all tables:**
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

All tables should show `rowsecurity = true`.

---

## 8. Other Security Headers

| Header | Value | Purpose |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `X-XSS-Protection` | `1; mode=block` | Legacy browser XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `Permissions-Policy` | camera, mic, geo, payment disabled | Reduce attack surface |
| `Cross-Origin-Opener-Policy` | `same-origin` | Prevent Spectre/cross-origin leaks |
| `Cross-Origin-Resource-Policy` | `same-origin` | Prevent cross-origin resource reads |

---

## 9. Environment Variables

| Variable | Type | Safe to expose? |
|---|---|---|
| `VITE_SUPABASE_URL` | Public | ✅ Yes — it's the project URL |
| `VITE_SUPABASE_ANON_KEY` | Publishable | ✅ Yes — scoped by RLS |
| Supabase `service_role` key | Secret | ❌ Never use in frontend |

> **Never add the Supabase `service_role` key to any frontend env variable.**
> It bypasses all RLS and gives full database access.

---

## 10. Dependency Security

- Run `npm audit` regularly
- `npm audit fix` has been applied — current state: **0 vulnerabilities**
- Dependabot or Renovate is recommended for automated PRs

---

*Last updated: 2026-09-23*
