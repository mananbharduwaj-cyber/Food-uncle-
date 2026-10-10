import { queryOptions, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import curry from "@/assets/curry.jpg";
import tandoor from "@/assets/tandoor.jpg";
import dessert from "@/assets/dessert.jpg";
import hero from "@/assets/hero.jpg";

export type MenuItem = Tables<"menu_items">;
export type Category = Tables<"categories">;
export type Settings = Tables<"restaurant_settings">;
export type Addon = { name: string; price: number };

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("restaurant_settings").select("*").eq("id", 1).single();
    if (error) throw error;
    return data;
  },
});
export const menuQuery = queryOptions({
  queryKey: ["menu"],
  queryFn: async () => {
    const [c, m] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("menu_items").select("*").order("name"),
    ]);
    if (c.error) throw c.error;
    if (m.error) throw m.error;
    return { categories: c.data, items: m.data };
  },
});

export function itemImage(item: MenuItem, categories: Category[]) {
  if (item.image_url) return item.image_url;
  const cat = categories.find((c) => c.id === item.category_id)?.name ?? "";
  if (/starter|chinese/i.test(cat)) return tandoor;
  if (/dessert|beverage/i.test(cat)) return dessert;
  if (/rice/i.test(cat)) return hero;
  return curry;
}
export const price = (n: number | string) => `₹${Math.round(Number(n))}`;

export function useUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  return user;
}

export function useRoles(userId?: string) {
  return useQuery({
    queryKey: ["roles", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((r) => r.role);
    },
  });
}

export const STATUS_LABEL: Record<string, string> = {
  placed: "Order placed",
  accepted: "Accepted by restaurant",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  served: "Served",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};
export function flowFor(type: string) {
  if (type === "delivery") return ["placed", "accepted", "preparing", "ready", "out_for_delivery", "delivered"];
  if (type === "dine_in") return ["placed", "accepted", "preparing", "ready", "served", "completed"];
  return ["placed", "accepted", "preparing", "ready", "completed"];
}
