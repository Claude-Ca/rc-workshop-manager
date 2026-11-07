import { useState, type ReactNode } from "react";
import home from "../../../../../docs/wiki/Home.md?raw";
import gettingStarted from "../../../../../docs/wiki/Prise-en-main.md?raw";
import inventory from "../../../../../docs/wiki/Inventaire.md?raw";
import fleet from "../../../../../docs/wiki/Ma-flotte.md?raw";
import radioAndBatteries from "../../../../../docs/wiki/Radio-et-batteries.md?raw";
import administration from "../../../../../docs/wiki/Administration.md?raw";
import backup from "../../../../../docs/wiki/Sauvegarde-et-restauration.md?raw";
import faq from "../../../../../docs/wiki/FAQ-et-limites.md?raw";
import appIcon from "./assets/brand/icone.png";
import welcomeAircraft from "./assets/brand/welcome-aircraft.png";
import { AircraftTypeIcon } from "./AircraftTypeIcon.js";
import { WorkshopIcon, type ComponentIconName } from "./WorkshopIcon.js";

type ManualPageId = "home" | "getting-started" | "inventory" | "fleet" | "radio" | "administration" | "backup" | "faq";
type ManualPage = { id: ManualPageId; title: string; icon: ComponentIconName; markdown: string };

const pages: ManualPage[] = [
  { id: "home", title: "Accueil du manuel", icon: "dashboard", markdown: home },
  { id: "getting-started", title: "Prise en main", icon: "dashboard", markdown: gettingStarted },
  { id: "inventory", title: "Inventaire", icon: "inventory", markdown: inventory },
  { id: "fleet", title: "Ma flotte", icon: "fleet", markdown: fleet },
  { id: "radio", title: "Radio et batteries", icon: "radio", markdown: radioAndBatteries },
  { id: "administration", title: "Administration", icon: "admin", markdown: administration },
  { id: "backup", title: "Sauvegarde et restauration", icon: "other", markdown: backup },
  { id: "faq", title: "FAQ et limites", icon: "other", markdown: faq },
];

const pageLinks: Record<string, ManualPageId> = {
  "Prise-en-main": "getting-started",
  "Inventaire": "inventory",
  "Ma-flotte": "fleet",
  "Radio-et-batteries": "radio",
  "Administration": "administration",
  "Sauvegarde-et-restauration": "backup",
  "FAQ-et-limites": "faq",
};

export function UserManual() {
  const [selectedId, setSelectedId] = useState<ManualPageId>("home");
  const selected = pages.find((page) => page.id === selectedId) ?? pages[0]!;

  return <section className="content user-manual-page">
    <header className="manual-hero">
      <img className="manual-hero-aircraft" src={welcomeAircraft} alt="" />
      <div className="manual-hero-copy">
        <div className="manual-brand"><img src={appIcon} alt="" /><span>RC WORKSHOP MANAGER · GUIDE UTILISATEUR</span></div>
        <h2>Le manuel de votre atelier</h2>
        <p>Retrouvez les explications et les parcours utiles directement dans l’application.</p>
      </div>
    </header>
    <div className="manual-layout">
      <nav className="manual-navigation" aria-label="Rubriques du manuel">
        <span className="eyebrow">SOMMAIRE</span>
        {pages.map((page) => <button key={page.id} type="button" className={selectedId === page.id ? "manual-nav-item active" : "manual-nav-item"} aria-current={selectedId === page.id ? "page" : undefined} onClick={() => setSelectedId(page.id)}>
          <WorkshopIcon name={page.icon} size={17} /><span>{page.title}</span>
        </button>)}
      </nav>
      <article className="manual-article">
        <div className="manual-article-heading">
          <div className="manual-article-icon">{selectedId === "fleet" ? <AircraftTypeIcon type="airplane" size={42} /> : <WorkshopIcon name={selected.icon} size={23} />}</div>
          <div><span className="eyebrow">MANUEL UTILISATEUR</span><h2>{selected.title}</h2></div>
        </div>
        <MarkdownContent markdown={selected.markdown} navigate={setSelectedId} />
      </article>
    </div>
  </section>;
}

function inlineMarkdown(text: string, navigate: (id: ManualPageId) => void): ReactNode[] {
  const pattern = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*)/g;
  const output: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) output.push(text.slice(cursor, index));
    const whole = match[0];
    if (match[2] && match[3]) {
      const destination = match[3].replace(/\.md$/, "").replace(/^\.\//, "");
      const pageId = pageLinks[destination];
      output.push(pageId
        ? <button key={index} type="button" className="manual-inline-link" onClick={() => navigate(pageId)}>{match[2]}</button>
        : <a key={index} href={match[3]} target={match[3].startsWith("http") ? "_blank" : undefined} rel={match[3].startsWith("http") ? "noreferrer" : undefined}>{match[2]}</a>);
    } else {
      output.push(<strong key={index}>{match[4]}</strong>);
    }
    cursor = index + whole.length;
  }
  if (cursor < text.length) output.push(text.slice(cursor));
  return output;
}

function MarkdownContent({ markdown, navigate }: { markdown: string; navigate: (id: ManualPageId) => void }) {
  const lines = markdown.replaceAll("\r", "").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index]!.trim();
    if (!line) { index += 1; continue; }
    if (line.startsWith("#")) {
      const level = Math.min((line.match(/^#+/)?.[0].length ?? 2) + 1, 4);
      const title = line.replace(/^#+\s*/, "");
      const heading = inlineMarkdown(title, navigate);
      blocks.push(level <= 2 ? <h2 key={index}>{heading}</h2> : level === 3 ? <h3 key={index}>{heading}</h3> : <h4 key={index}>{heading}</h4>);
      index += 1;
      continue;
    }
    if (line.startsWith("> ")) {
      const quote: string[] = [];
      while (index < lines.length && lines[index]!.trim().startsWith("> ")) quote.push(lines[index++]!.trim().slice(2));
      blocks.push(<blockquote key={index}>{quote.map((item, part) => <p key={part}>{inlineMarkdown(item, navigate)}</p>)}</blockquote>);
      continue;
    }
    if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*] /.test(lines[index]!)) items.push(lines[index++]!.trim().slice(2));
      blocks.push(<ul key={index}>{items.map((item, part) => <li key={part}>{inlineMarkdown(item, navigate)}</li>)}</ul>);
      continue;
    }
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\. /.test(lines[index]!)) items.push(lines[index++]!.trim().replace(/^\d+\. /, ""));
      blocks.push(<ol key={index}>{items.map((item, part) => <li key={part}>{inlineMarkdown(item, navigate)}</li>)}</ol>);
      continue;
    }
    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index]!.trim() && !/^\s*(#{1,4} |[-*] |\d+\. |> )/.test(lines[index]!)) paragraph.push(lines[index++]!.trim());
    blocks.push(<p key={index}>{inlineMarkdown(paragraph.join(" "), navigate)}</p>);
  }
  return <div className="manual-markdown">{blocks}</div>;
}
