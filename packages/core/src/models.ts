export const COMPONENT_CATEGORIES = [
  "motor", "esc", "battery", "propeller", "receiver", "servo", "connector",
  "control", "structure", "material", "construction", "tool", "other",
] as const;

export type ComponentCategory = (typeof COMPONENT_CATEGORIES)[number];
export type TrackingMode = "individual" | "quantity";
export type ItemStatus = "available" | "installed" | "reserved" | "repair" | "retired";

export interface ComponentReference {
  id: string;
  name: string;
  category: ComponentCategory;
  brand?: string;
  model?: string;
  description?: string;
  trackingMode: TrackingMode;
  /** Required radio properties for receiver references. */
  receiverChannels?: number;
  receiverProtocol?: string;
  attributes: Record<string, string | number | boolean>;
  photoPath?: string;
  archived: boolean;
  createdAt: string;
}

export interface StockItem {
  id: string;
  referenceId: string;
  inventoryCode: string;
  serialNumber?: string;
  status: ItemStatus;
  locationId?: string;
  aircraftId?: string;
  projectId?: string;
  tx16Name?: string;
  notes?: string;
  createdAt: string;
}

export interface StockLot {
  id: string;
  referenceId: string;
  quantity: number;
  unit: string;
  locationId?: string;
}

export interface Aircraft {
  id: string;
  name: string;
  manufacturer?: string;
  model?: string;
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  status: "planned" | "active" | "completed" | "cancelled";
  notes?: string;
}

export type MovementType =
  | "stock-in" | "installed" | "reserved" | "released"
  | "transferred" | "adjusted" | "consumed" | "repair" | "retired";

export interface StockMovement {
  id: string;
  type: MovementType;
  referenceId: string;
  itemId?: string;
  lotId?: string;
  quantity?: number;
  fromLocationId?: string;
  toLocationId?: string;
  aircraftId?: string;
  projectId?: string;
  notes?: string;
  occurredAt: string;
}

export interface InventorySnapshot {
  references: ComponentReference[];
  items: StockItem[];
  lots: StockLot[];
  aircraft: Aircraft[];
  projects: Project[];
  movements: StockMovement[];
}
