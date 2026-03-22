'use client';
import NavBar from './NavBar';
import { useRouter } from 'next/navigation';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
}

export default function PageLayout({ children, title, showBackButton }: PageLayoutProps) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          {showBackButton && (
            <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-900 border bg-white p-1 rounded-lg">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
          )}
          {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
        </div>
        {children}
      </main>
    </div>
  );
}
