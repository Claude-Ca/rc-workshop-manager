export const COMPONENT_CATEGORIES = [
  "motor", "esc", "radio", "servo", "battery", "supplies", "tool", "other",
] as const;

export type ComponentCategory = (typeof COMPONENT_CATEGORIES)[number] | "propeller" | "receiver" | "connector" | "control" | "structure" | "material" | "construction";
export type TrackingMode = "individual" | "quantity";
export type ItemStatus = "available" | "installed" | "reserved" | "borrowed" | "repair" | "sold" | "retired";

export interface ComponentReference {
  id: string;
  name: string;
  category: ComponentCategory;
  brand?: string;
  model?: string;
  description?: string;
  trackingMode: TrackingMode;
  /** Radio reference subtype; transmitters are not assigned to aircraft. */
  radioType?: "transmitter" | "receiver";
  receiverChannels?: number;
  receiverProtocol?: string;
  transmitterChannels?: number;
  transmitterProtocols?: string[];
  firmwareVersion?: string;
  batteryConnector?: string;
  batteryDischargeRateC?: number;
  batteryDimensionsMm?: string;
  batteryWeightG?: number;
  motorizationKind?: "motor" | "propeller";
  motorType?: "electric" | "glow";
  motorVoltage?: string;
  motorDisplacement?: string;
  propellerDiameter?: string;
  propellerPitch?: string;
  attributes: Record<string, string | number | boolean>;
  photoPath?: string;
  merchantUrl?: string;
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
  boundTransmitterId?: string;
  /** Aircraft for which an individual battery is compatible; never an assignment. */
  compatibleAircraftIds?: string[];
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

export type AircraftType = "airplane" | "glider" | "motor-glider" | "helicopter" | "multirotor" | "other";
export type AircraftOperationalState = "flight-ready" | "maintenance" | "parts" | "out-of-service";
export type AircraftLifecycleState = "active" | "sold" | "retired";

export type AircraftClosureDestination = "inventory" | "sold-with-aircraft" | "sold-separately" | "scrapped";
export interface AircraftEquipmentDisposition { itemId: string; destination: AircraftClosureDestination; }

export interface Aircraft {
  id: string;
  name: string;
  manufacturer?: string;
  model?: string;
  notes?: string;
  uafRegistration?: string;
  photoPath?: string;
  aircraftType?: AircraftType;
  operationalState?: AircraftOperationalState;
  lifecycleState?: AircraftLifecycleState;
  favorite?: boolean;
}

export interface Project {
  id: string;
  name: string;
  status: "planned" | "active" | "completed" | "cancelled";
  notes?: string;
}

export type MovementType =
  | "stock-in" | "installed" | "reserved" | "released"
  | "transferred" | "adjusted" | "consumed" | "repair" | "sold" | "retired" | "deleted";

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

export type AircraftLogbookEventType = "commissioning" | "flight" | "maintenance" | "incident" | "sale" | "retirement" | "note" | "task";

export interface AircraftLogbookEvent {
  id: string;
  aircraftId: string;
  type: AircraftLogbookEventType;
  date: string;
  comment?: string;
  flightCount?: number;
  taskStatus?: "todo" | "done";
}

export interface InventorySnapshot {
  logbookEvents: AircraftLogbookEvent[];
  references: ComponentReference[];
  items: StockItem[];
  lots: StockLot[];
  aircraft: Aircraft[];
  projects: Project[];
  movements: StockMovement[];
}
