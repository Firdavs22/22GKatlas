import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  tone?: 'neutral' | 'brand' | 'success' | 'warn' | 'danger';
  dot?: boolean;
}

const TONES = {
  neutral: 'bg-slate-100 text-slate-600',
  brand: 'bg-brand-pale text-brand',
  success: 'bg-success/20 text-emerald-700',
  warn: 'bg-warn/30 text-orange-700',
  danger: 'bg-danger/20 text-red-700',
};

const DOT_COLORS = {
  neutral: 'bg-slate-400',
  brand: 'bg-brand',
  success: 'bg-success',
  warn: 'bg-warn',
  danger: 'bg-danger',
};

export default function Badge({ children, tone = 'neutral', dot = false }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[tone]}`} />}
      {children}
    </span>
  );
}
