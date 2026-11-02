import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { InventoryService, type Aircraft, type ComponentReference, type Project, type StockItem, type StockLot } from "@rc-workshop/core";
import { SqliteInventoryRepository } from "@rc-workshop/infrastructure";

let mainWindow: BrowserWindow | null = null;
let repository: SqliteInventoryRepository;
let inventory: InventoryService;

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
  ipcMain.handle("inventory:add-item", (_event, input: Omit<StockItem, "createdAt">) => {
    inventory.addItem({ ...input, createdAt: new Date().toISOString() });
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
  ipcMain.handle("inventory:release-item", (_event, itemId: string) => {
    inventory.releaseItem(itemId, randomUUID(), new Date().toISOString());
    return inventory.getSnapshot();
  });
}

app.whenReady().then(() => {
  const databasePath = join(app.getPath("userData"), "rc-workshop.sqlite");
  repository = new SqliteInventoryRepository(databasePath);
  inventory = new InventoryService(repository);
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
