export type ComponentIconName = "dashboard" | "inventory" | "fleet" | "projects" | "movements" | "admin" | "manual" | "motor" | "esc" | "radio" | "radio-receiver" | "radio-transmitter" | "servo" | "battery" | "supplies" | "tool" | "other";

const paths: Record<ComponentIconName, string> = {
  dashboard: "M3 3h7v7H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 14h7v7H3z",
  inventory: "M4 5h16M4 12h16M4 19h16M7 3v4m10-4v4M7 10v4m10-4v4M7 17v4m10-4v4",
  fleet: "M2 13 11 11 20 7l-5 7-4 1-3 5-2 1 1-6-5-2z",
  projects: "M4 4h16v16H4zM8 8h8M8 12h8M8 16h5",
  movements: "M4 8h15l-3-3m3 3-3 3M20 16H5l3 3m-3-3 3-3",
  admin: "M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1-2.1M15.5 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z",
  manual: "M5 3.5h10a3 3 0 0 1 3 3v14H8a3 3 0 0 0-3 0zM5 3.5v17M8 7h7m-7 4h7m-7 4h5",
  motor: "M7 7h10v10H7zM9 2v5m6-5v5m-6 10v5m6-5v5M2 9h5m10 0h5M2 15h5m10 0h5",
  esc: "M8 3h8v4H8zM10 7v5m4-5v5m-9 0h14v8H5zM9 16h6",
  radio: "M4 8a12 12 0 0 1 16 0M7 11a8 8 0 0 1 10 0m-7 3a3 3 0 0 1 4 0M12 17v4",
  "radio-receiver": "M5 8h14v11H5zM8 8V5m3 3V6m4 2V5m-8 14v2m4-2v2m4-2v2m4-2v2M7 12h4m2 0h3m-9 3h8",
  "radio-transmitter": "M6 7h12v15H6zM10 7V4m4 3V5m-6 5h8v4H8zm2 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm4-2h1m-1 2h1",
  servo: "M4 5h16v14H4zM8 9l4 3-4 3m8-6h1m-1 3h1m-1 3h1",
  battery: "M5 7h14v13H5zM9 4h6v3M8 11h8M8 15h5",
  supplies: "M5 8h14v13H5zM8 8V5h8v3M3 11h2m14 0h2M9 13h6",
  tool: "m14 5 5 5-9 9-5 1 1-5zM12 7l5 5",
  other: "M5 5h14v14H5zM8 9h8m-8 3h8m-8 3h5",
};

export function WorkshopIcon({ name, size = 18 }: { name: ComponentIconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d={paths[name]} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />{name === "radio-receiver" && <path d="M7 5a4 4 0 0 1 4 0M7 3a6 6 0 0 1 6 0" stroke="currentColor" strokeWidth="1.15" />}{name === "radio-transmitter" && <><path d="M10 4a3 3 0 0 1 4 0M9 2a5 5 0 0 1 6 0" stroke="currentColor" strokeWidth="1.15" /><circle cx="16.5" cy="18.5" r="2.6" stroke="currentColor" strokeWidth="1.2" /></>}</svg>;
}
