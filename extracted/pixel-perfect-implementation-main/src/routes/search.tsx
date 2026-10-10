import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ItemRow } from "@/components/ItemCard";
import { menuQuery } from "@/lib/data";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search dishes — Food Uncle" },
      { name: "description", content: "Find any dish on the Food Uncle menu by name, category or keyword." },
      { property: "og:title", content: "Search — Food Uncle" },
      { property: "og:description", content: "Search the Food Uncle menu." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(menuQuery),
  component: SearchPage,
});

const POPULAR = ["Biryani", "Butter Chicken", "Paneer", "Naan", "Dessert"];

function SearchPage() {
  const { data } = useSuspenseQuery(menuQuery);
  const [q, setQ] = useState("");
  const [veg, setVeg] = useState<"all" | "veg" | "nonveg">("all");
  const [best, setBest] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => setRecent(JSON.parse(localStorage.getItem("fu_recent") ?? "[]")), []);
  const commit = (term: string) => {
    if (!term.trim()) return;
    const next = [term, ...recent.filter((r) => r !== term)].slice(0, 6);
    setRecent(next);
    localStorage.setItem("fu_recent", JSON.stringify(next));
  };
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    return data.items.filter((i) => {
      const cat = data.categories.find((c) => c.id === i.category_id)?.name ?? "";
      const hay = `${i.name} ${i.description ?? ""} ${i.keywords ?? ""} ${cat}`.toLowerCase();
      if (t && !hay.includes(t)) return false;
      if (veg === "veg" && !i.is_veg) return false;
      if (veg === "nonveg" && i.is_veg) return false;
      if (best && !i.is_bestseller) return false;
      if (maxPrice && Number(i.discount_price ?? i.price) > maxPrice) return false;
      return true;
    });
  }, [q, veg, best, maxPrice, data]);
  const active = q || veg !== "all" || best || maxPrice;
  const chip = (on: boolean) => `shrink-0 rounded-full border px-3 py-1.5 text-sm ${on ? "border-primary bg-primary/10 text-primary" : "border-border"}`;
  return (
    <AppShell title="Search">
      <div className="px-5 pt-3">
        <form onSubmit={(e) => { e.preventDefault(); commit(q); }} className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
          <SearchIcon className="h-4 w-4 text-muted-foreground" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => commit(q)} placeholder="Dish, category or ingredient" className="flex-1 bg-transparent text-sm outline-none" />
          {q && <button type="button" onClick={() => setQ("")} aria-label="Clear"><X className="h-4 w-4" /></button>}
        </form>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <button className={chip(veg === "veg")} onClick={() => setVeg(veg === "veg" ? "all" : "veg")}>Veg</button>
          <button className={chip(veg === "nonveg")} onClick={() => setVeg(veg === "nonveg" ? "all" : "nonveg")}>Non-veg</button>
          <button className={chip(best)} onClick={() => setBest(!best)}>Bestseller</button>
          <button className={chip(maxPrice === 200)} onClick={() => setMaxPrice(maxPrice === 200 ? null : 200)}>Under ₹200</button>
        </div>
        {!active ? (
          <div className="mt-5 space-y-5">
            {recent.length > 0 && (
              <div>
                <h2 className="font-sans text-sm font-semibold text-muted-foreground">Recent</h2>
                <div className="mt-2 flex flex-wrap gap-2">{recent.map((r) => <button key={r} className={chip(false)} onClick={() => setQ(r)}>{r}</button>)}</div>
              </div>
            )}
            <div>
              <h2 className="font-sans text-sm font-semibold text-muted-foreground">Popular searches</h2>
              <div className="mt-2 flex flex-wrap gap-2">{POPULAR.map((r) => <button key={r} className={chip(false)} onClick={() => setQ(r)}>{r}</button>)}</div>
            </div>
          </div>
        ) : results.length === 0 ? (
          <p className="mt-12 text-center text-muted-foreground">No dishes match “{q}”. Try another word.</p>
        ) : (
          <div className="divide-y divide-border">{results.map((i) => <ItemRow key={i.id} item={i} categories={data.categories} />)}</div>
        )}
      </div>
    </AppShell>
  );
}
