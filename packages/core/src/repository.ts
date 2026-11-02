import type {
  Aircraft, ComponentReference, InventorySnapshot, Project, StockItem,
  StockLot, StockMovement,
} from "./models.js";

export interface InventoryRepository {
  getSnapshot(): InventorySnapshot;
  saveReference(reference: ComponentReference): void;
  deleteReference(referenceId: string): void;
  saveItem(item: StockItem): void;
  deleteItem(itemId: string): void;
  saveLot(lot: StockLot): void;
  deleteLot(lotId: string): void;
  saveAircraft(aircraft: Aircraft): void;
  deleteAircraft(aircraftId: string): void;
  saveProject(project: Project): void;
  appendMovement(movement: StockMovement): void;
}
