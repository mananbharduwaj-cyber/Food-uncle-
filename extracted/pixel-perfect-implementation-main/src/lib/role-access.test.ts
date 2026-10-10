import { describe, expect, it } from "vitest";
import { canAccessAdmin, destinationForLogin, homeForRoles } from "./role-access";

describe("Role access", () => {
  it("does not allow a delivery partner into the owner dashboard", () => {
    expect(canAccessAdmin(["delivery_partner"])).toBe(false);
  });
  it("sends delivery partners to their own screen", () => {
    expect(homeForRoles(["customer", "delivery_partner"])).toBe("/delivery");
  });
  it("keeps owners on the restaurant dashboard", () => {
    expect(homeForRoles(["owner"])).toBe("/admin");
  });
  it("keeps managers on the restaurant dashboard", () => {
    expect(homeForRoles(["manager"])).toBe("/admin");
  });
  it("keeps customers away from staff screens", () => {
    expect(homeForRoles(["customer"])).toBe("/profile");
    expect(canAccessAdmin(["customer"])).toBe(false);
  });
  it("never sends an owner using delivery login to the owner's dashboard", () => {
    expect(destinationForLogin(["owner", "customer"], "delivery")).toBeNull();
  });
  it("keeps a dual-role account on the delivery screen when using delivery login", () => {
    expect(destinationForLogin(["owner", "delivery_partner"], "delivery")).toBe("/delivery");
  });
  it("requires a delivery role even when a customer selects delivery login", () => {
    expect(destinationForLogin(["customer"], "delivery")).toBeNull();
  });
  it("does not send a delivery account into the dashboard through staff login", () => {
    expect(destinationForLogin(["delivery_partner"], "staff")).toBeNull();
  });
});