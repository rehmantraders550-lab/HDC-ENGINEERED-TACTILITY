# Cloudflare Workers deployment

This application is a server-rendered HDC website with quote intake, an admin review desk, a relational data store, and private artwork uploads. It deploys as a Cloudflare Worker with static assets, D1, and R2. It is not a static Pages build.

## Before deployment

1. Install Node.js 20 or newer and run `npm install`.
2. Create a D1 database and an R2 bucket in the intended Cloudflare account.
3. Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.jsonc` with the database ID returned by Wrangler.
4. Generate a hash with `npm run hash:admin` in a private terminal, then set the Worker secrets `SESSION_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD_HASH`. No default admin account is created.
5. Apply the migration with `npm run db:migrate:remote`.
6. Build and deploy with `npm run deploy`.

The first request seeds the product catalogue with `INSERT OR IGNORE`. It does not seed prices. Quote totals remain uncalculated unless an administrator adds an exact approved price row.

## Local development

Copy `.dev.vars.example` to `.dev.vars`, replace each placeholder, then run `npm run dev`. Wrangler uses local D1 and R2 emulators by default. Apply the schema locally with `npm run db:migrate:local`.

## Storage and privacy

- D1 stores catalogue reviews, quotes, quote line items, artwork metadata, jobs, exact approved price rows, audit events, rate-limit buckets, and sessions.
- R2 stores artwork under random keys. The bucket is private; files are only returned through the admin-authenticated route.
- Session cookies are HTTP-only, SameSite=Lax, and secure in production. Session records expire after eight hours.
- Artwork uploads accept PDF, PNG, JPEG, TIFF, and EPS, with a 25 MB per-file limit and at most three files per request.
- Customer IP addresses are hashed before rate-limit storage.
- Textile/DTF items are excluded from public catalogue routes unless separately approved.

## Business data

No price rows are seeded. Catalogues and posters retain the 500-piece MOQ rule. The A3 sticker-sheet value remains a base price and is not multiplied into an invented total. Do not approve prices or production profiles until HDC confirms the values.

## Domain

After the Worker is deployed and its `workers.dev` URL is verified, attach a custom domain in Cloudflare. Keep the existing HDC site and Hostinger deployment untouched until the new Worker has been checked.
