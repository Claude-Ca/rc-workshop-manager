import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { basename, extname, join, resolve, sep } from "node:path";
import { copyFile, mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { COMPONENT_CATEGORIES, InventoryService, type Aircraft, type ComponentCategory, type ComponentReference, type InventorySnapshot, type Project, type StockItem, type StockLot } from "@rc-workshop/core";
import { SqliteInventoryRepository, validateInventoryDatabase } from "@rc-workshop/infrastructure";

let mainWindow: BrowserWindow | null = null;
type InventoryEntry = { id: string; name: string; path: string; createdAt: string; lastUsedAt?: string };
type InventoryRegistry = { entries: InventoryEntry[]; activeId: string; lastUsedId: string };
type InventorySummary = { id: string; name: string; createdAt: string; lastUsedAt?: string; active: boolean; lastUsed: boolean; primary: boolean };

let repository: SqliteInventoryRepository;
let inventory: InventoryService;
let registry: InventoryRegistry;
const registryPath = () => join(app.getPath("userData"), "inventories.json");
const inventoryDirectory = () => join(app.getPath("userData"), "inventories");

function summaries(): InventorySummary[] {
  return registry.entries.map(({ id, name, createdAt, lastUsedAt }, index) => ({
    id, name, createdAt, ...(lastUsedAt ? { lastUsedAt } : {}),
    active: id === registry.activeId, lastUsed: id === registry.lastUsedId, primary: index === 0,
  }));
}

async function saveRegistry(): Promise<void> {
  const target = registryPath();
  const temporary = target + ".tmp";
  await writeFile(temporary, JSON.stringify(registry, null, 2), "utf8");
  await rename(temporary, target);
}

async function activateInventory(id: string): Promise<InventorySummary[]> {
  const entry = registry.entries.find((candidate) => candidate.id === id);
  if (!entry) throw new Error("Cette base n’existe plus dans la liste.");
  if (repository && registry.activeId === id) return summaries();
  const nextRepository = new SqliteInventoryRepository(entry.path);
  repository?.close();
  repository = nextRepository;
  inventory = new InventoryService(repository);
  const now = new Date().toISOString();
  registry.activeId = id;
  registry.lastUsedId = id;
  registry.entries = registry.entries.map((candidate) => candidate.id === id ? { ...candidate, lastUsedAt: now } : candidate);
  await saveRegistry();
  return summaries();
}

async function initializeInventories(): Promise<void> {
  await mkdir(inventoryDirectory(), { recursive: true });
  try {
    registry = JSON.parse(await readFile(registryPath(), "utf8")) as InventoryRegistry;
    if (!Array.isArray(registry.entries)) throw new Error("Invalid inventory registry");
  } catch {
    const legacyPath = join(app.getPath("userData"), "rc-workshop.sqlite");
    registry = { entries: [], activeId: "", lastUsedId: "" };
    const legacyExists = await stat(legacyPath).then(() => true, () => false);
    if (legacyExists) {
      await copyFile(legacyPath, join(inventoryDirectory(), "legacy-backup-" + Date.now() + ".sqlite"));
      registry.entries.push({ id: "legacy", name: "Inventaire principal", path: legacyPath, createdAt: new Date().toISOString() });
    }
  }
  registry.entries = registry.entries.filter((entry) => entry && entry.id && entry.name && entry.path);
  if (!registry.entries.length) {
    const id = randomUUID();
    const path = join(inventoryDirectory(), id + ".sqlite");
    const initialRepository = new SqliteInventoryRepository(path);
    initialRepository.close();
    registry.entries.push({ id, name: "Mon inventaire", path, createdAt: new Date().toISOString() });
  }
  const desired = registry.entries.find((entry) => entry.id === registry.lastUsedId) ?? registry.entries[0];
  if (!desired) throw new Error("Aucune base d’inventaire n’a pu être initialisée.");
  await activateInventory(desired.id);
}

const exportCategoryLabels: Record<string, string> = {
  motor: "Motorisation", esc: "Variateurs ESC", radio: "Radio", servo: "Servos",
  battery: "Batteries", supplies: "Fournitures", tool: "Outils et équipements", other: "Divers",
  propeller: "Hélices", receiver: "Radio", connector: "Fournitures", control: "Fournitures",
  structure: "Fournitures", material: "Fournitures", construction: "Fournitures",
};

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return '"' + text.replaceAll('"', '""') + '"';
}

