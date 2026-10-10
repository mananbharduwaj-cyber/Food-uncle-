import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Bike, Clock, QrCode, Search, ShoppingBag } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ItemTile } from "@/components/ItemCard";
import { menuQuery, settingsQuery, type Category, type MenuItem } from "@/lib/data";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Food Uncle — Order delivery, takeaway & table" },
      { name: "description", content: "Order North Indian favourites from Food Uncle — delivered, ready for pickup, or right at your table." },
      { property: "og:title", content: "Food Uncle — Order online" },
      { property: "og:description", content: "Butter chicken, biryani, tandoor and more. Order from Food Uncle." },
    ],
  }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(settingsQuery), context.queryClient.ensureQueryData(menuQuery)]),
  component: Home,
});

function Home() {
  const { data: s } = useSuspenseQuery(settingsQuery);
  const { data: menu } = useSuspenseQuery(menuQuery);
  const best = menu.items.filter((i) => i.is_bestseller);
  const rec = menu.items.filter((i) => i.is_recommended);
  return (
    <AppShell>
      {s.announcement && <div className="bg-primary px-5 py-2 text-center text-xs font-medium text-primary-foreground">{s.announcement}</div>}
      <section className="px-5 pt-5">
        <div className="relative overflow-hidden rounded-3xl">
          <img src={hero} alt="Food Uncle signature dishes" width={1600} height={912} className="h-56 w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
          <div className="absolute bottom-0 p-5 text-primary-foreground">
            <h1 className="text-3xl font-semibold">{s.name}</h1>
            <p className="text-sm opacity-90">{s.tagline}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className={`rounded-full px-3 py-1 font-semibold ${s.is_open ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}`}>
            {s.is_open ? "Open now" : "Closed"}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1"><Clock className="h-3 w-3" /> {s.prep_time_minutes} min</span>
          <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1">
            <Bike className="h-3 w-3" /> {s.delivery_enabled ? `Delivers within ${s.delivery_radius_km} km` : "Delivery paused"}
          </span>
        </div>
        <Link to="/search" className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <Search className="h-4 w-4" /> Search for butter chicken, biryani…
        </Link>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link to="/menu" className="rounded-2xl bg-card p-4 shadow-soft">
            <ShoppingBag className="h-6 w-6 text-primary" />
            <p className="mt-2 font-semibold">Delivery & Takeaway</p>
            <p className="text-xs text-muted-foreground">Order to your door or pick up</p>
          </Link>
          <div className="rounded-2xl bg-card p-4 shadow-soft">
            <QrCode className="h-6 w-6 text-primary" />
            <p className="mt-2 font-semibold">At the table?</p>
            <p className="text-xs text-muted-foreground">Scan the QR on your table to order</p>
          </div>
        </div>
      </section>

      <section className="mt-7">
        <h2 className="px-5 text-xl font-semibold">Categories</h2>
        <div className="mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
          {menu.categories.map((c) => (
            <Link key={c.id} to="/menu" hash={c.id} className="shrink-0 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium">
              {c.name}
            </Link>
          ))}
        </div>
      </section>
      <Rail title="Bestsellers" items={best} cats={menu.categories} />
      <Rail title="Uncle recommends" items={rec} cats={menu.categories} />
      <div className="mt-10 flex flex-wrap justify-center gap-3 px-5 text-center">
        <Link to="/admin" className="inline-block rounded-full border border-border px-5 py-2 text-sm font-semibold text-muted-foreground">
          Owner / Manager login →
        </Link>
        <Link to="/delivery" className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-semibold text-muted-foreground">
          <Bike className="h-4 w-4" /> Delivery partner login →
        </Link>
      </div>
    </AppShell>
  );
}

function Rail({ title, items, cats }: { title: string; items: MenuItem[]; cats: Category[] }) {
  if (!items.length) return null;
  return (
    <section className="mt-7">
      <h2 className="px-5 text-xl font-semibold">{title}</h2>
      <div className="mt-3 flex gap-4 overflow-x-auto px-5 pb-2">
        {items.map((i) => <ItemTile key={i.id} item={i} categories={cats} />)}
      </div>
    </section>
  );
}
