import { describe, expect, it } from "vitest";
import { InventoryError, InventoryService } from "../src/index.js";
import type { Aircraft, ComponentReference, InventorySnapshot, InventoryRepository, Project, StockItem, StockLot, StockMovement } from "../src/index.js";

class MemoryRepository implements InventoryRepository {
  snapshot: InventorySnapshot = { logbookEvents: [], references: [], items: [], lots: [], aircraft: [], projects: [], movements: [] };
  getSnapshot() { return structuredClone(this.snapshot); }
  saveReference(value: ComponentReference) { this.snapshot.references = [...this.snapshot.references.filter(x => x.id !== value.id), value]; }
  deleteReference(id: string) { this.snapshot.references = this.snapshot.references.filter(x => x.id !== id); }
  saveItem(value: StockItem) { this.snapshot.items = [...this.snapshot.items.filter(x => x.id !== value.id), value]; }
  deleteItem(id: string) { this.snapshot.items = this.snapshot.items.filter(x => x.id !== id); }
  saveLot(value: StockLot) { this.snapshot.lots = [...this.snapshot.lots.filter(x => x.id !== value.id), value]; }
  deleteLot(id: string) { this.snapshot.lots = this.snapshot.lots.filter(x => x.id !== id); }
  saveAircraft(value: Aircraft) { this.snapshot.aircraft = [...this.snapshot.aircraft.filter(x => x.id !== value.id), value]; }
  deleteAircraft(id: string) { this.snapshot.aircraft = this.snapshot.aircraft.filter(x => x.id !== id); this.snapshot.logbookEvents = this.snapshot.logbookEvents.filter(x => x.aircraftId !== id); }
  saveLogbookEvent(value: import("../src/models.js").AircraftLogbookEvent) { this.snapshot.logbookEvents = [...this.snapshot.logbookEvents.filter(x => x.id !== value.id), value]; }
  deleteLogbookEvent(id: string) { this.snapshot.logbookEvents = this.snapshot.logbookEvents.filter(x => x.id !== id); }
  saveProject(value: Project) { this.snapshot.projects.push(value); }
  appendMovement(value: StockMovement) { this.snapshot.movements.push(value); }
  saveAircraftClosure(aircraft: Aircraft, entries: Array<{ item: StockItem; movement: StockMovement }>, event: import("../src/models.js").AircraftLogbookEvent) {
    this.saveAircraft(aircraft);
    for (const entry of entries) { this.saveItem(entry.item); this.appendMovement(entry.movement); }
    this.saveLogbookEvent(event);
  }
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
  it("creates only active aircraft and prevents closed aircraft from returning to favorites", () => {
    const repository = new MemoryRepository(); const service = new InventoryService(repository);
    expect(() => service.addAircraft({ ...aircraft("A0"), lifecycleState:"sold" })).toThrow(/doit être actif/);
    service.addAircraft(aircraft("A1"));
    service.closeAircraft("A1","retired",[],"CLOSE","2026-11-06T14:00:00.000Z");
    expect(() => service.setAircraftFavorite("A1",true)).toThrow(/clôturé/);
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
  it("recovers only selected equipment from one aircraft and records each release", () => {
    const repository = new MemoryRepository(); const service = new InventoryService(repository);
    repository.snapshot.aircraft = [aircraft("A1"), aircraft("A2")];
    repository.snapshot.references = [
      { id: "MOTOR", name: "Moteur", category: "motor", trackingMode: "individual", attributes: {}, archived: false, createdAt: "2026-01-01" },
      { id: "SERVO", name: "Servo", category: "servo", trackingMode: "individual", attributes: {}, archived: false, createdAt: "2026-01-01" },
    ];
    repository.snapshot.items = [
      { id: "I1", referenceId: "MOTOR", inventoryCode: "MOT-001", status: "installed", aircraftId: "A1", createdAt: "2026-01-01" },
      { id: "I2", referenceId: "SERVO", inventoryCode: "SER-001", status: "installed", aircraftId: "A1", createdAt: "2026-01-01" },
      { id: "I3", referenceId: "SERVO", inventoryCode: "SER-002", status: "installed", aircraftId: "A2", createdAt: "2026-01-01" },
    ];
    service.releaseAircraftItems("A1", ["I1"], "MOV-REC", "2026-11-05T12:00:00.000Z");
    expect(repository.snapshot.items.find((item) => item.id === "I1")).toMatchObject({ status: "available" });
    expect(repository.snapshot.items.find((item) => item.id === "I1")?.aircraftId).toBeUndefined();
    expect(repository.snapshot.items.find((item) => item.id === "I2")).toMatchObject({ status: "installed", aircraftId: "A1" });
    expect(repository.snapshot.items.find((item) => item.id === "I3")).toMatchObject({ status: "installed", aircraftId: "A2" });
    expect(repository.snapshot.movements).toEqual([expect.objectContaining({ id: "MOV-REC-0", type: "released", itemId: "I1", aircraftId: "A1" })]);
  });

  it("rejects empty, duplicate, or foreign equipment selections without partial changes", () => {
    const repository = new MemoryRepository(); const service = new InventoryService(repository);
    repository.snapshot.aircraft = [aircraft("A1"), aircraft("A2")];
    repository.snapshot.items = [
      { id: "I1", referenceId: "R1", inventoryCode: "MOT-001", status: "installed", aircraftId: "A1", createdAt: "2026-01-01" },
      { id: "I2", referenceId: "R1", inventoryCode: "MOT-002", status: "installed", aircraftId: "A2", createdAt: "2026-01-01" },
    ];
    expect(() => service.releaseAircraftItems("A1", [], "MOV", "2026-11-05T12:00:00.000Z")).toThrow(/au moins un/);
    expect(() => service.releaseAircraftItems("A1", ["I1", "I1"], "MOV", "2026-11-05T12:00:00.000Z")).toThrow(/double/);
    expect(() => service.releaseAircraftItems("A1", ["I1", "I2"], "MOV", "2026-11-05T12:00:00.000Z")).toThrow(/plus affecté/);
    expect(repository.snapshot.items.every((item) => item.status === "installed")).toBe(true);
    expect(repository.snapshot.movements).toHaveLength(0);
  });

  it("does not trigger equipment recovery when the operational state becomes out of service", () => {
    const repository = new MemoryRepository(); const service = new InventoryService(repository); repository.snapshot.aircraft = [aircraft("A1")];
    repository.snapshot.items = [{ id:"I1",referenceId:"R1",inventoryCode:"MOT-001",status:"installed",aircraftId:"A1",createdAt:"2026-01-01" }];
    service.updateAircraft({ ...aircraft("A1"), operationalState:"out-of-service" });
    expect(repository.snapshot.aircraft[0]?.operationalState).toBe("out-of-service");
    expect(repository.snapshot.items[0]).toMatchObject({status:"installed",aircraftId:"A1"});
    expect(repository.snapshot.movements).toHaveLength(0);
  });
  it("requires sale and retirement to use the dedicated closure operation", () => {
    const repository = new MemoryRepository(); const service = new InventoryService(repository); repository.snapshot.aircraft = [aircraft("A1")];
    expect(() => service.updateAircraft({ ...aircraft("A1"), lifecycleState:"retired" })).toThrow(/action de clôture/);
    expect(repository.snapshot.aircraft[0]?.lifecycleState).toBe("active");
  });
  it("keeps type, operational state and lifecycle independent", () => {
    const repository = new MemoryRepository(); const service = new InventoryService(repository);
    service.addAircraft(aircraft("A1"));
    service.updateAircraft({ ...aircraft("A1"), operationalState: "maintenance" });
    expect(repository.snapshot.aircraft[0]).toMatchObject({ aircraftType: "airplane", operationalState: "maintenance", lifecycleState: "active" });
  });
  it("closes a sold aircraft with an explicit fate for every assigned physical item", () => {
    const repository = new MemoryRepository(); const service = new InventoryService(repository);
    repository.snapshot.aircraft = [{ ...aircraft("A1"), favorite: true }];
    repository.snapshot.items = [
      { id:"I1",referenceId:"R1",inventoryCode:"RX-001",status:"installed",aircraftId:"A1",createdAt:"2026-01-01" },
      { id:"I2",referenceId:"R2",inventoryCode:"MOT-001",status:"installed",aircraftId:"A1",createdAt:"2026-01-01" },
      { id:"I3",referenceId:"R3",inventoryCode:"SER-001",status:"installed",aircraftId:"A1",createdAt:"2026-01-01" },
      { id:"BAT",referenceId:"RB",inventoryCode:"BAT-001",status:"available",createdAt:"2026-01-01" },
    ];
    service.closeAircraft("A1","sold",[{itemId:"I1",destination:"inventory"},{itemId:"I2",destination:"sold-with-aircraft"},{itemId:"I3",destination:"sold-separately"}],"CLOSE","2026-11-06T12:30:00.000Z");
    expect(repository.snapshot.aircraft[0]).toMatchObject({lifecycleState:"sold",favorite:false});
    expect(repository.snapshot.items.find(x=>x.id==="I1")).toMatchObject({status:"available"});
    expect(repository.snapshot.items.find(x=>x.id==="I2")).toMatchObject({status:"sold"});
    expect(repository.snapshot.items.find(x=>x.id==="I3")).toMatchObject({status:"sold"});
    expect(repository.snapshot.items.every(x=>!x.aircraftId)).toBe(true);
    expect(repository.snapshot.items.map(x=>x.id)).toContain("I2");
    expect(repository.snapshot.items.find(x=>x.id==="BAT")).toMatchObject({status:"available"});
    expect(repository.snapshot.movements.map(x=>x.type)).toEqual(["released","sold","sold"]);
    expect(repository.snapshot.logbookEvents).toEqual([expect.objectContaining({type:"sale",aircraftId:"A1",date:"2026-11-06"})]);
  });
  it("closes a retired aircraft and records its retirement event", () => {
    const repository = new MemoryRepository(); const service = new InventoryService(repository);
    repository.snapshot.aircraft = [aircraft("A1")];
    repository.snapshot.items = [{id:"I1",referenceId:"R1",inventoryCode:"MOT-001",status:"installed",aircraftId:"A1",createdAt:"2026-01-01"}];
    service.closeAircraft("A1","retired",[{itemId:"I1",destination:"scrapped"}],"RETIRE","2026-11-06T13:00:00.000Z");
    expect(repository.snapshot.aircraft[0]?.lifecycleState).toBe("retired");
    expect(repository.snapshot.items[0]).toMatchObject({id:"I1",status:"retired"});
    expect(repository.snapshot.movements[0]).toMatchObject({type:"retired",notes:"Clôture de l'aéronef : mis au rebut"});
    expect(repository.snapshot.logbookEvents[0]).toMatchObject({type:"retirement"});
  });
  it("rejects missing, duplicate, foreign or incompatible equipment destinations", () => {
    const repository = new MemoryRepository(); const service = new InventoryService(repository);
    repository.snapshot.aircraft = [aircraft("A1")];
    repository.snapshot.items = [
      {id:"I1",referenceId:"R1",inventoryCode:"MOT-001",status:"installed",aircraftId:"A1",createdAt:"2026-01-01"},
      {id:"I2",referenceId:"R2",inventoryCode:"SER-001",status:"installed",aircraftId:"A1",createdAt:"2026-01-01"},
    ];
    expect(() => service.closeAircraft("A1","sold",[],"C1","2026-11-06T13:00:00.000Z")).toThrow(/Chaque équipement/);
    expect(() => service.closeAircraft("A1","sold",[{itemId:"I1",destination:"inventory"},{itemId:"I1",destination:"scrapped"}],"C2","2026-11-06T13:00:00.000Z")).toThrow(/incomplètes ou invalides/);
    expect(() => service.closeAircraft("A1","sold",[{itemId:"I1",destination:"inventory"},{itemId:"FOREIGN",destination:"inventory"}],"C2B","2026-11-06T13:00:00.000Z")).toThrow(/incomplètes ou invalides/);
    expect(() => service.closeAircraft("A1","retired",[{itemId:"I1",destination:"sold-with-aircraft"},{itemId:"I2",destination:"inventory"}],"C3","2026-11-06T13:00:00.000Z")).toThrow(/aéronef retiré/);
    expect(repository.snapshot.aircraft[0]?.lifecycleState).toBe("active");
    expect(repository.snapshot.movements).toHaveLength(0);
  });
});