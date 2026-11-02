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
  deleteItem(itemId: string) { this.snapshot.items = this.snapshot.items.filter(x => x.id !== itemId); }
  saveLot(value: StockLot) { this.snapshot.lots = [...this.snapshot.lots.filter(x => x.id !== value.id), value]; }
  deleteLot(lotId: string) { this.snapshot.lots = this.snapshot.lots.filter(x => x.id !== lotId); }
  saveAircraft(value: Aircraft) { this.snapshot.aircraft = [...this.snapshot.aircraft.filter(x => x.id !== value.id), value]; }
  deleteAircraft(aircraftId: string) { this.snapshot.aircraft = this.snapshot.aircraft.filter(x => x.id !== aircraftId); }
  saveProject(value: Project) { this.snapshot.projects.push(value); }
  appendMovement(value: StockMovement) { this.snapshot.movements.push(value); }
}

const reference = (id: string, category: ComponentReference["category"], trackingMode: ComponentReference["trackingMode"]): ComponentReference => ({
  id, name: "Récepteur 8 voies", category, trackingMode,
  ...(category === "receiver" ? { receiverChannels: 8, receiverProtocol: "ExpressLRS" } : {}),
  ...(category === "motor" ? { motorizationKind: "motor" as const, motorType: "electric" as const, motorVoltage: "4S" } : {}),
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

  it("validates motor and propeller specifications independently", () => {
    const service = new InventoryService(new MemoryRepository());
    const motor = { ...reference("REF-ELECTRIC", "motor", "individual"), motorizationKind: "motor" as const, motorType: "electric" as const, motorVoltage: "3-4S" };
    const propeller = { ...reference("REF-PROP", "motor", "individual"), motorizationKind: "propeller" as const, propellerDiameter: "12", propellerPitch: "8" };
    service.createReference(motor);
    service.createReference(propeller);
    expect(() => service.createReference({ ...motor, id: "REF-BAD-MOTOR", motorVoltage: "" })).toThrow(/Tension/);
    expect(() => service.createReference({ ...propeller, id: "REF-BAD-PROP", propellerPitch: "" })).toThrow(/Diametre et pas/);
  });

  it("validates and stores a radio receiver subtype", () => {
    const repository = new MemoryRepository();
    const service = new InventoryService(repository);
    const receiver: ComponentReference = {
      id: "REF-RADIO-RX", name: "Récepteur 8 voies", category: "radio", radioType: "receiver",
      trackingMode: "individual", receiverChannels: 8, receiverProtocol: "ExpressLRS",
      attributes: {}, archived: false, createdAt: "2026-11-01T12:00:00.000Z",
    };
    service.createReference(receiver);
    expect(repository.snapshot.references[0]).toMatchObject({
      category: "radio", radioType: "receiver", receiverChannels: 8, receiverProtocol: "ExpressLRS",
    });
  });

  it("validates and stores a radio transmitter subtype without receiver fields", () => {
    const repository = new MemoryRepository();
    const service = new InventoryService(repository);
    const transmitter: ComponentReference = {
      id: "REF-RADIO-TX", name: "Émetteur 16 voies", category: "radio", radioType: "transmitter",
      trackingMode: "individual", transmitterChannels: 16, transmitterProtocols: ["ACCESS", "ExpressLRS"],
      firmwareVersion: "3.0.0", attributes: {}, archived: false, createdAt: "2026-11-01T12:00:00.000Z",
    };
    service.createReference(transmitter);
    expect(repository.snapshot.references[0]).toMatchObject({
      category: "radio", radioType: "transmitter", transmitterChannels: 16,
      transmitterProtocols: ["ACCESS", "ExpressLRS"], firmwareVersion: "3.0.0",
    });
    expect(repository.snapshot.references[0]?.receiverProtocol).toBeUndefined();
  });

  it("rejects transmitters without a channel count or protocol", () => {
    const service = new InventoryService(new MemoryRepository());
    const transmitter: ComponentReference = {
      id: "REF-BAD-TX", name: "Émetteur incomplet", category: "radio", radioType: "transmitter",
      trackingMode: "individual", transmitterChannels: 0, transmitterProtocols: [],
      attributes: {}, archived: false, createdAt: "2026-11-01T12:00:00.000Z",
    };
    expect(() => service.createReference(transmitter)).toThrow(/nombre de voies/);
    expect(() => service.createReference({ ...transmitter, transmitterChannels: 16 })).toThrow(/protocole radio/);
  });

  it("assigns a stable TX16 name to a receiver when none is provided", () => {
    const repository = new MemoryRepository();
    const service = new InventoryService(repository);
    service.createReference(reference("REF-RX", "receiver", "individual"));
    service.addItem({ id: "ITEM-1", referenceId: "REF-RX", inventoryCode: "RX-007", status: "available", createdAt: "2026-11-01T12:00:00.000Z" });
    expect(repository.snapshot.items[0]?.inventoryCode).toBe("RX-001");
    expect(repository.snapshot.items[0]?.tx16Name).toBe("RX-001");
    expect(repository.snapshot.movements).toHaveLength(1);
  });

  it("generates unique inventory codes with category prefixes", () => {
    const repository = new MemoryRepository();
    const service = new InventoryService(repository);
    service.createReference({ ...reference("REF-RX", "radio", "individual"), radioType: "receiver", receiverChannels: 8, receiverProtocol: "ACCESS" });
    service.createReference({ ...reference("REF-MOTOR", "motor", "individual"), motorizationKind: "motor", motorType: "glow", motorDisplacement: "46" });
    service.addItem({ id: "ITEM-1", referenceId: "REF-RX", inventoryCode: "", status: "available", createdAt: "2026-11-01T12:00:00.000Z" });
    service.addItem({ id: "ITEM-2", referenceId: "REF-RX", inventoryCode: "", status: "available", createdAt: "2026-11-01T12:00:00.000Z" });
    service.addItem({ id: "ITEM-3", referenceId: "REF-MOTOR", inventoryCode: "", status: "available", createdAt: "2026-11-01T12:00:00.000Z" });
    expect(repository.snapshot.items.map((item) => item.inventoryCode)).toEqual(["RX-001", "RX-002", "MOT-001"]);
  });

  it("binds a receiver to zero or one transmitter and rejects invalid targets", () => {
    const repository = new MemoryRepository();
    const service = new InventoryService(repository);
    service.createReference({ ...reference("REF-RX", "radio", "individual"), radioType: "receiver", receiverChannels: 8, receiverProtocol: "ACCESS" });
    service.createReference({ ...reference("REF-TX", "radio", "individual"), radioType: "transmitter", transmitterChannels: 16, transmitterProtocols: ["ACCESS"] });
    service.addItem({ id: "RX-ITEM", referenceId: "REF-RX", inventoryCode: "", status: "available", createdAt: "2026-11-01T12:00:00.000Z" });
    service.addItem({ id: "TX-ITEM", referenceId: "REF-TX", inventoryCode: "", status: "available", createdAt: "2026-11-01T12:00:00.000Z" });
    service.setReceiverBinding("RX-ITEM", "TX-ITEM");
    expect(repository.snapshot.items.find((item) => item.id === "RX-ITEM")?.boundTransmitterId).toBe("TX-ITEM");
    service.setReceiverBinding("RX-ITEM", null);
    expect(repository.snapshot.items.find((item) => item.id === "RX-ITEM")?.boundTransmitterId).toBeUndefined();
    expect(() => service.setReceiverBinding("TX-ITEM", "RX-ITEM")).toThrow(/receiver/i);
  });

