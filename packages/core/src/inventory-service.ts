import type {
  Aircraft, AircraftLogbookEvent, ComponentReference, InventorySnapshot, Project, StockItem, StockLot,
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
    if (reference.category === "battery") {
      if (item.aircraftId || item.projectId) throw new InventoryError("Une batterie est compatible avec des avions, mais ne peut pas leur être affectée.");
      if ((item.compatibleAircraftIds ?? []).some((id) => !snapshot.aircraft.some((aircraft) => aircraft.id === id))) throw new InventoryError("Un avion sélectionné pour la compatibilité n’existe plus.");
    } else if (item.compatibleAircraftIds?.length) throw new InventoryError("Seules les batteries peuvent définir des compatibilités avion.");
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
    const normalized: Aircraft = { ...aircraft, name: aircraft.name.trim(),
      aircraftType: aircraft.aircraftType ?? "other", operationalState: aircraft.operationalState ?? "flight-ready",
      lifecycleState: aircraft.lifecycleState ?? "active", favorite: aircraft.favorite ?? false };
    if (!["airplane", "glider", "motor-glider", "helicopter", "multirotor", "other"].includes(normalized.aircraftType!)) throw new InventoryError("Type d'aéronef invalide.");
    if (!["flight-ready", "maintenance", "parts", "out-of-service"].includes(normalized.operationalState!)) throw new InventoryError("État opérationnel invalide.");
    if (!["active", "sold", "retired"].includes(normalized.lifecycleState!)) throw new InventoryError("Cycle de vie invalide.");
    if (normalized.favorite && this.repository.getSnapshot().aircraft.filter((entry) => entry.favorite).length >= 4) {
      throw new InventoryError("Quatre aéronefs favoris maximum par inventaire.");
    }
    this.repository.saveAircraft(normalized);
  }

  updateAircraft(aircraft: Aircraft): void {
    const snapshot = this.repository.getSnapshot();
    const previous = snapshot.aircraft.find((entry) => entry.id === aircraft.id);
    if (!previous) throw new InventoryError("Avion introuvable.");
    if (!aircraft.name.trim()) throw new InventoryError("Le nom de l'avion est obligatoire.");
    if (aircraft.lifecycleState !== undefined && aircraft.lifecycleState !== (previous.lifecycleState ?? "active")) throw new InventoryError("La vente ou le retrait définitif doit être réalisé depuis l'action de clôture de la fiche aéronef.");
    if ((previous.lifecycleState ?? "active") !== "active") throw new InventoryError("La fiche d'un aéronef clôturé ne peut plus être modifiée.");
    const updated: Aircraft = { ...aircraft, name: aircraft.name.trim(), aircraftType: aircraft.aircraftType ?? "other", operationalState: aircraft.operationalState ?? "flight-ready", lifecycleState: "active", favorite: aircraft.favorite ?? false };
    if (!["airplane", "glider", "motor-glider", "helicopter", "multirotor", "other"].includes(updated.aircraftType!)) throw new InventoryError("Type d'aéronef invalide.");
    if (!["flight-ready", "maintenance", "parts", "out-of-service"].includes(updated.operationalState!)) throw new InventoryError("État opérationnel invalide.");
    if (updated.favorite && !previous.favorite && snapshot.aircraft.filter((entry) => entry.favorite).length >= 4) throw new InventoryError("Quatre aéronefs favoris maximum par inventaire.");
    if (aircraft.manufacturer?.trim()) updated.manufacturer = aircraft.manufacturer.trim(); else delete updated.manufacturer;
    if (aircraft.model?.trim()) updated.model = aircraft.model.trim(); else delete updated.model;
    if (aircraft.notes?.trim()) updated.notes = aircraft.notes.trim(); else delete updated.notes;
    if (aircraft.uafRegistration?.trim()) updated.uafRegistration = aircraft.uafRegistration.trim(); else delete updated.uafRegistration;
    if (aircraft.photoPath?.trim()) updated.photoPath = aircraft.photoPath.trim(); else delete updated.photoPath;
    this.repository.saveAircraft(updated);
  }

  closeAircraft(aircraftId: string, lifecycleState: "sold" | "retired", dispositions: import("./models.js").AircraftEquipmentDisposition[], movementIdPrefix: string, occurredAt: string): void {
    const snapshot = this.repository.getSnapshot();
    const aircraft = snapshot.aircraft.find((entry) => entry.id === aircraftId);
    if (!aircraft) throw new InventoryError("Aéronef introuvable.");
    if ((aircraft.lifecycleState ?? "active") !== "active") throw new InventoryError("Cet aéronef est déjà clôturé.");
    if (lifecycleState !== "sold" && lifecycleState !== "retired") throw new InventoryError("Type de clôture invalide.");
    if (!movementIdPrefix.trim()) throw new InventoryError("Identifiant de clôture obligatoire.");
    const installed = snapshot.items.filter((item) => item.status === "installed" && item.aircraftId === aircraftId);
    if (!Array.isArray(dispositions) || dispositions.length !== installed.length) throw new InventoryError("Chaque équipement affecté doit recevoir une destination explicite.");
    const selected = new Map(dispositions.map((entry) => [entry.itemId, entry.destination]));
    const allowed: import("./models.js").AircraftClosureDestination[] = ["inventory", "sold-with-aircraft", "sold-separately", "scrapped"];
    if (selected.size !== installed.length || installed.some((item) => !selected.has(item.id)) || dispositions.some((entry) => !allowed.includes(entry.destination))) throw new InventoryError("Les destinations des équipements sont incomplètes ou invalides.");
    const labels: Record<import("./models.js").AircraftClosureDestination, string> = { inventory: "récupéré dans l'inventaire", "sold-with-aircraft": "vendu avec l'aéronef", "sold-separately": "vendu séparément", scrapped: "mis au rebut" };
    const entries = installed.map((item, index) => {
      const destination = selected.get(item.id)!;
      const updatedItem: StockItem = { ...item, status: destination === "inventory" ? "available" : "retired" };
      delete updatedItem.aircraftId; delete updatedItem.projectId;
      const movement: StockMovement = { id: movementIdPrefix + "-" + index, type: destination === "inventory" ? "released" : destination === "scrapped" ? "retired" : "sold", referenceId: item.referenceId, itemId: item.id, aircraftId, notes: "Clôture de l'aéronef : " + labels[destination], occurredAt };
      return { item: updatedItem, movement };
    });
    const closed: Aircraft = { ...aircraft, lifecycleState, favorite: false };
    const event: AircraftLogbookEvent = { id: movementIdPrefix + "-LOGBOOK", aircraftId, type: lifecycleState === "sold" ? "sale" : "retirement", date: occurredAt.slice(0, 10), comment: lifecycleState === "sold" ? "Aéronef vendu et sorti de la flotte." : "Aéronef retiré définitivement de la flotte." };
    this.repository.saveAircraftClosure(closed, entries, event);
  }

  setAircraftFavorite(aircraftId: string, favorite: boolean): void {
    const snapshot = this.repository.getSnapshot();
    const aircraft = snapshot.aircraft.find((entry) => entry.id === aircraftId);
    if (!aircraft) throw new InventoryError("Aéronef introuvable.");
    if (favorite && !aircraft.favorite && snapshot.aircraft.filter((entry) => entry.favorite).length >= 4) {
      throw new InventoryError("Quatre aéronefs favoris maximum par inventaire.");
    }
    this.repository.saveAircraft({ ...aircraft, favorite });
  }

  saveAircraftLogbookEvent(event: AircraftLogbookEvent): void {
    const snapshot = this.repository.getSnapshot();
    if (!snapshot.aircraft.some((aircraft) => aircraft.id === event.aircraftId)) throw new InventoryError("Aéronef introuvable.");
    if (!event.id.trim()) throw new InventoryError("Identifiant d'événement obligatoire.");
    if (!["commissioning", "flight", "maintenance", "incident", "sale", "retirement"].includes(event.type)) throw new InventoryError("Type d'événement invalide.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date) || Number.isNaN(Date.parse(event.date + "T00:00:00Z")) || new Date(event.date + "T00:00:00.000Z").toISOString().slice(0, 10) !== event.date) throw new InventoryError("La date de l'événement est invalide.");
    if (event.flightCount !== undefined && (!Number.isInteger(event.flightCount) || event.flightCount < 0)) throw new InventoryError("Le nombre de vols doit être un entier positif ou nul.");
    const normalized: AircraftLogbookEvent = { ...event };
    const comment = event.comment?.trim();
    if (comment) normalized.comment = comment; else delete normalized.comment;
    this.repository.saveLogbookEvent(normalized);
  }

  deleteAircraftLogbookEvent(eventId: string): void {
    if (!this.repository.getSnapshot().logbookEvents.some((event) => event.id === eventId)) throw new InventoryError("Événement de journal introuvable.");
    this.repository.deleteLogbookEvent(eventId);
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
    if (!["available", "borrowed", "repair"].includes(status)) throw new InventoryError("Statut d’outil invalide.");
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

  releaseAircraftItems(aircraftId: string, itemIds: string[], movementIdPrefix: string, occurredAt: string): void {
    const snapshot = this.repository.getSnapshot();
    if (!snapshot.aircraft.some((aircraft) => aircraft.id === aircraftId)) throw new InventoryError("Aéronef introuvable.");
    if (!Array.isArray(itemIds) || itemIds.length === 0) throw new InventoryError("Sélectionne au moins un équipement à récupérer.");
    if (new Set(itemIds).size !== itemIds.length) throw new InventoryError("La sélection contient un équipement en double.");
    if (!movementIdPrefix.trim()) throw new InventoryError("Identifiant de mouvement obligatoire.");
    const entries = itemIds.map((itemId, index) => {
      const item = snapshot.items.find((entry) => entry.id === itemId);
      if (!item || item.status !== "installed" || item.aircraftId !== aircraftId) {
        throw new InventoryError("Un équipement sélectionné n'est plus affecté à cet aéronef. Actualise la fiche avant de recommencer.");
      }
      const updated: StockItem = { ...item, status: "available" };
      delete updated.aircraftId;
      delete updated.projectId;
      const movement: StockMovement = {
        id: movementIdPrefix + "-" + index, type: "released", referenceId: item.referenceId,
        itemId: item.id, aircraftId, notes: "Récupération depuis l'aéronef", occurredAt,
      };
      return { item: updated, movement };
    });
    if (this.repository.releaseAircraftItems) {
      this.repository.releaseAircraftItems(entries);
    } else {
      for (const entry of entries) {
        this.repository.saveItem(entry.item);
        this.repository.appendMovement(entry.movement);
      }
    }
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
