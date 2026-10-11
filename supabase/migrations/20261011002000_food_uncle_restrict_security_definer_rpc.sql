-- Restrict security-definer RPCs. Trigger execution remains available to PostgreSQL;
-- browser roles cannot invoke these functions through the exposed API.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_app_role(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_app_role(text[]) TO authenticated;
