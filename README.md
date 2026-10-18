# The Caffeine Craft Cafe — TCC Karve Nagar

A responsive React + TypeScript + Tailwind cafe website with Supabase-backed menu data, guest checkout, order tracking, staff authentication, and an RLS-protected admin dashboard.

## Run locally

Requirements: Node.js 20+ and npm. Supabase is needed for menu administration, checkout, tracking, and the admin console. Without Supabase credentials, the supplied 46-item menu is shown locally, but checkout, tracking, and administration are unavailable.

```sh
npm install
cp .env.example .env.local
# Add the Supabase project URL and public anon/publishable key to .env.local
npm run dev
```

The browser may use only the Supabase project URL and its public anon/publishable key. Never put a service-role key, database password, or other secret in a `VITE_` variable or frontend source.

## Supabase setup

1. Create a Supabase project and keep its database password and service-role key private.
2. Apply both SQL files in `supabase/migrations/` in filename order using the Supabase SQL Editor, or install the Supabase CLI and run `npx supabase link --project-ref <project-ref>` followed by `npx supabase db push`.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` from the Supabase project's API settings.
4. Create the owner/staff account in **Authentication → Users**. Public sign-up is not needed. Promote only authorized staff from the SQL Editor:

   ```sql
   insert into public.profiles (id, role)
   select id, 'admin' from auth.users where email = 'owner@example.com'
   on conflict (id) do update set role = 'admin';
   ```

5. Sign in at `/#admin`. An authenticated account without a `profiles.role = 'admin'` record has no staff access.
6. Review the imported menu and confirm item descriptions, serving sizes, ingredients/allergens, dietary labels, photos, and current availability with the cafe.
7. Configure storage, auth email/redirect settings, backups, monitoring, and your own operations before launch. The migration creates a public-read `product-photos` bucket with admin-only upload access (JPG, PNG, WebP; 5 MB limit).

The SQL checkout function reads current product prices and availability, applies configured tax, delivery fee, and exact-match promotion on the server, then persists order and item snapshots in one database transaction. No online payment is integrated or simulated. Guest order tracking reveals only status/reference/time after matching both order number and phone; customers have no direct access to order tables. For larger launches, add request throttling/bot protection to public RPC calls and monitor abuse.

Delivery is disabled by default. Turn it on only after confirming delivery operations, service area, fee, and address handling with the owner. The checkout form requires an address; it does not validate delivery coverage. Pickup and delivery checkout become usable only after the corresponding admin setting is enabled and the menu has confirmed, priced, available products.

## Tests and production build

```sh
npm test
npm run build
```

The Vitest tests cover checkout input validation. `supabase/tests/database.test.sql` is a pgTAP integration test for the checkout RPC, order/order-item persistence, unpriced draft seeds, and the admin RLS boundary. Run it against a local Supabase database using the Supabase CLI (`npx supabase start`, then `npx supabase test db`). It temporarily enables pickup and adds test rows inside a transaction, then rolls the test changes back.

## Deployment

Build with `npm run build` and deploy the generated `dist/` directory to Vercel, Netlify, Cloudflare Pages, or another static hosting provider. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build-time environment variables on the host; redeploy after changing them. Configure the host's SPA fallback so routes such as `/#admin` resolve to `index.html`. Set the correct production site URL and allowed redirect URLs in Supabase Authentication settings. Keep database migrations under version control and apply them to production before deploying code that depends on them.

Supabase and static-hosting providers may offer free tiers, but quotas, regional availability, storage/bandwidth limits, backups, database pausing, email delivery, and pricing change. Review current terms and usage in each provider dashboard; production traffic or upgraded capacity can incur charges. A free tier is not a promise of uninterrupted production service.

## Owner confirmation required before going live

- Confirm the exact business name/branding, address, phone, map pin, and which days the 11:00 AM–11:30 PM hours apply.
- Confirm the supplied 4.9 rating and 203 reviews before publishing them; this demo does **not** claim either as verified and does not display them as a business fact.
- Confirm each menu item's exact name/category, price, serving sizes, ingredients/allergens, dietary labels, photograph rights, and current availability. The PDF supplies 46 item names and prices; descriptions and dietary details are not supplied.
- Confirm whether pickup is offered and its hours, preparation/confirmation process, and customer communication.
- Confirm delivery availability, service area, fees, applicable taxes, and operational handling before enabling delivery.
- Confirm any promotion's code, discount, eligibility, and dates before setting it up.
- Confirm privacy/retention wording and customer contact-data handling for orders.

Demo photography is illustrative stock imagery from Unsplash image URLs and is labelled as not representing this cafe; replace it with properly licensed, owner-approved cafe/product photography for publication. No awards, guarantees, payment service, or third-party ordering service are claimed.
