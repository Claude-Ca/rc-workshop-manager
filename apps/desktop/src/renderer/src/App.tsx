import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  COMPONENT_CATEGORIES,
  type Aircraft,
  type ComponentCategory,
  type ComponentReference,
  type InventorySnapshot,
  type StockItem,
  type StockLot,
  type TrackingMode,
} from "@rc-workshop/core";

type Section = "dashboard" | "inventory" | "aircraft" | "projects" | "movements";
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
const emptySnapshot: InventorySnapshot = { references: [], items: [], lots: [], aircraft: [], projects: [], movements: [] };

function App() {
  const [snapshot, setSnapshot] = useState<InventorySnapshot>(emptySnapshot);
  const [section, setSection] = useState<Section>("dashboard");
  const [category, setCategory] = useState<ComponentCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewReference, setShowNewReference] = useState(false);
  const [stockGroupCategory, setStockGroupCategory] = useState<"supplies" | "tool" | null>(null);
  const [editingStockGroup, setEditingStockGroup] = useState<ComponentReference | null>(null);
  const [showAddStock, setShowAddStock] = useState(false);
  const [showEditReference, setShowEditReference] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);
  const [previewAircraft, setPreviewAircraft] = useState<Aircraft | null>(null);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const actionLock = useRef(false);

  const refresh = async () => {
    if (!window.rcWorkshop || typeof window.rcWorkshop.getSnapshot !== "function") {
      throw new Error("Le pont Electron est indisponible. Vérifie le chargement du script preload puis relance l'application.");
    }
    setSnapshot(await window.rcWorkshop.getSnapshot());
  };
  useEffect(() => { void refresh().catch((e: unknown) => setError(String(e))); }, []);

  const selected = snapshot.references.find((reference) => reference.id === selectedId) ?? null;
  const visibleReferences = useMemo(() => snapshot.references.filter((reference) =>
    (showArchived || !reference.archived) &&
    (category === "all" || reference.category === category) &&
    `${reference.name} ${reference.brand ?? ""} ${reference.model ?? ""} ${reference.category}`.toLowerCase().includes(search.toLowerCase())
  ), [snapshot.references, category, search, showArchived]);

  const availableItems = snapshot.items.filter((item) => item.status === "available").length;
  const installedItems = snapshot.items.filter((item) => item.status === "installed").length;
  const reservedItems = snapshot.items.filter((item) => item.status === "reserved").length;
  const totalQuantity = snapshot.lots.reduce((sum, lot) => sum + lot.quantity, 0);

  async function runAction(action: () => Promise<InventorySnapshot>) {
    if (actionLock.current) return;
    actionLock.current = true; setBusy(true); setError("");
    try { setSnapshot(await action()); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { actionLock.current = false; setBusy(false); }
  }

  async function handleSaveStockGroup(input: { name: string; quantity: number; unit: string; category: "supplies" | "tool"; referenceId?: string }) {
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
        </nav>
        <div className="sidebar-bottom"><span className="status-dot" /> Base locale SQLite <small>Stockée sur ce PC</small></div>
      </aside>
      <main className="main">
        <header className="topbar"><div><span className="eyebrow">RC WORKSHOP MANAGER</span><h1>{section === "dashboard" ? "Vue d'ensemble" : section === "inventory" ? "Inventaire" : section === "aircraft" ? "Ma flotte" : section === "projects" ? "Mes projets" : "Historique des mouvements"}</h1></div><div className="top-actions"><span className="local-chip">● Hors ligne · Données locales</span><button className="primary" disabled={busy} onClick={() => { if (busy) return; setError(""); if (section === "inventory" && (category === "supplies" || category === "tool")) setStockGroupCategory(category); else setShowNewReference(true); }}>{section === "inventory" && (category === "supplies" || category === "tool") ? (category === "supplies" ? "＋ Ajouter une fourniture" : "＋ Ajouter un outil / équipement") : "＋ Nouveau composant"}</button></div></header>
        {error && <div className="error-banner">{error}<button onClick={() => setError("")}>×</button></div>}
        {section === "dashboard" && <section className="content">
          <div className="welcome"><div><span className="eyebrow">TON ATELIER, EN UN COUP D'ŒIL</span><h2>Bienvenue dans ton atelier RC.</h2><p>Retrouve tes composants, leur disponibilité et leur affectation.</p></div><div className="welcome-icon">🛩️</div></div>
          <div className="stats"><Stat label="Références catalogue" value={snapshot.references.length} note="Types de composants" icon="▤" /><Stat label="Exemplaires disponibles" value={availableItems + totalQuantity} note="Prêts à être utilisés" icon="✓" /><Stat label="Installés sur un avion" value={installedItems} note="Équipements affectés" icon="✈" /><Stat label="Réservés" value={reservedItems} note="Pour tes projets" icon="◷" /></div>
          <div className="section-heading"><div><span className="eyebrow">PAR FAMILLE</span><h2>Explorer le stock</h2></div><button className="text-button" onClick={() => { setSection("inventory"); setCategory("all"); }}>Tout l'inventaire →</button></div>
          <div className="category-grid">{COMPONENT_CATEGORIES.map((value) => { const count = snapshot.references.filter((ref) => ref.category === value && !ref.archived).length; return <button className="category-card" key={value} onClick={() => openCategory(value)}><span className="category-icon">{icons[value]}</span><strong>{labels[value]}</strong><small>{count} référence{count > 1 ? "s" : ""}</small><span className="card-arrow">↗</span></button>; })}</div>
          <div className="section-heading"><div><span className="eyebrow">DERNIÈRES ENTRÉES</span><h2>Ajouts récents</h2></div><button className="text-button" onClick={() => setSection("inventory")}>Voir le catalogue →</button></div>
          <div className="recent-list">{snapshot.references.slice(-5).reverse().map((ref) => <button className="recent-row" key={ref.id} onClick={() => { setSelectedId(ref.id); setSection("inventory"); }}><span className="category-icon small">{icons[ref.category]}</span><span className="recent-name"><strong>{ref.name}</strong><small>{labels[ref.category]}{ref.brand ? ` · ${ref.brand}` : ""}</small></span><span className="row-arrow">→</span></button>)}{snapshot.references.length === 0 && <EmptyState title="Ton inventaire est encore vide" text="Ajoute ton premier composant pour commencer à organiser ton atelier." />}</div>
        </section>}
        {section === "inventory" && <section className="content">
          <div className="toolbar">
            <div className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={(category === "supplies" || category === "tool") ? "Rechercher dans le stock..." : "Rechercher un composant, une marque..."} /></div>
            <select value={category} onChange={(e) => { setCategory(e.target.value as ComponentCategory | "all"); setSelectedId(null); }}><option value="all">Toutes les catégories</option>{COMPONENT_CATEGORIES.map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select>
            {category !== "supplies" && category !== "tool" && <label className="archived-toggle"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Afficher les références archivées</label>}
            <span className="result-count">{visibleReferences.length} {category === "supplies" ? "fourniture(s)" : category === "tool" ? "outil(s) / équipement(s)" : "référence(s)"}</span>
          </div>
          {(category === "supplies" || category === "tool") ? <div className="supply-list">{visibleReferences.map((ref) => { const lots = snapshot.lots.filter((lot) => lot.referenceId === ref.id); const quantity = lots.reduce((sum, lot) => sum + lot.quantity, 0); const unit = lots[0]?.unit ?? "pièce"; return <div className="supply-row" key={ref.id}><strong>{ref.name}</strong><span>Qté : {quantity} {unit}</span><button className="subtle-button" disabled={busy} onClick={() => setEditingStockGroup(ref)}>Modifier la quantité</button></div>; })}{visibleReferences.length === 0 && <EmptyState title={category === "supplies" ? "Aucune fourniture en stock" : "Aucun outil ou équipement en stock"} text="Ajoute une désignation et sa quantité pour commencer ta liste." />}</div> : selected ? <ReferenceDetail reference={selected} snapshot={snapshot} onBack={() => setSelectedId(null)} onAddStock={() => setShowAddStock(true)} onEdit={() => setShowEditReference(true)} onDelete={() => void handleDeleteReference(selected)} onRestore={() => void handleRestoreReference(selected)} onAssign={(itemId, target) => runAction(() => window.rcWorkshop.assignItem(itemId, target))} onRelease={(itemId) => runAction(() => window.rcWorkshop.releaseItem(itemId))} onBind={(itemId, transmitterId) => runAction(() => window.rcWorkshop.setReceiverBinding(itemId, transmitterId))} onEditItem={setEditingItem} onDeleteItem={(item) => void handleDeleteItem(item)} busy={busy} /> : <div className="reference-grid">{visibleReferences.map((ref) => <button className="reference-card" key={ref.id} onClick={() => setSelectedId(ref.id)}><div className="reference-photo">{ref.photoPath ? <img src={ref.photoPath} alt="" /> : <span>{icons[ref.category]}</span>}<small>{labels[ref.category]}{ref.archived ? " · ARCHIVÉE" : ""}</small></div><div className="reference-info"><strong>{ref.name}{ref.archived && <span className="archived-badge">Archivée</span>}</strong><span>{[ref.brand, ref.model].filter(Boolean).join(" · ") || "Marque / modèle non renseigné"}</span><div className="reference-meta"><small>{ref.trackingMode === "individual" ? snapshot.items.filter((item) => item.referenceId === ref.id).length + " exemplaire(s)" : snapshot.lots.filter((lot) => lot.referenceId === ref.id).reduce((sum, lot) => sum + lot.quantity, 0) + " en stock"}</small><b>→</b></div></div></button>)}{visibleReferences.length === 0 && <EmptyState title="Aucun composant trouvé" text="Essaie une autre recherche ou ajoute une nouvelle référence." />}</div>}
        </section>}
        {section === "aircraft" && <section className="content"><div className="section-heading"><div><span className="eyebrow">FLOTTE RC</span><h2>Mes avions</h2></div></div><div className="aircraft-grid">{snapshot.aircraft.map((aircraft) => { const installed = snapshot.items.filter((item) => item.aircraftId === aircraft.id); const receiver = installed.find((item) => { const ref = snapshot.references.find((entry) => entry.id === item.referenceId); return ref?.category === "radio" && ref.radioType === "receiver"; }); const receiverRef = receiver && snapshot.references.find((entry) => entry.id === receiver.referenceId); return <div className="aircraft-card" key={aircraft.id}><span className="aircraft-icon">✈</span><strong>{aircraft.name}</strong><small>{[aircraft.manufacturer, aircraft.model].filter(Boolean).join(" · ") || "Modèle non précisé"}</small>{aircraft.uafRegistration && <small>Immatriculation UAF : {aircraft.uafRegistration}</small>}{receiver && <small>RX affecté : {receiverRef?.name ?? "Récepteur"} · {receiver.inventoryCode}</small>}<span className="aircraft-count">{installed.length} équipement(s) installé(s)</span><div className="aircraft-actions"><button className="secondary" disabled={busy} onClick={() => setPreviewAircraft(aircraft)}>Aperçu</button><button className="subtle-button" disabled={busy} onClick={() => setEditingAircraft(aircraft)}>Modifier la fiche</button></div></div>; })}</div><AddAircraft onAdd={(aircraft) => runAction(() => window.rcWorkshop.addAircraft({ id: crypto.randomUUID(), ...aircraft }))} busy={busy} /></section>}
        {section === "projects" && <section className="content"><div className="section-heading"><div><span className="eyebrow">CONSTRUCTIONS & MODIFICATIONS</span><h2>Mes projets</h2></div></div><div className="project-grid">{snapshot.projects.map((project) => <div className="project-card" key={project.id}><strong>{project.name}</strong><span className={`project-status ${project.status}`}>{project.status}</span><small>{snapshot.items.filter((item) => item.projectId === project.id).length} composant(s) réservé(s)</small></div>)}</div><AddProject onAdd={(name) => runAction(() => window.rcWorkshop.addProject({ id: crypto.randomUUID(), name, status: "planned" }))} busy={busy} /></section>}
        {section === "movements" && <section className="content"><div className="movement-list">{snapshot.movements.map((movement) => <div className="movement-row" key={movement.id}><span className="movement-icon">↔</span><div><strong>{movement.type}</strong><small>{movement.referenceId} · {movement.itemId ?? movement.lotId ?? ""}</small></div><time>{new Date(movement.occurredAt).toLocaleString("fr-FR")}</time></div>)}{snapshot.movements.length === 0 && <EmptyState title="Pas encore de mouvement" text="Les entrées, installations et réservations apparaîtront ici." />}</div></section>}
      </main>
      {(stockGroupCategory || editingStockGroup) && <StockGroupModal key={editingStockGroup?.id ?? stockGroupCategory} category={(editingStockGroup?.category ?? stockGroupCategory) as "supplies" | "tool"} reference={editingStockGroup ?? undefined} initialQuantity={editingStockGroup ? snapshot.lots.filter((lot) => lot.referenceId === editingStockGroup.id).reduce((sum, lot) => sum + lot.quantity, 0) : undefined} initialUnit={editingStockGroup ? snapshot.lots.find((lot) => lot.referenceId === editingStockGroup.id)?.unit : undefined} busy={busy} onClose={() => { setStockGroupCategory(null); setEditingStockGroup(null); }} onSubmit={(value) => handleSaveStockGroup({ ...value, category: (editingStockGroup?.category ?? stockGroupCategory) as "supplies" | "tool", ...(editingStockGroup ? { referenceId: editingStockGroup.id } : {}) })} />}
      {showNewReference && <ReferenceModal error={error} busy={busy} onClose={() => setShowNewReference(false)} onSubmit={(value) => runAction(async () => { const result = await window.rcWorkshop.createReference(value); setShowNewReference(false); setSection("inventory"); setCategory("all"); setSelectedId(value.id); return result; })} />}
      {showEditReference && selected && <ReferenceModal reference={selected} error={error} busy={busy} onClose={() => setShowEditReference(false)} onSubmit={(value) => runAction(async () => { const result = await window.rcWorkshop.updateReference(value as ComponentReference); setShowEditReference(false); return result; })} />}
      {previewAircraft && <AircraftPreviewModal aircraft={previewAircraft} snapshot={snapshot} onClose={() => setPreviewAircraft(null)} />}
      {editingAircraft && <AircraftModal aircraft={editingAircraft} error={error} busy={busy} onClose={() => setEditingAircraft(null)} onSubmit={(value) => runAction(async () => { const result = await window.rcWorkshop.updateAircraft(value); setEditingAircraft(null); return result; })} />}
      {showAddStock && selected && <StockModal reference={selected} error={error} busy={busy} onClose={() => setShowAddStock(false)} onSubmit={(value) => runAction(async () => { const result = selected.trackingMode === "individual" ? await window.rcWorkshop.addItem(value as Omit<StockItem, "createdAt">) : await window.rcWorkshop.addLot(value as StockLot); setShowAddStock(false); return result; })} />}
      {editingItem && <StockItemModal item={editingItem} snapshot={snapshot} error={error} busy={busy} onClose={() => setEditingItem(null)} onSubmit={(value) => runAction(async () => { const result = await window.rcWorkshop.updateItem(value); setEditingItem(null); return result; })} />}
    </div>
  );
}
function Stat({ label, value, note, icon }: { label: string; value: number; note: string; icon: string }) { return <div className="stat-card"><span className="stat-icon">{icon}</span><small>{label}</small><strong>{value}</strong><span>{note}</span></div>; }
function EmptyState({ title, text }: { title: string; text: string }) { return <div className="empty-state"><span>📦</span><strong>{title}</strong><p>{text}</p></div>; }
function ReferenceDetail({ reference, snapshot, onBack, onAddStock, onEdit, onDelete, onRestore, onAssign, onRelease, onBind, onEditItem, onDeleteItem, busy }: { reference: ComponentReference; snapshot: InventorySnapshot; onBack: () => void; onAddStock: () => void; onEdit: () => void; onDelete: () => void; onRestore: () => void; onAssign: (itemId: string, target: AssignmentTarget) => void; onRelease: (itemId: string) => void; onBind: (itemId: string, transmitterId: string | null) => void; onEditItem: (item: StockItem) => void; onDeleteItem: (item: StockItem) => void; busy: boolean }) {
  const items = snapshot.items.filter((item) => item.referenceId === reference.id); const lots = snapshot.lots.filter((lot) => lot.referenceId === reference.id);
  return <div className="detail-view"><button className="text-button back-button" onClick={onBack}>← Retour au catalogue</button><div className="detail-header"><div className="detail-photo">{reference.photoPath ? <img src={reference.photoPath} alt="" /> : <span>{icons[reference.category]}</span>}</div><div className="detail-title"><span className="eyebrow">{labels[reference.category].toUpperCase()}</span><h2>{reference.name}</h2><p>{[reference.brand, reference.model].filter(Boolean).join(" · ") || "Marque / modèle non renseigné"}</p><span className="tracking-chip">{reference.trackingMode === "individual" ? "Suivi individuel" : "Gestion par quantité"}</span></div><div className="detail-actions"><button className="secondary" disabled={busy || reference.archived} onClick={onEdit}>Modifier la référence</button><button className="danger-button" disabled={busy || reference.archived} onClick={onDelete}>Supprimer / archiver</button>{reference.archived && <button className="secondary" disabled={busy} onClick={onRestore}>Restaurer</button>}<button className="primary" disabled={busy || reference.archived} onClick={onAddStock}>＋ Ajouter au stock</button></div></div><div className="detail-columns"><div className="panel"><h3>Caractéristiques</h3><p>{reference.description || "Aucune description renseignée."}</p>{(reference.category === "radio" && (reference.radioType ?? "receiver") === "receiver") && <><div className="attribute-row"><span>Type</span><strong>Récepteur</strong></div><div className="attribute-row"><span>Nombre de voies</span><strong>{reference.receiverChannels ?? "Non renseigné"}</strong></div><div className="attribute-row"><span>Protocole radio</span><strong>{reference.receiverProtocol || "Non renseigné"}</strong></div></>}{(reference.category === "motor" && reference.motorizationKind === "motor") && <><div className="attribute-row"><span>Type de moteur</span><strong>{reference.motorType === "glow" ? "Glow" : "Électrique"}</strong></div>{reference.motorType === "glow" ? <div className="attribute-row"><span>Cylindrée</span><strong>{reference.motorDisplacement}</strong></div> : <div className="attribute-row"><span>Tension</span><strong>{reference.motorVoltage}</strong></div>}</>}{(reference.category === "motor" && reference.motorizationKind === "propeller") && <><div className="attribute-row"><span>Hélice</span><strong>{reference.propellerDiameter} × {reference.propellerPitch} pouces</strong></div></>}{(reference.category === "radio" && reference.radioType === "transmitter") && <><div className="attribute-row"><span>Type</span><strong>Émetteur</strong></div><div className="attribute-row"><span>Nombre de voies</span><strong>{reference.transmitterChannels ?? "Non renseigné"}</strong></div><div className="attribute-row"><span>Protocoles radio</span><strong>{reference.transmitterProtocols?.join(", ") || "Non renseigné"}</strong></div><div className="attribute-row"><span>Version logicielle / firmware</span><strong>{reference.firmwareVersion || "Non renseignée"}</strong></div></>}{Object.entries(reference.attributes).map(([key, value]) => <div className="attribute-row" key={key}><span>{key}</span><strong>{String(value)}</strong></div>)}<div className="attribute-row"><span>Identifiant catalogue</span><strong>{reference.id}</strong></div></div><div className="panel"><h3>{reference.trackingMode === "individual" ? "Exemplaires physiques" : "Quantités en stock"}</h3>{items.map((item) => <ItemRow key={item.id} item={item} snapshot={snapshot} onAssign={onAssign} onRelease={onRelease} onBind={onBind} onEditItem={onEditItem} onDeleteItem={onDeleteItem} busy={busy} />)}{lots.map((lot) => <div className="lot-row" key={lot.id}><strong>{lot.quantity} {lot.unit}</strong><small>{lot.locationId || "Emplacement non renseigné"}</small></div>)}{items.length === 0 && lots.length === 0 && <p className="muted">Aucun stock enregistré pour cette référence.</p>}</div></div></div>;
}
function ItemRow({ item, snapshot, onAssign, onRelease, onBind, onEditItem, onDeleteItem, busy }: { item: StockItem; snapshot: InventorySnapshot; onAssign: (itemId: string, target: AssignmentTarget) => void; onRelease: (itemId: string) => void; onBind: (itemId: string, transmitterId: string | null) => void; onEditItem: (item: StockItem) => void; onDeleteItem: (item: StockItem) => void; busy: boolean }) {
  const [target, setTarget] = useState(""); const status = item.status === "available" ? "Disponible" : item.status === "installed" ? "Installé" : item.status === "reserved" ? "Réservé" : item.status;
  const assignedTo = item.aircraftId ? snapshot.aircraft.find((x) => x.id === item.aircraftId)?.name : item.projectId ? snapshot.projects.find((x) => x.id === item.projectId)?.name : undefined;
  const itemReference = snapshot.references.find((entry) => entry.id === item.referenceId);
  const isTransmitter = itemReference?.category === "radio" && itemReference.radioType === "transmitter";
  const isSupply = itemReference?.category === "supplies";
  const isReceiver = itemReference?.category === "radio" && itemReference.radioType === "receiver";
  const boundTransmitter = snapshot.items.find((entry) => entry.id === item.boundTransmitterId);
  const transmitters = snapshot.items.filter((entry) => {
    const ref = snapshot.references.find((candidate) => candidate.id === entry.referenceId);
    return ref?.category === "radio" && ref.radioType === "transmitter";
  });
  const targetParts = target.split(":");
  const canAssign = targetParts.length === 2 && targetParts[1] !== "";
  return <div className="item-row"><div><strong>{item.inventoryCode}</strong><small>{item.tx16Name ? `TX16 : ${item.tx16Name} · ` : ""}{item.serialNumber || "N° de série non renseigné"}{isReceiver ? ` · Bind : ${boundTransmitter?.inventoryCode ?? "non défini"}` : ""}</small><span className={`item-status ${item.status}`}>{status}{assignedTo ? " · " + assignedTo : ""}</span></div>{isReceiver && <div className="item-actions"><label>Bind <select value={item.boundTransmitterId ?? ""} disabled={busy} onChange={(e) => onBind(item.id, e.target.value || null)}><option value="">Aucun émetteur</option>{transmitters.map((tx) => <option key={tx.id} value={tx.id}>{tx.inventoryCode}</option>)}</select></label></div>}{item.status === "available" && !isTransmitter && !isSupply && (snapshot.aircraft.length > 0 || snapshot.projects.length > 0) && <div className="item-actions"><select value={target} onChange={(e) => setTarget(e.target.value)}><option value="">Affecter à...</option>{snapshot.aircraft.length > 0 && <optgroup label="Installer sur un avion">{snapshot.aircraft.map((aircraft) => <option value={`aircraft:${aircraft.id}`} key={aircraft.id}>{aircraft.name}</option>)}</optgroup>}{snapshot.projects.length > 0 && <optgroup label="Réserver pour un projet">{snapshot.projects.map((project) => <option value={`project:${project.id}`} key={project.id}>{project.name}</option>)}</optgroup>}</select><button disabled={!canAssign || busy} onClick={() => { const [kind, id] = targetParts; if ((kind === "aircraft" || kind === "project") && id) onAssign(item.id, { kind, id }); }}>{target.startsWith("project:") ? "Réserver" : "Installer"}</button></div>}{(item.status === "installed" || item.status === "reserved") && <button className="subtle-button" disabled={busy} onClick={() => onRelease(item.id)}>Libérer</button>}<div className="item-actions"><button className="subtle-button" disabled={busy} onClick={() => onEditItem(item)}>Modifier</button><button className="danger-button" disabled={busy} onClick={() => onDeleteItem(item)}>Supprimer</button></div></div>;
}
function ReferenceModal({ reference, onClose, onSubmit, busy, error }: { reference?: ComponentReference; onClose: () => void; onSubmit: (value: Omit<ComponentReference, "createdAt" | "archived">) => void; busy: boolean; error: string }) {
  const [name, setName] = useState(reference?.name ?? ""); const [brand, setBrand] = useState(reference?.brand ?? ""); const [model, setModel] = useState(reference?.model ?? ""); const [category, setCategory] = useState<ComponentCategory>(reference?.category ?? "motor"); const [trackingMode, setTrackingMode] = useState<TrackingMode>(reference?.trackingMode ?? "individual"); const [description, setDescription] = useState(reference?.description ?? ""); const [photoPath, setPhotoPath] = useState(reference?.photoPath ?? ""); const [radioType, setRadioType] = useState<"transmitter" | "receiver">(reference?.radioType ?? (reference?.category === "receiver" ? "receiver" : "transmitter")); const [receiverChannels, setReceiverChannels] = useState(String(reference?.receiverChannels ?? 8)); const [receiverProtocol, setReceiverProtocol] = useState(reference?.receiverProtocol ?? ""); const [transmitterChannels, setTransmitterChannels] = useState(String(reference?.transmitterChannels ?? 16)); const [transmitterProtocols, setTransmitterProtocols] = useState((reference?.transmitterProtocols ?? []).join(", ")); const [firmwareVersion, setFirmwareVersion] = useState(reference?.firmwareVersion ?? ""); const [motorizationKind, setMotorizationKind] = useState<"motor" | "propeller">(reference?.motorizationKind ?? "motor"); const [motorType, setMotorType] = useState<"electric" | "glow">(reference?.motorType ?? "electric"); const [motorVoltage, setMotorVoltage] = useState(reference?.motorVoltage ?? ""); const [motorDisplacement, setMotorDisplacement] = useState(reference?.motorDisplacement ?? "");
  const [propellerDiameter, setPropellerDiameter] = useState(reference?.propellerDiameter ?? "");
  const [propellerPitch, setPropellerPitch] = useState(reference?.propellerPitch ?? "");
  function submit(event: FormEvent) { event.preventDefault(); const isRadio = category === "radio" || category === "receiver"; const subtype = category === "receiver" ? "receiver" : radioType; onSubmit({ id: reference?.id ?? crypto.randomUUID(), name, category: category === "receiver" ? "radio" : category, trackingMode: category === "supplies" || category === "tool" ? "quantity" : isRadio && subtype === "receiver" ? "individual" : trackingMode, attributes: reference?.attributes ?? {}, ...(category === "motor" ? { motorizationKind, ...(motorizationKind === "motor" ? { motorType, ...(motorType === "electric" ? { motorVoltage: motorVoltage.trim() } : { motorDisplacement: motorDisplacement.trim() }) } : { propellerDiameter: propellerDiameter.trim(), propellerPitch: propellerPitch.trim() }) } : {}), ...(isRadio ? { radioType: subtype, ...(subtype === "receiver" ? { receiverChannels: Number(receiverChannels), receiverProtocol: receiverProtocol.trim() } : { transmitterChannels: Number(transmitterChannels), transmitterProtocols: transmitterProtocols.split(",").map((x) => x.trim()).filter(Boolean), ...(firmwareVersion.trim() ? { firmwareVersion: firmwareVersion.trim() } : {}) }) } : {}), ...(brand.trim() ? { brand: brand.trim() } : {}), ...(model.trim() ? { model: model.trim() } : {}), ...(description.trim() ? { description: description.trim() } : {}), ...(photoPath.trim() ? { photoPath: photoPath.trim() } : {}), ...(reference ? { archived: reference.archived, createdAt: reference.createdAt } : {}) }); }
  return <Modal title={reference ? "Modifier la référence catalogue" : "Nouvelle référence catalogue"} onClose={onClose} error={error}><form onSubmit={submit} className="form-grid"><label>Désignation *<input required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Dualsky ECO 3520C V2" /></label><div className="form-row"><label>Catégorie<select value={category} disabled={Boolean(reference)} onChange={(e) => { setCategory(e.target.value as ComponentCategory); if (e.target.value === "receiver") { setRadioType("receiver"); setTrackingMode("individual"); } else if (e.target.value === "supplies" || e.target.value === "tool") { setTrackingMode("quantity"); } }}>{COMPONENT_CATEGORIES.filter((x) => x !== "supplies" && x !== "tool").map((x) => <option value={x} key={x}>{labels[x]}</option>)}</select></label><label>Mode de suivi<select value={trackingMode} disabled={Boolean(reference) || (category === "radio" && radioType === "receiver") || category === "receiver" || category === "supplies" || category === "tool"} onChange={(e) => setTrackingMode(e.target.value as TrackingMode)}><option value="individual">Exemplaires individuels</option><option value="quantity">Quantité / lot</option></select></label></div>{category === "supplies" && <p className="field-hint">Les fournitures sont gérées par quantité en stock et ne peuvent pas être affectées à un avion ou à un projet.</p>}{category === "motor" && <><div className="form-row"><label>Type de composant<select value={motorizationKind} onChange={(e) => setMotorizationKind(e.target.value as "motor" | "propeller")}><option value="motor">Moteur</option><option value="propeller">Hélice</option></select></label>{motorizationKind === "motor" && <label>Type de moteur<select value={motorType} onChange={(e) => setMotorType(e.target.value as "electric" | "glow")}><option value="electric">Électrique</option><option value="glow">Glow</option></select></label>}</div>{motorizationKind === "motor" ? motorType === "electric" ? <label>Tension<input required value={motorVoltage} onChange={(e) => setMotorVoltage(e.target.value)} placeholder="Ex. 3S, 4S, 3-4S" /></label> : <label>Cylindrée Glow<input required value={motorDisplacement} onChange={(e) => setMotorDisplacement(e.target.value)} placeholder="Ex. 46, 51" /></label> : <div className="form-row"><label>Diamètre (pouces)<input required value={propellerDiameter} onChange={(e) => setPropellerDiameter(e.target.value)} placeholder="Ex. 12" /></label><label>Pas (pouces)<input required value={propellerPitch} onChange={(e) => setPropellerPitch(e.target.value)} placeholder="Ex. 8" /></label></div>}</>}{category === "radio" && <div className="form-row"><label>Type de radio<select value={radioType} disabled={Boolean(reference)} onChange={(e) => { const next = e.target.value as "transmitter" | "receiver"; setRadioType(next); if (next === "receiver") setTrackingMode("individual"); }}>{[["transmitter", "Émetteur"], ["receiver", "Récepteur"]].map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label><div className="field-hint">{radioType === "transmitter" ? "Un émetteur n'est pas affecté à un avion." : "Un récepteur est suivi individuellement et peut être affecté à un avion."}</div></div>}<div className="form-row"><label>Marque<input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ex. Dualsky" /></label><label>Modèle / référence<input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Référence fabricant" /></label></div>{(category === "radio" || category === "receiver") && (category === "receiver" || radioType === "receiver") && <div className="form-row"><label>Nombre de voies *<input type="number" min="1" step="1" required value={receiverChannels} onChange={(e) => setReceiverChannels(e.target.value)} placeholder="Ex. 8" /></label><label>Protocole radio *<input required value={receiverProtocol} onChange={(e) => setReceiverProtocol(e.target.value)} placeholder="Ex. ExpressLRS, ACCESS, DSMX..." /></label></div>}{category === "radio" && radioType === "transmitter" && <><div className="form-row"><label>Nombre de voies *<input type="number" min="1" step="1" required value={transmitterChannels} onChange={(e) => setTransmitterChannels(e.target.value)} /></label><label>Protocoles radio *<input required value={transmitterProtocols} onChange={(e) => setTransmitterProtocols(e.target.value)} placeholder="Ex. ExpressLRS, ACCESS, DSMX..." /></label></div><label>Version logicielle / firmware<input value={firmwareVersion} onChange={(e) => setFirmwareVersion(e.target.value)} placeholder="Ex. EdgeTX 2.x" /></label></>}<label>Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Caractéristiques principales..." /></label><label>Photo (URL ou data URI, facultatif)<input value={photoPath} onChange={(e) => setPhotoPath(e.target.value)} placeholder="https://... ou data:image/..." /></label><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Annuler</button><button className="primary" disabled={busy || !name.trim()}>{reference ? "Enregistrer les modifications" : "Créer la référence"}</button></div></form></Modal>;
}
function StockGroupModal({ category, reference, initialQuantity, initialUnit, onClose, onSubmit, busy }: { category: "supplies" | "tool"; reference?: ComponentReference | undefined; initialQuantity?: number | undefined; initialUnit?: string | undefined; onClose: () => void; onSubmit: (value: { name: string; quantity: number; unit: string }) => void; busy: boolean }) {
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
  const isReceiver = reference?.category === "receiver" || (reference?.category === "radio" && reference.radioType === "receiver");
  const [serialNumber, setSerialNumber] = useState(item.serialNumber ?? "");
  const [tx16Name, setTx16Name] = useState(item.tx16Name ?? "");
  const [locationId, setLocationId] = useState(item.locationId ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");
  function submit(event: FormEvent) {
    event.preventDefault();
    const updated = { ...item };
    if (serialNumber.trim()) updated.serialNumber = serialNumber.trim(); else delete updated.serialNumber;
    if (isReceiver) { if (tx16Name.trim()) updated.tx16Name = tx16Name.trim(); else delete updated.tx16Name; }
    if (locationId.trim()) updated.locationId = locationId.trim(); else delete updated.locationId;
    if (notes.trim()) updated.notes = notes.trim(); else delete updated.notes;
    onSubmit(updated);
  }
  return <Modal title={"Modifier l’exemplaire " + item.inventoryCode} onClose={onClose} error={error}><form className="form-grid" onSubmit={submit}>
    <p className="field-hint">{reference?.name ?? item.referenceId} · {item.status === "available" ? "Disponible" : item.status === "installed" ? "Installé" : item.status === "reserved" ? "Réservé" : item.status}</p>
    {isReceiver && <label>Nom / identifiant dans la TX16<input value={tx16Name} onInput={(event) => setTx16Name(event.currentTarget.value)} autoFocus placeholder={item.inventoryCode} /></label>}
    <label>Numéro de série<input value={serialNumber} onInput={(event) => setSerialNumber(event.currentTarget.value)} autoFocus={!isReceiver} /></label>
    <label>Emplacement<input value={locationId} onInput={(event) => setLocationId(event.currentTarget.value)} /></label>
    <label>Notes<textarea value={notes} onInput={(event) => setNotes(event.currentTarget.value)} /></label>
    <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Annuler</button><button className="primary" disabled={busy}>Enregistrer</button></div>
  </form></Modal>;
}

function StockModal({ reference, onClose, onSubmit, busy, error }: { reference: ComponentReference; onClose: () => void; onSubmit: (value: Omit<StockItem, "createdAt"> | StockLot) => void; busy: boolean; error: string }) {
  const inventoryCode = ""; const isReceiver = reference.category === "receiver" || (reference.category === "radio" && reference.radioType === "receiver"); const [tx16Name, setTx16Name] = useState(""); const [serialNumber, setSerialNumber] = useState(""); const [quantity, setQuantity] = useState("1"); const [unit, setUnit] = useState("pièce"); const [locationId, setLocationId] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); if (reference.trackingMode === "individual") onSubmit({ id: crypto.randomUUID(), referenceId: reference.id, inventoryCode, status: "available", ...(serialNumber ? { serialNumber } : {}), ...(locationId ? { locationId } : {}), ...(isReceiver ? { tx16Name } : {}) }); else onSubmit({ id: crypto.randomUUID(), referenceId: reference.id, quantity: Number(quantity), unit, ...(locationId ? { locationId } : {}) }); }
  return <Modal title={reference.trackingMode === "individual" ? "Ajouter un exemplaire" : "Ajouter une quantité"} onClose={onClose} error={error}><form onSubmit={submit} className="form-grid">{reference.trackingMode === "individual" ? <><p className="field-hint">Identifiant généré automatiquement selon la catégorie (ex. RX-001, MOT-001).</p>{isReceiver && <label>Nom / identifiant dans la TX16<input autoFocus value={tx16Name} onInput={(e) => setTx16Name(e.currentTarget.value)} placeholder="RX-007" /></label>}<label>Numéro de série<input autoFocus={!isReceiver} value={serialNumber} onInput={(e) => setSerialNumber(e.currentTarget.value)} /></label></> : <div className="form-row"><label>Quantité *<input type="number" min="1" step="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label><label>Unité<input required value={unit} onChange={(e) => setUnit(e.target.value)} /></label></div>}<label>Emplacement (facultatif)<input value={locationId} onInput={(e) => setLocationId(e.currentTarget.value)} placeholder="Ex. boîte batteries / tiroir 3" /></label><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Annuler</button><button className="primary" disabled={busy}>Enregistrer</button></div></form></Modal>;
}
function AddAircraft({ onAdd, busy }: { onAdd: (aircraft: Pick<Aircraft, "name" | "manufacturer" | "model" | "uafRegistration">) => void; busy: boolean }) { const [name,setName]=useState(""); const [manufacturer,setManufacturer]=useState(""); const [model,setModel]=useState(""); const [uafRegistration,setUafRegistration]=useState(""); return <form className="inline-add aircraft-add" onSubmit={(e)=>{e.preventDefault();if(name.trim()){onAdd({name:name.trim(),...(manufacturer.trim()?{manufacturer:manufacturer.trim()}:{}),...(model.trim()?{model:model.trim()}:{}),...(uafRegistration.trim()?{uafRegistration:uafRegistration.trim()}:{})});setName("");setManufacturer("");setModel("");setUafRegistration("");}}}><input required value={name} onChange={(e)=>setName(e.target.value)} placeholder="Nom de l’avion..." /><input value={manufacturer} onChange={(e)=>setManufacturer(e.target.value)} placeholder="Constructeur" /><input value={model} onChange={(e)=>setModel(e.target.value)} placeholder="Modèle" /><input value={uafRegistration} onChange={(e)=>setUafRegistration(e.target.value)} placeholder="Immatriculation UAF (facultatif)" /><button className="primary" disabled={busy || !name.trim()}>＋ Ajouter un avion</button></form>; }
function AircraftPreviewModal({ aircraft, snapshot, onClose }: { aircraft: Aircraft; snapshot: InventorySnapshot; onClose: () => void }) {
  const installed = snapshot.items.filter((item) => item.aircraftId === aircraft.id);
  const getReference = (item: StockItem) => snapshot.references.find((entry) => entry.id === item.referenceId);
  const isReceiver = (item: StockItem) => { const ref = getReference(item); return ref?.category === "radio" && ref.radioType === "receiver"; };
  const isMotor = (item: StockItem) => { const ref = getReference(item); return ref?.category === "motor" && ref.motorizationKind === "motor"; };
  const isPropeller = (item: StockItem) => { const ref = getReference(item); return (ref?.category === "motor" && ref.motorizationKind === "propeller") || ref?.category === "propeller"; };
  const receiver = installed.find(isReceiver);
  const transmitter = receiver?.boundTransmitterId ? snapshot.items.find((item) => item.id === receiver.boundTransmitterId) : undefined;
  const motors = installed.filter(isMotor);
  const propellers = installed.filter(isPropeller);
  const electricMotorInstalled = motors.some((item) => getReference(item)?.motorType === "electric");
  const speedControllers = electricMotorInstalled ? installed.filter((item) => getReference(item)?.category === "esc") : [];
  const displayedIds = new Set([receiver, ...motors, ...propellers, ...speedControllers].filter((item): item is StockItem => Boolean(item)).map((item) => item.id));
  const formatItem = (item: StockItem) => { const ref = getReference(item); return (ref?.name ?? item.referenceId) + " · " + item.inventoryCode; };
  const formatPropeller = (item: StockItem) => { const ref = getReference(item); return (ref?.brand?.trim() || ref?.name || item.referenceId) + " - " + item.inventoryCode + " - " + (ref?.propellerDiameter ?? "?") + "x" + (ref?.propellerPitch ?? "?"); };
  return <Modal title="Aperçu de la fiche avion" onClose={onClose}><div className="form-grid">
    <h3>{aircraft.name}</h3>
    <p>{[aircraft.manufacturer, aircraft.model].filter(Boolean).join(" · ") || "Constructeur / modèle non renseigné"}</p>
    {aircraft.uafRegistration && <p><strong>Immatriculation UAF :</strong> {aircraft.uafRegistration}</p>}
    {aircraft.notes && <p><strong>Notes :</strong> {aircraft.notes}</p>}
    <h3>Configuration</h3>
    <div className="attribute-row"><span>Récepteur (RX)</span><strong>{receiver ? formatItem(receiver) : "Aucun récepteur affecté"}</strong></div>
    {receiver && <div className="attribute-row"><span>Bind radio</span><strong>{transmitter ? formatItem(transmitter) : "Non défini"}</strong></div>}
    <div className="attribute-row"><span>Moteur</span><strong>{motors.length ? motors.map(formatItem).join(" · ") : "Aucun moteur affecté"}</strong></div>
    <div className="attribute-row"><span>Hélice</span><strong>{propellers.length ? propellers.map(formatPropeller).join(" · ") : "Aucune hélice affectée"}</strong></div>
    {electricMotorInstalled && <div className="attribute-row"><span>ESC</span><strong>{speedControllers.length ? speedControllers.map(formatItem).join(" · ") : "Aucun ESC affecté"}</strong></div>}
    {installed.some((item) => !displayedIds.has(item.id)) && <><h3>Autres équipements installés</h3>{installed.filter((item) => !displayedIds.has(item.id)).map((item) => <div className="item-row" key={item.id}><div><strong>{formatItem(item)}</strong></div></div>)}</>}
    {installed.length === 0 && <p className="muted">Aucun équipement installé.</p>}
    <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Fermer</button></div>
  </div></Modal>;
}
function AircraftModal({ aircraft, onClose, onSubmit, busy, error }: { aircraft: Aircraft; onClose: () => void; onSubmit: (value: Aircraft) => void; busy: boolean; error: string }) { const [name,setName]=useState(aircraft.name); const [manufacturer,setManufacturer]=useState(aircraft.manufacturer??""); const [model,setModel]=useState(aircraft.model??""); const [uafRegistration,setUafRegistration]=useState(aircraft.uafRegistration??""); const [notes,setNotes]=useState(aircraft.notes??""); return <Modal title="Modifier la fiche avion" onClose={onClose} error={error}><form className="form-grid" onSubmit={(e)=>{e.preventDefault();onSubmit({id:aircraft.id,name:name.trim(),...(manufacturer.trim()?{manufacturer:manufacturer.trim()}:{}),...(model.trim()?{model:model.trim()}:{}),...(uafRegistration.trim()?{uafRegistration:uafRegistration.trim()}:{}),...(notes.trim()?{notes:notes.trim()}:{})});}}><label>Nom de l’avion *<input required autoFocus value={name} onChange={(e)=>setName(e.target.value)} /></label><div className="form-row"><label>Constructeur<input value={manufacturer} onChange={(e)=>setManufacturer(e.target.value)} /></label><label>Modèle<input value={model} onChange={(e)=>setModel(e.target.value)} /></label></div><label>Immatriculation UAF (facultatif)<input value={uafRegistration} onChange={(e)=>setUafRegistration(e.target.value)} placeholder="Ex. F-XXXX" /></label><label>Notes<textarea value={notes} onChange={(e)=>setNotes(e.target.value)} /></label><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Annuler</button><button className="primary" disabled={busy||!name.trim()}>Enregistrer les modifications</button></div></form></Modal>; }
function AddProject({ onAdd, busy }: { onAdd: (name: string) => void; busy: boolean }) { const [name,setName]=useState(""); return <form className="inline-add" onSubmit={(e)=>{e.preventDefault();if(name.trim()){onAdd(name.trim());setName("");}}}><input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Nom du nouveau projet..." /><button className="primary" disabled={busy || !name.trim()}>＋ Ajouter un projet</button></form>; }
function Modal({ title, onClose, children, error }: { title: string; onClose: () => void; children: React.ReactNode; error?: string }) { return <div className="modal-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)onClose();}}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><h2>{title}</h2><button type="button" onClick={onClose}>×</button></div>{error && <div className="error-banner modal-error" role="alert">{error}</div>}{children}</div></div>; }
export default App;
