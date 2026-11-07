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
      <path d="M8 31 35 30 46 25 50 15 55 15 59 25 83 31 92 34 92 37 59 39 55 49 50 49 46 41 35 38 8 37z" fill={steel} />
      <path d="m18 32 18-1m11-6 5-9m7 9 22 6m-22 8 22-1m-32 2 5 9" stroke={highlight} strokeWidth=".8" />
      <path d="m14 33 23-1m-22 4 22 1" stroke="#d1fbff" strokeWidth=".45" opacity=".8" />
      <circle cx="95" cy="35.5" r="2.2" fill="#b8f6ff" strokeWidth=".7" />
      <path d="M95 27v17m-3.5-8.5h7" stroke="#d6fbff" strokeWidth="1" />
    </g>}
    {type === "glider" && <g {...stroke}>
      <path d="M4 31 45 32 52 3h4l-1 29 30 2 11 2-1 2-40-1 1 29h-4l-7-29L4 37z" fill={steel} />
      <path d="M7 32 45 33m-36 3 36 1m7-4 4-28m-4 32 1 26" stroke={highlight} strokeWidth=".72" />
      <path d="m45 32 9-2m-9 7 9 2m-14-4-8 1" stroke="#d8fcff" strokeWidth=".55" />
    </g>}
    {type === "motor-glider" && <g {...stroke}>
      <path d="M7 30 43 31 51 7h4l-1 25 29 2 11 2-1 2-39-1 1 24h-4l-8-25L7 37z" fill={steel} />
      <path d="m12 31 31 1m-30 4 30 1m8-5 4-23m-4 30 1 21" stroke={highlight} strokeWidth=".72" />
      <path d="M86 33h7l3 3-3 3h-7" fill="#8be9fb" strokeWidth=".9" />
      <circle cx="98" cy="36" r="1.6" fill="#d6fbff" strokeWidth=".7" />
      <path d="M98 29v14m-3-10 6 6m0-6-6 6" stroke="#d6fbff" strokeWidth="1.05" />
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
