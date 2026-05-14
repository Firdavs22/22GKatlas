import { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'pale' | 'brand';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const VARIANTS = {
  default: 'bg-white border border-slate-200',
  pale: 'bg-brand-pale/40 border border-brand-pale',
  brand: 'bg-brand text-white border border-brand',
};

const PADDINGS = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...rest
}: CardProps) {
  return (
    <div
      className={`rounded-2xl ${VARIANTS[variant]} ${PADDINGS[padding]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
