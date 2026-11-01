import type {
  Aircraft, ComponentReference, InventorySnapshot, Project, StockItem,
  StockLot, StockMovement,
} from "./models.js";

export interface InventoryRepository {
  getSnapshot(): InventorySnapshot;
  saveReference(reference: ComponentReference): void;
  deleteReference(referenceId: string): void;
  saveItem(item: StockItem): void;
  saveLot(lot: StockLot): void;
  saveAircraft(aircraft: Aircraft): void;
  deleteAircraft(aircraftId: string): void;
  saveProject(project: Project): void;
  appendMovement(movement: StockMovement): void;
}
