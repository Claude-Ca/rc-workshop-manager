import Database from "better-sqlite3";
import type {
  Aircraft, ComponentReference, InventorySnapshot, Project, StockItem, StockLot, StockMovement,
} from "@rc-workshop/core";
import type { InventoryRepository } from "@rc-workshop/core";

type Row = Record<string, unknown>;

const REQUIRED_INVENTORY_COLUMNS: Record<string, readonly string[]> = {
  component_references: ["id", "name", "category", "brand", "model", "description", "tracking_mode", "attributes_json", "photo_path", "archived", "created_at"],
  stock_items: ["id", "reference_id", "inventory_code", "serial_number", "status", "location_id", "aircraft_id", "project_id", "tx16_name", "notes", "created_at"],
  stock_lots: ["id", "reference_id", "quantity", "unit", "location_id"],
  aircraft: ["id", "name", "manufacturer", "model", "notes"],
  projects: ["id", "name", "status", "notes"],
  stock_movements: ["id", "type", "reference_id", "item_id", "lot_id", "quantity", "from_location_id", "to_location_id", "aircraft_id", "project_id", "notes", "occurred_at"],
};

/**
 * Checks an imported file without modifying it. Schema upgrades are applied only
 * after the file has passed this read-only compatibility check.
 */
export function validateInventoryDatabase(databasePath: string): void {
  const db = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    const integrity = db.pragma("quick_check") as Array<{ quick_check: string }>;
    if (integrity.length !== 1 || integrity[0]?.quick_check !== "ok") {
      throw new Error("le contrôle d’intégrité SQLite a échoué.");
    }

    const tables = new Set((db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Row[]).map((row) => String(row.name)));
    for (const [table, requiredColumns] of Object.entries(REQUIRED_INVENTORY_COLUMNS)) {
      if (!tables.has(table)) {
        throw new Error("la table « " + table + " » est absente.");
      }
      const columns = new Set((db.prepare("PRAGMA table_info(" + table + ")").all() as Row[]).map((row) => String(row.name)));
      const missing = requiredColumns.filter((column) => !columns.has(column));
      if (missing.length) {
        throw new Error("la table « " + table + " » ne contient pas les colonnes attendues : " + missing.join(", ") + ".");
      }
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error("Fichier incompatible avec un inventaire RC Workshop : " + detail);
  } finally {
    db.close();
  }
}

export class SqliteInventoryRepository implements InventoryRepository {
  private readonly db: Database.Database;

