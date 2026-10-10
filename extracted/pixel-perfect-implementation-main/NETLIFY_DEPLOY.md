# Food Uncle — Netlify deployment

This project is configured for TanStack Start on Netlify using the official
`@netlify/vite-plugin-tanstack-start` integration.

Netlify build settings:
- Build command: `npm run build`
- Publish directory: `dist/client`
- Node: 22

Required runtime environment variables for full ordering/server functionality:
- SUPABASE_URL
- SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SERVICE_ROLE_KEY
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY
- VITE_SUPABASE_PROJECT_ID

Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser/client code.
