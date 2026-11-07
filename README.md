# Dawat Nama — Digital Invitation Store

A React + Vite storefront and Cloudflare Pages Functions starter for a luxury digital invitation business.

## Brand and business rules
- Brand: Dawat Nama
- Currency: PKR
- Two order paths: ready-made self-service and custom luxury requests
- Payment is manual only. No Stripe, PayPal, card gateway or automatic payment processing.
- Admin manually verifies payment before publishing an invitation.
- Delivery: unique invitation URL plus WhatsApp coordination
- RSVP is intentionally not included.
- Event count is dynamic (1–12); each event has name, date, venue, address and optional Google Maps URL.

## Included
- Luxury emerald / antique gold / warm ivory visual identity
- Responsive homepage and template collection
- Template demo pages
- Ready-made order form
- Custom design request form
- Automatic event form count
- Cloudflare Pages API function
- D1 database schema and starter templates
- Password-protected admin login
- Admin order overview, payment status updates and publish action
- Public invitation page with optional View Location button

## 1. Run locally
Install Node.js (LTS), then:

```bash
npm install
npm run dev
```

The storefront can be previewed locally. API features require Cloudflare Pages Functions and a configured D1 database.

## 2. GitHub
Upload the contents of this folder to the root of your GitHub repository (not the ZIP file itself). Commit and push.

## 3. Cloudflare Pages deployment
1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
2. Select the `dawat-nama` GitHub repository.
3. Framework preset: `Vite`
4. Build command: `npm run build`
5. Build output directory: `dist`
6. Deploy.

## 4. D1 database
Create a D1 database named `dawat-nama-db`.
Copy its database ID into `wrangler.toml` in place of `REPLACE_WITH_YOUR_D1_DATABASE_ID`.
Run the migration:

```bash
npx wrangler d1 migrations apply dawat-nama-db --remote
```

If you do not use Wrangler locally, apply `migrations/0001_init.sql` from the D1 console's query editor.

## 5. R2 storage
Create an R2 bucket named `dawat-nama-media`. The binding is declared in `wrangler.toml`.
This starter does not yet include an admin media uploader; it is reserved for the next development phase when your real template assets are ready.

## 6. Secrets and variables
In Cloudflare Pages → your project → Settings → Variables and Secrets, add:
- `ADMIN_PASSWORD` (secret): choose a strong, unique password
- `SESSION_SECRET` (secret): long random secret (at least 32 characters)
- `VITE_WHATSAPP_NUMBER` (build-time variable): WhatsApp number with country code, digits only, e.g. `923001234567`
- Optional `VITE_API_BASE`: leave empty when API is served by the same Pages project.

After adding or changing VITE variables, trigger a new deployment.

## 7. Routes
- `/` storefront
- `/demo/:templateSlug` design demo
- `/order/:templateSlug` ready-made order form
- `/custom` custom luxury request form
- `/admin` admin dashboard
- `/i/:invitationSlug` published guest invitation

The included `public/_redirects` sends SPA routes to the React app. Pages Functions under `functions/` continue to handle `/api/*`.

## Important before public launch
This is a development foundation, not a fully audited production commerce system. Before accepting real customer information:
- add rate limiting / bot protection to public order creation
- add admin audit logs, password rotation and stronger session/cookie handling
- add payment receipt upload to private storage and admin review
- add order detail editor with invitation preview and template assignment
- add custom quote / amount setting workflow
- add template and media library management
- test all pages on real iOS and Android devices
- replace sample Unsplash images and sample demo names with licensed assets and your own designs
- set up privacy policy, terms, refund/cancellation policy and contact information
- use a custom domain when you are ready (domain purchase is not free)

## Template integration
A template should be a reusable presentation component. Store its content/animation configuration in the template record and its images/video in R2. Customer-specific names, dates, venues and maps should come from D1 data. Do not create a separate hard-coded page for every customer.

## Payment rule
No payment gateway is included. The current order flow opens WhatsApp after order submission. Admin manually changes payment status to `verified`. Publishing is blocked until payment is verified. Custom request amounts remain quote-pending in this starter and should be entered in the next admin workflow before publishing.