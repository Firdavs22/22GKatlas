import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'ghost' | 'outline' | 'subtle' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const VARIANTS = {
  primary: 'bg-brand text-white hover:bg-brand/90 disabled:bg-brand/50',
  ghost: 'text-brand hover:bg-brand-pale/60',
  outline: 'border border-slate-200 bg-white text-foreground hover:bg-slate-50',
  subtle: 'bg-brand-pale/60 text-brand hover:bg-brand-pale',
  danger: 'bg-danger text-white hover:bg-danger/90 disabled:bg-danger/40',
};

const SIZES = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
