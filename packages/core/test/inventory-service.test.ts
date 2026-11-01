import { describe, expect, it } from "vitest";
import { InventoryError, InventoryService } from "../src/index.js";
import type { InventoryRepository } from "../src/repository.js";
import type { InventorySnapshot, ComponentReference, StockItem, StockLot, Aircraft, Project, StockMovement } from "../src/models.js";

class MemoryRepository implements InventoryRepository {
  snapshot: InventorySnapshot = { references: [], items: [], lots: [], aircraft: [], projects: [], movements: [] };
  getSnapshot() { return structuredClone(this.snapshot); }
  saveReference(value: ComponentReference) { this.snapshot.references.push(value); }
  saveItem(value: StockItem) { this.snapshot.items = [...this.snapshot.items.filter(x => x.id !== value.id), value]; }
  saveLot(value: StockLot) { this.snapshot.lots.push(value); }
  saveAircraft(value: Aircraft) { this.snapshot.aircraft.push(value); }
  saveProject(value: Project) { this.snapshot.projects.push(value); }
  appendMovement(value: StockMovement) { this.snapshot.movements.push(value); }
}

const reference = (id: string, category: ComponentReference["category"], trackingMode: ComponentReference["trackingMode"]): ComponentReference => ({
  id, name: "Récepteur 8 voies", category, trackingMode, attributes: {}, archived: false, createdAt: "2026-11-01T12:00:00.000Z",
});

describe("InventoryService", () => {
  it("requires receiver references to be individually tracked", () => {
    const service = new InventoryService(new MemoryRepository());
    expect(() => service.createReference(reference("REF-1", "receiver", "quantity"))).toThrow(InventoryError);
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

  it("validates quantity lots as positive integers", () => {
    const service = new InventoryService(new MemoryRepository());
    service.createReference(reference("REF-HINGE", "construction", "quantity"));
    expect(() => service.addLot({ id: "LOT-1", referenceId: "REF-HINGE", quantity: 0, unit: "pièce" })).toThrow(/strictement positif/);
  });
});
