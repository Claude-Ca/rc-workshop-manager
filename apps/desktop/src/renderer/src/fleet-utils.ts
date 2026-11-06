import type { Aircraft, AircraftLifecycleState, AircraftOperationalState, AircraftType } from "@rc-workshop/core";

export type FleetFilters = {
  query: string;
  type: AircraftType | "all";
  operationalState: AircraftOperationalState | "all";
  lifecycleState: AircraftLifecycleState | "all";
  favoritesOnly: boolean;
};

export function filterAircraft(aircraft: Aircraft[], filters: FleetFilters): Aircraft[] {
  const query = filters.query.trim().toLocaleLowerCase("fr");
  return aircraft.filter((entry) => {
    const searchable = [entry.name, entry.manufacturer, entry.model, entry.uafRegistration, entry.notes].filter(Boolean).join(" ").toLocaleLowerCase("fr");
    return (!query || searchable.includes(query)) && (filters.type === "all" || (entry.aircraftType ?? "other") === filters.type) &&
      (filters.operationalState === "all" || (entry.operationalState ?? "flight-ready") === filters.operationalState) &&
      (filters.lifecycleState === "all" || (entry.lifecycleState ?? "active") === filters.lifecycleState) && (!filters.favoritesOnly || Boolean(entry.favorite));
  });
}

export const FLEET_GROUP_ORDER = ["flight-ready", "maintenance", "parts", "out-of-service", "sold", "retired"] as const;

export function getFleetGroupKey(entry: Aircraft): typeof FLEET_GROUP_ORDER[number] {
  const lifecycle = entry.lifecycleState ?? "active";
  return lifecycle === "active" ? entry.operationalState ?? "flight-ready" : lifecycle;
}

export function groupAircraft(aircraft: Aircraft[], grouping: "operational" | "lifecycle" = "operational"): Map<string, Aircraft[]> {
  const groups = new Map<string, Aircraft[]>();
  const order = grouping === "operational" ? FLEET_GROUP_ORDER : ["active", "sold", "retired"] as const;
  for (const key of order) {
    const entries = aircraft.filter((entry) => (grouping === "operational" ? getFleetGroupKey(entry) : entry.lifecycleState ?? "active") === key);
    if (entries.length) groups.set(key, entries);
  }
  return groups;
}
