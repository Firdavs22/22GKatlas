'use client';
import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import AppSidebar from './AppSidebar';
import { SectionLabel, PageTitle } from './ui';

interface PageLayoutProps {
  children: ReactNode;
  title?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  showBackButton?: boolean;
  /** Use wider max-width for table-heavy pages. */
  wide?: boolean;
  /** Full-bleed: no max-width, only side padding. */
  full?: boolean;
}

export default function PageLayout({
  children,
  title,
  eyebrow,
  actions,
  showBackButton,
  wide,
  full,
}: PageLayoutProps) {
  const router = useRouter();
  // All pages are full-bleed by default (no max-w). `wide` and `full` are kept
  // as accepted props for backward compatibility but no longer affect width.
  void wide;
  void full;
  const maxW = '';

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 min-w-0">
        <div className={`${maxW} px-6 lg:px-10 py-8`}>
          {(title || actions || showBackButton) && (
            <header className="mb-8 flex items-start justify-between gap-6">
              <div className="min-w-0 flex-1">
                {showBackButton && (
                  <button
                    onClick={() => router.back()}
                    className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-foreground"
                  >
                    <ArrowLeft size={16} />
                    Назад
                  </button>
                )}
                {eyebrow && (
                  <div className="mb-2">
                    <SectionLabel>{eyebrow}</SectionLabel>
                  </div>
                )}
                {title && <PageTitle>{title}</PageTitle>}
              </div>
              {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
            </header>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
