import { ReactNode } from 'react';

interface PageTitleProps {
  children: ReactNode;
  size?: 'lg' | 'xl' | '2xl';
}

const SIZES = {
  lg: 'text-3xl',
  xl: 'text-4xl',
  '2xl': 'text-5xl',
};

export default function PageTitle({ children, size = 'lg' }: PageTitleProps) {
  return (
    <h1 className={`font-serif ${SIZES[size]} leading-tight text-foreground`}>
      {children}
    </h1>
  );
}
