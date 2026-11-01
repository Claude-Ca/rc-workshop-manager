import { describe, expect, it } from "vitest";
import { InventoryError, InventoryService } from "../src/index.js";
import type { InventoryRepository } from "../src/repository.js";
import type { InventorySnapshot, ComponentReference, StockItem, StockLot, Aircraft, Project, StockMovement } from "../src/models.js";

class MemoryRepository implements InventoryRepository {
  snapshot: InventorySnapshot = { references: [], items: [], lots: [], aircraft: [], projects: [], movements: [] };
  getSnapshot() { return structuredClone(this.snapshot); }
  saveReference(value: ComponentReference) { this.snapshot.references = [...this.snapshot.references.filter(x => x.id !== value.id), value]; }
  deleteReference(referenceId: string) { this.snapshot.references = this.snapshot.references.filter(x => x.id !== referenceId); }
  saveItem(value: StockItem) { this.snapshot.items = [...this.snapshot.items.filter(x => x.id !== value.id), value]; }
  saveLot(value: StockLot) { this.snapshot.lots.push(value); }
  saveAircraft(value: Aircraft) { this.snapshot.aircraft = [...this.snapshot.aircraft.filter(x => x.id !== value.id), value]; }
  deleteAircraft(aircraftId: string) { this.snapshot.aircraft = this.snapshot.aircraft.filter(x => x.id !== aircraftId); }
  saveProject(value: Project) { this.snapshot.projects.push(value); }
  appendMovement(value: StockMovement) { this.snapshot.movements.push(value); }
}

const reference = (id: string, category: ComponentReference["category"], trackingMode: ComponentReference["trackingMode"]): ComponentReference => ({
  id, name: "Récepteur 8 voies", category, trackingMode,
  ...(category === "receiver" ? { receiverChannels: 8, receiverProtocol: "ExpressLRS" } : {}),
  attributes: {}, archived: false, createdAt: "2026-11-01T12:00:00.000Z",
});

