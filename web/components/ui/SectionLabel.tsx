import { ReactNode } from 'react';

export default function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
      {children}
    </div>
  );
}
