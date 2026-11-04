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
    if (reference.category === "supplies" && reference.trackingMode !== "quantity") throw new InventoryError("Les fournitures doivent être gérées par quantité.");
    if (["motor", "esc", "radio", "battery", "tool", "servo"].includes(reference.category) && reference.trackingMode !== "individual") throw new InventoryError("Cette catégorie doit être suivie individuellement.");
    if ((reference.category === "receiver" || (reference.category === "radio" && (reference.radioType ?? "receiver") === "receiver")) && reference.trackingMode !== "individual") {
      throw new InventoryError("Un récepteur doit être suivi individuellement.");
    }
    if ((reference.category === "receiver" || (reference.category === "radio" && (reference.radioType ?? "receiver") === "receiver"))) {
      if (!Number.isInteger(reference.receiverChannels) || (reference.receiverChannels ?? 0) < 1) {
        throw new InventoryError("Le nombre de voies du récepteur doit être un entier strictement positif.");
      }
      if (!reference.receiverProtocol?.trim()) {
        throw new InventoryError("Le protocole radio du récepteur est obligatoire.");
      }
    }
    if (reference.category === "motor") {
      if (!reference.motorizationKind) throw new InventoryError("Type de motorisation obligatoire.");
      if (reference.motorizationKind === "motor" && !reference.motorType) throw new InventoryError("Type de moteur obligatoire.");
      if (reference.motorizationKind === "motor" && reference.motorType === "electric" && !reference.motorVoltage?.trim()) throw new InventoryError("Tension obligatoire.");
      if (reference.motorizationKind === "motor" && reference.motorType === "glow" && !reference.motorDisplacement?.trim()) throw new InventoryError("Cylindree obligatoire.");
      if (reference.motorizationKind === "propeller" && (!reference.propellerDiameter?.trim() || !reference.propellerPitch?.trim())) throw new InventoryError("Diametre et pas obligatoires.");
    }
    if (reference.category === "radio" && reference.radioType === "transmitter") {
      if (!Number.isInteger(reference.transmitterChannels) || (reference.transmitterChannels ?? 0) < 1) throw new InventoryError("Le nombre de voies de l'émetteur doit être un entier strictement positif.");
      if (!reference.transmitterProtocols?.some((protocol) => protocol.trim())) throw new InventoryError("Au moins un protocole radio de l'émetteur est obligatoire.");
    }
    this.repository.saveReference({ ...reference, name: reference.name.trim(), archived: false });
  }

  updateReference(reference: ComponentReference): void {
    const snapshot = this.repository.getSnapshot();
    const existing = snapshot.references.find((entry) => entry.id === reference.id);
    if (!existing) throw new InventoryError("Référence catalogue introuvable.");
    if (existing.archived) throw new InventoryError("Une référence archivée ne peut pas être modifiée.");
    if (!reference.name.trim()) throw new InventoryError("La désignation est obligatoire.");
    if (reference.category === "supplies" && reference.trackingMode !== "quantity") throw new InventoryError("Les fournitures doivent être gérées par quantité.");
    if (["motor", "esc", "radio", "battery", "tool", "servo"].includes(reference.category) && reference.trackingMode !== "individual") throw new InventoryError("Cette catégorie doit être suivie individuellement.");
    const hasStock = snapshot.items.some((item) => item.referenceId === reference.id) || snapshot.lots.some((lot) => lot.referenceId === reference.id);
    const hasHistory = snapshot.movements.some((movement) => movement.referenceId === reference.id);
    if ((hasStock || hasHistory) && reference.category !== existing.category) throw new InventoryError("La catégorie ne peut pas être modifiée après utilisation de cette référence.");
    if (hasStock && reference.trackingMode !== existing.trackingMode) throw new InventoryError("Le mode de suivi ne peut pas être modifié tant que des exemplaires ou lots existent.");
    if (reference.category === "supplies" && reference.trackingMode !== "quantity") throw new InventoryError("Les fournitures doivent être gérées par quantité.");
    if ((reference.category === "receiver" || (reference.category === "radio" && (reference.radioType ?? "receiver") === "receiver"))) {
      if (reference.trackingMode !== "individual") throw new InventoryError("Un récepteur doit être suivi individuellement.");
      if (!Number.isInteger(reference.receiverChannels) || (reference.receiverChannels ?? 0) < 1) throw new InventoryError("Le nombre de voies du récepteur doit être un entier strictement positif.");
      if (!reference.receiverProtocol?.trim()) throw new InventoryError("Le protocole radio du récepteur est obligatoire.");
    }
    if (reference.category === "motor") {
      if (!reference.motorizationKind) throw new InventoryError("Type de motorisation obligatoire.");
      if (reference.motorizationKind === "motor" && !reference.motorType) throw new InventoryError("Type de moteur obligatoire.");
      if (reference.motorType === "electric" && !reference.motorVoltage?.trim()) throw new InventoryError("Tension obligatoire.");
      if (reference.motorType === "glow" && !reference.motorDisplacement?.trim()) throw new InventoryError("Cylindree obligatoire.");
      if (reference.motorizationKind === "propeller" && (!reference.propellerDiameter?.trim() || !reference.propellerPitch?.trim())) throw new InventoryError("Diametre et pas obligatoires.");
    }
    if (reference.category === "radio" && reference.radioType === "transmitter") {
      if (!Number.isInteger(reference.transmitterChannels) || (reference.transmitterChannels ?? 0) < 1) throw new InventoryError("Le nombre de voies de l'émetteur doit être un entier strictement positif.");
      if (!reference.transmitterProtocols?.some((protocol) => protocol.trim())) throw new InventoryError("Au moins un protocole radio de l'émetteur est obligatoire.");
    }
    const updated: ComponentReference = { ...reference, id: existing.id, createdAt: existing.createdAt, name: reference.name.trim(), archived: false };
    if (reference.brand?.trim()) updated.brand = reference.brand.trim(); else delete updated.brand;
    if (reference.model?.trim()) updated.model = reference.model.trim(); else delete updated.model;
    this.repository.saveReference(updated);
  }

  deleteReference(referenceId: string): { archived: boolean } {
    const snapshot = this.repository.getSnapshot();
    const reference = snapshot.references.find((entry) => entry.id === referenceId);
    if (!reference) throw new InventoryError("Référence catalogue introuvable.");
    const items = snapshot.items.filter((item) => item.referenceId === referenceId).length;
    const lots = snapshot.lots.filter((lot) => lot.referenceId === referenceId).length;
    const movements = snapshot.movements.filter((movement) => movement.referenceId === referenceId).length;
    if (items + lots + movements > 0) {
      this.repository.saveReference({ ...reference, archived: true });
      return { archived: true };
    }
    this.repository.deleteReference(referenceId);
    return { archived: false };
  }

  restoreReference(referenceId: string): void {
    const reference = this.repository.getSnapshot().references.find((entry) => entry.id === referenceId);
    if (!reference) throw new InventoryError("Référence catalogue introuvable.");
    if (!reference.archived) throw new InventoryError("Cette référence n'est pas archivée.");
    this.repository.saveReference({ ...reference, archived: false });
  }

  addItem(item: StockItem): void {
    const snapshot = this.repository.getSnapshot();
    const reference = snapshot.references.find((entry) => entry.id === item.referenceId && !entry.archived);
    if (!reference) throw new InventoryError("Référence catalogue introuvable ou archivée.");
    if (reference.category === "supplies" || reference.trackingMode !== "individual") throw new InventoryError("Cette référence est gérée en quantité, pas par exemplaire.");
    if (reference.category === "battery" && (item.aircraftId || item.projectId)) throw new InventoryError("Une batterie est compatible avec des avions, mais ne peut pas leur être affectée.");
    if (reference.category === "tool" && !["available", "borrowed", "repair"].includes(item.status)) throw new InventoryError("Statut d’outil invalide.");
    const prefix = reference.category === "radio" && reference.radioType === "transmitter" ? "TX" : reference.category === "receiver" || reference.category === "radio" ? "RX" : reference.category === "motor" && reference.motorizationKind === "propeller" ? "PROP" : reference.category === "motor" ? "MOT" : reference.category === "esc" ? "ESC" : reference.category === "servo" ? "SER" : reference.category === "battery" ? "BAT" : reference.category === "tool" ? "TOOL" : "DIV";
    let sequence = 1;
    let inventoryCode = prefix + "-" + String(sequence).padStart(3, "0");
    const usedCodes = new Set(snapshot.items.map((entry) => entry.inventoryCode.toLowerCase()));
    while (usedCodes.has(inventoryCode.toLowerCase())) { sequence += 1; inventoryCode = prefix + "-" + String(sequence).padStart(3, "0"); }
    item = { ...item, inventoryCode };
    if ((reference.category === "receiver" || (reference.category === "radio" && (reference.radioType ?? "receiver") === "receiver"))) {
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

  updateItem(input: StockItem): void {
    const snapshot = this.repository.getSnapshot();
    const existing = snapshot.items.find((item) => item.id === input.id);
    if (!existing) throw new InventoryError("Exemplaire introuvable.");
    if (input.referenceId !== existing.referenceId) throw new InventoryError("La référence d’un exemplaire ne peut pas être modifiée.");
    const reference = snapshot.references.find((entry) => entry.id === existing.referenceId);
    if (!reference) throw new InventoryError("Référence catalogue introuvable.");
    const updated: StockItem = { ...existing };
    if (reference.category === "battery") {
      const compatibleIds = [...new Set(input.compatibleAircraftIds ?? [])];
      if (compatibleIds.some((id) => !snapshot.aircraft.some((aircraft) => aircraft.id === id))) throw new InventoryError("Un avion sélectionné pour la compatibilité n'existe plus.");
      if (compatibleIds.length) updated.compatibleAircraftIds = compatibleIds; else delete updated.compatibleAircraftIds;
      if (existing.aircraftId || existing.projectId) throw new InventoryError("Une batterie ne peut pas être affectée à un avion ou à un projet.");
    } else delete updated.compatibleAircraftIds;
    if (input.serialNumber?.trim()) updated.serialNumber = input.serialNumber.trim(); else delete updated.serialNumber;
    if (input.locationId?.trim()) updated.locationId = input.locationId.trim(); else delete updated.locationId;
    if (input.notes?.trim()) updated.notes = input.notes.trim(); else delete updated.notes;
    const isReceiver = reference.category === "receiver" || (reference.category === "radio" && reference.radioType === "receiver");
    if (isReceiver) {
      const tx16Name = input.tx16Name?.trim() || existing.inventoryCode;
      if (snapshot.items.some((item) => item.id !== existing.id && item.tx16Name?.toLowerCase() === tx16Name.toLowerCase())) {
        throw new InventoryError("Ce nom TX16 est déjà attribué à un récepteur.");
      }
      updated.tx16Name = tx16Name;
    }
    this.repository.saveItem(updated);
  }

  deleteItem(itemId: string, movementId: string, occurredAt: string): void {
    const item = this.repository.getSnapshot().items.find((entry) => entry.id === itemId);
    if (!item) throw new InventoryError("Exemplaire introuvable.");
    this.repository.appendMovement({ id: movementId, type: "deleted", referenceId: item.referenceId, itemId, occurredAt });
    this.repository.deleteItem(itemId);
  }

  setStockGroupQuantity(referenceId: string, quantity: number, unit: string, newLotId: string, movementId: string, occurredAt: string): void {
    const snapshot = this.repository.getSnapshot();
    const reference = snapshot.references.find((entry) => entry.id === referenceId && !entry.archived);
    if (!reference || reference.category !== "supplies" || reference.trackingMode !== "quantity") throw new InventoryError("Fourniture introuvable.");
    if (!Number.isInteger(quantity) || quantity < 0) throw new InventoryError("La quantité doit être un entier positif ou nul.");
    if (!unit.trim()) throw new InventoryError("L’unité de stock est obligatoire.");
    const existingLots = snapshot.lots.filter((lot) => lot.referenceId === referenceId);
    const lotId = existingLots[0]?.id ?? newLotId;
    const before = existingLots.reduce((sum, lot) => sum + lot.quantity, 0);
    this.repository.saveLot({ id: lotId, referenceId, quantity, unit: unit.trim() });
    for (const lot of existingLots.slice(1)) this.repository.deleteLot(lot.id);
    this.repository.appendMovement({ id: movementId, type: "adjusted", referenceId, lotId, quantity: quantity - before, occurredAt });
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

  updateAircraft(aircraft: Aircraft): void {
    const snapshot = this.repository.getSnapshot();
    if (!snapshot.aircraft.some((entry) => entry.id === aircraft.id)) throw new InventoryError("Avion introuvable.");
    if (!aircraft.name.trim()) throw new InventoryError("Le nom de l'avion est obligatoire.");
    const updated: Aircraft = { ...aircraft, name: aircraft.name.trim() };
    if (aircraft.manufacturer?.trim()) updated.manufacturer = aircraft.manufacturer.trim(); else delete updated.manufacturer;
    if (aircraft.model?.trim()) updated.model = aircraft.model.trim(); else delete updated.model;
    if (aircraft.notes?.trim()) updated.notes = aircraft.notes.trim(); else delete updated.notes;
    if (aircraft.uafRegistration?.trim()) updated.uafRegistration = aircraft.uafRegistration.trim(); else delete updated.uafRegistration;
    this.repository.saveAircraft(updated);
  }

  addProject(project: Project): void {
    if (!project.id.trim() || !project.name.trim()) throw new InventoryError("Identifiant et nom de projet obligatoires.");
    this.repository.saveProject(project);
  }

  setToolStatus(itemId: string, status: "available" | "borrowed" | "repair", movementId: string, occurredAt: string): void {
    const snapshot = this.repository.getSnapshot();
    const item = snapshot.items.find((entry) => entry.id === itemId);
    if (!item) throw new InventoryError("Outil introuvable.");
    const reference = snapshot.references.find((entry) => entry.id === item.referenceId);
    if (reference?.category !== "tool") throw new InventoryError("Seul un outil peut recevoir ce statut.");
    if (item.status === "installed" || item.status === "reserved") throw new InventoryError("Un outil affecté ne peut pas changer de statut.");
    if (item.status === status) return;
    this.repository.saveItem({ ...item, status });
    this.repository.appendMovement({ id: movementId, type: status === "repair" ? "repair" : "adjusted", referenceId: item.referenceId, itemId, notes: "Statut outil : " + status, occurredAt });
  }

  setReceiverBinding(receiverItemId: string, transmitterItemId: string | null): void {
    const snapshot = this.repository.getSnapshot();
    const receiver = snapshot.items.find((entry) => entry.id === receiverItemId);
    if (!receiver) throw new InventoryError("Receiver not found.");
    const receiverReference = snapshot.references.find((entry) => entry.id === receiver.referenceId);
    if (receiverReference?.category !== "radio" || receiverReference.radioType !== "receiver") throw new InventoryError("Only a receiver can be bound.");
    const updated: StockItem = { ...receiver };
    if (transmitterItemId) {
      const transmitter = snapshot.items.find((entry) => entry.id === transmitterItemId);
      const transmitterReference = transmitter && snapshot.references.find((entry) => entry.id === transmitter.referenceId);
      if (!transmitter || transmitterReference?.category !== "radio" || transmitterReference.radioType !== "transmitter") throw new InventoryError("Selected item is not a transmitter.");
      updated.boundTransmitterId = transmitter.id;
    } else delete updated.boundTransmitterId;
    this.repository.saveItem(updated);
  }

  assignItem(itemId: string, target: { kind: "aircraft"; id: string } | { kind: "project"; id: string }, movementId: string, occurredAt: string): void {
    const snapshot = this.repository.getSnapshot();
    const item = snapshot.items.find((entry) => entry.id === itemId);
    if (!item) throw new InventoryError("Exemplaire introuvable.");
    if (item.status !== "available") throw new InventoryError("Seul un exemplaire disponible peut être affecté.");
    const itemReference = snapshot.references.find((entry) => entry.id === item.referenceId);
    if (itemReference?.category === "supplies" || itemReference?.category === "tool" || itemReference?.category === "battery") throw new InventoryError("Les fournitures, outils et batteries ne peuvent pas être affectés.");
    if (itemReference?.category === "radio" && itemReference.radioType === "transmitter") throw new InventoryError("A transmitter cannot be assigned.");
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
