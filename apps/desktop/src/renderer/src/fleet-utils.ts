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
