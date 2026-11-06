import { describe, expect, it } from "vitest";
import type { Aircraft } from "@rc-workshop/core";
import { filterAircraft, groupAircraft } from "./fleet-utils.js";

const fleet: Aircraft[] = [
  { id: "A1", name: "Mistral", manufacturer: "E-flite", model: "Cub", aircraftType: "airplane", operationalState: "flight-ready", lifecycleState: "active", favorite: true },
  { id: "A2", name: "Aeron", manufacturer: "Planeprint", aircraftType: "motor-glider", operationalState: "parts", lifecycleState: "active", favorite: false, uafRegistration: "UAF-123" },
  { id: "A3", name: "Ancien", aircraftType: "glider", operationalState: "out-of-service", lifecycleState: "sold", favorite: false },
];
const noFilters = { query: "", type: "all", operationalState: "all", lifecycleState: "all", favoritesOnly: false } as const;

describe("fleet filtering", () => {
  it("combines type, operational state, lifecycle and favorite filters", () => {
    expect(filterAircraft(fleet, { ...noFilters, type: "motor-glider", operationalState: "parts", favoritesOnly: true })).toEqual([]);
    expect(filterAircraft(fleet, { ...noFilters, lifecycleState: "sold" }).map((entry) => entry.id)).toEqual(["A3"]);
    expect(filterAircraft(fleet, { ...noFilters, type: "airplane", favoritesOnly: true }).map((entry) => entry.id)).toEqual(["A1"]);
  });

  it("searches the aircraft details without regard to letter case", () => {
    expect(filterAircraft(fleet, { ...noFilters, query: "uaf-123" }).map((entry) => entry.id)).toEqual(["A2"]);
    expect(filterAircraft(fleet, { ...noFilters, query: "  E-FLITE " }).map((entry) => entry.id)).toEqual(["A1"]);
  });
});

describe("fleet groups", () => {
  it("orders operational and lifecycle groups without duplicating closed aircraft", () => {
    const grouped = groupAircraft([
      fleet[2]!,
      { id: "A4", name: "Retiré", lifecycleState: "retired", operationalState: "flight-ready" },
      { id: "A5", name: "Maintenance", lifecycleState: "active", operationalState: "maintenance" },
      fleet[0]!,
    ]);
    expect([...grouped.keys()]).toEqual(["flight-ready", "maintenance", "sold", "retired"]);
    expect([...grouped.values()].flat().map((entry) => entry.id)).toEqual(["A1", "A5", "A3", "A4"]);
  });
});
