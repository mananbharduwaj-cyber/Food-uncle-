import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { destinationForLogin, type LoginIntent } from "@/lib/role-access";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Food Uncle" },
      { name: "description", content: "Sign in or create your Food Uncle account to order." },
      { property: "og:title", content: "Sign in — Food Uncle" },
      { property: "og:description", content: "Your Food Uncle account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    staff: s["staff"] === true || s["staff"] === "true" ? true : undefined,
    delivery: s["delivery"] === true || s["delivery"] === "true" ? true : undefined,
  }),
  component: AuthPage,
});

async function homeFor(intent: LoginIntent) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
  if (error) throw error;
  return destinationForLogin((data ?? []).map((r) => r.role), intent);
}

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [accessError, setAccessError] = useState("");
  const qc = useQueryClient();
  const nav = useNavigate();
  const { staff, delivery } = Route.useSearch();
  const intent: LoginIntent = delivery ? "delivery" : staff ? "staff" : "customer";
  const finishSignIn = async () => {
    const destination = await homeFor(intent);
    if (!destination) {
      setAccessError(delivery
        ? "This account is not a delivery partner. Sign in with your assigned delivery account."
        : "This account does not have owner or manager access.");
      return;
    }
    await qc.cancelQueries();
    qc.clear();
    await nav({ to: destination });
  };

  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active || !data.session) return;
      if (sessionStorage.getItem("fu_oauth_login") === intent) {
        sessionStorage.removeItem("fu_oauth_login");
        await finishSignIn();
      } else if (delivery || staff) {
        const destination = await homeFor(intent);
        if (active && !destination) setAccessError(delivery
          ? "The signed-in account is not a delivery partner. Use your delivery account below."
          : "The signed-in account does not have owner or manager access.");
      }
    };
    void checkSession().catch(() => { if (active) setAccessError("Couldn't verify account access. Please try again."); });
    return () => { active = false; };
  }, [intent]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setAccessError("");
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      try { await finishSignIn(); } catch { setAccessError("Couldn't verify account access. Please try again."); }
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { full_name: name } } });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      setSent(true);
    }
  };
  const google = async () => {
    sessionStorage.setItem("fu_oauth_login", intent);
    const callback = new URL("/auth", window.location.origin);
    if (delivery) callback.searchParams.set("delivery", "true");
    else if (staff) callback.searchParams.set("staff", "true");
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: callback.toString() });
    if (r.error) { sessionStorage.removeItem("fu_oauth_login"); toast.error("Google sign-in failed"); return; }
    if (r.redirected) return;
    sessionStorage.removeItem("fu_oauth_login");
    try { await finishSignIn(); } catch { setAccessError("Couldn't verify account access. Please try again."); }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-center text-4xl font-semibold text-primary">Food Uncle</h1>
      <p className="mt-2 text-center text-muted-foreground">{delivery ? "Delivery partner login" : staff ? "Owner & manager login" : mode === "in" ? "Welcome back" : "Create your account"}</p>
      {accessError && <p role="alert" className="mt-5 text-center text-sm text-destructive">{accessError}</p>}
      {sent ? (
        <p className="mt-8 rounded-2xl bg-card p-5 text-center shadow-soft">Check your email to confirm your account, then sign in.</p>
      ) : (
        <>
          <Button variant="outline" className="mt-8 h-11" onClick={google}>Continue with Google</Button>
          <div className="my-5 text-center text-xs text-muted-foreground">or with email</div>
          <form onSubmit={submit} className="space-y-3">
            {mode === "up" && <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />}
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button className="h-11 w-full" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Sign up"}</Button>
          </form>
          {!delivery && <Button variant="ghost" className="mt-4 text-sm text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
          </Button>}
          {staff && <p className="mt-4 text-xs text-muted-foreground">The first account created becomes the restaurant owner. Only owners and managers have restaurant dashboard access.</p>}
        </>
      )}
    </div>
  );
}
