# Security Phase 2 operations

## Vercel environment variables

Set these as encrypted Vercel variables (Production and each Preview environment that will be tested):

- `AUTH_SESSION_SECRET`: at least 32 random bytes. Generate with `openssl rand -base64 32` and store as `base64:<output>`.
- `ADMIN_EMAIL`: the dedicated custom-admin login email.
- `ADMIN_PASSWORD_HASH`: a bcrypt hash, generated locally with `node -e "require('bcryptjs').hash(process.argv[1],12).then(console.log)" 'a-long-unique-password'`.
- `NEXT_PUBLIC_SITE_URL`: canonical origin, including `https://`, with no path.
- `ADMIN_ALLOWED_ORIGINS`: optional comma-separated additional exact origins. Add a fixed Preview URL if Preview aliases are used. Vercel's current `VERCEL_URL` is also accepted automatically.

Existing variables remain required and unchanged: `SANITY_WRITE_TOKEN` (or the existing `SANITY_API_TOKEN` fallback), `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, CCAvenue variables, and the Google/Instagram OAuth client variables used by the deployment.

## Administrator and Sanity setup

1. Generate a unique administrator password and its bcrypt hash using the command above. Never put the password or hash in the repository.
2. Add `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, and `AUTH_SESSION_SECRET` in Vercel; redeploy.
3. Sign in at `/admin/login`. This creates a seven-day signed `HttpOnly`, `Secure`, `SameSite=Lax` administrator cookie.
4. Use `/admin/orders`, `/admin/coupons`, and `/admin/socials` only after that login. API calls are independently authorized server-side and mutations require an allowed `Origin`.
5. Sanity Studio authentication is separate and does **not** authorize these custom admin pages or APIs. Configure Sanity project membership in manage.sanity.io for Studio users, and separately provision the custom-admin environment credentials above.
6. In Google and Meta developer consoles, retain the exact callback URLs `/api/auth/google/callback` and `/api/auth/instagram/callback` under the deployed origin. Start connections only from `/admin/socials`; state expires after ten minutes and is consumed once.

## Operational limitations

- Sessions are stateless and remain valid for up to seven days unless the cookie is cleared or `AUTH_SESSION_SECRET` is rotated. There is no per-session server-side revocation list.
- Administrator authentication is a single environment-configured account; use a password manager and rotate it. MFA is not implemented by this application.
- Login rate limiting should also be enforced at the Vercel firewall/WAF layer.
- OAuth provider tokens continue to be stored in the existing Sanity settings document. Sanity access policy and token scope remain part of the trust boundary.

## Customer ownership backfill

New registered-customer orders and subscriptions store an immutable `customerAccount` reference. Guest records intentionally have no account reference. Historical records are read only when they have no reference, their phone normalizes to the signed customer's exact 10-digit canonical phone, and that canonical phone resolves to exactly one customer account.

Before removing the legacy fallback:

1. Export customer accounts, normalize each phone to `canonicalPhone`, and stop if any canonical value is duplicated.
2. Resolve each unowned historical order and subscription to exactly one customer account by canonical phone. Leave unmatched records unowned; never select an arbitrary duplicate.
3. Patch resolved documents with `customerAccount` references in a reviewed, idempotent migration.
4. Compare per-customer record counts and totals before and after the migration.
5. Remove the legacy fallback only after all ambiguous records have been manually resolved.

## Historical credential rotation

Phase 1 removed credential values from the current tree, but repository history may still contain prior values. The repository owner must confirm rotation or revocation of these categories without copying values into issues or pull requests: AI/chat provider API keys, CCAvenue working/access credentials, and subscription-payment credentials.

## Preview verification

- Confirm a weak/missing `AUTH_SESSION_SECRET` makes customer and administrator login fail closed.
- Confirm unauthenticated requests to profile/update routes and every `/api/admin/*` business route return `401`.
- Log in as one customer; view and edit that account, then verify changing a submitted phone cannot access or modify another account.
- Log out and verify the profile API returns `401`.
- Log in at `/admin/login`; verify orders, coupons, social status, imports, and POST sync actions work. Verify a customer session cannot use them.
- Attempt an admin mutation from an unlisted Origin and expect `403`.
- Exercise Google and Instagram connect flows; reject a missing/mismatched/replayed state.
- Place a guest COD order and verify notifications and totals.
- Complete CCAvenue guest checkout and verify its success/failure return handling.
- Complete a subscription payment and verify both subscription and linked order records.
