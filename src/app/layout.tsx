import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { BottomNav } from '@/components/BottomNav';
import { AuthWatcher } from '@/components/AuthWatcher';

export const metadata: Metadata = {
  title: 'Woolves Life OS',
  description: 'Seu sistema operacional pessoal gamificado.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icons/favicon-16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Woolves',
  },
  other: {
    // Standard equivalent of apple-mobile-web-app-capable (silences the
    // deprecation warning while keeping the Apple meta for older iOS).
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="font-sans">
        <Providers>
          <AuthWatcher />
          <div className="app-aura min-h-screen">
            <div className="mx-auto min-h-screen w-full max-w-app">
              {children}
            </div>
          </div>
          <BottomNav />
        </Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
