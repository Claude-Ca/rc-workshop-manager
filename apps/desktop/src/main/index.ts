import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { basename, extname, join } from "node:path";
import { copyFile, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { InventoryService, type Aircraft, type ComponentReference, type Project, type StockItem, type StockLot } from "@rc-workshop/core";
import { SqliteInventoryRepository } from "@rc-workshop/infrastructure";

let mainWindow: BrowserWindow | null = null;
type InventoryEntry = { id: string; name: string; path: string; createdAt: string; lastUsedAt?: string };
type InventoryRegistry = { entries: InventoryEntry[]; activeId: string; lastUsedId: string };
type InventorySummary = { id: string; name: string; createdAt: string; lastUsedAt?: string; active: boolean; lastUsed: boolean };

let repository: SqliteInventoryRepository;
let inventory: InventoryService;
let registry: InventoryRegistry;
const registryPath = () => join(app.getPath("userData"), "inventories.json");
const inventoryDirectory = () => join(app.getPath("userData"), "inventories");

function summaries(): InventorySummary[] {
  return registry.entries.map(({ id, name, createdAt, lastUsedAt }) => ({
    id, name, createdAt, ...(lastUsedAt ? { lastUsedAt } : {}),
    active: id === registry.activeId, lastUsed: id === registry.lastUsedId,
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
  await activateInventory(desired.id);
}

function inventoryManagerHandlers(): void {
  ipcMain.handle("inventories:list", () => ({ items: summaries(), activeId: registry.activeId, lastUsedId: registry.lastUsedId }));
  ipcMain.handle("inventories:open", async (_event, id: string) => ({ items: await activateInventory(id), activeId: registry.activeId, lastUsedId: registry.lastUsedId }));
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
      const imported = new SqliteInventoryRepository(path);
      imported.close();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error("Impossible d’ouvrir ce fichier comme base RC Workshop : " + message);
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
  ipcMain.handle("inventory:add-project", (_event, input: Project) => {
    inventory.addProject(input);
    return inventory.getSnapshot();
  });
  ipcMain.handle("inventory:assign-item", (_event, itemId: string, target: { kind: "aircraft"; id: string } | { kind: "project"; id: string }) => {
    inventory.assignItem(itemId, target, randomUUID(), new Date().toISOString());
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
