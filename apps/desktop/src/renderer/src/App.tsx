import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  COMPONENT_CATEGORIES,
  type Aircraft,
  type AircraftEquipmentDisposition,
  type AircraftType,
  type AircraftOperationalState,
  type AircraftLifecycleState,
  type AircraftLogbookEvent,
  type AircraftLogbookEventType,
  type ComponentCategory,
  type ComponentReference,
  type InventorySnapshot,
  type StockItem,
  type StockLot,
  type TrackingMode,
} from "@rc-workshop/core";

import type { InventoryList } from "../../preload/index.js";
import { filterAircraft, groupAircraft } from "./fleet-utils.js";

type Section = "dashboard" | "inventory" | "aircraft" | "projects" | "movements" | "export" | "admin" | "reset";
type AssignmentTarget = { kind: "aircraft" | "project"; id: string };
const labels: Record<ComponentCategory, string> = {
  motor: "Motorisation", esc: "Variateurs ESC", radio: "Radio", servo: "Servos",
  battery: "Batteries", supplies: "Fournitures", tool: "Outils et équipements", other: "Divers",
  propeller: "Hélices", receiver: "Récepteur (ancienne catégorie)", connector: "Fournitures",
  control: "Fournitures", structure: "Fournitures", material: "Fournitures", construction: "Fournitures",
};
const icons: Record<ComponentCategory, string> = {
  motor: "⚙️", esc: "🔌", radio: "📡", servo: "🎛️", battery: "🔋", supplies: "🧰", tool: "🔧", other: "📦",
  propeller: "🌀", receiver: "📡", connector: "🔗", control: "🕹️", structure: "🛩️", material: "🪵", construction: "🧰",
};
const emptySnapshot: InventorySnapshot = { logbookEvents: [], references: [], items: [], lots: [], aircraft: [], projects: [], movements: [] };
const aircraftTypeLabels: Record<AircraftType, string> = {
  airplane: "Avion", glider: "Planeur", "motor-glider": "Motoplaneur", helicopter: "Hélicoptère", multirotor: "Multirotor", other: "Autre",
};
const operationalStateLabels: Record<AircraftOperationalState, string> = {
  "flight-ready": "En état de vol", maintenance: "En maintenance", parts: "Pour pièces", "out-of-service": "Hors service",
};
const lifecycleStateLabels: Record<AircraftLifecycleState, string> = {
  active: "Actif", sold: "Vendu", retired: "Retiré",
};
const logbookEventLabels: Record<AircraftLogbookEventType, string> = {
  commissioning: "Mise en service / premier vol", flight: "Vol", maintenance: "Maintenance",
  incident: "Incident / crash", sale: "Vente", retirement: "Retrait définitif",
};

function isAssignableReference(reference: ComponentReference): boolean {
  return reference.category === "motor" || reference.category === "propeller" || reference.category === "esc" || reference.category === "servo" ||
    reference.category === "receiver" || (reference.category === "radio" && (reference.radioType ?? "receiver") === "receiver");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " octet(s)";
  const units = ["Ko", "Mo", "Go"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value) + " " + units[unit];
}

