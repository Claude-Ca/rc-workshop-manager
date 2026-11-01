import type {
  Aircraft, ComponentReference, InventorySnapshot, Project, StockItem, StockLot,
  StockMovement, ItemStatus,
} from "./models.js";
import type { InventoryRepository } from "./repository.js";

export class InventoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InventoryError";
  }
}

export class InventoryService {
  constructor(private readonly repository: InventoryRepository) {}

  getSnapshot(): InventorySnapshot {
    return this.repository.getSnapshot();
  }

  createReference(reference: ComponentReference): void {
    const snapshot = this.repository.getSnapshot();
    if (!reference.id.trim() || !reference.name.trim()) throw new InventoryError("Identifiant et désignation obligatoires.");
    if (snapshot.references.some((entry) => entry.id === reference.id)) throw new InventoryError("Cette référence existe déjà.");
    if (reference.category === "receiver" && reference.trackingMode !== "individual") {
      throw new InventoryError("Un récepteur doit être suivi individuellement.");
    }
    this.repository.saveReference({ ...reference, name: reference.name.trim(), archived: false });
  }

  addItem(item: StockItem): void {
    const snapshot = this.repository.getSnapshot();
    const reference = snapshot.references.find((entry) => entry.id === item.referenceId && !entry.archived);
    if (!reference) throw new InventoryError("Référence catalogue introuvable ou archivée.");
    if (reference.trackingMode !== "individual") throw new InventoryError("Cette référence est gérée en quantité, pas par exemplaire.");
    if (!item.inventoryCode.trim()) throw new InventoryError("L'identifiant d'inventaire est obligatoire.");
    if (snapshot.items.some((entry) => entry.inventoryCode.toLowerCase() === item.inventoryCode.toLowerCase())) {
      throw new InventoryError("Cet identifiant d'inventaire est déjà utilisé.");
    }
    if (reference.category === "receiver") {
      const tx16Name = item.tx16Name?.trim() || item.inventoryCode.trim();
      if (snapshot.items.some((entry) => entry.tx16Name?.toLowerCase() === tx16Name.toLowerCase())) {
        throw new InventoryError("Ce nom TX16 est déjà attribué à un récepteur.");
      }
      this.repository.saveItem({ ...item, tx16Name });
    } else {
      this.repository.saveItem(item);
    }
    this.repository.appendMovement({
      id: `MOV-${item.id}`, type: "stock-in", referenceId: item.referenceId,
      itemId: item.id, occurredAt: item.createdAt,
    });
  }

  addLot(lot: StockLot): void {
    const snapshot = this.repository.getSnapshot();
    const reference = snapshot.references.find((entry) => entry.id === lot.referenceId && !entry.archived);
    if (!reference) throw new InventoryError("Référence catalogue introuvable ou archivée.");
    if (reference.trackingMode !== "quantity") throw new InventoryError("Cette référence nécessite un suivi individuel.");
    if (!Number.isInteger(lot.quantity) || lot.quantity <= 0) throw new InventoryError("La quantité doit être un entier strictement positif.");
    if (!lot.unit.trim()) throw new InventoryError("L'unité de stock est obligatoire.");
    this.repository.saveLot(lot);
    this.repository.appendMovement({
      id: `MOV-${lot.id}`, type: "stock-in", referenceId: lot.referenceId,
      lotId: lot.id, quantity: lot.quantity, occurredAt: new Date().toISOString(),
    });
  }

  addAircraft(aircraft: Aircraft): void {
    if (!aircraft.id.trim() || !aircraft.name.trim()) throw new InventoryError("Identifiant et nom d'avion obligatoires.");
    this.repository.saveAircraft(aircraft);
  }

  addProject(project: Project): void {
    if (!project.id.trim() || !project.name.trim()) throw new InventoryError("Identifiant et nom de projet obligatoires.");
    this.repository.saveProject(project);
  }

  assignItem(itemId: string, target: { kind: "aircraft"; id: string } | { kind: "project"; id: string }, movementId: string, occurredAt: string): void {
    const snapshot = this.repository.getSnapshot();
    const item = snapshot.items.find((entry) => entry.id === itemId);
    if (!item) throw new InventoryError("Exemplaire introuvable.");
    if (item.status !== "available") throw new InventoryError("Seul un exemplaire disponible peut être affecté.");
    if (target.kind === "aircraft" && !snapshot.aircraft.some((entry) => entry.id === target.id)) throw new InventoryError("Avion introuvable.");
    if (target.kind === "project" && !snapshot.projects.some((entry) => entry.id === target.id)) throw new InventoryError("Projet introuvable.");
    const status: ItemStatus = target.kind === "aircraft" ? "installed" : "reserved";
    const updated: StockItem = {
      ...item, status,
      ...(target.kind === "aircraft" ? { aircraftId: target.id } : { projectId: target.id }),
    };
    if (target.kind === "aircraft") delete updated.projectId;
    else delete updated.aircraftId;
    this.repository.saveItem(updated);
    this.repository.appendMovement({
      id: movementId, type: target.kind === "aircraft" ? "installed" : "reserved",
      referenceId: item.referenceId, itemId, ...(target.kind === "aircraft" ? { aircraftId: target.id } : { projectId: target.id }), occurredAt,
    });
  }

  releaseItem(itemId: string, movementId: string, occurredAt: string): void {
    const item = this.repository.getSnapshot().items.find((entry) => entry.id === itemId);
    if (!item) throw new InventoryError("Exemplaire introuvable.");
    if (item.status !== "installed" && item.status !== "reserved") throw new InventoryError("Cet exemplaire n'est pas affecté.");
    const updated: StockItem = { ...item, status: "available" };
    delete updated.aircraftId;
    delete updated.projectId;
    this.repository.saveItem(updated);
    this.repository.appendMovement({ id: movementId, type: "released", referenceId: item.referenceId, itemId, occurredAt });
  }
}
