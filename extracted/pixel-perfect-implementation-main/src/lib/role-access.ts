import type { Enums } from "@/integrations/supabase/types";

export type AppRole = Enums<"app_role">;

export function canAccessAdmin(roles: readonly AppRole[]) {
  return roles.includes("owner") || roles.includes("manager");
}

export function homeForRoles(roles: readonly AppRole[]): "/admin" | "/delivery" | "/profile" {
  if (canAccessAdmin(roles)) return "/admin";
  if (roles.includes("delivery_partner")) return "/delivery";
  return "/profile";
}

export type LoginIntent = "delivery" | "staff" | "customer";

export function destinationForLogin(roles: readonly AppRole[], intent: LoginIntent) {
  if (intent === "delivery") return roles.includes("delivery_partner") ? "/delivery" : null;
  if (intent === "staff") return canAccessAdmin(roles) ? "/admin" : null;
  return homeForRoles(roles);
}