# Cloudflare Workers deployment

This application is a server-rendered HDC website with quote intake, an admin review desk, a relational data store, and private artwork uploads. It deploys as a Cloudflare Worker with static assets, D1, and R2. It is not a static Pages build.

## Before deployment

1. Install Node.js 20 or newer and run `npm install`.
2. Enable the R2 subscription in Cloudflare under **Storage & databases → R2 → Overview**. Cloudflare requires an activation checkout; review its billing terms. Then create a D1 database and an R2 bucket in the intended account.
3. Confirm the `DB` binding in `wrangler.jsonc` uses your database ID. The current package is configured with the D1 database created for this project.
4. Generate a hash with `npm run hash:admin` in a private terminal, then set the Worker secrets `SESSION_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD_HASH`. No default admin account is created.
5. Apply the migration with `npm run db:migrate:remote`.
6. Build and deploy with `npm run deploy`.

The first request seeds the product catalogue with `INSERT OR IGNORE`. It does not seed prices. Quote totals remain uncalculated unless an administrator adds an exact approved price row.

## Local development

Copy `.dev.vars.example` to `.dev.vars`, replace each placeholder, then run `npm run dev`. Wrangler uses local D1 and R2 emulators by default. Apply the schema locally with `npm run db:migrate:local`.

## Storage and privacy

- D1 stores catalogue reviews, quotes, quote line items, artwork metadata, HDC's R2 safety counters, jobs, exact approved price rows, audit events, rate-limit buckets, and sessions.
- R2 stores artwork under random keys. The bucket is private; files are only returned through the admin-authenticated route.
- Session cookies are HTTP-only, SameSite=Lax, and secure in production. Session records expire after eight hours.
- Artwork uploads accept PDF, PNG, JPEG, TIFF, and EPS, with a 10 MB per-file limit, at most three files, and 25 MB total per request.
- HDC's application stops new uploads at 8 GiB of tracked storage or 100,000 reserved upload writes over the life of this application, and stops admin downloads at 1,000,000 over the life of this application. These conservative HDC-only caps leave room below R2's included Standard tier allowances, but they do not account for use by other buckets or applications on the Cloudflare account.
- The admin desk shows HDC's own tracked storage and download count. Review **R2 → Metrics** and **Manage Account → Billing → Billable Usage** weekly for account-wide storage and operations. Set an account budget alert as an email warning; Cloudflare says budget alerts are informational and do not stop usage. R2's included Standard tier allowances are 10 GB-month storage, 1 million Class A requests, and 10 million Class B requests; usage above them can be billed. See the current [R2 pricing](https://developers.cloudflare.com/r2/pricing/).
- If the HDC upload safety cap is reached or an upload fails, the quote text is still saved and the customer is told to send the artwork to HDC separately.
- Customer IP addresses are hashed before rate-limit storage.
- Textile/DTF items are excluded from public catalogue routes unless separately approved.

## Business data

No price rows are seeded. Catalogues and posters retain the 500-piece MOQ rule. The A3 sticker-sheet value remains a base price and is not multiplied into an invented total. Do not approve prices or production profiles until HDC confirms the values.

## Domain

After the Worker is deployed and its `workers.dev` URL is verified, attach a custom domain in Cloudflare. Keep the existing HDC site and Hostinger deployment untouched until the new Worker has been checked.
