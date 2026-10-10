import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bike, LayoutDashboard, LogOut } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Food Uncle" }, { name: "description", content: "Your Food Uncle account and saved addresses." }, { property: "og:title", content: "Profile — Food Uncle" }, { property: "og:description", content: "Your account." }] }),
  component: Profile,
});

function Profile() {
  const { user } = Route.useRouteContext();
  const roles = useRoles(user.id);
  const qc = useQueryClient();
  const nav = useNavigate();
  const addresses = useQuery({ queryKey: ["addresses", user.id], queryFn: async () => (await supabase.from("addresses").select("*")).data ?? [] });
  const isStaff = roles.data?.some((r) => r === "owner" || r === "manager");
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", search: { staff: undefined, delivery: undefined }, replace: true });
  };
  return (
    <AppShell title="Profile">
      <div className="mx-5 mt-4 rounded-2xl bg-card p-5 shadow-soft">
        <p className="font-semibold">{user.user_metadata?.["full_name"] ?? user.email}</p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
      {isStaff && (
        <Link to="/admin" className="mx-5 mt-4 flex items-center gap-3 rounded-2xl bg-primary p-4 font-semibold text-primary-foreground">
          <LayoutDashboard className="h-5 w-5" /> Restaurant dashboard
        </Link>
      )}
      {roles.data?.includes("delivery_partner") && (
        <Link to="/delivery" className="mx-5 mt-4 flex items-center gap-3 rounded-2xl bg-primary p-4 font-semibold text-primary-foreground">
          <Bike className="h-5 w-5" /> My deliveries
        </Link>
      )}
      <div className="mx-5 mt-4 rounded-2xl bg-card p-5 shadow-soft">
        <h2 className="font-sans text-sm font-semibold text-muted-foreground">Saved addresses</h2>
        {!addresses.data?.length ? <p className="mt-2 text-sm text-muted-foreground">No addresses yet — add one at checkout.</p> : addresses.data.map((a) => (
          <div key={a.id} className="mt-3 flex items-start justify-between text-sm">
            <span>{a.name}, {a.house}, {a.street}, {a.city}</span>
            <button className="text-destructive" onClick={async () => { await supabase.from("addresses").delete().eq("id", a.id); addresses.refetch(); }}>Remove</button>
          </div>
        ))}
      </div>
      <button onClick={signOut} className="mx-5 mt-4 flex items-center gap-2 text-sm font-semibold text-destructive"><LogOut className="h-4 w-4" /> Sign out</button>
    </AppShell>
  );
}