function buildInventoryCsv(snapshot: InventorySnapshot, categories: unknown): string {
  const validCategories = Array.isArray(categories)
    ? categories.filter((value): value is ComponentCategory => typeof value === "string" && (COMPONENT_CATEGORIES as readonly string[]).includes(value))
    : [];
  const filter = validCategories.length ? new Set(validCategories) : null;
  const columns = [
    "Type", "Catégorie", "Référence", "Marque", "Modèle", "Suivi", "Type radio", "Canaux RX/TX",
    "Protocoles", "Firmware", "Connecteur batterie", "Décharge batterie (C)", "Dimensions batterie (mm)", "Poids batterie (g)", "Motorisation", "Type moteur", "Tension", "Cylindrée", "Hélice DxP",
    "Attributs", "Code inventaire", "N° série", "Statut", "Quantité", "Unité", "Emplacement",
    "Avion", "Projet", "Avions compatibles", "Nom TX16", "Bind", "Notes", "Créé le",
  ];
  const rows: string[][] = [columns];
  const aircraftNames = new Map(snapshot.aircraft.map((entry) => [entry.id, entry.name]));
  const projectNames = new Map(snapshot.projects.map((entry) => [entry.id, entry.name]));
  const itemNames = new Map(snapshot.items.map((entry) => [entry.id, entry.inventoryCode]));
  for (const reference of snapshot.references) {
    if (filter && !filter.has(reference.category)) continue;
    const base: string[] = [
      "", exportCategoryLabels[reference.category] ?? reference.category, reference.name, reference.brand ?? "",
      reference.model ?? "", reference.trackingMode, reference.radioType ?? "",
      String(reference.receiverChannels ?? reference.transmitterChannels ?? ""),
      [...(reference.transmitterProtocols ?? []), ...(reference.receiverProtocol ? [reference.receiverProtocol] : [])].join(", "),
      reference.firmwareVersion ?? "", reference.batteryConnector ?? "", String(reference.batteryDischargeRateC ?? ""), reference.batteryDimensionsMm ?? "", String(reference.batteryWeightG ?? ""), reference.motorizationKind ?? "", reference.motorType ?? "",
      reference.motorVoltage ?? "", reference.motorDisplacement ?? "",
      reference.propellerDiameter || reference.propellerPitch ? (reference.propellerDiameter ?? "") + "x" + (reference.propellerPitch ?? "") : "",
      JSON.stringify(reference.attributes) ?? "",
    ];
    const referenceItems = snapshot.items.filter((item) => item.referenceId === reference.id);
    const referenceLots = snapshot.lots.filter((lot) => lot.referenceId === reference.id);
    const appendRow = (type: string, details: Array<string | number>) => {
      const row = [type, ...base.slice(1), ...details].map(String);
      while (row.length < columns.length) row.push("");
      rows.push(row.slice(0, columns.length));
    };
    for (const item of referenceItems) {
      appendRow("Exemplaire", [item.inventoryCode, item.serialNumber ?? "", item.status, "", "",
        item.locationId ?? "", item.aircraftId ? aircraftNames.get(item.aircraftId) ?? item.aircraftId : "",
        item.projectId ? projectNames.get(item.projectId) ?? item.projectId : "", (item.compatibleAircraftIds ?? []).map((id) => aircraftNames.get(id) ?? id).join(", "), item.tx16Name ?? "",
        item.boundTransmitterId ? itemNames.get(item.boundTransmitterId) ?? item.boundTransmitterId : "",
        item.notes ?? "", item.createdAt]);
    }
    for (const lot of referenceLots) {
      appendRow("Stock", ["", "", "", lot.quantity, lot.unit, lot.locationId ?? ""]);
    }
    if (!referenceItems.length && !referenceLots.length) appendRow("Référence catalogue", []);
  }
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n") + "\r\n";
}

function safeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").trim() || "inventaire";
}

function inventoryManagerHandlers(): void {
  ipcMain.handle("export:database", async () => {
    const entry = registry.entries.find((candidate) => candidate.id === registry.activeId);
    if (!entry) throw new Error("Aucune base n’est ouverte.");
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow!, {
      title: "Exporter une copie complète de la base",
      defaultPath: join(app.getPath("documents"), safeFileName(entry.name) + "-backup.sqlite"),
      filters: [{ name: "Base SQLite", extensions: ["sqlite"] }],
    });
    if (canceled || !filePath) return false;
    if (resolve(filePath).toLocaleLowerCase() === resolve(entry.path).toLocaleLowerCase()) {
      throw new Error("Choisis un autre emplacement pour ne pas remplacer la base actuellement ouverte.");
    }
    await repository.backupTo(filePath);
    return true;
  });
  ipcMain.handle("inventory:compact", async () => {
    const entry = registry.entries.find((candidate) => candidate.id === registry.activeId);
    if (!entry) throw new Error("Aucune base n’est ouverte.");
    const beforeBytes = (await stat(entry.path)).size;
    repository.compact();
    const afterBytes = (await stat(entry.path)).size;
    return { beforeBytes, afterBytes, reclaimedBytes: Math.max(0, beforeBytes - afterBytes) };
  });
  ipcMain.handle("export:csv", async (_event, categories: unknown) => {
    const entry = registry.entries.find((candidate) => candidate.id === registry.activeId);
    if (!entry) throw new Error("Aucune base n’est ouverte.");
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow!, {
      title: "Exporter l’inventaire au format CSV",
      defaultPath: join(app.getPath("documents"), safeFileName(entry.name) + "-inventaire.csv"),
      filters: [{ name: "Fichier CSV", extensions: ["csv"] }],
    });
    if (canceled || !filePath) return false;
    await writeFile(filePath, buildInventoryCsv(inventory.getSnapshot(), categories), "utf8");
    return true;
  });
  ipcMain.handle("inventory:reset", async () => {
    const entry = registry.entries.find((candidate) => candidate.id === registry.activeId);
    if (!entry) throw new Error("Aucune base n’est ouverte.");
    const backupDirectory = join(app.getPath("userData"), "backups");
    await mkdir(backupDirectory, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = join(backupDirectory, safeFileName(entry.name) + "-before-reset-" + timestamp + ".sqlite");
    await repository.backupTo(backupPath);
    repository.reset();
    return inventory.getSnapshot();
  });
  ipcMain.handle("inventories:list", () => ({ items: summaries(), activeId: registry.activeId, lastUsedId: registry.lastUsedId }));
  ipcMain.handle("inventories:open", async (_event, id: string) => ({ items: await activateInventory(id), activeId: registry.activeId, lastUsedId: registry.lastUsedId }));
  ipcMain.handle("inventories:delete", async (_event, id: string) => {
    const index = registry.entries.findIndex((candidate) => candidate.id === id);
    if (index < 0) throw new Error("Cette base n’existe plus dans la liste.");
    const entry = registry.entries[index];
    if (!entry) throw new Error("Cette base n’existe plus dans la liste.");
    if (index === 0) throw new Error("L’inventaire principal ne peut pas être supprimé.");
    if (id === registry.activeId) throw new Error("Impossible de supprimer l’inventaire actuellement ouvert.");

    const managedDirectory = resolve(inventoryDirectory());
    const managedPrefix = managedDirectory.endsWith(sep) ? managedDirectory : managedDirectory + sep;
    const databasePath = resolve(entry.path);
    if (!databasePath.startsWith(managedPrefix)) {
      throw new Error("La suppression est limitée aux bases secondaires gérées par l’application.");
    }
    await stat(databasePath);

    const tombstone = databasePath + ".deleting-" + randomUUID();
    const movedFiles: Array<{ original: string; temporary: string }> = [];
    const moveIfPresent = async (original: string, temporary: string) => {
      try {
        await rename(original, temporary);
        movedFiles.push({ original, temporary });
      } catch (error) {
        if ((error as { code?: string }).code !== "ENOENT") throw error;
      }
    };

    const previousEntries = registry.entries;
    const previousLastUsedId = registry.lastUsedId;
    try {
      await moveIfPresent(databasePath, tombstone);
      await moveIfPresent(databasePath + "-wal", tombstone + "-wal");
      await moveIfPresent(databasePath + "-shm", tombstone + "-shm");
      registry.entries = registry.entries.filter((candidate) => candidate.id !== id);
      if (registry.lastUsedId === id) registry.lastUsedId = registry.activeId;
      await saveRegistry();
    } catch (error) {
      registry.entries = previousEntries;
      registry.lastUsedId = previousLastUsedId;
      for (const file of movedFiles.reverse()) {
        await rename(file.temporary, file.original).catch(() => undefined);
      }
      throw error;
    }

    await Promise.all(movedFiles.map((file) => unlink(file.temporary).catch(() => undefined)));
    return { items: summaries(), activeId: registry.activeId, lastUsedId: registry.lastUsedId };
  });
  ipcMain.handle("inventories:create", async (_event, rawName: string) => {
    const name = String(rawName ?? "").trim();
    if (!name) throw new Error("Donne un nom à la base.");
    if (registry.entries.some((entry) => entry.name.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error("Une base porte déjà ce nom.");
    const id = randomUUID();
    const path = join(inventoryDirectory(), id + ".sqlite");
    const created = new SqliteInventoryRepository(path);
    created.close();
    registry.entries.push({ id, name, path, createdAt: new Date().toISOString() });
    await saveRegistry();
    await activateInventory(id);
    return { items: summaries(), activeId: registry.activeId, lastUsedId: registry.lastUsedId };
  });
  ipcMain.handle("inventories:import", async () => {
    const selection = await dialog.showOpenDialog(mainWindow!, {
      title: "Ouvrir une base SQLite", properties: ["openFile"],
      filters: [{ name: "Bases SQLite", extensions: ["sqlite", "sqlite3", "db"] }],
    });
    if (selection.canceled || !selection.filePaths[0]) return { items: summaries(), activeId: registry.activeId, lastUsedId: registry.lastUsedId };
    const sourcePath = selection.filePaths[0];
    const id = randomUUID();
    const path = join(inventoryDirectory(), id + ".sqlite");
    await copyFile(sourcePath, path);
    const importedName = basename(sourcePath, extname(sourcePath)).trim() || "Base importée";
    const name = registry.entries.some((entry) => entry.name.toLocaleLowerCase() === importedName.toLocaleLowerCase()) ? importedName + " (importée)" : importedName;
    try {
      validateInventoryDatabase(path);
      const imported = new SqliteInventoryRepository(path);
      imported.close();
    } catch (error) {
      await unlink(path).catch(() => undefined);
      throw new Error("Import impossible. Le fichier sélectionné n’est pas compatible avec RC Workshop ou semble endommagé. Choisissez une sauvegarde d’inventaire RC Workshop valide, puis réessayez. Votre fichier d’origine n’a pas été modifié et aucune base n’a été ajoutée.");
    }
    registry.entries.push({ id, name, path, createdAt: new Date().toISOString() });
    await saveRegistry();
    await activateInventory(id);
    return { items: summaries(), activeId: registry.activeId, lastUsedId: registry.lastUsedId };
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 700,
    title: "RC Workshop Manager",
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function registerHandlers(): void {
  inventoryManagerHandlers();
  ipcMain.handle("inventory:snapshot", () => inventory.getSnapshot());
  ipcMain.handle("inventory:update-reference", (_event, input: ComponentReference) => {
    inventory.updateReference(input);
    return inventory.getSnapshot();
  });
  ipcMain.handle("inventory:restore-reference", (_event, referenceId: string) => {
    inventory.restoreReference(referenceId);
    return inventory.getSnapshot();
  });
  ipcMain.handle("inventory:delete-reference", (_event, referenceId: string) => {
    const result = inventory.deleteReference(referenceId);
    return { snapshot: inventory.getSnapshot(), archived: result.archived };
  });
  ipcMain.handle("inventory:create-reference", (_event, input: Omit<ComponentReference, "createdAt" | "archived">) => {
    inventory.createReference({ ...input, createdAt: new Date().toISOString(), archived: false });
    return inventory.getSnapshot();
  });
  ipcMain.handle("inventory:update-item", (_event, input: StockItem) => {
    inventory.updateItem(input);
    return inventory.getSnapshot();
  });
  ipcMain.handle("inventory:delete-item", (_event, itemId: string) => {
    inventory.deleteItem(itemId, randomUUID(), new Date().toISOString());
    return inventory.getSnapshot();
  });
  ipcMain.handle("inventory:add-item", (_event, input: Omit<StockItem, "createdAt">) => {
    inventory.addItem({ ...input, createdAt: new Date().toISOString() });
    return inventory.getSnapshot();
  });
  ipcMain.handle("inventory:set-stock-group-quantity", (_event, referenceId: string, quantity: number, unit: string) => {
    inventory.setStockGroupQuantity(referenceId, quantity, unit, randomUUID(), randomUUID(), new Date().toISOString());
    return inventory.getSnapshot();
  });
  ipcMain.handle("inventory:add-lot", (_event, input: StockLot) => {
    inventory.addLot(input);
    return inventory.getSnapshot();
  });
  ipcMain.handle("inventory:add-aircraft", (_event, input: Aircraft) => {
    inventory.addAircraft(input);
    return inventory.getSnapshot();
  });
  ipcMain.handle("inventory:update-aircraft", (_event, input: Aircraft) => {
    inventory.updateAircraft(input);
    return inventory.getSnapshot();
  });
  ipcMain.handle("inventory:set-aircraft-favorite", (_event, aircraftId: string, favorite: boolean) => {
    inventory.setAircraftFavorite(aircraftId, favorite);
    return inventory.getSnapshot();
  });
  ipcMain.handle("inventory:save-aircraft-logbook-event", (_event, input: import("@rc-workshop/core").AircraftLogbookEvent) => {
    inventory.saveAircraftLogbookEvent(input);
    return inventory.getSnapshot();
  });
  ipcMain.handle("inventory:delete-aircraft-logbook-event", (_event, eventId: string) => {
    inventory.deleteAircraftLogbookEvent(eventId);
    return inventory.getSnapshot();
  });
  ipcMain.handle("inventory:add-project", (_event, input: Project) => {
    inventory.addProject(input);
    return inventory.getSnapshot();
  });
  ipcMain.handle("inventory:assign-item", (_event, itemId: string, target: { kind: "aircraft"; id: string } | { kind: "project"; id: string }) => {
    inventory.assignItem(itemId, target, randomUUID(), new Date().toISOString());
    return inventory.getSnapshot();
  });
  ipcMain.handle("inventory:set-tool-status", (_event, itemId: string, status: "available" | "borrowed" | "repair") => {
    inventory.setToolStatus(itemId, status, randomUUID(), new Date().toISOString());
    return inventory.getSnapshot();
  });
  ipcMain.handle("inventory:set-receiver-binding", (_event, receiverItemId: string, transmitterItemId: string | null) => {
    inventory.setReceiverBinding(receiverItemId, transmitterItemId);
    return inventory.getSnapshot();
  });
  ipcMain.handle("inventory:release-item", (_event, itemId: string) => {
    inventory.releaseItem(itemId, randomUUID(), new Date().toISOString());
    return inventory.getSnapshot();
  });
}

app.whenReady().then(async () => {
  await initializeInventories();
  registerHandlers();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => repository?.close());
