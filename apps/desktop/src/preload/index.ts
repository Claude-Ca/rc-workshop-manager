import { contextBridge, ipcRenderer } from "electron";
import type { Aircraft, AircraftEquipmentDisposition, AircraftLogbookEvent, ComponentCategory, ComponentReference, InventorySnapshot, Project, StockItem, StockLot } from "@rc-workshop/core";

export type InventorySummary = { id: string; name: string; createdAt: string; lastUsedAt?: string; active: boolean; lastUsed: boolean; primary: boolean };
export type InventoryList = { items: InventorySummary[]; activeId: string; lastUsedId: string };

export interface DesktopApi {
  choosePhoto(): Promise<string | null>;
  exportDatabase(): Promise<boolean>;
  exportInventoryCsv(categories: ComponentCategory[] | "all"): Promise<boolean>;
  resetInventory(): Promise<InventorySnapshot>;
  compactDatabase(): Promise<{ beforeBytes: number; afterBytes: number; reclaimedBytes: number }>;
  getInventories(): Promise<InventoryList>;
  openInventory(id: string): Promise<InventoryList>;
  deleteInventory(id: string): Promise<InventoryList>;
  createInventory(name: string): Promise<InventoryList>;
  importInventory(): Promise<InventoryList>;
  getSnapshot(): Promise<InventorySnapshot>;
  createReference(input: Omit<ComponentReference, "createdAt" | "archived">): Promise<InventorySnapshot>;
  updateReference(input: ComponentReference): Promise<InventorySnapshot>;
  deleteReference(referenceId: string): Promise<{ snapshot: InventorySnapshot; archived: boolean }>;
  restoreReference(referenceId: string): Promise<InventorySnapshot>;
  addItem(input: Omit<StockItem, "createdAt">): Promise<InventorySnapshot>;
  updateItem(input: StockItem): Promise<InventorySnapshot>;
  deleteItem(itemId: string): Promise<InventorySnapshot>;
  addLot(input: StockLot): Promise<InventorySnapshot>;
  setStockGroupQuantity(referenceId: string, quantity: number, unit: string): Promise<InventorySnapshot>;
  addAircraft(input: Aircraft): Promise<InventorySnapshot>;
  updateAircraft(input: Aircraft): Promise<InventorySnapshot>;
  closeAircraft(aircraftId: string, lifecycleState: "sold" | "retired", dispositions: AircraftEquipmentDisposition[]): Promise<InventorySnapshot>;
  setAircraftFavorite(aircraftId: string, favorite: boolean): Promise<InventorySnapshot>;
  saveAircraftLogbookEvent(input: AircraftLogbookEvent): Promise<InventorySnapshot>;
  deleteAircraftLogbookEvent(eventId: string): Promise<InventorySnapshot>;
  addProject(input: Project): Promise<InventorySnapshot>;
  assignItem(itemId: string, target: { kind: "aircraft"; id: string } | { kind: "project"; id: string }): Promise<InventorySnapshot>;
  releaseItem(itemId: string): Promise<InventorySnapshot>;
  releaseAircraftItems(aircraftId: string, itemIds: string[]): Promise<InventorySnapshot>;
  setReceiverBinding(receiverItemId: string, transmitterItemId: string | null): Promise<InventorySnapshot>;
  setToolStatus(itemId: string, status: "available" | "borrowed" | "repair"): Promise<InventorySnapshot>;
}

const api: DesktopApi = {
  choosePhoto: () => ipcRenderer.invoke("photo:choose"),
  exportDatabase: () => ipcRenderer.invoke("export:database"),
  exportInventoryCsv: (categories) => ipcRenderer.invoke("export:csv", categories),
  resetInventory: () => ipcRenderer.invoke("inventory:reset"),
  compactDatabase: () => ipcRenderer.invoke("inventory:compact"),
  getInventories: () => ipcRenderer.invoke("inventories:list"),
  openInventory: (id) => ipcRenderer.invoke("inventories:open", id),
  deleteInventory: (id) => ipcRenderer.invoke("inventories:delete", id),
  createInventory: (name) => ipcRenderer.invoke("inventories:create", name),
  importInventory: () => ipcRenderer.invoke("inventories:import"),
  getSnapshot: () => ipcRenderer.invoke("inventory:snapshot"),
  createReference: (input) => ipcRenderer.invoke("inventory:create-reference", input),
  updateReference: (input) => ipcRenderer.invoke("inventory:update-reference", input),
  deleteReference: (referenceId) => ipcRenderer.invoke("inventory:delete-reference", referenceId),
  restoreReference: (referenceId) => ipcRenderer.invoke("inventory:restore-reference", referenceId),
  addItem: (input) => ipcRenderer.invoke("inventory:add-item", input),
  updateItem: (input) => ipcRenderer.invoke("inventory:update-item", input),
  deleteItem: (itemId) => ipcRenderer.invoke("inventory:delete-item", itemId),
  addLot: (input) => ipcRenderer.invoke("inventory:add-lot", input),
  setStockGroupQuantity: (referenceId, quantity, unit) => ipcRenderer.invoke("inventory:set-stock-group-quantity", referenceId, quantity, unit),
  addAircraft: (input) => ipcRenderer.invoke("inventory:add-aircraft", input),
  updateAircraft: (input) => ipcRenderer.invoke("inventory:update-aircraft", input),
  closeAircraft: (aircraftId, lifecycleState, dispositions) => ipcRenderer.invoke("inventory:close-aircraft", aircraftId, lifecycleState, dispositions),
  setAircraftFavorite: (aircraftId, favorite) => ipcRenderer.invoke("inventory:set-aircraft-favorite", aircraftId, favorite),
  saveAircraftLogbookEvent: (input) => ipcRenderer.invoke("inventory:save-aircraft-logbook-event", input),
  deleteAircraftLogbookEvent: (eventId) => ipcRenderer.invoke("inventory:delete-aircraft-logbook-event", eventId),
  addProject: (input) => ipcRenderer.invoke("inventory:add-project", input),
  assignItem: (itemId, target) => ipcRenderer.invoke("inventory:assign-item", itemId, target),
  releaseItem: (itemId) => ipcRenderer.invoke("inventory:release-item", itemId),
  releaseAircraftItems: (aircraftId, itemIds) => ipcRenderer.invoke("inventory:release-aircraft-items", aircraftId, itemIds),
  setReceiverBinding: (receiverItemId, transmitterItemId) => ipcRenderer.invoke("inventory:set-receiver-binding", receiverItemId, transmitterItemId),
  setToolStatus: (itemId, status) => ipcRenderer.invoke("inventory:set-tool-status", itemId, status),
};

contextBridge.exposeInMainWorld("rcWorkshop", api);
