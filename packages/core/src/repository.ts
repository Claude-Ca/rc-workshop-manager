import type {
  Aircraft, ComponentReference, InventorySnapshot, Project, StockItem,
  StockLot, StockMovement,
} from "./models.js";

export interface InventoryRepository {
  getSnapshot(): InventorySnapshot;
  saveReference(reference: ComponentReference): void;
  saveItem(item: StockItem): void;
  saveLot(lot: StockLot): void;
  saveAircraft(aircraft: Aircraft): void;
  saveProject(project: Project): void;
  appendMovement(movement: StockMovement): void;
}
