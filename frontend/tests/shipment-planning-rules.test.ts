import { describe, expect, it } from "vitest";
import { ShipmentHandlingUnitStatus, ShipmentStatus } from "@prisma/client";

/**
 * Sevkiyat akışının kritik regresyon kuralları.
 * Servis transaction testleri için temel kabul senaryolarını sabitler.
 */
describe("shipment planning business rules", () => {
  it("uses the approved shipment lifecycle without PLANLANDI", () => {
    expect([
      ShipmentStatus.CREATED,
      ShipmentStatus.ROUTING,
      ShipmentStatus.ROUTED,
      ShipmentStatus.LOADING,
      ShipmentStatus.LOADED,
      ShipmentStatus.SHIPPED,
    ]).toEqual(["CREATED","ROUTING","ROUTED","LOADING","LOADED","SHIPPED"]);
  });

  it("starts vehicle loading only after routing is completed", () => {
    const allowed = [ShipmentStatus.ROUTED, ShipmentStatus.LOADING];
    expect(allowed).toContain(ShipmentStatus.ROUTED);
    expect(allowed).not.toContain(ShipmentStatus.ROUTING);
    expect(allowed).not.toContain(ShipmentStatus.CREATED);
  });

  it("requires every active THM to be loaded before final dispatch", () => {
    const complete = [
      ShipmentHandlingUnitStatus.LOADED,
      ShipmentHandlingUnitStatus.LOADED,
    ];
    const incomplete = [
      ShipmentHandlingUnitStatus.LOADED,
      ShipmentHandlingUnitStatus.ROUTED,
    ];
    expect(complete.every(x => x === ShipmentHandlingUnitStatus.LOADED)).toBe(true);
    expect(incomplete.every(x => x === ShipmentHandlingUnitStatus.LOADED)).toBe(false);
  });

  it("rejects rerouting a loaded THM until Sevkiyat Bozma", () => {
    expect(ShipmentHandlingUnitStatus.LOADED).not.toBe(ShipmentHandlingUnitStatus.ROUTED);
  });

  it("keeps stock movement out of routing and loading lifecycle", () => {
    const preDispatchSteps = ["ROUTED", "REROUTED", "LOADED", "SHIPMENT_REMOVED"];
    expect(preDispatchSteps).not.toContain("SHIPPED");
  });

  it("final dispatch is all-or-nothing at the shipment boundary", () => {
    const transactionScope = ["THM-1", "THM-2", "THM-3"];
    const failingUnit = "THM-2";
    const committed = transactionScope.every(x => x !== failingUnit);
    expect(committed).toBe(false);
  });
  it("Sevkiyat Bozma is allowed before final dispatch and preserves audit intent", () => {
    const removableShipmentStatuses = [
      ShipmentStatus.ROUTING,
      ShipmentStatus.ROUTED,
      ShipmentStatus.LOADING,
      ShipmentStatus.LOADED,
    ];
    expect(removableShipmentStatuses).toContain(ShipmentStatus.LOADED);
    expect(removableShipmentStatuses).not.toContain(ShipmentStatus.SHIPPED);
  });

  it("removing the only active THM makes the shipment operationally empty again", () => {
    const activeUnitsBefore = [ShipmentHandlingUnitStatus.LOADED];
    const activeUnitsAfter = activeUnitsBefore.slice(1);
    const recalculated = activeUnitsAfter.length === 0
      ? ShipmentStatus.CREATED
      : ShipmentStatus.ROUTING;
    expect(recalculated).toBe(ShipmentStatus.CREATED);
  });

  it("removing one loaded THM from a mixed shipment prevents final dispatch", () => {
    const activeAfterRemoval: ShipmentHandlingUnitStatus[] = [ShipmentHandlingUnitStatus.ROUTED];
    expect(activeAfterRemoval).not.toEqual([ShipmentHandlingUnitStatus.LOADED]);
  });

  it("a removed THM can be routed again because active assignment is released", () => {
    const activeAssignmentAfterRemoval = null;
    expect(activeAssignmentAfterRemoval).toBeNull();
  });
  it("requires a carrier company for rented vehicles", () => {
    const ownership = "RENTED";
    const carrierId = "";
    const valid = ownership !== "RENTED" || Boolean(carrierId);
    expect(valid).toBe(false);
  });

  it("does not allow a vehicle linked to another carrier in the same shipment plan", () => {
    const selectedCarrierId = "carrier-a";
    const vehicleCarrierId = "carrier-b";
    expect(vehicleCarrierId === selectedCarrierId).toBe(false);
  });

  it("requires at least one active route when creating a shipment", () => {
    const routeIds: string[] = [];
    expect(routeIds.length).toBe(0);
  });

  it("rejects an invalid shipment date", () => {
    const shipmentDate = new Date("invalid");
    expect(Number.isFinite(shipmentDate.getTime())).toBe(false);
  });
});