describe("InventoryService", () => {
  it("requires receiver references to be individually tracked", () => {
    const service = new InventoryService(new MemoryRepository());
    expect(() => service.createReference(reference("REF-1", "receiver", "quantity"))).toThrow(InventoryError);
  });

  it("requires receiver channel count and radio protocol", () => {
    const service = new InventoryService(new MemoryRepository());
    const missingChannels = { ...reference("REF-2", "receiver", "individual") };
    delete missingChannels.receiverChannels;
    expect(() => service.createReference(missingChannels)).toThrow(/nombre de voies/);
    const missingProtocol = { ...reference("REF-3", "receiver", "individual"), receiverProtocol: " " };
    expect(() => service.createReference(missingProtocol)).toThrow(/protocole radio/);
  });

  it("assigns a stable TX16 name to a receiver when none is provided", () => {
    const repository = new MemoryRepository();
    const service = new InventoryService(repository);
    service.createReference(reference("REF-RX", "receiver", "individual"));
    service.addItem({ id: "ITEM-1", referenceId: "REF-RX", inventoryCode: "RX-007", status: "available", createdAt: "2026-11-01T12:00:00.000Z" });
    expect(repository.snapshot.items[0]?.tx16Name).toBe("RX-007");
    expect(repository.snapshot.movements).toHaveLength(1);
  });

  it("prevents duplicate inventory codes", () => {
    const repository = new MemoryRepository();
    const service = new InventoryService(repository);
    service.createReference(reference("REF-RX", "receiver", "individual"));
    service.addItem({ id: "ITEM-1", referenceId: "REF-RX", inventoryCode: "RX-007", status: "available", createdAt: "2026-11-01T12:00:00.000Z" });
    expect(() => service.addItem({ id: "ITEM-2", referenceId: "REF-RX", inventoryCode: "rx-007", status: "available", createdAt: "2026-11-01T12:00:00.000Z" })).toThrow(/déjà utilisé/);
  });

  it("only assigns available items and releases them back to stock", () => {
    const repository = new MemoryRepository();
    const service = new InventoryService(repository);
    service.createReference(reference("REF-RX", "receiver", "individual"));
    service.addAircraft({ id: "AIR-1", name: "Carbon-Z Cub" });
    service.addItem({ id: "ITEM-1", referenceId: "REF-RX", inventoryCode: "RX-001", status: "available", createdAt: "2026-11-01T12:00:00.000Z" });
    service.assignItem("ITEM-1", { kind: "aircraft", id: "AIR-1" }, "MOV-2", "2026-11-01T12:10:00.000Z");
    expect(repository.snapshot.items[0]?.status).toBe("installed");
    expect(() => service.assignItem("ITEM-1", { kind: "aircraft", id: "AIR-1" }, "MOV-3", "2026-11-01T12:20:00.000Z")).toThrow(/disponible/);
    service.releaseItem("ITEM-1", "MOV-4", "2026-11-01T12:30:00.000Z");
    expect(repository.snapshot.items[0]?.status).toBe("available");
  });

  it("updates a catalog reference without changing its identity", () => {
    const repository = new MemoryRepository();
    const service = new InventoryService(repository);
    service.createReference(reference("REF-EDIT", "motor", "individual"));
    service.addItem({ id: "ITEM-EDIT", referenceId: "REF-EDIT", inventoryCode: "MOT-001", status: "available", createdAt: "2026-11-01T12:00:00.000Z" });
    const original = repository.snapshot.references[0]!;
    service.updateReference({ ...original, name: "Motor renommé" });
    expect(repository.snapshot.references).toHaveLength(1);
    expect(repository.snapshot.references[0]).toMatchObject({ id: "REF-EDIT", name: "Motor renommé" });
    expect(repository.snapshot.items[0]?.referenceId).toBe("REF-EDIT");
  });

  it("archives a referenced catalog entry instead of deleting its history", () => {
    const repository = new MemoryRepository();
    const service = new InventoryService(repository);
    service.createReference(reference("REF-USED", "motor", "individual"));
    service.addItem({ id: "ITEM-USED", referenceId: "REF-USED", inventoryCode: "MOT-USED", status: "available", createdAt: "2026-11-01T12:00:00.000Z" });
    expect(service.deleteReference("REF-USED")).toEqual({ archived: true });
    expect(repository.snapshot.references[0]?.archived).toBe(true);
    expect(repository.snapshot.items[0]?.referenceId).toBe("REF-USED");
    expect(() => service.addItem({ id: "ITEM-NEW", referenceId: "REF-USED", inventoryCode: "MOT-NEW", status: "available", createdAt: "2026-11-01T12:00:00.000Z" })).toThrow(/introuvable ou archivée/);
  });

  it("deletes an unused catalog entry", () => {
    const repository = new MemoryRepository();
    const service = new InventoryService(repository);
    service.createReference(reference("REF-UNUSED", "motor", "individual"));
    expect(service.deleteReference("REF-UNUSED")).toEqual({ archived: false });
    expect(repository.snapshot.references).toHaveLength(0);
  });

  it("updates aircraft details including optional UAF registration without changing the id", () => {
    const repository = new MemoryRepository();
    const service = new InventoryService(repository);
    service.addAircraft({ id: "AIR-EDIT", name: "Carbon Cub" });
    service.createReference(reference("REF-DUMMY", "motor", "individual"));
    service.addItem({ id: "ITEM-AIR", referenceId: "REF-DUMMY", inventoryCode: "DUMMY-001", status: "available", createdAt: "2026-11-01T12:00:00.000Z" });
    service.assignItem("ITEM-AIR", { kind: "aircraft", id: "AIR-EDIT" }, "MOV-AIR", "2026-11-01T12:05:00.000Z");
    service.updateAircraft({ id: "AIR-EDIT", name: "Carbon-Z Cub", manufacturer: "E-flite", model: "SS", uafRegistration: "UAF-123" });
    expect(repository.snapshot.aircraft).toHaveLength(1);
    expect(repository.snapshot.aircraft[0]).toMatchObject({ id: "AIR-EDIT", name: "Carbon-Z Cub", uafRegistration: "UAF-123" });
    expect(repository.snapshot.items[0]?.aircraftId).toBe("AIR-EDIT");
  });

  it("validates quantity lots as positive integers", () => {
    const service = new InventoryService(new MemoryRepository());
    service.createReference(reference("REF-HINGE", "construction", "quantity"));
    expect(() => service.addLot({ id: "LOT-1", referenceId: "REF-HINGE", quantity: 0, unit: "pièce" })).toThrow(/strictement positif/);
  });
});
