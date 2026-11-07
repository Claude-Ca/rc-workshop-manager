import type { AircraftType } from "@rc-workshop/core";

const labels: Record<AircraftType, string> = {
  airplane: "Avion", glider: "Planeur", "motor-glider": "Motoplaneur",
  helicopter: "Hélicoptère", multirotor: "Multirotor", other: "Autre aéronef",
};

const silhouettes: Record<AircraftType, string> = {
  airplane: "M4 11.5 20 8l20-4-10 10-7 2-5 7-3 1 2-8-6-3z",
  glider: "M2 12 22 10l8-7 3 1-5 6 14 2v2l-16 1-9 7-2-1 4-7-17-1z",
  "motor-glider": "M2 12 21 10l9-7 3 1-5 6 14 2v2l-16 1-8 7-2-1 3-7-17-1z M22 9l2-5 3-1 1 5",
  helicopter: "M5 13h25a4 4 0 0 1 4 4v1H9a4 4 0 0 1-4-4z M20 13l2-5h5l3 5M9 8h22M18 7h5M28 7h5M17 18l-3 4m18-4 3 4",
  multirotor: "M20 17h8l2-3 2 3h8M24 16V9m4 7V9M22 8h8m-9-2a2 2 0 1 1-4 0 2 2 0 0 1 4 0m13 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
  other: "M4 13 21 10l11-6-4 8 8 4-1 2-12-3-6 7-2-1 2-8-13 2z",
};

export function AircraftTypeIcon({ type, size = 28, className = "" }: { type: AircraftType; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 44 28" fill="none" role="img" aria-label={labels[type]} focusable="false">
    <path d={silhouettes[type]} stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" strokeLinecap="round" />
    {type === "airplane" && <path d="m7 12 7 3m13-5-5 8" stroke="currentColor" strokeWidth=".8" opacity=".65" />}
    {type === "glider" && <path d="m10 12 10 1m2-2-3 9m7-9 11 1" stroke="currentColor" strokeWidth=".8" opacity=".65" />}
  </svg>;
}
