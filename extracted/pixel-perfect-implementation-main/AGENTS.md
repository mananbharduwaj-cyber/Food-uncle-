<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Order totals are recomputed server-side in `placeOrder` from DB prices/settings; client totals are preview only (prevents price tampering).
- Pricing rules live in `src/lib/pricing.ts` as pure functions shared by client and server, so preview and charge never diverge.
- Roles live in `user_roles`; first signup becomes owner via the signup trigger; RLS uses `has_role`/`is_staff`.
- Staff destinations use shared role-access helpers and authenticated route gates; delivery UI never queries restaurant-wide orders, so assignment data remains private until an authorized workflow exists.
- Explicit delivery/staff login intent must be checked against stored roles; a mismatched delivery session stays at delivery login, never redirects to admin, and OAuth preserves intent on its public callback.
