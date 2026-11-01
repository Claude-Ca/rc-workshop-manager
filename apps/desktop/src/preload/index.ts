import { contextBridge, ipcRenderer } from "electron";
import type { Aircraft, ComponentReference, InventorySnapshot, Project, StockItem, StockLot } from "@rc-workshop/core";

export interface DesktopApi {
  getSnapshot(): Promise<InventorySnapshot>;
  createReference(input: Omit<ComponentReference, "createdAt" | "archived">): Promise<InventorySnapshot>;
  addItem(input: Omit<StockItem, "createdAt">): Promise<InventorySnapshot>;
  addLot(input: StockLot): Promise<InventorySnapshot>;
  addAircraft(input: Aircraft): Promise<InventorySnapshot>;
  addProject(input: Project): Promise<InventorySnapshot>;
  assignItem(itemId: string, target: { kind: "aircraft"; id: string } | { kind: "project"; id: string }): Promise<InventorySnapshot>;
  releaseItem(itemId: string): Promise<InventorySnapshot>;
}

const api: DesktopApi = {
  getSnapshot: () => ipcRenderer.invoke("inventory:snapshot"),
  createReference: (input) => ipcRenderer.invoke("inventory:create-reference", input),
  addItem: (input) => ipcRenderer.invoke("inventory:add-item", input),
  addLot: (input) => ipcRenderer.invoke("inventory:add-lot", input),
  addAircraft: (input) => ipcRenderer.invoke("inventory:add-aircraft", input),
  addProject: (input) => ipcRenderer.invoke("inventory:add-project", input),
  assignItem: (itemId, target) => ipcRenderer.invoke("inventory:assign-item", itemId, target),
  releaseItem: (itemId) => ipcRenderer.invoke("inventory:release-item", itemId),
};

contextBridge.exposeInMainWorld("rcWorkshop", api);
