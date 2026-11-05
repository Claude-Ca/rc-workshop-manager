import type { Aircraft, AircraftLogbookEvent, ComponentReference, InventorySnapshot, Project, StockItem, StockLot, StockMovement } from "./models.js";
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
  saveLogbookEvent(event: AircraftLogbookEvent): void;
  deleteLogbookEvent(eventId: string): void;
  saveProject(project: Project): void;
  appendMovement(movement: StockMovement): void;
  saveAircraftClosure(aircraft: Aircraft, entries: Array<{ item: StockItem; movement: StockMovement }>, event: AircraftLogbookEvent): void;
  releaseAircraftItems?(entries: Array<{ item: StockItem; movement: StockMovement }>): void;
}
