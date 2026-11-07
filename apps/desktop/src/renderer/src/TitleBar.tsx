import { useEffect, useState } from "react";
import appIcon from "./assets/brand/icone.png";

function WindowGlyph({ kind }: { kind: "minimize" | "maximize" | "restore" | "close" }) {
  if (kind === "minimize") return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" /></svg>;
  if (kind === "close") return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg>;
  if (kind === "restore") return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 5V3h8v8h-2M3 5h8v8H3z" /></svg>;
  return <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="3.5" width="9" height="9" /></svg>;
}

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("rc-workshop-theme");
    return saved === "light" ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("rc-workshop-theme", theme);
    void window.rcWorkshop.isWindowMaximized().then(setMaximized);
  }, [theme]);

  useEffect(() => window.rcWorkshop.onWindowMaximizedChange(setMaximized), []);

  async function toggleMaximize() {
    setMaximized(await window.rcWorkshop.toggleMaximizeWindow());
  }

  return <header className="app-titlebar" aria-label="Barre de titre de la fenêtre">
    <div className="titlebar-brand" aria-label="RC Workshop Manager">
      <img src={appIcon} alt="" />
      <span>RC Workshop Manager</span>
    </div>
    <div className="titlebar-drag-space" onDoubleClick={() => void toggleMaximize()} aria-hidden="true" />
    <button className="titlebar-button theme-toggle" type="button" aria-label={theme === "dark" ? "Activer le thème clair" : "Activer le thème sombre"} aria-pressed={theme === "light"} title={theme === "dark" ? "Thème clair" : "Thème sombre"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      {theme === "dark" ? <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3.5" /><path d="M10 1.8v2M10 16.2v2M1.8 10h2m12.4 0h2M4.2 4.2l1.4 1.4m8.8 8.8 1.4 1.4m0-11.6-1.4 1.4m-8.8 8.8-1.4 1.4" /></svg> : <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15.8 12.2A7.2 7.2 0 0 1 7.8 4.1 7.3 7.3 0 1 0 15.8 12.2Z" /></svg>}
    </button>
    <button className="titlebar-button" type="button" aria-label="Réduire" title="Réduire" onClick={() => void window.rcWorkshop.minimizeWindow()}><WindowGlyph kind="minimize" /></button>
    <button className="titlebar-button" type="button" aria-label={maximized ? "Restaurer" : "Agrandir"} title={maximized ? "Restaurer" : "Agrandir"} onClick={() => void toggleMaximize()}><WindowGlyph kind={maximized ? "restore" : "maximize"} /></button>
    <button className="titlebar-button close-button" type="button" aria-label="Fermer" title="Fermer" onClick={() => void window.rcWorkshop.closeWindow()}><WindowGlyph kind="close" /></button>
  </header>;
}
