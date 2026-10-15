# Food Uncle

Food Uncle is a mobile-first food ordering ecosystem built independently from scratch with React, Vite and Supabase.

## Included
- Customer ordering: search, categories, cart, delivery/dine-in/pickup, COD and online-payment placeholder.
- Owner operations dashboard with live order queue, revenue summary, menu health and restaurant controls.
- Delivery partner view with assigned-order workflow and COD handoff state.
- Supabase PostgreSQL schema, RLS-aware data model and secure `place_order` RPC.
- 3 km default delivery radius and premium emerald/ivory/champagne visual system.
- Netlify build configuration and SPA fallback.

## Development

```sh
npm install
npm run dev
```

The production build is `dist/` and is configured in `netlify.toml`.

## Backend

The production Supabase project is `dibnupnkpqlqkriqcczg`. Database migrations live under `supabase/migrations/`.

Online payments are intentionally not faked: connect Razorpay credentials through a secure server-side integration before enabling real payment capture.
