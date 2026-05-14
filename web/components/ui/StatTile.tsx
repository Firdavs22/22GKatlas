import { ReactNode } from 'react';

interface StatTileProps {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
}

export default function StatTile({ label, value, unit, hint }: StatTileProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-serif text-3xl leading-none text-foreground">{value}</span>
        {unit && <span className="text-sm text-slate-500">{unit}</span>}
      </div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