  constructor(databasePath: string) {
    this.db = new Database(databasePath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.initialize();
  }

  async backupTo(destinationPath: string): Promise<void> {
    await this.db.backup(destinationPath);
  }

  reset(): void {
    this.db.transaction(() => {
      this.db.exec("DELETE FROM stock_movements; DELETE FROM stock_items; DELETE FROM stock_lots; DELETE FROM component_references; DELETE FROM aircraft; DELETE FROM projects;");
    })();
  }

  close(): void {
    this.db.close();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS component_references (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
        brand TEXT, model TEXT, description TEXT, tracking_mode TEXT NOT NULL,
        receiver_channels INTEGER, receiver_protocol TEXT, radio_type TEXT, transmitter_channels INTEGER, transmitter_protocols_json TEXT, firmware_version TEXT,
        motorization_kind TEXT, motor_type TEXT, motor_voltage TEXT, motor_displacement TEXT, propeller_diameter TEXT, propeller_pitch TEXT,
        attributes_json TEXT NOT NULL DEFAULT '{}', photo_path TEXT,
        archived INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS aircraft (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, manufacturer TEXT, model TEXT, notes TEXT, uaf_registration TEXT
      );
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL, notes TEXT
      );
      CREATE TABLE IF NOT EXISTS stock_items (
        id TEXT PRIMARY KEY, reference_id TEXT NOT NULL REFERENCES component_references(id),
        inventory_code TEXT NOT NULL COLLATE NOCASE UNIQUE, serial_number TEXT,
        status TEXT NOT NULL, location_id TEXT, aircraft_id TEXT REFERENCES aircraft(id),
        project_id TEXT REFERENCES projects(id), tx16_name TEXT COLLATE NOCASE UNIQUE, bound_transmitter_id TEXT,
        notes TEXT, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS stock_lots (
        id TEXT PRIMARY KEY, reference_id TEXT NOT NULL REFERENCES component_references(id),
        quantity INTEGER NOT NULL CHECK(quantity >= 0), unit TEXT NOT NULL, location_id TEXT
      );
      CREATE TABLE IF NOT EXISTS stock_movements (
        id TEXT PRIMARY KEY, type TEXT NOT NULL, reference_id TEXT NOT NULL,
        item_id TEXT, lot_id TEXT, quantity INTEGER, from_location_id TEXT,
        to_location_id TEXT, aircraft_id TEXT, project_id TEXT, notes TEXT, occurred_at TEXT NOT NULL
      );
    `);
    const referenceColumns = this.db.prepare("PRAGMA table_info(component_references)").all() as Row[];
    if (!referenceColumns.some((column) => column.name === "receiver_channels")) this.db.exec("ALTER TABLE component_references ADD COLUMN receiver_channels INTEGER");
    if (!referenceColumns.some((column) => column.name === "receiver_protocol")) this.db.exec("ALTER TABLE component_references ADD COLUMN receiver_protocol TEXT");
    if (!referenceColumns.some((column) => column.name === "radio_type")) this.db.exec("ALTER TABLE component_references ADD COLUMN radio_type TEXT");
    if (!referenceColumns.some((column) => column.name === "transmitter_channels")) this.db.exec("ALTER TABLE component_references ADD COLUMN transmitter_channels INTEGER");
    if (!referenceColumns.some((column) => column.name === "transmitter_protocols_json")) this.db.exec("ALTER TABLE component_references ADD COLUMN transmitter_protocols_json TEXT");
    if (!referenceColumns.some((column) => column.name === "firmware_version")) this.db.exec("ALTER TABLE component_references ADD COLUMN firmware_version TEXT");
    const stockColumns = this.db.prepare("PRAGMA table_info(stock_items)").all() as Row[];
    if (!stockColumns.some((column) => column.name === "bound_transmitter_id")) this.db.exec("ALTER TABLE stock_items ADD COLUMN bound_transmitter_id TEXT");
    for (const [column, type] of [["motorization_kind", "TEXT"], ["motor_type", "TEXT"], ["motor_voltage", "TEXT"], ["motor_displacement", "TEXT"], ["propeller_diameter", "TEXT"], ["propeller_pitch", "TEXT"]]) {
      if (!referenceColumns.some((entry) => entry.name === column)) this.db.exec("ALTER TABLE component_references ADD COLUMN " + column + " " + type);
    }
    this.db.exec("UPDATE component_references SET category='radio', radio_type='receiver' WHERE category='receiver'");
    this.db.exec("UPDATE component_references SET category='supplies' WHERE category IN ('connector','control','structure','material','construction')");
    const aircraftColumns = this.db.prepare("PRAGMA table_info(aircraft)").all() as Row[];
    if (!aircraftColumns.some((column) => column.name === "uaf_registration")) this.db.exec("ALTER TABLE aircraft ADD COLUMN uaf_registration TEXT");
  }

  getSnapshot(): InventorySnapshot {
    const references = (this.db.prepare("SELECT * FROM component_references ORDER BY name").all() as Row[]).map((row): ComponentReference => ({
      id: String(row.id), name: String(row.name), category: row.category as ComponentReference["category"],
      trackingMode: row.tracking_mode as ComponentReference["trackingMode"],
      attributes: JSON.parse(String(row.attributes_json)) as Record<string, string | number | boolean>,
      archived: Number(row.archived) === 1, createdAt: String(row.created_at),
      ...(row.brand ? { brand: String(row.brand) } : {}),
      ...(row.model ? { model: String(row.model) } : {}),
      ...(row.description ? { description: String(row.description) } : {}),
      ...(row.photo_path ? { photoPath: String(row.photo_path) } : {}),
      ...(row.receiver_channels !== null && row.receiver_channels !== undefined ? { receiverChannels: Number(row.receiver_channels) } : {}),
      ...(row.receiver_protocol ? { receiverProtocol: String(row.receiver_protocol) } : {}),
      ...(row.radio_type === "transmitter" || row.radio_type === "receiver" ? { radioType: row.radio_type } : {}),
      ...(row.transmitter_channels !== null && row.transmitter_channels !== undefined ? { transmitterChannels: Number(row.transmitter_channels) } : {}),
      ...(row.transmitter_protocols_json ? { transmitterProtocols: JSON.parse(String(row.transmitter_protocols_json)) as string[] } : {}),
      ...(row.firmware_version ? { firmwareVersion: String(row.firmware_version) } : {}),
      ...(row.motorization_kind ? { motorizationKind: row.motorization_kind as "motor" | "propeller" } : {}),
      ...(row.motor_type ? { motorType: row.motor_type as "electric" | "glow" } : {}),
      ...(row.motor_voltage ? { motorVoltage: String(row.motor_voltage) } : {}),
      ...(row.motor_displacement ? { motorDisplacement: String(row.motor_displacement) } : {}),
      ...(row.propeller_diameter ? { propellerDiameter: String(row.propeller_diameter) } : {}),
      ...(row.propeller_pitch ? { propellerPitch: String(row.propeller_pitch) } : {}),
    }));
    const items = (this.db.prepare("SELECT * FROM stock_items ORDER BY inventory_code").all() as Row[]).map((row): StockItem => ({
      id: String(row.id), referenceId: String(row.reference_id), inventoryCode: String(row.inventory_code),
      status: row.status as StockItem["status"], createdAt: String(row.created_at),
      ...(row.serial_number ? { serialNumber: String(row.serial_number) } : {}),
      ...(row.location_id ? { locationId: String(row.location_id) } : {}),
      ...(row.aircraft_id ? { aircraftId: String(row.aircraft_id) } : {}),
      ...(row.project_id ? { projectId: String(row.project_id) } : {}),
      ...(row.tx16_name ? { tx16Name: String(row.tx16_name) } : {}),
      ...(row.bound_transmitter_id ? { boundTransmitterId: String(row.bound_transmitter_id) } : {}),
      ...(row.notes ? { notes: String(row.notes) } : {}),
    }));
    const lots = (this.db.prepare("SELECT * FROM stock_lots").all() as Row[]).map((row): StockLot => ({
      id: String(row.id), referenceId: String(row.reference_id), quantity: Number(row.quantity),
      unit: String(row.unit), ...(row.location_id ? { locationId: String(row.location_id) } : {}),
    }));
    const aircraft = (this.db.prepare("SELECT * FROM aircraft ORDER BY name").all() as Row[]).map((row): Aircraft => ({
      id: String(row.id), name: String(row.name),
      ...(row.manufacturer ? { manufacturer: String(row.manufacturer) } : {}),
      ...(row.model ? { model: String(row.model) } : {}),
      ...(row.notes ? { notes: String(row.notes) } : {}),
      ...(row.uaf_registration ? { uafRegistration: String(row.uaf_registration) } : {}),
    }));
    const projects = (this.db.prepare("SELECT * FROM projects ORDER BY name").all() as Row[]).map((row): Project => ({
      id: String(row.id), name: String(row.name), status: row.status as Project["status"],
      ...(row.notes ? { notes: String(row.notes) } : {}),
    }));
    const movements = (this.db.prepare("SELECT * FROM stock_movements ORDER BY occurred_at DESC").all() as Row[]).map((row): StockMovement => ({
      id: String(row.id), type: row.type as StockMovement["type"], referenceId: String(row.reference_id), occurredAt: String(row.occurred_at),
      ...(row.item_id ? { itemId: String(row.item_id) } : {}),
      ...(row.lot_id ? { lotId: String(row.lot_id) } : {}),
      ...(row.quantity !== null && row.quantity !== undefined ? { quantity: Number(row.quantity) } : {}),
      ...(row.from_location_id ? { fromLocationId: String(row.from_location_id) } : {}),
      ...(row.to_location_id ? { toLocationId: String(row.to_location_id) } : {}),
      ...(row.aircraft_id ? { aircraftId: String(row.aircraft_id) } : {}),
      ...(row.project_id ? { projectId: String(row.project_id) } : {}),
      ...(row.notes ? { notes: String(row.notes) } : {}),
    }));
    return { references, items, lots, aircraft, projects, movements };
  }

  saveReference(value: ComponentReference): void {
    this.db.prepare(`INSERT INTO component_references
      (id,name,category,brand,model,description,tracking_mode,attributes_json,photo_path,archived,created_at,receiver_channels,receiver_protocol,radio_type,transmitter_channels,transmitter_protocols_json,firmware_version,motorization_kind,motor_type,motor_voltage,motor_displacement,propeller_diameter,propeller_pitch)
      VALUES (@id,@name,@category,@brand,@model,@description,@trackingMode,@attributes,@photoPath,@archived,@createdAt,@receiverChannels,@receiverProtocol,@radioType,@transmitterChannels,@transmitterProtocols,@firmwareVersion,@motorizationKind,@motorType,@motorVoltage,@motorDisplacement,@propellerDiameter,@propellerPitch)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,category=excluded.category,brand=excluded.brand,
      model=excluded.model,description=excluded.description,tracking_mode=excluded.tracking_mode,
      attributes_json=excluded.attributes_json,photo_path=excluded.photo_path,archived=excluded.archived,
      receiver_channels=excluded.receiver_channels,receiver_protocol=excluded.receiver_protocol,radio_type=excluded.radio_type,transmitter_channels=excluded.transmitter_channels,transmitter_protocols_json=excluded.transmitter_protocols_json,firmware_version=excluded.firmware_version,motorization_kind=excluded.motorization_kind,motor_type=excluded.motor_type,motor_voltage=excluded.motor_voltage,motor_displacement=excluded.motor_displacement,propeller_diameter=excluded.propeller_diameter,propeller_pitch=excluded.propeller_pitch`)
      .run({ id:value.id,name:value.name,category:value.category,brand:value.brand??null,model:value.model??null,
        description:value.description??null,trackingMode:value.trackingMode,attributes:JSON.stringify(value.attributes),
        photoPath:value.photoPath??null,archived:value.archived?1:0,createdAt:value.createdAt,
        receiverChannels:value.receiverChannels??null,receiverProtocol:value.receiverProtocol??null,radioType:value.radioType??null,transmitterChannels:value.transmitterChannels??null,transmitterProtocols:value.transmitterProtocols?JSON.stringify(value.transmitterProtocols):null,firmwareVersion:value.firmwareVersion??null,
        motorizationKind:value.motorizationKind??null,motorType:value.motorType??null,motorVoltage:value.motorVoltage??null,motorDisplacement:value.motorDisplacement??null,propellerDiameter:value.propellerDiameter??null,propellerPitch:value.propellerPitch??null });
  }

  deleteReference(referenceId: string): void {
    this.db.prepare("DELETE FROM component_references WHERE id = ?").run(referenceId);
  }

  saveItem(value: StockItem): void {
    this.db.prepare(`INSERT INTO stock_items
      (id,reference_id,inventory_code,serial_number,status,location_id,aircraft_id,project_id,tx16_name,notes,created_at,bound_transmitter_id)
      VALUES (@id,@referenceId,@inventoryCode,@serialNumber,@status,@locationId,@aircraftId,@projectId,@tx16Name,@notes,@createdAt,@boundTransmitterId)
      ON CONFLICT(id) DO UPDATE SET inventory_code=excluded.inventory_code,serial_number=excluded.serial_number,
      status=excluded.status,location_id=excluded.location_id,aircraft_id=excluded.aircraft_id,
      project_id=excluded.project_id,tx16_name=excluded.tx16_name,notes=excluded.notes,bound_transmitter_id=excluded.bound_transmitter_id`)
      .run({ id:value.id,referenceId:value.referenceId,inventoryCode:value.inventoryCode,serialNumber:value.serialNumber??null,
        status:value.status,locationId:value.locationId??null,aircraftId:value.aircraftId??null,projectId:value.projectId??null,
        tx16Name:value.tx16Name??null,notes:value.notes??null,createdAt:value.createdAt,boundTransmitterId:value.boundTransmitterId??null });
  }

  deleteItem(itemId: string): void {
    this.db.prepare("UPDATE stock_items SET bound_transmitter_id = NULL WHERE bound_transmitter_id = ?").run(itemId);
    this.db.prepare("DELETE FROM stock_items WHERE id = ?").run(itemId);
  }

  deleteLot(lotId: string): void {
    this.db.prepare("DELETE FROM stock_lots WHERE id = ?").run(lotId);
  }

  saveLot(value: StockLot): void {
    this.db.prepare(`INSERT INTO stock_lots (id,reference_id,quantity,unit,location_id)
      VALUES (@id,@referenceId,@quantity,@unit,@locationId)
      ON CONFLICT(id) DO UPDATE SET quantity=excluded.quantity,unit=excluded.unit,location_id=excluded.location_id`)
      .run({ id:value.id,referenceId:value.referenceId,quantity:value.quantity,unit:value.unit,locationId:value.locationId??null });
  }

  saveAircraft(value: Aircraft): void {
    this.db.prepare(`INSERT INTO aircraft (id,name,manufacturer,model,notes,uaf_registration) VALUES (@id,@name,@manufacturer,@model,@notes,@uafRegistration)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,manufacturer=excluded.manufacturer,model=excluded.model,notes=excluded.notes,uaf_registration=excluded.uaf_registration`)
      .run({ id:value.id,name:value.name,manufacturer:value.manufacturer??null,model:value.model??null,notes:value.notes??null,uafRegistration:value.uafRegistration??null });
  }

  deleteAircraft(aircraftId: string): void {
    this.db.prepare("DELETE FROM aircraft WHERE id = ?").run(aircraftId);
  }

  saveProject(value: Project): void {
    this.db.prepare(`INSERT INTO projects (id,name,status,notes) VALUES (@id,@name,@status,@notes)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,status=excluded.status,notes=excluded.notes`)
      .run({ id:value.id,name:value.name,status:value.status,notes:value.notes??null });
  }

  appendMovement(value: StockMovement): void {
    this.db.prepare(`INSERT INTO stock_movements
      (id,type,reference_id,item_id,lot_id,quantity,from_location_id,to_location_id,aircraft_id,project_id,notes,occurred_at)
      VALUES (@id,@type,@referenceId,@itemId,@lotId,@quantity,@fromLocationId,@toLocationId,@aircraftId,@projectId,@notes,@occurredAt)`)
      .run({ id:value.id,type:value.type,referenceId:value.referenceId,itemId:value.itemId??null,lotId:value.lotId??null,
        quantity:value.quantity??null,fromLocationId:value.fromLocationId??null,toLocationId:value.toLocationId??null,
        aircraftId:value.aircraftId??null,projectId:value.projectId??null,notes:value.notes??null,occurredAt:value.occurredAt });
  }
}
