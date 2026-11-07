import { useId } from "react";
import type { AircraftType } from "@rc-workshop/core";

const labels: Record<AircraftType, string> = {
  airplane: "Avion", glider: "Planeur", "motor-glider": "Motoplaneur",
  helicopter: "Hélicoptère", multirotor: "Multirotor", other: "Autre aéronef",
};

export function AircraftTypeIcon({ type, size = 40, className = "" }: { type: AircraftType; size?: number; className?: string }) {
  const gradientId = useId().replaceAll(":", "");
  const steel = `url(#${gradientId}-steel)`;
  const highlight = `url(#${gradientId}-highlight)`;
  const outline = "currentColor";
  const stroke = { stroke: outline, strokeWidth: 1.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

  return <svg className={className} width={size} height={size * 0.68} viewBox="0 0 100 68" fill="none" role="img" aria-label={labels[type]} focusable="false">
    <defs>
      <linearGradient id={`${gradientId}-steel`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#9af3ff" /><stop offset=".25" stopColor="#3d9bc8" /><stop offset=".58" stopColor="#183b72" /><stop offset="1" stopColor="#78dff2" /></linearGradient>
      <linearGradient id={`${gradientId}-highlight`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#2877b1" /><stop offset=".5" stopColor="#c1fbff" /><stop offset="1" stopColor="#36b9dc" /></linearGradient>
    </defs>
    {type === "airplane" && <g {...stroke}>
      <path d="M8 31 38 28 56 8l5 1-8 20 30 4 9 3v3l-39-1 5 19-5 2-15-21-30-1z" fill={steel} />
      <path d="m20 31 22 1m-4-3 18-19m-6 21 27 4m-28 1 4 17" stroke={highlight} strokeWidth=".8" />
      <path d="m14 32 23 2m-18 2 20 1" stroke="#d1fbff" strokeWidth=".45" opacity=".8" />
      <path d="M43 34h8l2 2-2 2h-8z" fill="#b8f6ff" strokeWidth=".7" />
    </g>}
    {type === "glider" && <g {...stroke}>
      <path d="M4 30 44 31 53 7h3l-4 24 27 1 15 3-1 3-41-1 4 20-3 1-13-21L4 38z" fill={steel} />
      <path d="m10 32 34 1M20 34l24 1m10-5 3-21m-4 26 3 17m-20-14-11 9" stroke={highlight} strokeWidth=".75" />
      <path d="m45 32 8-2m-8 7 9 2" stroke="#d8fcff" strokeWidth=".55" />
    </g>}
    {type === "motor-glider" && <g {...stroke}>
      <path d="M6 29 43 30 52 8h3l-4 22 29 2 14 3-1 3-42-1 4 19-3 1-13-21L6 37z" fill={steel} />
      <path d="m11 31 32 1M19 34l24 1m10-5 3-20m-4 27 3 15" stroke={highlight} strokeWidth=".75" />
      <path d="M80 33h8l3 3-3 3h-8" fill="#8be9fb" strokeWidth=".9" />
      <path d="M92 28v16m-3-13 6 10m0-10-6 10" stroke="#d6fbff" strokeWidth="1.05" />
    </g>}
    {type === "helicopter" && <g {...stroke}>
      <path d="m14 34 14-4 11 3v8l-11 4-14-4z" fill={steel} />
      <path d="m39 36 34-2v4l-34 2" fill={highlight} />
      <path d="m73 32 5-5 4 1 2 6m-8 5 5 5 4-1 1-6" fill={steel} />
      <path d="m20 30 4-8h13l5 10M17 21h27m-18-3h9m-5 14v2m-8 12-4 5m26-6 4 5" />
      <path d="m13 34 4 3-4 3m-2-6v6M21 24h14" stroke={highlight} strokeWidth=".8" />
    </g>}
    {type === "multirotor" && <g {...stroke}>
      <path d="m50 24 9 8 10-9 3 3-9 10 9 9-3 3-10-9-9 9-3-3 9-9-9-10z" fill={steel} />
      <path d="M17 16h19v4H17zM64 16h19v4H64zM17 48h19v4H17zM64 48h19v4H64z" fill={highlight} />
      <path d="m34 20 15 12m17-12L53 32M34 48l15-12m17 12L53 36" />
      <circle cx="27" cy="18" r="5" fill={steel} /><circle cx="73" cy="18" r="5" fill={steel} /><circle cx="27" cy="50" r="5" fill={steel} /><circle cx="73" cy="50" r="5" fill={steel} />
      <circle cx="51" cy="34" r="4" fill="#baf8ff" />
    </g>}
    {type === "other" && <g {...stroke}>
      <path d="m7 34 34-4 12-14 5 1-5 14 39 3 2 3-41 3 5 14-5 1-12-15-34-4z" fill={steel} />
      <path d="m17 33 25-2m-1 7 13 14m-1-37 3 14m-17 6h9" stroke={highlight} strokeWidth=".8" />
      <path d="m42 30 5 4-5 4z" fill="#d2fbff" strokeWidth=".7" />
    </g>}
  </svg>;
}
