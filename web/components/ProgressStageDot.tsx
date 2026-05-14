type Stage = 'none' | 'presented' | 'practicing' | 'mastered';

interface ProgressStageDotProps {
  stage: Stage;
  size?: number;
}

/** 4-stage circular indicator matching the prototype legend.
 *  none → empty outlined circle
 *  presented → half-filled peach (left half)
 *  practicing → half-filled blue (left half)
 *  mastered → solid green
 */
export default function ProgressStageDot({ stage, size = 22 }: ProgressStageDotProps) {
  const r = size / 2;
  const stroke = '#CBD5E1';

  if (stage === 'none') {
    return (
      <svg width={size} height={size} aria-hidden>
        <circle cx={r} cy={r} r={r - 1} fill="white" stroke={stroke} strokeWidth={1} />
      </svg>
    );
  }
  if (stage === 'mastered') {
    return (
      <svg width={size} height={size} aria-hidden>
        <circle cx={r} cy={r} r={r - 1} fill="#83C696" />
      </svg>
    );
  }
  const half = stage === 'presented' ? '#F1C49E' : '#7EB3E4';
  return (
    <svg width={size} height={size} aria-hidden>
      <circle cx={r} cy={r} r={r - 1} fill="white" stroke={stroke} strokeWidth={1} />
      <path
        d={`M ${r} 1 A ${r - 1} ${r - 1} 0 0 1 ${r} ${size - 1} Z`}
        fill={half}
      />
    </svg>
  );
}

export const STAGE_ORDER: Stage[] = ['none', 'presented', 'practicing', 'mastered'];
export const STAGE_LABEL: Record<Stage, string> = {
  none: 'Не начат',
  presented: 'Знакомство',
  practicing: 'Повторение',
  mastered: 'Усвоено',
};
