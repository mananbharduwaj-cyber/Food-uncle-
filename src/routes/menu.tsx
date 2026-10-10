import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ItemRow } from "@/components/ItemCard";
import { menuQuery } from "@/lib/data";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menu — Food Uncle" },
      { name: "description", content: "Browse starters, curries, breads, biryani, Chinese, drinks and desserts at Food Uncle." },
      { property: "og:title", content: "Menu — Food Uncle" },
      { property: "og:description", content: "The full Food Uncle menu." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(menuQuery),
  component: MenuPage,
});

function MenuPage() {
  const { data } = useSuspenseQuery(menuQuery);
  const [vegOnly, setVegOnly] = useState(false);
  const items = data.items.filter((i) => !vegOnly || i.is_veg);
  return (
    <AppShell title="Menu">
      <div className="sticky top-[57px] z-20 flex gap-2 overflow-x-auto bg-background px-5 py-3">
        <button onClick={() => setVegOnly(!vegOnly)} className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium ${vegOnly ? "border-success bg-success/10 text-success" : "border-border"}`}>
          Veg only
        </button>
        {data.categories.map((c) => (
          <a key={c.id} href={`#${c.id}`} className="shrink-0 rounded-full border border-border px-4 py-1.5 text-sm">
            {c.name}
          </a>
        ))}
      </div>
      {data.categories.map((c) => {
        const list = items.filter((i) => i.category_id === c.id);
        if (!list.length) return null;
        return (
          <section key={c.id} id={c.id} className="scroll-mt-28 px-5 pt-4">
            <h2 className="text-lg font-semibold">{c.name} <span className="text-sm font-normal text-muted-foreground">({list.length})</span></h2>
            <div className="divide-y divide-border">
              {list.map((i) => <ItemRow key={i.id} item={i} categories={data.categories} />)}
            </div>
          </section>
        );
      })}
    </AppShell>
  );
}
