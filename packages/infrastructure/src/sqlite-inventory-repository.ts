import Database from "better-sqlite3";
import type {
  Aircraft, ComponentReference, InventorySnapshot, Project, StockItem, StockLot, StockMovement,
} from "@rc-workshop/core";
import type { InventoryRepository } from "@rc-workshop/core";

type Row = Record<string, unknown>;

export class SqliteInventoryRepository implements InventoryRepository {
  private readonly db: Database.Database;

  constructor(databasePath: string) {
    this.db = new Database(databasePath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.initialize();
  }

  close(): void {
    this.db.close();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS component_references (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
        brand TEXT, model TEXT, description TEXT, tracking_mode TEXT NOT NULL,
        attributes_json TEXT NOT NULL DEFAULT '{}', photo_path TEXT,
        archived INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS aircraft (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, manufacturer TEXT, model TEXT, notes TEXT
      );
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL, notes TEXT
      );
      CREATE TABLE IF NOT EXISTS stock_items (
        id TEXT PRIMARY KEY, reference_id TEXT NOT NULL REFERENCES component_references(id),
        inventory_code TEXT NOT NULL COLLATE NOCASE UNIQUE, serial_number TEXT,
        status TEXT NOT NULL, location_id TEXT, aircraft_id TEXT REFERENCES aircraft(id),
        project_id TEXT REFERENCES projects(id), tx16_name TEXT COLLATE NOCASE UNIQUE,
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
    }));
    const items = (this.db.prepare("SELECT * FROM stock_items ORDER BY inventory_code").all() as Row[]).map((row): StockItem => ({
      id: String(row.id), referenceId: String(row.reference_id), inventoryCode: String(row.inventory_code),
      status: row.status as StockItem["status"], createdAt: String(row.created_at),
      ...(row.serial_number ? { serialNumber: String(row.serial_number) } : {}),
      ...(row.location_id ? { locationId: String(row.location_id) } : {}),
      ...(row.aircraft_id ? { aircraftId: String(row.aircraft_id) } : {}),
      ...(row.project_id ? { projectId: String(row.project_id) } : {}),
      ...(row.tx16_name ? { tx16Name: String(row.tx16_name) } : {}),
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
      (id,name,category,brand,model,description,tracking_mode,attributes_json,photo_path,archived,created_at)
      VALUES (@id,@name,@category,@brand,@model,@description,@trackingMode,@attributes,@photoPath,@archived,@createdAt)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,category=excluded.category,brand=excluded.brand,
      model=excluded.model,description=excluded.description,tracking_mode=excluded.tracking_mode,
      attributes_json=excluded.attributes_json,photo_path=excluded.photo_path,archived=excluded.archived`)
      .run({ id:value.id,name:value.name,category:value.category,brand:value.brand??null,model:value.model??null,
        description:value.description??null,trackingMode:value.trackingMode,attributes:JSON.stringify(value.attributes),
        photoPath:value.photoPath??null,archived:value.archived?1:0,createdAt:value.createdAt });
  }

  saveItem(value: StockItem): void {
    this.db.prepare(`INSERT INTO stock_items
      (id,reference_id,inventory_code,serial_number,status,location_id,aircraft_id,project_id,tx16_name,notes,created_at)
      VALUES (@id,@referenceId,@inventoryCode,@serialNumber,@status,@locationId,@aircraftId,@projectId,@tx16Name,@notes,@createdAt)
      ON CONFLICT(id) DO UPDATE SET inventory_code=excluded.inventory_code,serial_number=excluded.serial_number,
      status=excluded.status,location_id=excluded.location_id,aircraft_id=excluded.aircraft_id,
      project_id=excluded.project_id,tx16_name=excluded.tx16_name,notes=excluded.notes`)
      .run({ id:value.id,referenceId:value.referenceId,inventoryCode:value.inventoryCode,serialNumber:value.serialNumber??null,
        status:value.status,locationId:value.locationId??null,aircraftId:value.aircraftId??null,projectId:value.projectId??null,
        tx16Name:value.tx16Name??null,notes:value.notes??null,createdAt:value.createdAt });
  }

  saveLot(value: StockLot): void {
    this.db.prepare(`INSERT INTO stock_lots (id,reference_id,quantity,unit,location_id)
      VALUES (@id,@referenceId,@quantity,@unit,@locationId)
      ON CONFLICT(id) DO UPDATE SET quantity=excluded.quantity,unit=excluded.unit,location_id=excluded.location_id`)
      .run({ id:value.id,referenceId:value.referenceId,quantity:value.quantity,unit:value.unit,locationId:value.locationId??null });
  }

  saveAircraft(value: Aircraft): void {
    this.db.prepare(`INSERT INTO aircraft (id,name,manufacturer,model,notes) VALUES (@id,@name,@manufacturer,@model,@notes)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,manufacturer=excluded.manufacturer,model=excluded.model,notes=excluded.notes`)
      .run({ id:value.id,name:value.name,manufacturer:value.manufacturer??null,model:value.model??null,notes:value.notes??null });
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
