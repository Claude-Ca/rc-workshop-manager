import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  COMPONENT_CATEGORIES,
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
  motor: "Motorisation", esc: "Variateurs ESC", battery: "Batteries", propeller: "Hélices",
  receiver: "Récepteurs", servo: "Servos", connector: "Connectique", control: "Commandes",
  structure: "Structure", material: "Matériaux", construction: "Construction", tool: "Outillage", other: "Divers",
};
const icons: Record<ComponentCategory, string> = {
  motor: "⚙️", esc: "🔌", battery: "🔋", propeller: "🌀", receiver: "📡", servo: "🎛️",
  connector: "🔗", control: "🕹️", structure: "🛩️", material: "🪵", construction: "🧰", tool: "🔧", other: "📦",
};
const emptySnapshot: InventorySnapshot = { references: [], items: [], lots: [], aircraft: [], projects: [], movements: [] };

function App() {
  const [snapshot, setSnapshot] = useState<InventorySnapshot>(emptySnapshot);
  const [section, setSection] = useState<Section>("dashboard");
  const [category, setCategory] = useState<ComponentCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewReference, setShowNewReference] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    if (!window.rcWorkshop || typeof window.rcWorkshop.getSnapshot !== "function") {
      throw new Error("Le pont Electron est indisponible. Vérifie le chargement du script preload puis relance l'application.");
    }
    setSnapshot(await window.rcWorkshop.getSnapshot());
  };
  useEffect(() => { void refresh().catch((e: unknown) => setError(String(e))); }, []);

  const selected = snapshot.references.find((reference) => reference.id === selectedId) ?? null;
  const visibleReferences = useMemo(() => snapshot.references.filter((reference) =>
    !reference.archived &&
    (category === "all" || reference.category === category) &&
    `${reference.name} ${reference.brand ?? ""} ${reference.model ?? ""} ${reference.category}`.toLowerCase().includes(search.toLowerCase())
  ), [snapshot.references, category, search]);

  const availableItems = snapshot.items.filter((item) => item.status === "available").length;
  const installedItems = snapshot.items.filter((item) => item.status === "installed").length;
  const reservedItems = snapshot.items.filter((item) => item.status === "reserved").length;
  const totalQuantity = snapshot.lots.reduce((sum, lot) => sum + lot.quantity, 0);

  async function runAction(action: () => Promise<InventorySnapshot>) {
    setBusy(true); setError("");
    try { setSnapshot(await action()); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
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
        <header className="topbar"><div><span className="eyebrow">RC WORKSHOP MANAGER</span><h1>{section === "dashboard" ? "Vue d'ensemble" : section === "inventory" ? "Inventaire" : section === "aircraft" ? "Ma flotte" : section === "projects" ? "Mes projets" : "Historique des mouvements"}</h1></div><div className="top-actions"><span className="local-chip">● Hors ligne · Données locales</span><button className="primary" onClick={() => { setShowNewReference(true); setError(""); }}>＋ Nouveau composant</button></div></header>
        {error && <div className="error-banner">{error}<button onClick={() => setError("")}>×</button></div>}
        {section === "dashboard" && <section className="content">
          <div className="welcome"><div><span className="eyebrow">TON ATELIER, EN UN COUP D'ŒIL</span><h2>Bienvenue dans ton atelier RC.</h2><p>Retrouve tes composants, leur disponibilité et leur affectation.</p></div><div className="welcome-icon">🛩️</div></div>
          <div className="stats"><Stat label="Références catalogue" value={snapshot.references.length} note="Types de composants" icon="▤" /><Stat label="Exemplaires disponibles" value={availableItems + totalQuantity} note="Prêts à être utilisés" icon="✓" /><Stat label="Installés sur un avion" value={installedItems} note="Équipements affectés" icon="✈" /><Stat label="Réservés" value={reservedItems} note="Pour tes projets" icon="◷" /></div>
          <div className="section-heading"><div><span className="eyebrow">PAR FAMILLE</span><h2>Explorer le stock</h2></div><button className="text-button" onClick={() => { setSection("inventory"); setCategory("all"); }}>Tout l'inventaire →</button></div>
          <div className="category-grid">{COMPONENT_CATEGORIES.map((value) => { const count = snapshot.references.filter((ref) => ref.category === value && !ref.archived).length; return <button className="category-card" key={value} onClick={() => openCategory(value)}><span className="category-icon">{icons[value]}</span><strong>{labels[value]}</strong><small>{count} référence{count > 1 ? "s" : ""}</small><span className="card-arrow">↗</span></button>; })}</div>
          <div className="section-heading"><div><span className="eyebrow">DERNIÈRES ENTRÉES</span><h2>Ajouts récents</h2></div><button className="text-button" onClick={() => setSection("inventory")}>Voir le catalogue →</button></div>
          <div className="recent-list">{snapshot.references.slice(-5).reverse().map((ref) => <button className="recent-row" key={ref.id} onClick={() => { setSelectedId(ref.id); setSection("inventory"); }}><span className="category-icon small">{icons[ref.category]}</span><span className="recent-name"><strong>{ref.name}</strong><small>{labels[ref.category]}{ref.brand ? ` · ${ref.brand}` : ""}</small></span><span className="row-arrow">→</span></button>)}{snapshot.references.length === 0 && <EmptyState title="Ton inventaire est encore vide" text="Ajoute ton premier composant pour commencer à organiser ton atelier." />}</div>
        </section>}
        {section === "inventory" && <section className="content"><div className="toolbar"><div className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un composant, une marque..." /></div><select value={category} onChange={(e) => setCategory(e.target.value as ComponentCategory | "all")}><option value="all">Toutes les catégories</option>{COMPONENT_CATEGORIES.map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select><span className="result-count">{visibleReferences.length} référence(s)</span></div>{selected ? <ReferenceDetail reference={selected} snapshot={snapshot} onBack={() => setSelectedId(null)} onAddStock={() => setShowAddStock(true)} onAssign={(itemId, target) => runAction(() => window.rcWorkshop.assignItem(itemId, target))} onRelease={(itemId) => runAction(() => window.rcWorkshop.releaseItem(itemId))} busy={busy} /> : <div className="reference-grid">{visibleReferences.map((ref) => <button className="reference-card" key={ref.id} onClick={() => setSelectedId(ref.id)}><div className="reference-photo">{ref.photoPath ? <img src={ref.photoPath} alt="" /> : <span>{icons[ref.category]}</span>}<small>{labels[ref.category]}</small></div><div className="reference-info"><strong>{ref.name}</strong><span>{[ref.brand, ref.model].filter(Boolean).join(" · ") || "Marque / modèle non renseigné"}</span><div className="reference-meta"><small>{ref.trackingMode === "individual" ? snapshot.items.filter((item) => item.referenceId === ref.id).length + " exemplaire(s)" : snapshot.lots.filter((lot) => lot.referenceId === ref.id).reduce((sum, lot) => sum + lot.quantity, 0) + " en stock"}</small><b>→</b></div></div></button>)}{visibleReferences.length === 0 && <EmptyState title="Aucun composant trouvé" text="Essaie une autre recherche ou ajoute une nouvelle référence." />}</div>}</section>}
        {section === "aircraft" && <section className="content"><div className="section-heading"><div><span className="eyebrow">FLOTTE RC</span><h2>Mes avions</h2></div></div><div className="aircraft-grid">{snapshot.aircraft.map((aircraft) => <div className="aircraft-card" key={aircraft.id}><span className="aircraft-icon">✈</span><strong>{aircraft.name}</strong><small>{[aircraft.manufacturer, aircraft.model].filter(Boolean).join(" · ") || "Modèle non précisé"}</small><span className="aircraft-count">{snapshot.items.filter((item) => item.aircraftId === aircraft.id).length} équipement(s) installé(s)</span></div>)}</div><AddAircraft onAdd={(name) => runAction(() => window.rcWorkshop.addAircraft({ id: crypto.randomUUID(), name }))} busy={busy} /></section>}
        {section === "projects" && <section className="content"><div className="section-heading"><div><span className="eyebrow">CONSTRUCTIONS & MODIFICATIONS</span><h2>Mes projets</h2></div></div><div className="project-grid">{snapshot.projects.map((project) => <div className="project-card" key={project.id}><strong>{project.name}</strong><span className={`project-status ${project.status}`}>{project.status}</span><small>{snapshot.items.filter((item) => item.projectId === project.id).length} composant(s) réservé(s)</small></div>)}</div><AddProject onAdd={(name) => runAction(() => window.rcWorkshop.addProject({ id: crypto.randomUUID(), name, status: "planned" }))} busy={busy} /></section>}
        {section === "movements" && <section className="content"><div className="movement-list">{snapshot.movements.map((movement) => <div className="movement-row" key={movement.id}><span className="movement-icon">↔</span><div><strong>{movement.type}</strong><small>{movement.referenceId} · {movement.itemId ?? movement.lotId ?? ""}</small></div><time>{new Date(movement.occurredAt).toLocaleString("fr-FR")}</time></div>)}{snapshot.movements.length === 0 && <EmptyState title="Pas encore de mouvement" text="Les entrées, installations et réservations apparaîtront ici." />}</div></section>}
      </main>
      {showNewReference && <ReferenceModal error={error} busy={busy} onClose={() => setShowNewReference(false)} onSubmit={(value) => runAction(async () => { const result = await window.rcWorkshop.createReference(value); setShowNewReference(false); setSection("inventory"); setCategory("all"); setSelectedId(value.id); return result; })} />}
      {showAddStock && selected && <StockModal reference={selected} error={error} busy={busy} onClose={() => setShowAddStock(false)} onSubmit={(value) => runAction(async () => { const result = selected.trackingMode === "individual" ? await window.rcWorkshop.addItem(value as Omit<StockItem, "createdAt">) : await window.rcWorkshop.addLot(value as StockLot); setShowAddStock(false); return result; })} />}
    </div>
  );
}
function Stat({ label, value, note, icon }: { label: string; value: number; note: string; icon: string }) { return <div className="stat-card"><span className="stat-icon">{icon}</span><small>{label}</small><strong>{value}</strong><span>{note}</span></div>; }
function EmptyState({ title, text }: { title: string; text: string }) { return <div className="empty-state"><span>📦</span><strong>{title}</strong><p>{text}</p></div>; }
function ReferenceDetail({ reference, snapshot, onBack, onAddStock, onAssign, onRelease, busy }: { reference: ComponentReference; snapshot: InventorySnapshot; onBack: () => void; onAddStock: () => void; onAssign: (itemId: string, target: AssignmentTarget) => void; onRelease: (itemId: string) => void; busy: boolean }) {
  const items = snapshot.items.filter((item) => item.referenceId === reference.id); const lots = snapshot.lots.filter((lot) => lot.referenceId === reference.id);
  return <div className="detail-view"><button className="text-button back-button" onClick={onBack}>← Retour au catalogue</button><div className="detail-header"><div className="detail-photo">{reference.photoPath ? <img src={reference.photoPath} alt="" /> : <span>{icons[reference.category]}</span>}</div><div className="detail-title"><span className="eyebrow">{labels[reference.category].toUpperCase()}</span><h2>{reference.name}</h2><p>{[reference.brand, reference.model].filter(Boolean).join(" · ") || "Marque / modèle non renseigné"}</p><span className="tracking-chip">{reference.trackingMode === "individual" ? "Suivi individuel" : "Gestion par quantité"}</span></div><button className="primary" onClick={onAddStock}>＋ Ajouter au stock</button></div><div className="detail-columns"><div className="panel"><h3>Caractéristiques</h3><p>{reference.description || "Aucune description renseignée."}</p>{reference.category === "receiver" && <><div className="attribute-row"><span>Nombre de voies</span><strong>{reference.receiverChannels ?? "Non renseigné"}</strong></div><div className="attribute-row"><span>Protocole radio</span><strong>{reference.receiverProtocol || "Non renseigné"}</strong></div></>}{Object.entries(reference.attributes).map(([key, value]) => <div className="attribute-row" key={key}><span>{key}</span><strong>{String(value)}</strong></div>)}<div className="attribute-row"><span>Identifiant catalogue</span><strong>{reference.id}</strong></div></div><div className="panel"><h3>{reference.trackingMode === "individual" ? "Exemplaires physiques" : "Quantités en stock"}</h3>{items.map((item) => <ItemRow key={item.id} item={item} snapshot={snapshot} onAssign={onAssign} onRelease={onRelease} busy={busy} />)}{lots.map((lot) => <div className="lot-row" key={lot.id}><strong>{lot.quantity} {lot.unit}</strong><small>{lot.locationId || "Emplacement non renseigné"}</small></div>)}{items.length === 0 && lots.length === 0 && <p className="muted">Aucun stock enregistré pour cette référence.</p>}</div></div></div>;
}
function ItemRow({ item, snapshot, onAssign, onRelease, busy }: { item: StockItem; snapshot: InventorySnapshot; onAssign: (itemId: string, target: AssignmentTarget) => void; onRelease: (itemId: string) => void; busy: boolean }) {
  const [target, setTarget] = useState(""); const status = item.status === "available" ? "Disponible" : item.status === "installed" ? "Installé" : item.status === "reserved" ? "Réservé" : item.status;
  const assignedTo = item.aircraftId ? snapshot.aircraft.find((x) => x.id === item.aircraftId)?.name : item.projectId ? snapshot.projects.find((x) => x.id === item.projectId)?.name : undefined;
  const targetParts = target.split(":");
  const canAssign = targetParts.length === 2 && targetParts[1] !== "";
  return <div className="item-row"><div><strong>{item.inventoryCode}</strong><small>{item.tx16Name ? `TX16 : ${item.tx16Name} · ` : ""}{item.serialNumber || "N° de série non renseigné"}</small><span className={`item-status ${item.status}`}>{status}{assignedTo ? " · " + assignedTo : ""}</span></div>{item.status === "available" && (snapshot.aircraft.length > 0 || snapshot.projects.length > 0) && <div className="item-actions"><select value={target} onChange={(e) => setTarget(e.target.value)}><option value="">Affecter à...</option>{snapshot.aircraft.length > 0 && <optgroup label="Installer sur un avion">{snapshot.aircraft.map((aircraft) => <option value={`aircraft:${aircraft.id}`} key={aircraft.id}>{aircraft.name}</option>)}</optgroup>}{snapshot.projects.length > 0 && <optgroup label="Réserver pour un projet">{snapshot.projects.map((project) => <option value={`project:${project.id}`} key={project.id}>{project.name}</option>)}</optgroup>}</select><button disabled={!canAssign || busy} onClick={() => { const [kind, id] = targetParts; if ((kind === "aircraft" || kind === "project") && id) onAssign(item.id, { kind, id }); }}>{target.startsWith("project:") ? "Réserver" : "Installer"}</button></div>}{(item.status === "installed" || item.status === "reserved") && <button className="subtle-button" disabled={busy} onClick={() => onRelease(item.id)}>Libérer</button>}</div>;
}
function ReferenceModal({ onClose, onSubmit, busy, error }: { onClose: () => void; onSubmit: (value: Omit<ComponentReference, "createdAt" | "archived">) => void; busy: boolean; error: string }) {
  const [name, setName] = useState(""); const [brand, setBrand] = useState(""); const [model, setModel] = useState(""); const [category, setCategory] = useState<ComponentCategory>("motor"); const [trackingMode, setTrackingMode] = useState<TrackingMode>("individual"); const [description, setDescription] = useState(""); const [photoPath, setPhotoPath] = useState(""); const [receiverChannels, setReceiverChannels] = useState("8"); const [receiverProtocol, setReceiverProtocol] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); onSubmit({ id: crypto.randomUUID(), name, category, trackingMode: category === "receiver" ? "individual" : trackingMode, attributes: {}, ...(category === "receiver" ? { receiverChannels: Number(receiverChannels), receiverProtocol: receiverProtocol.trim() } : {}), ...(brand ? { brand } : {}), ...(model ? { model } : {}), ...(description ? { description } : {}), ...(photoPath ? { photoPath } : {}) }); }
  return <Modal title="Nouvelle référence catalogue" onClose={onClose} error={error}><form onSubmit={submit} className="form-grid"><label>Désignation *<input required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Dualsky ECO 3520C V2" /></label><div className="form-row"><label>Catégorie<select value={category} onChange={(e) => { setCategory(e.target.value as ComponentCategory); if (e.target.value === "receiver") setTrackingMode("individual"); }}>{COMPONENT_CATEGORIES.map((x) => <option value={x} key={x}>{labels[x]}</option>)}</select></label><label>Mode de suivi<select value={trackingMode} disabled={category === "receiver"} onChange={(e) => setTrackingMode(e.target.value as TrackingMode)}><option value="individual">Exemplaires individuels</option><option value="quantity">Quantité / lot</option></select></label></div><div className="form-row"><label>Marque<input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ex. Dualsky" /></label><label>Modèle / référence<input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Référence fabricant" /></label></div>{category === "receiver" && <div className="form-row"><label>Nombre de voies *<input type="number" min="1" step="1" required value={receiverChannels} onChange={(e) => setReceiverChannels(e.target.value)} placeholder="Ex. 8" /></label><label>Protocole radio *<input required value={receiverProtocol} onChange={(e) => setReceiverProtocol(e.target.value)} placeholder="Ex. ExpressLRS, ACCESS, DSMX..." /></label></div>}<label>Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Caractéristiques principales..." /></label><label>Photo (URL ou data URI, facultatif)<input value={photoPath} onChange={(e) => setPhotoPath(e.target.value)} placeholder="https://... ou data:image/..." /></label><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Annuler</button><button className="primary" disabled={busy || !name.trim()}>Créer la référence</button></div></form></Modal>;
}
function StockModal({ reference, onClose, onSubmit, busy, error }: { reference: ComponentReference; onClose: () => void; onSubmit: (value: Omit<StockItem, "createdAt"> | StockLot) => void; busy: boolean; error: string }) {
  const [inventoryCode, setInventoryCode] = useState(reference.category === "receiver" ? "RX-" : "ITEM-"); const [tx16Name, setTx16Name] = useState(""); const [serialNumber, setSerialNumber] = useState(""); const [quantity, setQuantity] = useState("1"); const [unit, setUnit] = useState("pièce"); const [locationId, setLocationId] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); if (reference.trackingMode === "individual") onSubmit({ id: crypto.randomUUID(), referenceId: reference.id, inventoryCode, status: "available", ...(serialNumber ? { serialNumber } : {}), ...(locationId ? { locationId } : {}), ...(reference.category === "receiver" ? { tx16Name: tx16Name || inventoryCode } : {}) }); else onSubmit({ id: crypto.randomUUID(), referenceId: reference.id, quantity: Number(quantity), unit, ...(locationId ? { locationId } : {}) }); }
  return <Modal title={reference.trackingMode === "individual" ? "Ajouter un exemplaire" : "Ajouter une quantité"} onClose={onClose} error={error}><form onSubmit={submit} className="form-grid">{reference.trackingMode === "individual" ? <><label>Identifiant inventaire *<input required value={inventoryCode} onChange={(e) => setInventoryCode(e.target.value)} placeholder="RX-007" /></label>{reference.category === "receiver" && <label>Nom / identifiant dans la TX16<input value={tx16Name} onChange={(e) => setTx16Name(e.target.value)} placeholder={inventoryCode || "RX-007"} /></label>}<label>Numéro de série<input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} /></label></> : <div className="form-row"><label>Quantité *<input type="number" min="1" step="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label><label>Unité<input required value={unit} onChange={(e) => setUnit(e.target.value)} /></label></div>}<label>Emplacement (facultatif)<input value={locationId} onChange={(e) => setLocationId(e.target.value)} placeholder="Ex. boîte batteries / tiroir 3" /></label><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Annuler</button><button className="primary" disabled={busy}>Enregistrer</button></div></form></Modal>;
}
function AddAircraft({ onAdd, busy }: { onAdd: (name: string) => void; busy: boolean }) { const [name,setName]=useState(""); return <form className="inline-add" onSubmit={(e)=>{e.preventDefault();if(name.trim()){onAdd(name.trim());setName("");}}}><input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Nom du nouvel avion..." /><button className="primary" disabled={busy || !name.trim()}>＋ Ajouter un avion</button></form>; }
function AddProject({ onAdd, busy }: { onAdd: (name: string) => void; busy: boolean }) { const [name,setName]=useState(""); return <form className="inline-add" onSubmit={(e)=>{e.preventDefault();if(name.trim()){onAdd(name.trim());setName("");}}}><input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Nom du nouveau projet..." /><button className="primary" disabled={busy || !name.trim()}>＋ Ajouter un projet</button></form>; }
function Modal({ title, onClose, children, error }: { title: string; onClose: () => void; children: React.ReactNode; error?: string }) { return <div className="modal-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)onClose();}}><div className="modal"><div className="modal-header"><h2>{title}</h2><button type="button" onClick={onClose}>×</button></div>{error && <div className="error-banner modal-error" role="alert">{error}</div>}{children}</div></div>; }
export default App;
