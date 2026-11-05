import { describe, expect, it } from "vitest";
import { InventoryError, InventoryService } from "../src/index.js";
import type { Aircraft, ComponentReference, InventorySnapshot, InventoryRepository, Project, StockItem, StockLot, StockMovement } from "../src/index.js";

class MemoryRepository implements InventoryRepository {
  snapshot: InventorySnapshot = { references: [], items: [], lots: [], aircraft: [], projects: [], movements: [] };
  getSnapshot() { return structuredClone(this.snapshot); }
  saveReference(value: ComponentReference) { this.snapshot.references = [...this.snapshot.references.filter(x => x.id !== value.id), value]; }
  deleteReference(id: string) { this.snapshot.references = this.snapshot.references.filter(x => x.id !== id); }
  saveItem(value: StockItem) { this.snapshot.items = [...this.snapshot.items.filter(x => x.id !== value.id), value]; }
  deleteItem(id: string) { this.snapshot.items = this.snapshot.items.filter(x => x.id !== id); }
  saveLot(value: StockLot) { this.snapshot.lots = [...this.snapshot.lots.filter(x => x.id !== value.id), value]; }
  deleteLot(id: string) { this.snapshot.lots = this.snapshot.lots.filter(x => x.id !== id); }
  saveAircraft(value: Aircraft) { this.snapshot.aircraft = [...this.snapshot.aircraft.filter(x => x.id !== value.id), value]; }
  deleteAircraft(id: string) { this.snapshot.aircraft = this.snapshot.aircraft.filter(x => x.id !== id); }
  saveProject(value: Project) { this.snapshot.projects.push(value); }
  appendMovement(value: StockMovement) { this.snapshot.movements.push(value); }
}
const aircraft = (id: string, favorite = false): Aircraft => ({
  id, name: "Aéronef " + id, aircraftType: "airplane", operationalState: "flight-ready",
  lifecycleState: "active", favorite,
});
describe("aircraft classification and favorites", () => {
  it("applies safe defaults to newly added aircraft", () => {
    const repository = new MemoryRepository();
    new InventoryService(repository).addAircraft({ id: "A1", name: "Cub" } as Aircraft);
    expect(repository.snapshot.aircraft[0]).toMatchObject({ aircraftType: "other", operationalState: "flight-ready", lifecycleState: "active", favorite: false });
  });
  it("allows four favorites and rejects a fifth without changing existing favorites", () => {
    const repository = new MemoryRepository(); const service = new InventoryService(repository);
    for (let i = 1; i <= 4; i += 1) service.addAircraft(aircraft("A" + i, true));
    service.addAircraft(aircraft("A5"));
    expect(() => service.setAircraftFavorite("A5", true)).toThrow(InventoryError);
    expect(repository.snapshot.aircraft.filter((entry) => entry.favorite)).toHaveLength(4);
    expect(repository.snapshot.aircraft.find((entry) => entry.id === "A5")?.favorite).toBe(false);
  });
  it("allows a fifth aircraft to become favorite after one is removed", () => {
    const repository = new MemoryRepository(); const service = new InventoryService(repository);
    for (let i = 1; i <= 4; i += 1) service.addAircraft(aircraft("A" + i, true));
    service.addAircraft(aircraft("A5")); service.setAircraftFavorite("A1", false); service.setAircraftFavorite("A5", true);
    expect(repository.snapshot.aircraft.filter((entry) => entry.favorite)).toHaveLength(4);
    expect(repository.snapshot.aircraft.find((entry) => entry.id === "A5")?.favorite).toBe(true);
  });
  it("keeps type, operational state and lifecycle independent", () => {
    const repository = new MemoryRepository(); const service = new InventoryService(repository);
    service.addAircraft(aircraft("A1"));
    service.updateAircraft({ ...aircraft("A1"), operationalState: "maintenance" });
    expect(repository.snapshot.aircraft[0]).toMatchObject({ aircraftType: "airplane", operationalState: "maintenance", lifecycleState: "active" });
  });
});