function App() {
  const [snapshot, setSnapshot] = useState<InventorySnapshot>(emptySnapshot);
  const [section, setSection] = useState<Section>("dashboard");
  const [category, setCategory] = useState<ComponentCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewReference, setShowNewReference] = useState(false);
  const [showNewAircraft, setShowNewAircraft] = useState(false);
  const [newReferenceCategory, setNewReferenceCategory] = useState<ComponentCategory | null>(null);
  const [showNewComponentMenu, setShowNewComponentMenu] = useState(false);
  const [stockGroupCategory, setStockGroupCategory] = useState<"supplies" | null>(null);
  const [editingStockGroup, setEditingStockGroup] = useState<ComponentReference | null>(null);
  const [showAddStock, setShowAddStock] = useState(false);
  const [showEditReference, setShowEditReference] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);
  const [previewAircraft, setPreviewAircraft] = useState<Aircraft | null>(null);
  const [aircraftClosureIntent, setAircraftClosureIntent] = useState<"sold" | "retired" | null>(null);
  const [logbookAircraft, setLogbookAircraft] = useState<Aircraft | null>(null);
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(null);
  const [fleetSearch, setFleetSearch] = useState("");
  const [fleetType, setFleetType] = useState<AircraftType | "all">("all");
  const [fleetOperational, setFleetOperational] = useState<AircraftOperationalState | "all">("all");
  const [fleetLifecycle, setFleetLifecycle] = useState<AircraftLifecycleState | "all">("all");
  const [fleetFavoritesOnly, setFleetFavoritesOnly] = useState(false);
  const [fleetView, setFleetView] = useState<"cards" | "list">("cards");
  const [fleetGrouping, setFleetGrouping] = useState<"operational" | "lifecycle">("operational");
  const [collapsedFleetGroups, setCollapsedFleetGroups] = useState<string[]>(["out-of-service", "sold", "retired"]);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [inventoryList, setInventoryList] = useState<InventoryList | null>(null);
  const [showInventoryManager, setShowInventoryManager] = useState(false);
  const [exportCategories, setExportCategories] = useState<ComponentCategory[] | "all">("all");
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [notice, setNotice] = useState("");
  const actionLock = useRef(false);

  const refresh = async () => {
    if (!window.rcWorkshop || typeof window.rcWorkshop.getSnapshot !== "function") {
      throw new Error("Le pont Electron est indisponible. Vérifie le chargement du script preload puis relance l'application.");
    }
    setSnapshot(await window.rcWorkshop.getSnapshot());
  };
  useEffect(() => {
    void Promise.all([refresh(), window.rcWorkshop.getInventories().then(setInventoryList)])
      .catch((e: unknown) => setError(String(e)));
  }, []);

  async function openInventory(id: string) {
    if (actionLock.current) return;
    actionLock.current = true; setBusy(true); setError("");
    try {
      setInventoryList(await window.rcWorkshop.openInventory(id));
      setSnapshot(await window.rcWorkshop.getSnapshot());
      setSection("dashboard"); setCategory("all"); setSelectedId(null); setShowInventoryManager(false);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { actionLock.current = false; setBusy(false); }
  }

  async function createInventory(name: string) {
    if (actionLock.current) return;
    actionLock.current = true; setBusy(true); setError("");
    try {
      setInventoryList(await window.rcWorkshop.createInventory(name));
      setSnapshot(await window.rcWorkshop.getSnapshot());
      setSection("dashboard"); setCategory("all"); setSelectedId(null); setShowInventoryManager(false);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { actionLock.current = false; setBusy(false); }
  }

  async function importInventory() {
    if (actionLock.current) return;
    actionLock.current = true; setBusy(true); setError("");
    try {
      setInventoryList(await window.rcWorkshop.importInventory());
      setSnapshot(await window.rcWorkshop.getSnapshot());
      setSection("dashboard"); setCategory("all"); setSelectedId(null); setShowInventoryManager(false);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { actionLock.current = false; setBusy(false); }
  }

  async function deleteInventory(id: string) {
    const target = inventoryList?.items.find((entry) => entry.id === id);
    if (!target || target.primary || target.active) return;
    if (!window.confirm("Supprimer définitivement l’inventaire « " + target.name + " » ? Son fichier SQLite sera supprimé. Cette opération est irréversible.")) return;
    if (actionLock.current) return;
    actionLock.current = true; setBusy(true); setError(""); setNotice("");
    try {
      setInventoryList(await window.rcWorkshop.deleteInventory(id));
      setNotice("L’inventaire « " + target.name + " » a été supprimé.");
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { actionLock.current = false; setBusy(false); }
  }

  async function compactActiveDatabase() {
    if (actionLock.current) return;
    const activeName = inventoryList?.items.find((entry) => entry.active)?.name ?? "la base active";
    if (!window.confirm("Compacter la base « " + activeName + " » ? L’opération peut prendre un peu de temps selon sa taille.")) return;
    actionLock.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const result = await window.rcWorkshop.compactDatabase();
      setNotice("Compactage terminé : " + formatBytes(result.beforeBytes) + " → " + formatBytes(result.afterBytes) +
        ". Espace récupéré : " + formatBytes(result.reclaimedBytes) + ".");
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { actionLock.current = false; setBusy(false); }
  }

  function openNewComponent(value: ComponentCategory) {
    setShowNewComponentMenu(false);
    setError("");
    if (value === "supplies") { setStockGroupCategory("supplies"); return; }
    setNewReferenceCategory(value);
    setShowNewReference(true);
  }

  async function runExport(action: () => Promise<boolean>) {
    if (actionLock.current) return;
    actionLock.current = true; setBusy(true); setError("");
    try {
      if (await action()) window.alert("L’export a été enregistré.");
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { actionLock.current = false; setBusy(false); }
  }

  async function resetInventory() {
    if (actionLock.current) return;
    actionLock.current = true; setBusy(true); setError(""); setNotice("");
    try {
      setSnapshot(await window.rcWorkshop.resetInventory());
      setShowResetConfirmation(false);
      setNotice("L’inventaire a été remis à zéro. Une sauvegarde a été conservée avant l’opération.");
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { actionLock.current = false; setBusy(false); }
  }

  function toggleExportCategory(value: ComponentCategory, checked: boolean) {
    const current = exportCategories === "all" ? [...COMPONENT_CATEGORIES] : exportCategories;
    const next = checked ? [...current, value] : current.filter((entry) => entry !== value);
    setExportCategories(next.length === COMPONENT_CATEGORIES.length ? "all" : next);
  }

  const selected = snapshot.references.find((reference) => reference.id === selectedId) ?? null;
  const visibleReferences = useMemo(() => snapshot.references.filter((reference) =>
    (showArchived || !reference.archived) &&
    (category === "all" || reference.category === category) &&
    `${reference.name} ${reference.brand ?? ""} ${reference.model ?? ""} ${reference.category}`.toLowerCase().includes(search.toLowerCase())
  ), [snapshot.references, category, search, showArchived]);

  const availableItems = snapshot.items.filter((item) => item.status === "available").length;
  const filteredAircraft = filterAircraft(snapshot.aircraft, { query: fleetSearch, type: fleetType, operationalState: fleetOperational, lifecycleState: fleetLifecycle, favoritesOnly: fleetFavoritesOnly });
  const selectedAircraft = snapshot.aircraft.find((aircraft) => aircraft.id === selectedAircraftId) ?? null;
  const fleetGroups = groupAircraft(filteredAircraft, fleetGrouping);
  const fleetGroupLabels: Record<string, string> = { ...operationalStateLabels, ...lifecycleStateLabels };
  const installedItems = snapshot.items.filter((item) => item.status === "installed").length;
  const reservedItems = snapshot.items.filter((item) => item.status === "reserved").length;
  const totalQuantity = snapshot.lots.reduce((sum, lot) => sum + lot.quantity, 0);

  async function runAction(action: () => Promise<InventorySnapshot>): Promise<boolean> {
    if (actionLock.current) return false;
    actionLock.current = true; setBusy(true); setError("");
    try { setSnapshot(await action()); return true; }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); return false; }
    finally { actionLock.current = false; setBusy(false); }
  }

  async function handleSaveStockGroup(input: { name: string; quantity: number; unit: string; category: "supplies"; referenceId?: string }) {
    const name = input.name.trim();
    if (!name || input.quantity < (input.referenceId ? 0 : 1)) return;
    await runAction(async () => {
      let reference = input.referenceId
        ? snapshot.references.find((entry) => entry.id === input.referenceId)
        : snapshot.references.find((entry) => !entry.archived && entry.category === input.category && entry.trackingMode === "quantity" && entry.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase());
      if (!reference) {
        const id = crypto.randomUUID();
        await window.rcWorkshop.createReference({ id, name, category: input.category, trackingMode: "quantity", attributes: {} });
        reference = { id, name, category: input.category, trackingMode: "quantity", attributes: {}, archived: false, createdAt: new Date().toISOString() };
      }
      const result = input.referenceId
        ? await window.rcWorkshop.setStockGroupQuantity(reference.id, input.quantity, input.unit.trim() || "pièce")
        : await window.rcWorkshop.addLot({ id: crypto.randomUUID(), referenceId: reference.id, quantity: input.quantity, unit: input.unit.trim() || "pièce" });
      setStockGroupCategory(null); setEditingStockGroup(null); setSection("inventory"); setCategory(input.category); setSelectedId(null);
      return result;
    });
  }

  async function handleDeleteItem(item: StockItem) {
    const reference = snapshot.references.find((entry) => entry.id === item.referenceId);
    const assigned = item.aircraftId ? snapshot.aircraft.find((aircraft) => aircraft.id === item.aircraftId)?.name : item.projectId ? snapshot.projects.find((project) => project.id === item.projectId)?.name : null;
    const label = item.inventoryCode + (reference ? " (" + reference.name + ")" : "") + (assigned ? ", actuellement affecté à " + assigned : "");
    if (!window.confirm("Supprimer " + label + " ? L’historique des mouvements sera conservé.")) return;
    await runAction(() => window.rcWorkshop.deleteItem(item.id));
  }

  async function handleRestoreReference(reference: ComponentReference) {
    if (!window.confirm("Restaurer cette référence dans le catalogue actif ?")) return;
    await runAction(async () => { const result = await window.rcWorkshop.restoreReference(reference.id); setShowArchived(false); return result; });
  }

  async function handleDeleteReference(reference: ComponentReference) {
    const itemCount = snapshot.items.filter((item) => item.referenceId === reference.id).length;
    const lotCount = snapshot.lots.filter((lot) => lot.referenceId === reference.id).length;
    const movementCount = snapshot.movements.filter((movement) => movement.referenceId === reference.id).length;
    const used = itemCount + lotCount + movementCount > 0;
    const prompt = used
      ? "Cette référence est utilisée (" + itemCount + " exemplaire(s), " + lotCount + " lot(s), " + movementCount + " mouvement(s)). Elle sera archivée pour préserver l’historique. Continuer ?"
      : "Cette référence n’est utilisée par aucun exemplaire, lot ou mouvement. La supprimer définitivement ?";
    if (actionLock.current || !window.confirm(prompt)) return;
    actionLock.current = true; setBusy(true); setError("");
    try {
      const result = await window.rcWorkshop.deleteReference(reference.id);
      setSnapshot(result.snapshot); setSelectedId(null);
      window.alert(result.archived ? "Référence archivée : l’historique et les liens ont été préservés." : "Référence supprimée.");
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { actionLock.current = false; setBusy(false); }
  }

  function openCategory(value: ComponentCategory) {
    setCategory(value); setSection("inventory"); setSelectedId(null);
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">RC</div><div><strong>Workshop</strong><small>MANAGER</small></div></div>
        <div className="nav-label">ATELIER</div>
        <nav>
          <button className={section === "dashboard" ? "nav-item active" : "nav-item"} onClick={() => setSection("dashboard")}>▦ <span>Vue d'ensemble</span></button>
          <button className={section === "inventory" ? "nav-item active" : "nav-item"} onClick={() => { setSection("inventory"); setCategory("all"); }}>▤ <span>Inventaire</span><b>{snapshot.references.length}</b></button>
          <button className={section === "aircraft" ? "nav-item active" : "nav-item"} onClick={() => setSection("aircraft")}>✈ <span>Mes avions</span><b>{snapshot.aircraft.length}</b></button>
          <button className={section === "projects" ? "nav-item active" : "nav-item"} onClick={() => setSection("projects")}>▧ <span>Projets</span><b>{snapshot.projects.length}</b></button>
          <button className={section === "movements" ? "nav-item active" : "nav-item"} onClick={() => setSection("movements")}>↔ <span>Mouvements</span></button>
          <button className={section === "admin" || section === "reset" || section === "export" ? "nav-item active" : "nav-item"} onClick={() => setSection("admin")}>⚙ <span>Administration</span></button>
        </nav>
        <footer className="app-footer"><span>RC Workshop Manager · v0.1.0</span><a href="https://github.com/Claude-Ca/rc-workshop-manager" target="_blank" rel="noreferrer">Code source ↗</a></footer>
      </aside>
      <main className="main">
        <header className="topbar"><div><span className="eyebrow">RC WORKSHOP MANAGER</span><h1>{section === "dashboard" ? "Vue d'ensemble" : section === "inventory" ? "Inventaire" : section === "aircraft" ? "Ma flotte" : section === "projects" ? "Mes projets" : section === "movements" ? "Historique des mouvements" : section === "export" ? "Exporter l’inventaire" : section === "admin" ? "Administration" : "Réinitialiser l’inventaire"}</h1></div><div className="top-actions"><div className="active-inventory-chip" title="Base d’inventaire actuellement ouverte"><span className="active-inventory-icon">▣</span><span><small>BASE ACTIVE</small><strong>{inventoryList?.items.find((entry) => entry.active)?.name ?? "Chargement…"}</strong></span></div><span className="local-chip"><span className="status-dot" /> Hors ligne · SQLite local</span></div></header>
        {error && <div className="error-banner">{error}<button onClick={() => setError("")}>×</button></div>}{notice && <div className="success-banner">{notice}<button onClick={() => setNotice("")}>×</button></div>}
        {section === "dashboard" && <section className="content">
          <div className="welcome"><div><span className="eyebrow">TON ATELIER, EN UN COUP D'ŒIL</span><h2>Bienvenue dans ton atelier RC.</h2><p>Retrouve tes composants, leur disponibilité et leur affectation.</p></div><div className="welcome-icon">🛩️</div></div>
          <div className="stats"><Stat label="Références catalogue" value={snapshot.references.length} note="Types de composants" icon="▤" /><Stat label="Exemplaires disponibles" value={availableItems + totalQuantity} note="Prêts à être utilisés" icon="✓" /><Stat label="Installés sur un avion" value={installedItems} note="Équipements affectés" icon="✈" /><Stat label="Réservés" value={reservedItems} note="Pour tes projets" icon="◷" /></div>
          {snapshot.aircraft.some((aircraft) => aircraft.favorite) && <><div className="section-heading favorites-heading"><div><span className="eyebrow">ACCÈS RAPIDE</span><h2>Mes favoris</h2></div><span className="muted">{snapshot.aircraft.filter((aircraft) => aircraft.favorite).length}/4</span></div><div className="favorite-aircraft-grid">{snapshot.aircraft.filter((aircraft) => aircraft.favorite).map((aircraft) => <article className="favorite-aircraft-card" key={aircraft.id}><button className="favorite-aircraft-main" onClick={() => { setSection("aircraft"); setSelectedAircraftId(aircraft.id); }}>{aircraft.photoPath ? <img className="aircraft-photo" src={aircraft.photoPath} alt="" /> : <span className="aircraft-icon">✈</span>}<span><strong>{aircraft.name}</strong><small>{aircraftTypeLabels[aircraft.aircraftType ?? "other"]} · {operationalStateLabels[aircraft.operationalState ?? "flight-ready"]}</small></span></button><button className="favorite-toggle active" title="Retirer des favoris" aria-label={"Retirer " + aircraft.name + " des favoris"} onClick={() => runAction(() => window.rcWorkshop.setAircraftFavorite(aircraft.id, false))}>★</button></article>)}</div></>}
          <div className="section-heading"><div><span className="eyebrow">PAR FAMILLE</span><h2>Explorer le stock</h2></div><button className="text-button" onClick={() => { setSection("inventory"); setCategory("all"); }}>Tout l'inventaire →</button></div>
          <div className="category-grid">{COMPONENT_CATEGORIES.map((value) => { const count = snapshot.references.filter((ref) => ref.category === value && !ref.archived).length; return <div className="category-card" key={value}><button type="button" className="category-card-main" onClick={() => openCategory(value)}><span className="category-icon">{icons[value]}</span><strong>{labels[value]}</strong><small>{count} référence{count > 1 ? "s" : ""}</small><span className="card-arrow">↗</span></button><button type="button" className="category-add" aria-label={"Ajouter une référence : " + labels[value]} title={"Ajouter une référence : " + labels[value]} disabled={busy} onClick={() => openNewComponent(value)}>＋</button></div>; })}</div>
          <div className="section-heading"><div><span className="eyebrow">DERNIÈRES ENTRÉES</span><h2>Ajouts récents</h2></div><button className="text-button" onClick={() => setSection("inventory")}>Voir le catalogue →</button></div>
          <div className="recent-list">{snapshot.references.slice(-5).reverse().map((ref) => <button className="recent-row" key={ref.id} onClick={() => { setSelectedId(ref.id); setSection("inventory"); }}><span className="category-icon small">{icons[ref.category]}</span><span className="recent-name"><strong>{ref.name}</strong><small>{labels[ref.category]}{ref.brand ? ` · ${ref.brand}` : ""}</small></span><span className="row-arrow">→</span></button>)}{snapshot.references.length === 0 && <EmptyState title="Ton inventaire est encore vide" text="Ajoute ton premier composant pour commencer à organiser ton atelier." />}</div>
        </section>}
        {section === "inventory" && <section className="content">
          <div className="toolbar">
            <div className="new-component-menu"><button className="primary" disabled={busy} aria-expanded={showNewComponentMenu} onClick={() => setShowNewComponentMenu((open) => !open)}>＋ Ajouter <span aria-hidden="true">▾</span></button>{showNewComponentMenu && <div className="new-component-dropdown">{COMPONENT_CATEGORIES.map((value) => <button type="button" key={value} onClick={() => openNewComponent(value)}><span>{icons[value]}</span>{labels[value]}</button>)}</div>}</div>
            <div className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={category === "supplies" ? "Rechercher dans les fournitures..." : "Rechercher un composant, une marque..."} /></div>
            <select value={category} onChange={(e) => { setCategory(e.target.value as ComponentCategory | "all"); setSelectedId(null); }}><option value="all">Toutes les catégories</option>{COMPONENT_CATEGORIES.map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select>
            {category !== "supplies" && <label className="archived-toggle"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Afficher les références archivées</label>}
            <span className="result-count">{visibleReferences.length} {category === "supplies" ? "fourniture(s)" : category === "tool" ? "outil(s)" : "référence(s)"}</span>
          </div>
          {category === "supplies" ? <div className="supply-list">{visibleReferences.map((ref) => { const lots = snapshot.lots.filter((lot) => lot.referenceId === ref.id); const quantity = lots.reduce((sum, lot) => sum + lot.quantity, 0); const unit = lots[0]?.unit ?? "pièce"; return <div className="supply-row" key={ref.id}><strong>{ref.name}</strong><span>Qté : {quantity} {unit}</span><button className="subtle-button" disabled={busy} onClick={() => setEditingStockGroup(ref)}>Modifier la quantité</button></div>; })}{visibleReferences.length === 0 && <EmptyState title={category === "supplies" ? "Aucune fourniture en stock" : "Aucun outil ou équipement en stock"} text="Ajoute une désignation et sa quantité pour commencer ta liste." />}</div> : selected ? <ReferenceDetail reference={selected} snapshot={snapshot} onBack={() => setSelectedId(null)} onAddStock={() => setShowAddStock(true)} onEdit={() => setShowEditReference(true)} onDelete={() => void handleDeleteReference(selected)} onRestore={() => void handleRestoreReference(selected)} onAssign={(itemId, target) => runAction(() => window.rcWorkshop.assignItem(itemId, target))} onRelease={(itemId) => runAction(() => window.rcWorkshop.releaseItem(itemId))} onBind={(itemId, transmitterId) => runAction(() => window.rcWorkshop.setReceiverBinding(itemId, transmitterId))} onToolStatus={(itemId, status) => runAction(() => window.rcWorkshop.setToolStatus(itemId, status))} onEditItem={setEditingItem} onDeleteItem={(item) => void handleDeleteItem(item)} busy={busy} /> : <div className="reference-grid">{visibleReferences.map((ref) => { const refItems = snapshot.items.filter((item) => item.referenceId === ref.id); const availableCount = refItems.filter((item) => item.status === "available").length; const stockSummary = ref.trackingMode === "individual" ? (isAssignableReference(ref) ? `${refItems.length} exemplaire(s) · ${availableCount} disponible(s)` : `${refItems.length} exemplaire(s)`) : snapshot.lots.filter((lot) => lot.referenceId === ref.id).reduce((sum, lot) => sum + lot.quantity, 0) + " en stock"; return <button className="reference-card" key={ref.id} onClick={() => setSelectedId(ref.id)}><div className="reference-photo">{ref.photoPath ? <img src={ref.photoPath} alt="" /> : <span>{icons[ref.category]}</span>}<small>{labels[ref.category]}{ref.archived ? " · ARCHIVÉE" : ""}</small></div><div className="reference-info"><strong>{ref.name}{ref.archived && <span className="archived-badge">Archivée</span>}</strong><span>{[ref.brand, ref.model].filter(Boolean).join(" · ") || "Marque / modèle non renseigné"}</span><div className="reference-meta"><small>{ref.trackingMode === "individual" && isAssignableReference(ref) ? <><span>{refItems.length} exemplaire(s) · </span><span className={availableCount > 0 ? "stock-availability-positive" : undefined}>{availableCount} disponible(s)</span></> : stockSummary}</small><b>→</b></div></div></button>; })}{visibleReferences.length === 0 && <EmptyState title="Aucun composant trouvé" text="Essaie une autre recherche ou ajoute une nouvelle référence." />}</div>}
        </section>}
        {section === "aircraft" && <section className="content">
          {selectedAircraft ? <div className="aircraft-detail"><button className="text-button back-button" onClick={() => setSelectedAircraftId(null)}>← Retour à Ma Flotte</button>
            <div className="detail-header"><div className="detail-photo">{selectedAircraft.photoPath ? <img src={selectedAircraft.photoPath} alt="" /> : <span className="aircraft-icon">✈</span>}</div><div className="detail-title"><span className="eyebrow">FICHE AÉRONEF</span><h2>{selectedAircraft.name}</h2><p>{aircraftTypeLabels[selectedAircraft.aircraftType ?? "other"]} · {[selectedAircraft.manufacturer, selectedAircraft.model].filter(Boolean).join(" · ") || "Modèle non précisé"}</p><div className="aircraft-state-row"><span className={"state-pill " + (selectedAircraft.operationalState ?? "flight-ready")}>{operationalStateLabels[selectedAircraft.operationalState ?? "flight-ready"]}</span><span className="state-pill lifecycle">{lifecycleStateLabels[selectedAircraft.lifecycleState ?? "active"]}</span></div></div><div className="detail-actions"><button className="secondary" disabled={busy || selectedAircraft.lifecycleState !== "active"} onClick={() => setEditingAircraft(selectedAircraft)}>Modifier</button><button className="secondary" disabled={busy} onClick={() => setLogbookAircraft(selectedAircraft)}>Journal de bord ({snapshot.logbookEvents.filter((event) => event.aircraftId === selectedAircraft.id).length})</button></div></div>
            <div className="detail-columns"><div className="panel"><h3>Informations générales</h3><div className="attribute-row"><span>Type</span><strong>{aircraftTypeLabels[selectedAircraft.aircraftType ?? "other"]}</strong></div><div className="attribute-row"><span>État opérationnel</span><strong>{operationalStateLabels[selectedAircraft.operationalState ?? "flight-ready"]}</strong></div><div className="attribute-row"><span>Cycle de vie</span><strong>{lifecycleStateLabels[selectedAircraft.lifecycleState ?? "active"]}</strong></div><div className="attribute-row"><span>Immatriculation UAF</span><strong>{selectedAircraft.uafRegistration || "Non renseignée"}</strong></div><p>{selectedAircraft.notes || "Aucune note renseignée."}</p></div><div className="panel"><h3>Configuration · {snapshot.items.filter((item) => item.status === "installed" && item.aircraftId === selectedAircraft.id).length} équipement(s) installé(s)</h3>{snapshot.items.filter((item) => item.status === "installed" && item.aircraftId === selectedAircraft.id).map((item) => { const ref = snapshot.references.find((entry) => entry.id === item.referenceId); return <div className="item-row" key={item.id}><div><strong>{ref?.name ?? item.referenceId} · {item.inventoryCode}</strong><small>{item.serialNumber ? "N° de série : " + item.serialNumber : "Numéro de série non renseigné"}{item.notes ? " · " + item.notes : ""}</small></div></div>; })}{snapshot.items.every((item) => item.status !== "installed" || item.aircraftId !== selectedAircraft.id) && <p className="muted">Aucun équipement affecté.</p>}</div></div>
            <section className="panel aircraft-lifecycle-management"><h3>Cycle de vie</h3>{selectedAircraft.lifecycleState === "active" ? <><p>La vente et le retrait demandent une décision pour chaque équipement affecté.</p><div className="aircraft-preview-actions"><button className="secondary" disabled={busy} onClick={() => { setAircraftClosureIntent("sold"); setPreviewAircraft(selectedAircraft); }}>Vendre l’avion…</button><button className="danger-button" disabled={busy} onClick={() => { setAircraftClosureIntent("retired"); setPreviewAircraft(selectedAircraft); }}>Retirer définitivement…</button></div></> : <p>Cette fiche est clôturée : {lifecycleStateLabels[selectedAircraft.lifecycleState ?? "active"].toLocaleLowerCase("fr")}.</p>}</section>
          </div> : <>
            <div className="section-heading"><div><span className="eyebrow">FLOTTE RC · {snapshot.aircraft.length} AÉRONEF(S)</span><h2>Ma Flotte</h2></div><button type="button" className="primary" disabled={busy} onClick={() => { setError(""); setShowNewAircraft(true); }}>＋ Nouvel avion</button></div>
            <div className="fleet-toolbar"><div className="search-box"><span>⌕</span><input aria-label="Rechercher un aéronef" value={fleetSearch} onChange={(event) => setFleetSearch(event.target.value)} placeholder="Rechercher un aéronef…" /></div><select aria-label="Filtrer par type" value={fleetType} onChange={(event) => setFleetType(event.target.value as AircraftType | "all")}><option value="all">Tous les types</option>{Object.entries(aircraftTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select aria-label="Filtrer par état opérationnel" value={fleetOperational} onChange={(event) => setFleetOperational(event.target.value as AircraftOperationalState | "all")}><option value="all">Tous les états</option>{Object.entries(operationalStateLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select aria-label="Filtrer par cycle de vie" value={fleetLifecycle} onChange={(event) => setFleetLifecycle(event.target.value as AircraftLifecycleState | "all")}><option value="all">Tous les cycles de vie</option>{Object.entries(lifecycleStateLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><button type="button" className="secondary fleet-reset-button" onClick={() => { setFleetSearch(""); setFleetType("all"); setFleetOperational("all"); setFleetLifecycle("all"); setFleetFavoritesOnly(false); setFleetGrouping("operational"); }}>Réinitialiser les filtres</button><div className="fleet-controls-row"><div className="fleet-view-toggle" aria-label="Mode d’affichage"><button className={fleetView === "cards" ? "active" : ""} onClick={() => setFleetView("cards")}>Vignettes</button><button className={fleetView === "list" ? "active" : ""} onClick={() => setFleetView("list")}>Liste</button></div><button type="button" className={fleetFavoritesOnly ? "fleet-favorites-toggle active" : "fleet-favorites-toggle"} aria-pressed={fleetFavoritesOnly} onClick={() => setFleetFavoritesOnly((active) => !active)}>★ Favoris</button><label className="fleet-grouping">Regrouper par <select value={fleetGrouping} onChange={(event) => setFleetGrouping(event.target.value as "operational" | "lifecycle")}><option value="operational">État opérationnel</option><option value="lifecycle">Cycle de vie</option></select></label></div><span className="result-count">{filteredAircraft.length} / {snapshot.aircraft.length} aéronef(s)</span></div>
            {Array.from(fleetGroups.entries()).map(([group, aircraftList]) => <section className="fleet-group" key={group}><button className="fleet-group-heading" aria-expanded={!collapsedFleetGroups.includes(group)} onClick={() => setCollapsedFleetGroups((current) => current.includes(group) ? current.filter((item) => item !== group) : [...current, group])}><strong>{fleetGroupLabels[group]} <small>{aircraftList.length}</small></strong><span>{collapsedFleetGroups.includes(group) ? "＋" : "−"}</span></button>{!collapsedFleetGroups.includes(group) && <div className={fleetView === "cards" ? "aircraft-grid fleet-grid" : "fleet-list"}>{aircraftList.map((aircraft) => { const installed = snapshot.items.filter((item) => item.status === "installed" && item.aircraftId === aircraft.id); const receiver = installed.find((item) => { const ref = snapshot.references.find((entry) => entry.id === item.referenceId); return ref?.category === "radio" && ref.radioType === "receiver"; }); const receiverRef = receiver && snapshot.references.find((entry) => entry.id === receiver.referenceId); return <article className={fleetView === "cards" ? "aircraft-card fleet-card" : "fleet-row"} key={aircraft.id} role="button" tabIndex={0} onClick={() => setSelectedAircraftId(aircraft.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedAircraftId(aircraft.id); } }}><div className="fleet-primary">{aircraft.photoPath ? <img className="aircraft-photo fleet-photo" src={aircraft.photoPath} alt="" /> : <span className="aircraft-icon">✈</span>}<div><strong>{aircraft.name}</strong><small>{aircraftTypeLabels[aircraft.aircraftType ?? "other"]} · {[aircraft.manufacturer, aircraft.model].filter(Boolean).join(" · ") || "Modèle non précisé"}</small><div className="aircraft-state-row"><span className={"state-pill " + (aircraft.operationalState ?? "flight-ready")}>{operationalStateLabels[aircraft.operationalState ?? "flight-ready"]}</span><span className="state-pill lifecycle">{lifecycleStateLabels[aircraft.lifecycleState ?? "active"]}</span></div></div></div><div className="fleet-summary">{aircraft.uafRegistration && <small>Immatriculation UAF : {aircraft.uafRegistration}</small>}{receiver && <small>RX affecté : {receiverRef?.name ?? "Récepteur"} · {receiver.inventoryCode}</small>}<small>{installed.length} équipement(s) installé(s)</small></div><button type="button" className={aircraft.favorite ? "favorite-toggle active" : "favorite-toggle"} title={aircraft.favorite ? "Retirer des favoris" : "Ajouter aux favoris"} aria-label={aircraft.favorite ? "Retirer " + aircraft.name + " des favoris" : "Ajouter " + aircraft.name + " aux favoris"} aria-pressed={Boolean(aircraft.favorite)} disabled={busy || (!aircraft.favorite && snapshot.aircraft.filter((entry) => entry.favorite).length >= 4)} onClick={(event) => { event.stopPropagation(); void runAction(() => window.rcWorkshop.setAircraftFavorite(aircraft.id, !aircraft.favorite)); }}>{aircraft.favorite ? "★" : "☆"}</button></article>; })}</div>}</section>)}
            {filteredAircraft.length === 0 && <EmptyState title="Aucun aéronef trouvé" text={snapshot.aircraft.length ? "Modifie tes filtres ou ta recherche." : "Ajoute ton premier aéronef pour commencer ta flotte."} />}
          </>}
        </section>}
        {section === "projects" && <section className="content"><div className="section-heading"><div><span className="eyebrow">CONSTRUCTIONS & MODIFICATIONS</span><h2>Mes projets</h2></div></div><div className="project-grid">{snapshot.projects.map((project) => <div className="project-card" key={project.id}><strong>{project.name}</strong><span className={`project-status ${project.status}`}>{project.status}</span><small>{snapshot.items.filter((item) => item.projectId === project.id).length} composant(s) réservé(s)</small></div>)}</div><AddProject onAdd={(name) => runAction(() => window.rcWorkshop.addProject({ id: crypto.randomUUID(), name, status: "planned" }))} busy={busy} /></section>}
        {section === "movements" && <section className="content"><div className="movement-list">{snapshot.movements.map((movement) => <div className="movement-row" key={movement.id}><span className="movement-icon">↔</span><div><strong>{movement.type}</strong><small>{movement.referenceId} · {movement.itemId ?? movement.lotId ?? ""}</small></div><time>{new Date(movement.occurredAt).toLocaleString("fr-FR")}</time></div>)}{snapshot.movements.length === 0 && <EmptyState title="Pas encore de mouvement" text="Les entrées, installations et réservations apparaîtront ici." />}</div></section>}
        {section === "admin" && <section className="content admin-page">
          <div className="export-intro"><span className="eyebrow">OUTILS DE GESTION</span><h2>Administration de la base</h2><p>Les opérations d’administration s’appliquent à la base active : <strong>{inventoryList?.items.find((entry) => entry.active)?.name ?? "base ouverte"}</strong>.</p></div>
          <div className="admin-card"><div><h3>Gérer les bases d’inventaire</h3><p>Créer une nouvelle base, ouvrir une base existante ou importer une base SQLite. Chaque inventaire reste indépendant.</p></div><button className="primary" disabled={busy} onClick={() => { setError(""); setShowInventoryManager(true); }}>Gérer les inventaires</button></div>
          <div className="admin-card"><div><h3>Maintenance de la base SQLite</h3><p>Compacter la base active pour récupérer l’espace inutilisé après des suppressions ou des opérations de maintenance.</p></div><button className="subtle-button" disabled={busy} onClick={() => void compactActiveDatabase()}>Compacter la base</button></div>
          <div className="admin-card"><div><h3>Exporter l’inventaire</h3><p>Créer une sauvegarde SQLite complète ou exporter en CSV l’inventaire entier ou les catégories choisies.</p></div><button className="subtle-button" disabled={busy} onClick={() => setSection("export")}>Accéder aux exports</button></div>
          <div className="admin-card"><div><h3>Réinitialiser l’inventaire</h3><p>Efface le catalogue, les exemplaires, les quantités, les avions, les projets et l’historique de la base active. Une sauvegarde SQLite sera créée avant l’opération.</p></div><button className="danger-button" disabled={busy} onClick={() => setSection("reset")}>Accéder à la réinitialisation</button></div>
        </section>}
        {section === "reset" && <section className="content admin-page">
          <div className="export-intro"><span className="eyebrow">ACTION DESTRUCTIVE</span><h2>Réinitialiser l’inventaire actif</h2><p>Cette opération effacera toutes les données de <strong>{inventoryList?.items.find((entry) => entry.active)?.name ?? "la base active"}</strong>. Les autres bases resteront intactes. Une copie SQLite sera sauvegardée automatiquement avant la remise à zéro.</p></div>
          <div className="admin-card reset-card"><div><h3>Contenu supprimé de la base active</h3><p>Références, exemplaires, fournitures et quantités, avions, projets et mouvements.</p></div><button className="danger-button" disabled={busy} onClick={() => { setError(""); setShowResetConfirmation(true); }}>Réinitialiser l’inventaire…</button></div>
        </section>}
        {section === "export" && <section className="content export-page">
          <div className="export-intro"><span className="eyebrow">SAUVEGARDER OU PARTAGER</span><h2>Exporter les données</h2><p>Crée une copie complète de la base ou un fichier CSV pour tout l’inventaire ou les catégories choisies.</p></div>
          <div className="export-card">
            <div><span className="export-icon">▣</span><h3>Copie complète de la base</h3><p>Exporte une sauvegarde SQLite avec toutes les données, références et mouvements de la base active.</p></div>
            <button className="primary" disabled={busy} onClick={() => void runExport(() => window.rcWorkshop.exportDatabase())}>Exporter la base SQLite</button>
          </div>
          <div className="export-card csv-export-card">
            <div><span className="export-icon">▤</span><h3>Inventaire au format CSV</h3><p>Le CSV contient les références, exemplaires, quantités, affectations et informations catalogue utiles. Tu peux l’ouvrir dans un tableur.</p></div>
            <label className="export-all"><input type="checkbox" checked={exportCategories === "all"} onChange={(event) => setExportCategories(event.target.checked ? "all" : [])} /> Toutes les catégories</label>
            <div className="export-category-list">{COMPONENT_CATEGORIES.map((value) => <label key={value}><input type="checkbox" checked={exportCategories === "all" || exportCategories.includes(value)} onChange={(event) => toggleExportCategory(value, event.target.checked)} /> {labels[value]}</label>)}</div>
            <button className="primary" disabled={busy || (Array.isArray(exportCategories) && exportCategories.length === 0)} onClick={() => void runExport(() => window.rcWorkshop.exportInventoryCsv(exportCategories))}>Exporter le CSV</button>
          </div>
        </section>}
      </main>
      {(stockGroupCategory || editingStockGroup) && <StockGroupModal key={editingStockGroup?.id ?? stockGroupCategory} category="supplies" reference={editingStockGroup ?? undefined} initialQuantity={editingStockGroup ? snapshot.lots.filter((lot) => lot.referenceId === editingStockGroup.id).reduce((sum, lot) => sum + lot.quantity, 0) : undefined} initialUnit={editingStockGroup ? snapshot.lots.find((lot) => lot.referenceId === editingStockGroup.id)?.unit : undefined} busy={busy} onClose={() => { setStockGroupCategory(null); setEditingStockGroup(null); }} onSubmit={(value) => handleSaveStockGroup({ ...value, category: "supplies", ...(editingStockGroup ? { referenceId: editingStockGroup.id } : {}) })} />}
      {showResetConfirmation && <ResetInventoryModal inventoryName={inventoryList?.items.find((entry) => entry.active)?.name ?? "base active"} busy={busy} error={error} onClose={() => setShowResetConfirmation(false)} onConfirm={() => void resetInventory()} />}
      {showInventoryManager && <InventoryManagerModal inventoryList={inventoryList} busy={busy} error={error} onClose={() => setShowInventoryManager(false)} onOpen={(id) => void openInventory(id)} onCreate={(name) => void createInventory(name)} onImport={() => void importInventory()} onDelete={(id) => void deleteInventory(id)} />}
      {showNewReference && newReferenceCategory && <ReferenceModal initialCategory={newReferenceCategory} error={error} busy={busy} onClose={() => { setShowNewReference(false); setNewReferenceCategory(null); }} onSubmit={(value) => runAction(async () => { const result = await window.rcWorkshop.createReference(value); setShowNewReference(false); setNewReferenceCategory(null); setSection("inventory"); setCategory("all"); setSelectedId(value.id); return result; })} />}
      {showEditReference && selected && <ReferenceModal reference={selected} error={error} busy={busy} onClose={() => setShowEditReference(false)} onSubmit={(value) => runAction(async () => { const result = await window.rcWorkshop.updateReference(value as ComponentReference); setShowEditReference(false); return result; })} />}
      {previewAircraft && <AircraftPreviewModal key={previewAircraft.id + (aircraftClosureIntent ?? "preview")} aircraft={previewAircraft} snapshot={snapshot} busy={busy} error={error} initialClosureTarget={aircraftClosureIntent} onClose={() => { setPreviewAircraft(null); setAircraftClosureIntent(null); }} onEdit={() => { setEditingAircraft(previewAircraft); setPreviewAircraft(null); setAircraftClosureIntent(null); }} onOpenLogbook={() => setLogbookAircraft(previewAircraft)} onCloseAircraft={(lifecycleState, dispositions) => { void (async () => { const success = await runAction(() => window.rcWorkshop.closeAircraft(previewAircraft.id, lifecycleState, dispositions)); if (success) { setPreviewAircraft(null); setAircraftClosureIntent(null); } })(); }} />}
      {logbookAircraft && <AircraftLogbookModal aircraft={logbookAircraft} events={snapshot.logbookEvents.filter((event) => event.aircraftId === logbookAircraft.id)} busy={busy} error={error} onClose={() => setLogbookAircraft(null)} onSave={(event) => runAction(() => window.rcWorkshop.saveAircraftLogbookEvent(event))} />}
      {showNewAircraft && <AircraftModal favoriteLimitReached={snapshot.aircraft.filter((entry) => entry.favorite).length >= 4} error={error} busy={busy} onClose={() => setShowNewAircraft(false)} onSubmit={(value) => runAction(async () => { const result = await window.rcWorkshop.addAircraft({ id: crypto.randomUUID(), ...value }); setShowNewAircraft(false); return result; })} />}
      {editingAircraft && <AircraftModal aircraft={editingAircraft} favoriteLimitReached={snapshot.aircraft.filter((entry) => entry.favorite).length >= 4 && !Boolean(editingAircraft.favorite)} error={error} busy={busy} onClose={() => setEditingAircraft(null)} onSubmit={(value) => runAction(async () => { const result = await window.rcWorkshop.updateAircraft({ id: editingAircraft!.id, ...value }); setEditingAircraft(null); return result; })} />}
      {showAddStock && selected && <StockModal reference={selected} snapshot={snapshot} error={error} busy={busy} onClose={() => setShowAddStock(false)} onSubmit={(value) => runAction(async () => { const result = selected.trackingMode === "individual" ? await window.rcWorkshop.addItem(value as Omit<StockItem, "createdAt">) : await window.rcWorkshop.addLot(value as StockLot); setShowAddStock(false); return result; })} />}
      {editingItem && <StockItemModal item={editingItem} snapshot={snapshot} error={error} busy={busy} onClose={() => setEditingItem(null)} onSubmit={(value) => runAction(async () => { const result = await window.rcWorkshop.updateItem(value); setEditingItem(null); return result; })} />}
    </div>
  );
}
function Stat({ label, value, note, icon }: { label: string; value: number; note: string; icon: string }) { return <div className="stat-card"><span className="stat-icon">{icon}</span><small>{label}</small><strong>{value}</strong><span>{note}</span></div>; }
function EmptyState({ title, text }: { title: string; text: string }) { return <div className="empty-state"><span>📦</span><strong>{title}</strong><p>{text}</p></div>; }
function ReferenceDetail({ reference, snapshot, onBack, onAddStock, onEdit, onDelete, onRestore, onAssign, onRelease, onBind, onToolStatus, onEditItem, onDeleteItem, busy }: { reference: ComponentReference; snapshot: InventorySnapshot; onBack: () => void; onAddStock: () => void; onEdit: () => void; onDelete: () => void; onRestore: () => void; onAssign: (itemId: string, target: AssignmentTarget) => void; onRelease: (itemId: string) => void; onBind: (itemId: string, transmitterId: string | null) => void; onToolStatus: (itemId: string, status: "available" | "borrowed" | "repair") => void; onEditItem: (item: StockItem) => void; onDeleteItem: (item: StockItem) => void; busy: boolean }) {
  const items = snapshot.items.filter((item) => item.referenceId === reference.id); const lots = snapshot.lots.filter((lot) => lot.referenceId === reference.id);
  return <div className="detail-view"><button className="text-button back-button" onClick={onBack}>← Retour à l’inventaire</button><div className="detail-header"><div className="detail-photo">{reference.photoPath ? <img src={reference.photoPath} alt="" /> : <span>{icons[reference.category]}</span>}</div><div className="detail-title"><span className="eyebrow">{labels[reference.category].toUpperCase()}</span><h2>{reference.name}</h2><p>{[reference.brand, reference.model].filter(Boolean).join(" · ") || "Marque / modèle non renseigné"}</p><span className="tracking-chip">{reference.trackingMode === "individual" ? "Suivi individuel" : "Gestion par quantité"}</span>{reference.merchantUrl && <p><a href={reference.merchantUrl} target="_blank" rel="noreferrer">Site marchand ↗</a></p>}</div><div className="detail-actions"><button className="secondary" disabled={busy || reference.archived} onClick={onEdit}>Modifier la référence</button><button className="danger-button" disabled={busy || reference.archived} onClick={onDelete}>Supprimer / archiver</button>{reference.archived && <button className="secondary" disabled={busy} onClick={onRestore}>Restaurer</button>}<button className="primary" disabled={busy || reference.archived} onClick={onAddStock}>＋ Ajouter au stock</button></div></div><div className="detail-columns"><div className="panel"><h3>Caractéristiques</h3><p>{reference.description || "Aucune description renseignée."}</p>{(reference.category === "radio" && (reference.radioType ?? "receiver") === "receiver") && <><div className="attribute-row"><span>Type</span><strong>Récepteur</strong></div><div className="attribute-row"><span>Nombre de voies</span><strong>{reference.receiverChannels ?? "Non renseigné"}</strong></div><div className="attribute-row"><span>Protocole radio</span><strong>{reference.receiverProtocol || "Non renseigné"}</strong></div></>}{(reference.category === "motor" && reference.motorizationKind === "motor") && <><div className="attribute-row"><span>Type de moteur</span><strong>{reference.motorType === "glow" ? "Glow" : "Électrique"}</strong></div>{reference.motorType === "glow" ? <div className="attribute-row"><span>Cylindrée</span><strong>{reference.motorDisplacement}</strong></div> : <div className="attribute-row"><span>Tension</span><strong>{reference.motorVoltage}</strong></div>}</>}{(reference.category === "motor" && reference.motorizationKind === "propeller") && <><div className="attribute-row"><span>Hélice</span><strong>{reference.propellerDiameter} × {reference.propellerPitch} pouces</strong></div></>}{(reference.category === "radio" && reference.radioType === "transmitter") && <><div className="attribute-row"><span>Type</span><strong>Émetteur</strong></div><div className="attribute-row"><span>Nombre de voies</span><strong>{reference.transmitterChannels ?? "Non renseigné"}</strong></div><div className="attribute-row"><span>Protocoles radio</span><strong>{reference.transmitterProtocols?.join(", ") || "Non renseigné"}</strong></div><div className="attribute-row"><span>Version logicielle / firmware</span><strong>{reference.firmwareVersion || "Non renseignée"}</strong></div></>}{reference.category === "battery" && <>{reference.batteryConnector && <div className="attribute-row"><span>Connecteur</span><strong>{reference.batteryConnector}</strong></div>}{reference.batteryDischargeRateC !== undefined && <div className="attribute-row"><span>Taux de décharge</span><strong>{reference.batteryDischargeRateC} C</strong></div>}{reference.batteryDimensionsMm && <div className="attribute-row"><span>Dimensions</span><strong>{reference.batteryDimensionsMm} mm</strong></div>}{reference.batteryWeightG !== undefined && <div className="attribute-row"><span>Poids</span><strong>{reference.batteryWeightG} g</strong></div>}</>}{Object.entries(reference.attributes).map(([key, value]) => <div className="attribute-row" key={key}><span>{key}</span><strong>{String(value)}</strong></div>)}<div className="attribute-row"><span>Identifiant catalogue</span><strong>{reference.id}</strong></div></div><div className="panel"><h3>{reference.trackingMode === "individual" ? "Exemplaires physiques" : "Quantités en stock"}</h3>{items.map((item) => <ItemRow key={item.id} item={item} snapshot={snapshot} onAssign={onAssign} onRelease={onRelease} onBind={onBind} onToolStatus={onToolStatus} onEditItem={onEditItem} onDeleteItem={onDeleteItem} busy={busy} />)}{lots.map((lot) => <div className="lot-row" key={lot.id}><strong>{lot.quantity} {lot.unit}</strong><small>{lot.locationId || "Emplacement non renseigné"}</small></div>)}{items.length === 0 && lots.length === 0 && <p className="muted">Aucun stock enregistré pour cette référence.</p>}</div></div></div>;
}
function ItemRow({ item, snapshot, onAssign, onRelease, onBind, onToolStatus, onEditItem, onDeleteItem, busy }: { item: StockItem; snapshot: InventorySnapshot; onAssign: (itemId: string, target: AssignmentTarget) => void; onRelease: (itemId: string) => void; onBind: (itemId: string, transmitterId: string | null) => void; onToolStatus: (itemId: string, status: "available" | "borrowed" | "repair") => void; onEditItem: (item: StockItem) => void; onDeleteItem: (item: StockItem) => void; busy: boolean }) {
  const [target, setTarget] = useState(""); const status = item.status === "available" ? "Disponible" : item.status === "installed" ? "Installé" : item.status === "reserved" ? "Réservé" : item.status === "borrowed" ? "Prêté" : item.status === "repair" ? "En réparation" : item.status === "retired" ? "HS / rebuté" : item.status === "sold" ? "Vendu" : item.status;
  const assignedTo = item.aircraftId ? snapshot.aircraft.find((x) => x.id === item.aircraftId)?.name : item.projectId ? snapshot.projects.find((x) => x.id === item.projectId)?.name : undefined;
  const itemReference = snapshot.references.find((entry) => entry.id === item.referenceId);
  const isTransmitter = itemReference?.category === "radio" && itemReference.radioType === "transmitter";
  const isSupply = itemReference?.category === "supplies"; const isTool = itemReference?.category === "tool"; const isBattery = itemReference?.category === "battery";
  const isReceiver = itemReference?.category === "radio" && itemReference.radioType === "receiver";
  const boundTransmitter = snapshot.items.find((entry) => entry.id === item.boundTransmitterId);
  const transmitters = snapshot.items.filter((entry) => {
    const ref = snapshot.references.find((candidate) => candidate.id === entry.referenceId);
    return ref?.category === "radio" && ref.radioType === "transmitter";
  });
  const targetParts = target.split(":");
  const canAssign = targetParts.length === 2 && targetParts[1] !== "";
  return <div className="item-row"><div><strong>{item.inventoryCode}</strong><small>{item.tx16Name ? `TX16 : ${item.tx16Name} · ` : ""}{item.serialNumber || "N° de série non renseigné"}{item.compatibleAircraftIds?.length ? " · Compatible : " + item.compatibleAircraftIds.map((id) => snapshot.aircraft.find((a) => a.id === id)?.name ?? id).join(", ") : ""}{isReceiver ? ` · Bind : ${boundTransmitter?.inventoryCode ?? "non défini"}` : ""}</small><span className={`item-status ${item.status}`}>{status}{assignedTo ? " · " + assignedTo : ""}</span></div>{isTool && <div className="item-actions"><label>État <select value={item.status} disabled={busy} onChange={(e) => onToolStatus(item.id, e.target.value as "available" | "borrowed" | "repair")}><option value="available">Disponible</option><option value="borrowed">Prêté</option><option value="repair">En réparation</option></select></label></div>}{isReceiver && <div className="item-actions"><label>Bind <select value={item.boundTransmitterId ?? ""} disabled={busy} onChange={(e) => onBind(item.id, e.target.value || null)}><option value="">Aucun émetteur</option>{transmitters.map((tx) => <option key={tx.id} value={tx.id}>{tx.inventoryCode}</option>)}</select></label></div>}{item.status === "available" && !isTransmitter && !isSupply && !isTool && !isBattery && (snapshot.aircraft.length > 0 || snapshot.projects.length > 0) && <div className="item-actions"><select value={target} onChange={(e) => setTarget(e.target.value)}><option value="">Affecter à...</option>{snapshot.aircraft.length > 0 && <optgroup label="Installer sur un avion">{snapshot.aircraft.map((aircraft) => <option value={`aircraft:${aircraft.id}`} key={aircraft.id}>{aircraft.name}</option>)}</optgroup>}{snapshot.projects.length > 0 && <optgroup label="Réserver pour un projet">{snapshot.projects.map((project) => <option value={`project:${project.id}`} key={project.id}>{project.name}</option>)}</optgroup>}</select><button disabled={!canAssign || busy} onClick={() => { const [kind, id] = targetParts; if ((kind === "aircraft" || kind === "project") && id) onAssign(item.id, { kind, id }); }}>{target.startsWith("project:") ? "Réserver" : "Installer"}</button></div>}{(item.status === "installed" || item.status === "reserved") && <button className="subtle-button" disabled={busy} onClick={() => onRelease(item.id)}>Libérer</button>}<div className="item-actions"><button className="subtle-button" disabled={busy} onClick={() => onEditItem(item)}>Modifier</button><button className="danger-button" disabled={busy} onClick={() => onDeleteItem(item)}>Supprimer</button></div></div>;
}
function ReferenceModal({ reference, initialCategory, onClose, onSubmit, busy, error }: { reference?: ComponentReference; initialCategory?: ComponentCategory; onClose: () => void; onSubmit: (value: Omit<ComponentReference, "createdAt" | "archived">) => void; busy: boolean; error: string }) {
  const [name, setName] = useState(reference?.name ?? ""); const [brand, setBrand] = useState(reference?.brand ?? ""); const [model, setModel] = useState(reference?.model ?? ""); const [category, setCategory] = useState<ComponentCategory>(reference?.category ?? initialCategory ?? "motor"); const [trackingMode, setTrackingMode] = useState<TrackingMode>(reference?.trackingMode ?? "individual"); const [description, setDescription] = useState(reference?.description ?? ""); const [photoPath, setPhotoPath] = useState(reference?.photoPath ?? ""); const [radioType, setRadioType] = useState<"transmitter" | "receiver">(reference?.radioType ?? (reference?.category === "receiver" ? "receiver" : "transmitter")); const [receiverChannels, setReceiverChannels] = useState(String(reference?.receiverChannels ?? 8)); const [receiverProtocol, setReceiverProtocol] = useState(reference?.receiverProtocol ?? ""); const [transmitterChannels, setTransmitterChannels] = useState(String(reference?.transmitterChannels ?? 16)); const [transmitterProtocols, setTransmitterProtocols] = useState((reference?.transmitterProtocols ?? []).join(", ")); const [firmwareVersion, setFirmwareVersion] = useState(reference?.firmwareVersion ?? ""); const [motorizationKind, setMotorizationKind] = useState<"motor" | "propeller">(reference?.motorizationKind ?? "motor"); const [motorType, setMotorType] = useState<"electric" | "glow">(reference?.motorType ?? "electric"); const [motorVoltage, setMotorVoltage] = useState(reference?.motorVoltage ?? ""); const [motorDisplacement, setMotorDisplacement] = useState(reference?.motorDisplacement ?? "");
  const [propellerDiameter, setPropellerDiameter] = useState(reference?.propellerDiameter ?? "");
  const [propellerPitch, setPropellerPitch] = useState(reference?.propellerPitch ?? "");
  const [batteryConnector, setBatteryConnector] = useState(reference?.batteryConnector ?? "");
  const [batteryDischargeRateC, setBatteryDischargeRateC] = useState(reference?.batteryDischargeRateC === undefined ? "" : String(reference.batteryDischargeRateC));
  const [batteryDimensionsMm, setBatteryDimensionsMm] = useState(reference?.batteryDimensionsMm ?? "");
  const [batteryWeightG, setBatteryWeightG] = useState(reference?.batteryWeightG === undefined ? "" : String(reference.batteryWeightG));
  const [merchantUrl, setMerchantUrl] = useState(reference?.merchantUrl ?? '');
  function submit(event: FormEvent) { event.preventDefault(); const isRadio = category === "radio" || category === "receiver"; const subtype = category === "receiver" ? "receiver" : radioType; onSubmit({ id: reference?.id ?? crypto.randomUUID(), name, category: category === "receiver" ? "radio" : category, trackingMode: category === "supplies" ? "quantity" : category === "tool" || category === "servo" ? "individual" : isRadio && subtype === "receiver" ? "individual" : trackingMode, attributes: reference?.attributes ?? {}, ...(category === "motor" ? { motorizationKind, ...(motorizationKind === "motor" ? { motorType, ...(motorType === "electric" ? { motorVoltage: motorVoltage.trim() } : { motorDisplacement: motorDisplacement.trim() }) } : { propellerDiameter: propellerDiameter.trim(), propellerPitch: propellerPitch.trim() }) } : {}), ...(isRadio ? { radioType: subtype, ...(subtype === "receiver" ? { receiverChannels: Number(receiverChannels), receiverProtocol: receiverProtocol.trim() } : { transmitterChannels: Number(transmitterChannels), transmitterProtocols: transmitterProtocols.split(",").map((x) => x.trim()).filter(Boolean), ...(firmwareVersion.trim() ? { firmwareVersion: firmwareVersion.trim() } : {}) }) } : {}), ...(category === "battery" ? { ...(batteryConnector.trim() ? { batteryConnector: batteryConnector.trim() } : {}), ...(batteryDischargeRateC.trim() && Number.isFinite(Number(batteryDischargeRateC)) && Number(batteryDischargeRateC) > 0 ? { batteryDischargeRateC: Number(batteryDischargeRateC) } : {}), ...(batteryDimensionsMm.trim() ? { batteryDimensionsMm: batteryDimensionsMm.trim() } : {}), ...(batteryWeightG.trim() && Number.isFinite(Number(batteryWeightG)) && Number(batteryWeightG) > 0 ? { batteryWeightG: Number(batteryWeightG) } : {}) } : {}), ...(brand.trim() ? { brand: brand.trim() } : {}), ...(model.trim() ? { model: model.trim() } : {}), ...(description.trim() ? { description: description.trim() } : {}), ...(photoPath.trim() ? { photoPath: photoPath.trim() } : {}), ...(merchantUrl.trim() ? { merchantUrl: merchantUrl.trim() } : {}), ...(reference ? { archived: reference.archived, createdAt: reference.createdAt } : {}) }); }
  return <Modal title={reference ? "Modifier la référence catalogue" : "Nouvelle référence catalogue"} onClose={onClose} error={error}><form onSubmit={submit} className="form-grid"><label>Désignation *<input required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Dualsky ECO 3520C V2" /></label><div className="form-row"><label>Catégorie<select value={category} disabled={Boolean(reference) || Boolean(initialCategory)} onChange={(e) => { setCategory(e.target.value as ComponentCategory); if (e.target.value === "receiver") { setRadioType("receiver"); setTrackingMode("individual"); } else if (e.target.value === "supplies") { setTrackingMode("quantity"); } else if (["motor", "esc", "radio", "battery", "tool", "servo"].includes(e.target.value)) { setTrackingMode("individual"); } }}>{COMPONENT_CATEGORIES.filter((x) => x !== "supplies").map((x) => <option value={x} key={x}>{labels[x]}</option>)}</select></label><label>Mode de suivi<select value={trackingMode} disabled={Boolean(reference) || (category === "radio" && radioType === "receiver") || category === "receiver" || category === "supplies" || ["motor", "esc", "radio", "battery", "tool", "servo"].includes(category)} onChange={(e) => setTrackingMode(e.target.value as TrackingMode)}><option value="individual">Exemplaires individuels</option><option value="quantity">Quantité / lot</option></select></label></div>{category === "supplies" && <p className="field-hint">Les fournitures sont gérées par quantité en stock et ne peuvent pas être affectées à un avion ou à un projet.</p>}{category === "tool" && <p className="field-hint">Chaque outil est suivi individuellement avec les statuts Disponible, Prêté et En réparation.</p>}{category === "servo" && <p className="field-hint">Chaque servo est suivi individuellement et peut être affecté à un avion.</p>}{category === "motor" && <><div className="form-row"><label>Type de composant<select value={motorizationKind} onChange={(e) => setMotorizationKind(e.target.value as "motor" | "propeller")}><option value="motor">Moteur</option><option value="propeller">Hélice</option></select></label>{motorizationKind === "motor" && <label>Type de moteur<select value={motorType} onChange={(e) => setMotorType(e.target.value as "electric" | "glow")}><option value="electric">Électrique</option><option value="glow">Glow</option></select></label>}</div>{motorizationKind === "motor" ? motorType === "electric" ? <label>Tension<input required value={motorVoltage} onChange={(e) => setMotorVoltage(e.target.value)} placeholder="Ex. 3S, 4S, 3-4S" /></label> : <label>Cylindrée Glow<input required value={motorDisplacement} onChange={(e) => setMotorDisplacement(e.target.value)} placeholder="Ex. 46, 51" /></label> : <div className="form-row"><label>Diamètre (pouces)<input required value={propellerDiameter} onChange={(e) => setPropellerDiameter(e.target.value)} placeholder="Ex. 12" /></label><label>Pas (pouces)<input required value={propellerPitch} onChange={(e) => setPropellerPitch(e.target.value)} placeholder="Ex. 8" /></label></div>}</>}{category === "radio" && <div className="form-row"><label>Type de radio<select value={radioType} disabled={Boolean(reference)} onChange={(e) => { const next = e.target.value as "transmitter" | "receiver"; setRadioType(next); if (next === "receiver") setTrackingMode("individual"); }}>{[["transmitter", "Émetteur"], ["receiver", "Récepteur"]].map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label><div className="field-hint">{radioType === "transmitter" ? "Un émetteur n'est pas affecté à un avion." : "Un récepteur est suivi individuellement et peut être affecté à un avion."}</div></div>}<div className="form-row"><label>Marque<input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ex. Dualsky" /></label><label>Modèle / référence<input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Référence fabricant" /></label></div>{category === "battery" && <><div className="form-row"><label>Connecteur<input value={batteryConnector} onChange={(e) => setBatteryConnector(e.target.value)} placeholder="Ex. XT60, XT90, EC5" /></label><label>Taux de décharge (C)<input type="number" min="0.1" step="0.1" value={batteryDischargeRateC} onChange={(e) => setBatteryDischargeRateC(e.target.value)} placeholder="Ex. 60" /></label></div><div className="form-row"><label>Dimensions (mm)<input value={batteryDimensionsMm} onChange={(e) => setBatteryDimensionsMm(e.target.value)} placeholder="Ex. 145 × 45 × 35" /></label><label>Poids (g)<input type="number" min="0.1" step="0.1" value={batteryWeightG} onChange={(e) => setBatteryWeightG(e.target.value)} placeholder="Ex. 516" /></label></div><p className="field-hint">Ces caractéristiques sont facultatives et décrivent la référence de batterie.</p></>}{(category === "radio" || category === "receiver") && (category === "receiver" || radioType === "receiver") && <div className="form-row"><label>Nombre de voies *<input type="number" min="1" step="1" required value={receiverChannels} onChange={(e) => setReceiverChannels(e.target.value)} placeholder="Ex. 8" /></label><label>Protocole radio *<input required value={receiverProtocol} onChange={(e) => setReceiverProtocol(e.target.value)} placeholder="Ex. ExpressLRS, ACCESS, DSMX..." /></label></div>}{category === "radio" && radioType === "transmitter" && <><div className="form-row"><label>Nombre de voies *<input type="number" min="1" step="1" required value={transmitterChannels} onChange={(e) => setTransmitterChannels(e.target.value)} /></label><label>Protocoles radio *<input required value={transmitterProtocols} onChange={(e) => setTransmitterProtocols(e.target.value)} placeholder="Ex. ExpressLRS, ACCESS, DSMX..." /></label></div><label>Version logicielle / firmware<input value={firmwareVersion} onChange={(e) => setFirmwareVersion(e.target.value)} placeholder="Ex. EdgeTX 2.x" /></label></>}<label>Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Caractéristiques principales..." /></label><div className="form-row"><label>Photo locale (facultatif)<span className="photo-picker-row"><button type="button" className="secondary" disabled={busy} onClick={async () => { const chosen = await window.rcWorkshop.choosePhoto(); if (chosen) setPhotoPath(chosen); }}>Choisir une photo</button><span>{photoPath ? "Photo sélectionnée" : "Aucune photo"}</span></span></label><label>Site marchand (facultatif)<input type="url" value={merchantUrl} onChange={(e) => setMerchantUrl(e.target.value)} placeholder="https://boutique.example/..." /></label></div><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Annuler</button><button className="primary" disabled={busy || !name.trim()}>{reference ? "Enregistrer les modifications" : "Créer la référence"}</button></div></form></Modal>;
}
function StockGroupModal({ category, reference, initialQuantity, initialUnit, onClose, onSubmit, busy }: { category: "supplies"; reference?: ComponentReference | undefined; initialQuantity?: number | undefined; initialUnit?: string | undefined; onClose: () => void; onSubmit: (value: { name: string; quantity: number; unit: string }) => void; busy: boolean }) {
  const [name, setName] = useState(reference?.name ?? "");
  const [quantity, setQuantity] = useState(String(initialQuantity ?? 1));
  const [unit, setUnit] = useState(initialUnit ?? "pièce");
  function submit(event: FormEvent) { event.preventDefault(); onSubmit({ name, quantity: Number(quantity), unit }); }
  return <Modal title={reference ? "Modifier la quantité" : category === "supplies" ? "Ajouter une fourniture" : "Ajouter un outil / équipement"} onClose={onClose}><form className="form-grid" onSubmit={submit}>
    <label>Désignation *<input autoFocus required disabled={Boolean(reference)} value={name} onInput={(event) => setName(event.currentTarget.value)} placeholder={category === "supplies" ? "Tube carbone 4 mm - 65 cm" : "Nom de l’outil"} /></label>
    <div className="form-row"><label>Quantité en stock *<input type="number" min={reference ? "0" : "1"} step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label><label>Unité<input required value={unit} onInput={(event) => setUnit(event.currentTarget.value)} placeholder="pièce" /></label></div>
    <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Annuler</button><button className="primary" disabled={busy || !name.trim()}>{reference ? "Enregistrer" : "Ajouter au stock"}</button></div>
  </form></Modal>;
}

function StockItemModal({ item, snapshot, onClose, onSubmit, busy, error }: { item: StockItem; snapshot: InventorySnapshot; onClose: () => void; onSubmit: (value: StockItem) => void; busy: boolean; error: string }) {
  const reference = snapshot.references.find((entry) => entry.id === item.referenceId);
  const isReceiver = reference?.category === "receiver" || (reference?.category === "radio" && reference.radioType === "receiver"); const isBattery = reference?.category === "battery";
  const [serialNumber, setSerialNumber] = useState(item.serialNumber ?? "");
  const [tx16Name, setTx16Name] = useState(item.tx16Name ?? "");
  const [locationId, setLocationId] = useState(item.locationId ?? "");
  const [notes, setNotes] = useState(item.notes ?? ""); const [compatibleAircraftIds, setCompatibleAircraftIds] = useState<string[]>(item.compatibleAircraftIds ?? []);
  function submit(event: FormEvent) {
    event.preventDefault();
    const updated = { ...item };
    if (serialNumber.trim()) updated.serialNumber = serialNumber.trim(); else delete updated.serialNumber;
    if (isReceiver) { if (tx16Name.trim()) updated.tx16Name = tx16Name.trim(); else delete updated.tx16Name; } if (isBattery) { if (compatibleAircraftIds.length) updated.compatibleAircraftIds = compatibleAircraftIds; else delete updated.compatibleAircraftIds; }
    if (locationId.trim()) updated.locationId = locationId.trim(); else delete updated.locationId;
    if (notes.trim()) updated.notes = notes.trim(); else delete updated.notes;
    onSubmit(updated);
  }
  return <Modal title={"Modifier l’exemplaire " + item.inventoryCode} onClose={onClose} error={error}><form className="form-grid" onSubmit={submit}>
    <p className="field-hint">{reference?.name ?? item.referenceId} · {item.status === "available" ? "Disponible" : item.status === "installed" ? "Installé" : item.status === "reserved" ? "Réservé" : item.status}</p>
    {isReceiver && <label>Nom / identifiant dans la TX16<input value={tx16Name} onInput={(event) => setTx16Name(event.currentTarget.value)} autoFocus placeholder={item.inventoryCode} /></label>}
    {isBattery && <fieldset><legend>Avions compatibles</legend><p className="field-hint">Une compatibilité n’affecte pas la batterie à l’avion et ne la réserve pas.</p>{snapshot.aircraft.map((aircraft) => <label key={aircraft.id} className="checkbox-row"><input type="checkbox" checked={compatibleAircraftIds.includes(aircraft.id)} onChange={(event) => setCompatibleAircraftIds((current) => event.target.checked ? [...current, aircraft.id] : current.filter((id) => id !== aircraft.id))} />{aircraft.name}</label>)}{snapshot.aircraft.length === 0 && <p className="muted">Ajoute d’abord un avion à ta flotte.</p>}</fieldset>}<label>Numéro de série<input value={serialNumber} onInput={(event) => setSerialNumber(event.currentTarget.value)} autoFocus={!isReceiver} /></label>
    <label>Emplacement<input value={locationId} onInput={(event) => setLocationId(event.currentTarget.value)} /></label>
    <label>Notes<textarea value={notes} onInput={(event) => setNotes(event.currentTarget.value)} /></label>
    <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Annuler</button><button className="primary" disabled={busy}>Enregistrer</button></div>
  </form></Modal>;
}

function StockModal({ reference, snapshot, onClose, onSubmit, busy, error }: { reference: ComponentReference; snapshot: InventorySnapshot; onClose: () => void; onSubmit: (value: Omit<StockItem, "createdAt"> | StockLot) => void; busy: boolean; error: string }) {
  const inventoryCode = ""; const isReceiver = reference.category === "receiver" || (reference.category === "radio" && reference.radioType === "receiver"); const [tx16Name, setTx16Name] = useState(""); const [serialNumber, setSerialNumber] = useState(""); const [quantity, setQuantity] = useState("1"); const [unit, setUnit] = useState("pièce"); const [locationId, setLocationId] = useState(""); const [compatibleAircraftIds, setCompatibleAircraftIds] = useState<string[]>([]);
  function submit(event: FormEvent) { event.preventDefault(); if (reference.trackingMode === "individual") onSubmit({ id: crypto.randomUUID(), referenceId: reference.id, inventoryCode, status: "available", ...(serialNumber ? { serialNumber } : {}), ...(locationId ? { locationId } : {}), ...(isReceiver ? { tx16Name } : {}), ...(reference.category === "battery" && compatibleAircraftIds.length ? { compatibleAircraftIds } : {}) }); else onSubmit({ id: crypto.randomUUID(), referenceId: reference.id, quantity: Number(quantity), unit, ...(locationId ? { locationId } : {}) }); }
  return <Modal title={reference.trackingMode === "individual" ? "Ajouter un exemplaire" : "Ajouter une quantité"} onClose={onClose} error={error}><form onSubmit={submit} className="form-grid">{reference.trackingMode === "individual" ? <><p className="field-hint">Identifiant généré automatiquement selon la catégorie (ex. RX-001, MOT-001).</p>{isReceiver && <label>Nom / identifiant dans la TX16<input autoFocus value={tx16Name} onInput={(e) => setTx16Name(e.currentTarget.value)} placeholder="RX-007" /></label>}{reference.category === "battery" && <fieldset><legend>Avions compatibles</legend><p className="field-hint">Compatibilité indicative : la batterie reste en stock et n’est pas affectée à un avion.</p>{snapshot.aircraft.map((aircraft) => <label key={aircraft.id} className="checkbox-row"><input type="checkbox" checked={compatibleAircraftIds.includes(aircraft.id)} onChange={(event) => setCompatibleAircraftIds((current) => event.target.checked ? [...current, aircraft.id] : current.filter((id) => id !== aircraft.id))} />{aircraft.name}</label>)}</fieldset>}<label>Numéro de série<input autoFocus={!isReceiver} value={serialNumber} onInput={(e) => setSerialNumber(e.currentTarget.value)} /></label></> : <div className="form-row"><label>Quantité *<input type="number" min="1" step="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label><label>Unité<input required value={unit} onChange={(e) => setUnit(e.target.value)} /></label></div>}<label>Emplacement (facultatif)<input value={locationId} onInput={(e) => setLocationId(e.currentTarget.value)} placeholder="Ex. boîte batteries / tiroir 3" /></label><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Annuler</button><button className="primary" disabled={busy}>Enregistrer</button></div></form></Modal>;
}
function AircraftPreviewModal({ aircraft, snapshot, busy, error, initialClosureTarget = null, onClose, onEdit, onOpenLogbook, onCloseAircraft }: { aircraft: Aircraft; snapshot: InventorySnapshot; busy: boolean; error: string; initialClosureTarget?: "sold" | "retired" | null; onClose: () => void; onEdit: () => void; onOpenLogbook: () => void; onCloseAircraft: (lifecycleState: "sold" | "retired", dispositions: AircraftEquipmentDisposition[]) => void }) {
  const [closureTarget, setClosureTarget] = useState<"sold" | "retired" | null>(initialClosureTarget);
  const [destinations, setDestinations] = useState<Record<string, import("@rc-workshop/core").AircraftClosureDestination | "">>({});
  const [review, setReview] = useState(false);
  const installed = snapshot.items.filter((item) => item.status === "installed" && item.aircraftId === aircraft.id);
  const getReference = (item: StockItem) => snapshot.references.find((entry) => entry.id === item.referenceId);
  const isReceiver = (item: StockItem) => { const ref = getReference(item); return ref?.category === "radio" && ref.radioType === "receiver"; };
  const isMotor = (item: StockItem) => { const ref = getReference(item); return ref?.category === "motor" && ref.motorizationKind === "motor"; };
  const isPropeller = (item: StockItem) => { const ref = getReference(item); return (ref?.category === "motor" && ref.motorizationKind === "propeller") || ref?.category === "propeller"; };
  const receiver = installed.find(isReceiver);
  const transmitter = receiver?.boundTransmitterId ? snapshot.items.find((item) => item.id === receiver.boundTransmitterId) : undefined;
  const motors = installed.filter(isMotor), propellers = installed.filter(isPropeller);
  const electricMotorInstalled = motors.some((item) => getReference(item)?.motorType === "electric");
  const speedControllers = electricMotorInstalled ? installed.filter((item) => getReference(item)?.category === "esc") : [];
  const displayedIds = new Set([receiver, ...motors, ...propellers, ...speedControllers].filter((item): item is StockItem => Boolean(item)).map((item) => item.id));
  const formatItem = (item: StockItem) => { const ref = getReference(item); return (ref?.name ?? item.referenceId) + " · " + item.inventoryCode; };
  const formatPropeller = (item: StockItem) => { const ref = getReference(item); return (ref?.brand?.trim() || ref?.name || item.referenceId) + " - " + item.inventoryCode + " - " + (ref?.propellerDiameter ?? "?") + "x" + (ref?.propellerPitch ?? "?"); };
  const destinationLabels: Record<import("@rc-workshop/core").AircraftClosureDestination, string> = { inventory: "Récupéré dans l'inventaire", "sold-with-aircraft": "Vendu avec l'avion", "sold-separately": "Vendu séparément", scrapped: "Mis au rebut" };
  const allDestinationsSelected = installed.every((item) => Boolean(destinations[item.id]));
  const selectedSummary = (Object.keys(destinationLabels) as import("@rc-workshop/core").AircraftClosureDestination[]).map((key) => ({ key, label: destinationLabels[key], count: installed.filter((item) => destinations[item.id] === key).length })).filter((entry) => entry.count > 0);
  function startClosure(target: "sold" | "retired") { setClosureTarget(target); setReview(false); setDestinations(Object.fromEntries(installed.map((item) => [item.id, ""]))); }
  function cancelClosure() {
    if (initialClosureTarget) { onClose(); return; }
    setClosureTarget(null); setReview(false); setDestinations({});
  }
  const closureTitle = closureTarget === "sold" ? "Vendre l'avion" : "Retirer définitivement l'avion";
  return <Modal title={closureTarget ? (review ? "Récapitulatif de clôture" : closureTitle) : "Aperçu de la fiche avion"} onClose={closureTarget ? cancelClosure : onClose} error={error}>
    {closureTarget ? <div className="form-grid">
      {!review ? <>
        <p>{closureTarget === "sold" ? "La vente clôture définitivement la fiche de cet aéronef." : "Le retrait sort définitivement cet aéronef de ta flotte."} Indique le devenir de chaque équipement encore affecté. Aucun exemplaire ne sera supprimé.</p>
        {installed.length ? installed.map((item) => <label className="equipment-disposition-row" key={item.id}><span><strong>{formatItem(item)}</strong><small>{item.serialNumber ? "N° série : " + item.serialNumber : "Identité physique conservée"}</small></span><select required value={destinations[item.id] ?? ""} onChange={(event) => setDestinations((current) => ({ ...current, [item.id]: event.target.value as import("@rc-workshop/core").AircraftClosureDestination | "" }))}><option value="">Choisir une destination…</option><option value="inventory">Récupéré dans l'inventaire</option>{closureTarget === "sold" && <option value="sold-with-aircraft">Vendu avec l'avion</option>}<option value="sold-separately">Vendu séparément</option><option value="scrapped">Mis au rebut</option></select></label>) : <p className="muted">Aucun équipement n'est actuellement affecté à cet aéronef.</p>}
        <p className="field-hint">Les batteries ne figurent pas dans cette liste : elles sont gérées par compatibilité, pas par affectation.</p>
        <div className="modal-actions"><button type="button" className="secondary" disabled={busy} onClick={cancelClosure}>Annuler</button><button type="button" className="primary" disabled={busy || !allDestinationsSelected} onClick={() => setReview(true)}>Vérifier le récapitulatif</button></div>
      </> : <>
        <p>Vérifie les décisions avant de confirmer la clôture définitive de <strong>{aircraft.name}</strong>.</p>
        <div className="attribute-row"><span>Opération</span><strong>{closureTarget === "sold" ? "Vente" : "Retrait définitif"}</strong></div>
        {selectedSummary.map((entry) => <div className="attribute-row" key={entry.key}><span>{entry.label}</span><strong>{entry.count} équipement(s)</strong></div>)}
        <p className="field-hint">L'opération, les changements de stock, les mouvements et l'événement du journal seront enregistrés dans une transaction unique. En cas d'erreur, rien ne sera appliqué.</p>
        <div className="modal-actions"><button type="button" className="secondary" disabled={busy} onClick={() => setReview(false)}>Retour aux destinations</button><button type="button" className="danger-button" disabled={busy} onClick={() => onCloseAircraft(closureTarget, installed.map((item) => ({ itemId: item.id, destination: destinations[item.id] as import("@rc-workshop/core").AircraftClosureDestination })))}>Confirmer définitivement</button></div>
      </>}
    </div> : <div className="form-grid">
      {aircraft.photoPath && <img className="aircraft-preview-photo" src={aircraft.photoPath} alt={aircraft.name} />}
      <h3>{aircraft.name}</h3><p>{[aircraft.manufacturer, aircraft.model].filter(Boolean).join(" · ") || "Constructeur / modèle non renseigné"}</p>
      <div className="attribute-row"><span>Type</span><strong>{aircraftTypeLabels[aircraft.aircraftType ?? "other"]}</strong></div><div className="attribute-row"><span>État opérationnel</span><strong>{operationalStateLabels[aircraft.operationalState ?? "flight-ready"]}</strong></div><div className="attribute-row"><span>Cycle de vie</span><strong>{lifecycleStateLabels[aircraft.lifecycleState ?? "active"]}</strong></div>
      {aircraft.uafRegistration && <p><strong>Immatriculation UAF :</strong> {aircraft.uafRegistration}</p>}{aircraft.notes && <p><strong>Notes :</strong> {aircraft.notes}</p>}
      <h3>Configuration</h3><div className="attribute-row"><span>Récepteur (RX)</span><strong>{receiver ? formatItem(receiver) : "Aucun récepteur affecté"}</strong></div>{receiver && <div className="attribute-row"><span>Bind radio</span><strong>{transmitter ? formatItem(transmitter) : "Non défini"}</strong></div>}
      <div className="attribute-row"><span>Moteur</span><strong>{motors.length ? motors.map(formatItem).join(" · ") : "Aucun moteur affecté"}</strong></div><div className="attribute-row"><span>Hélice</span><strong>{propellers.length ? propellers.map(formatPropeller).join(" · ") : "Aucune hélice affectée"}</strong></div>
      {electricMotorInstalled && <div className="attribute-row"><span>ESC</span><strong>{speedControllers.length ? speedControllers.map(formatItem).join(" · ") : "Aucun ESC affecté"}</strong></div>}
      {installed.some((item) => !displayedIds.has(item.id)) && <><h3>Autres équipements installés</h3>{installed.filter((item) => !displayedIds.has(item.id)).map((item) => <div className="item-row" key={item.id}><div><strong>{formatItem(item)}</strong></div></div>)}</>}
      {installed.length === 0 && <p className="muted">Aucun équipement installé.</p>}
      <div className="aircraft-preview-actions"><button type="button" className="secondary" disabled={busy} onClick={onEdit}>Modifier la fiche</button><button type="button" className="secondary" disabled={busy} onClick={onOpenLogbook}>Journal de bord{snapshot.logbookEvents.filter((event) => event.aircraftId === aircraft.id).length ? ` (${snapshot.logbookEvents.filter((event) => event.aircraftId === aircraft.id).length})` : ""}</button></div>
      {aircraft.lifecycleState === "active" && <section className="aircraft-lifecycle-management"><h3>Gestion du cycle de vie</h3><p>La vente et le retrait définitif clôturent la fiche et demandent une décision pour chaque équipement affecté.</p><div className="aircraft-preview-actions"><button type="button" className="secondary" disabled={busy} onClick={() => startClosure("sold")}>Vendre l'avion…</button><button type="button" className="danger-button" disabled={busy} onClick={() => startClosure("retired")}>Retirer définitivement…</button></div></section>}
      <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Fermer</button></div>
    </div>}
  </Modal>;
}

function AircraftLogbook({ aircraftId, events, busy, onSave, onClose, registerCloseHandler }: { aircraftId: string; events: AircraftLogbookEvent[]; busy: boolean; onSave: (event: AircraftLogbookEvent) => void; onClose: () => void; registerCloseHandler: (handler: () => void) => void }) {
  const [editing, setEditing] = useState<AircraftLogbookEvent | null>(null);
  const [type, setType] = useState<AircraftLogbookEventType>("flight");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [comment, setComment] = useState("");
  const [flightCount, setFlightCount] = useState("");
  const [savedDraft, setSavedDraft] = useState({ type: "flight" as AircraftLogbookEventType, date: new Date().toISOString().slice(0, 10), comment: "", flightCount: "" });
  function startNew() {
    const nextDate = new Date().toISOString().slice(0, 10);
    setEditing(null); setType("flight"); setDate(nextDate);
    setComment(""); setFlightCount(""); setSavedDraft({ type: "flight", date: nextDate, comment: "", flightCount: "" });
  }
  function startEdit(event: AircraftLogbookEvent) {
    setEditing(event); setType(event.type); setDate(event.date);
    const nextDraft = { type: event.type, date: event.date, comment: event.comment ?? "", flightCount: event.flightCount === undefined ? "" : String(event.flightCount) };
    setComment(nextDraft.comment); setFlightCount(nextDraft.flightCount); setSavedDraft(nextDraft);
  }
  const hasUnsavedChanges = type !== savedDraft.type || date !== savedDraft.date || comment !== savedDraft.comment || flightCount !== savedDraft.flightCount;
  function requestClose() {
    if (hasUnsavedChanges && !window.confirm("Les modifications de l’événement ne sont pas enregistrées. Fermer le journal et les abandonner ?")) return;
    onClose();
  }
  useEffect(() => { registerCloseHandler(requestClose); }, [hasUnsavedChanges, savedDraft, type, date, comment, flightCount]);
  function submit(event: FormEvent) {
    event.preventDefault();
    const count = flightCount.trim() === "" ? undefined : Number(flightCount);
    onSave({ id: editing?.id ?? crypto.randomUUID(), aircraftId, type, date, ...(comment.trim() ? { comment: comment.trim() } : {}), ...(count === undefined ? {} : { flightCount: count }) });
    startNew();
  }
  return <section className="aircraft-logbook">
    <div className="logbook-heading"><h3>Journal de bord</h3><span>{events.length} événement(s)</span></div>
    <p className="field-hint">Mémoire personnelle facultative — indépendante des mouvements de stock et des états de l’aéronef.</p>
    {events.length ? <ol className="logbook-list">{events.map((event) => <li key={event.id}>
      <div className="logbook-event"><time>{new Date(event.date + "T12:00:00").toLocaleDateString("fr-FR")}</time><strong>{logbookEventLabels[event.type]}</strong>
        {event.flightCount !== undefined && <span>{event.flightCount} vol(s)</span>}
        {event.comment && <p>{event.comment}</p>}
      </div>
      <button type="button" className="text-button" disabled={busy} onClick={() => startEdit(event)}>Modifier</button>
    </li>)}</ol> : <p className="muted">Aucun événement enregistré. L’avion reste parfaitement utilisable sans journal.</p>}
    <form className="logbook-form" onSubmit={submit}>
      <strong>{editing ? "Modifier l’événement" : "Ajouter un événement"}</strong>
      <div className="form-row"><label>Type<select value={type} onChange={(e) => setType(e.target.value as AircraftLogbookEventType)}>{Object.entries(logbookEventLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Date<input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></label></div>
      <div className="form-row"><label>Nombre de vols (facultatif)<input type="number" min="0" step="1" value={flightCount} onChange={(e) => setFlightCount(e.target.value)} placeholder="Ex. 3" /></label><label>Commentaire (facultatif)<input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Conditions, travaux, remarques…" /></label></div>
      <div className="modal-actions">{editing && <button type="button" className="secondary" disabled={busy} onClick={startNew}>Annuler la modification</button>}<button className="primary" disabled={busy || !date || (flightCount.trim() !== "" && (!Number.isInteger(Number(flightCount)) || Number(flightCount) < 0))}>{editing ? "Enregistrer" : "Ajouter au journal"}</button></div>
    </form>
    <div className="modal-actions logbook-close-actions"><button type="button" className="secondary" disabled={busy} onClick={requestClose}>Fermer</button></div>
  </section>;
}

function AircraftLogbookModal({ aircraft, events, busy, error, onClose, onSave }: { aircraft: Aircraft; events: AircraftLogbookEvent[]; busy: boolean; error: string; onClose: () => void; onSave: (event: AircraftLogbookEvent) => void }) {
  const closeHandler = useRef(onClose);
  useEffect(() => {
    const firstField = document.querySelector<HTMLInputElement>(".logbook-form input");
    firstField?.focus();
  }, []);
  return <Modal title={`Journal de bord — ${aircraft.name}`} onClose={() => closeHandler.current()} error={error}>
    <AircraftLogbook aircraftId={aircraft.id} events={events} busy={busy} onSave={onSave} onClose={onClose} registerCloseHandler={(handler) => { closeHandler.current = handler; }} />
  </Modal>;
}

function AircraftModal({ aircraft, favoriteLimitReached = false, onClose, onSubmit, busy, error }: { aircraft?: Aircraft; favoriteLimitReached?: boolean; onClose: () => void; onSubmit: (value: Omit<Aircraft, "id">) => void; busy: boolean; error: string }) {
  const [name,setName]=useState(aircraft?.name ?? ""), [manufacturer,setManufacturer]=useState(aircraft?.manufacturer ?? ""), [model,setModel]=useState(aircraft?.model ?? "");
  const [uafRegistration,setUafRegistration]=useState(aircraft?.uafRegistration ?? ""), [notes,setNotes]=useState(aircraft?.notes ?? ""), [photoPath,setPhotoPath]=useState(aircraft?.photoPath ?? "");
  const [aircraftType,setAircraftType]=useState<AircraftType>(aircraft ? aircraft.aircraftType ?? "other" : "airplane"), [operationalState,setOperationalState]=useState<AircraftOperationalState>(aircraft?.operationalState ?? "flight-ready");
  const [favorite,setFavorite]=useState(aircraft?.favorite ?? false);
  const value=():Omit<Aircraft,"id">=>({name:name.trim(),aircraftType,operationalState,lifecycleState:aircraft?.lifecycleState ?? "active",favorite,...(manufacturer.trim()?{manufacturer:manufacturer.trim()}:{}),...(model.trim()?{model:model.trim()}:{}),...(uafRegistration.trim()?{uafRegistration:uafRegistration.trim()}:{}),...(photoPath.trim()?{photoPath:photoPath.trim()}:{}),...(notes.trim()?{notes:notes.trim()}:{})});
  return <Modal title={aircraft ? "Modifier la fiche avion" : "Nouvel avion"} onClose={onClose} error={error}><form className="form-grid" onSubmit={(event)=>{event.preventDefault();onSubmit(value());}}>
    <label>Nom de l’avion *<input required autoFocus value={name} onChange={(event)=>setName(event.target.value)} /></label>
    <div className="form-row"><label>Constructeur<input value={manufacturer} onChange={(event)=>setManufacturer(event.target.value)} /></label><label>Modèle<input value={model} onChange={(event)=>setModel(event.target.value)} /></label></div>
    <div className="form-row"><label>Type d’aéronef<select value={aircraftType} onChange={(event)=>setAircraftType(event.target.value as AircraftType)}>{Object.entries(aircraftTypeLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>État opérationnel<select value={operationalState} onChange={(event)=>setOperationalState(event.target.value as AircraftOperationalState)}>{Object.entries(operationalStateLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div>
    <div className="form-row"><div className="attribute-row"><span>Cycle de vie</span><strong>{lifecycleStateLabels[aircraft?.lifecycleState ?? "active"]}</strong></div><button type="button" className={favorite ? "favorite-toggle active" : "favorite-toggle"} title={favorite ? "Retirer des favoris" : "Ajouter aux favoris (4 maximum)"} aria-label={favorite ? "Retirer cet avion des favoris" : "Ajouter cet avion aux favoris (4 maximum)"} aria-pressed={favorite} disabled={busy || (!favorite && favoriteLimitReached)} onClick={() => setFavorite(!favorite)}>{favorite ? "★" : "☆"}</button></div>
    {aircraft && <p className="field-hint">La vente et le retrait définitif sont des opérations dédiées, accessibles depuis l’aperçu de la fiche avion.</p>}
    <label>Immatriculation UAF (facultatif)<input value={uafRegistration} onChange={(event)=>setUafRegistration(event.target.value)} placeholder="Ex. F-XXXX" /></label><label>Photo avion (facultatif)<span className="photo-picker-row"><button type="button" className="secondary" disabled={busy} onClick={async () => { const chosen = await window.rcWorkshop.choosePhoto(); if (chosen) setPhotoPath(chosen); }}>Choisir une photo</button><span>{photoPath ? "Photo sélectionnée" : "Aucune photo"}</span></span></label><label>Notes<textarea value={notes} onChange={(event)=>setNotes(event.target.value)} /></label>
    <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Annuler</button><button className="primary" disabled={busy||!name.trim()}>{aircraft ? "Enregistrer les modifications" : "Ajouter l’avion"}</button></div>
  </form></Modal>;
}

function AddProject({ onAdd, busy }: { onAdd: (name: string) => void; busy: boolean }) { const [name,setName]=useState(""); return <form className="inline-add" onSubmit={(e)=>{e.preventDefault();if(name.trim()){onAdd(name.trim());setName("");}}}><input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Nom du nouveau projet..." /><button className="primary" disabled={busy || !name.trim()}>＋ Ajouter un projet</button></form>; }
function Modal({ title, onClose, children, error }: { title: string; onClose: () => void; children: React.ReactNode; error?: string }) { return <div className="modal-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)onClose();}}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><h2>{title}</h2><button type="button" onClick={onClose}>×</button></div>{error && <div className="error-banner modal-error" role="alert">{error}</div>}{children}</div></div>; }
function ResetInventoryModal({ inventoryName, busy, error, onClose, onConfirm }: {
  inventoryName: string; busy: boolean; error: string; onClose: () => void; onConfirm: () => void;
}) {
  const [confirmation, setConfirmation] = useState("");
  return <Modal title="Confirmer la réinitialisation" onClose={onClose} error={error}>
    <div className="form-grid reset-confirmation">
      <p>La base <strong>{inventoryName}</strong> sera vidée de toutes ses références, de son stock, de ses avions, de ses projets et de son historique. Une sauvegarde SQLite sera créée automatiquement avant l’opération.</p>
      <label>Pour confirmer, saisis <strong>REINITIALISER</strong><input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
      <div className="modal-actions"><button type="button" className="secondary" disabled={busy} onClick={onClose}>Annuler</button><button type="button" className="danger-button" disabled={busy || confirmation !== "REINITIALISER"} onClick={onConfirm}>Confirmer la remise à zéro</button></div>
    </div>
  </Modal>;
}
function InventoryManagerModal({ inventoryList, busy, error, onClose, onOpen, onCreate, onImport, onDelete }: {
  inventoryList: InventoryList | null; busy: boolean; error: string; onClose: () => void;
  onOpen: (id: string) => void; onCreate: (name: string) => void; onImport: () => void; onDelete: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const last = inventoryList?.items.find((entry) => entry.id === inventoryList.lastUsedId);
  return <Modal title="Gérer les bases d’inventaire" onClose={onClose} error={error}>
    <div className="inventory-manager">
      {last && <button className="last-inventory" disabled={busy} onClick={() => onOpen(last.id)}><span>↻</span><div><strong>Reprendre la dernière base</strong><small>{last.name}</small></div><b>→</b></button>}
      <div className="inventory-manager-list">{inventoryList?.items.map((entry) => <div className="inventory-manager-row" key={entry.id}><div><strong>{entry.name}</strong><small>{entry.primary ? "Inventaire principal" : entry.active ? "Base ouverte" : entry.lastUsed ? "Dernière utilisée" : "Base locale"}</small></div><div className="inventory-manager-actions"><button className={entry.active ? "secondary" : "subtle-button"} disabled={busy || entry.active} onClick={() => onOpen(entry.id)}>{entry.active ? "Ouverte" : "Ouvrir"}</button>{!entry.primary && !entry.active && <button className="danger-button" disabled={busy} onClick={() => onDelete(entry.id)}>Supprimer</button>}</div></div>)}</div>
      <form className="inventory-create" onSubmit={(event) => { event.preventDefault(); if (name.trim()) onCreate(name.trim()); }}><label>Créer une base vide<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex. Atelier personnel" /></label><button className="primary" disabled={busy || !name.trim()}>＋ Créer</button></form>
      <button className="secondary import-inventory" disabled={busy} onClick={onImport}>Ouvrir / importer un fichier SQLite…</button>
    </div>
  </Modal>;
}
export default App;
