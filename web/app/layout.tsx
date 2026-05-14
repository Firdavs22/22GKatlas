import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Instrument_Serif, Lora } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

const geist = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-sans',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif-latin',
  display: 'swap',
});

const lora = Lora({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GloboAtlas — Монтессори',
  description: 'Система управления детским садом',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${geist.variable} ${instrumentSerif.variable} ${lora.variable}`}>
      <body className="antialiased bg-background text-foreground font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
