'use client';
import Link from 'next/link';
import { Heart, Brain, Activity } from 'lucide-react';

export type Dimension = 'emotion' | 'cognition' | 'body';

interface DimensionSummary {
  mastered: number;
  total: number;
  percent: number;
  label: string;
}

interface DimensionCardProps {
  dimension: Dimension;
  summary: DimensionSummary;
  href?: string;
}

// §6.1 ramp colors — pink (emotion) / purple (cognition) / teal (body)
const PALETTE: Record<Dimension, {
  title: string;
  cardBg: string;
  iconBg: string;
  iconColor: string;
  labelColor: string;
  valueColor: string;
  barBg: string;
  barFill: string;
  Icon: typeof Heart;
}> = {
  emotion: {
    title: 'Эмоции и общение',
    cardBg: '#FBEAF0',
    iconBg: '#ED93B1',
    iconColor: '#4B1528',
    labelColor: '#993556',
    valueColor: '#4B1528',
    barBg: '#F4C0D1',
    barFill: '#993556',
    Icon: Heart,
  },
  cognition: {
    title: 'Мышление и память',
    cardBg: '#EEEDFE',
    iconBg: '#AFA9EC',
    iconColor: '#26215C',
    labelColor: '#534AB7',
    valueColor: '#26215C',
    barBg: '#CECBF6',
    barFill: '#534AB7',
    Icon: Brain,
  },
  body: {
    title: 'Тело и движение',
    cardBg: '#E1F5EE',
    iconBg: '#5DCAA5',
    iconColor: '#04342C',
    labelColor: '#0F6E56',
    valueColor: '#04342C',
    barBg: '#9FE1CB',
    barFill: '#0F6E56',
    Icon: Activity,
  },
};

export default function DimensionCard({ dimension, summary, href }: DimensionCardProps) {
  const p = PALETTE[dimension];
  const Icon = p.Icon;
  const pct = Math.max(0, Math.min(100, summary.percent));
  const neutral = summary.label === 'Только знакомимся';

  const inner = (
    <div
      className="flex items-center gap-3 rounded-2xl px-3 py-3 transition-transform hover:scale-[1.01]"
      style={{ background: p.cardBg }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ background: p.iconBg, color: p.iconColor }}
      >
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium tracking-wide" style={{ color: p.labelColor }}>
          {p.title}
        </div>
        <div className="text-sm font-medium truncate" style={{ color: p.valueColor }}>
          {summary.label}
        </div>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden shrink-0"
        style={{ width: 56, background: p.barBg }}
        aria-label={`${summary.mastered} из ${summary.total}`}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: neutral ? '0%' : `${pct}%`, background: p.barFill }}
        />
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} aria-label={p.title}>{inner}</Link>;
  }
  return inner;
}
