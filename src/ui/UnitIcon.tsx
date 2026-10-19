import type { UnitId } from '../engine/config';

// Simple line icons per unit. Unknown units fall back to the first letter of their name.
const PATHS: Record<string, JSX.Element> = {
  soldier: (
    <>
      <path d="M12 3v13" />
      <path d="M8 16h8" />
      <path d="M12 16v4" />
      <path d="M10.5 5.5 12 3l1.5 2.5" />
    </>
  ),
  guard: <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3z" />,
  lancer: (
    <>
      <path d="M5 19 17 7" />
      <path d="M14 4h6v6l-3-3z" fill="currentColor" />
    </>
  ),
  tower: (
    <>
      <path d="M6 20V9h12v11z" />
      <path d="M6 9V5h2.5v2h2V5h3v2h2V5H18v4" />
      <path d="M10.5 20v-4h3v4" />
    </>
  ),
};

export default function UnitIcon({ unit, name, className }: { unit: UnitId; name: string; className?: string }) {
  const p = PATHS[unit];
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {p ?? (
        <text x="12" y="16.5" textAnchor="middle" fontSize="13" fontWeight="800" fill="currentColor" stroke="none">
          {name.slice(0, 1)}
        </text>
      )}
    </svg>
  );
}
