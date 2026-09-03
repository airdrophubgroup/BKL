import type { Metadata, Viewport } from 'next';
import { WorldcoinProvider } from '@/lib/worldcoin-context';
import AppGuard from '@/components/AppGuard';
import './globals.css';

export const metadata: Metadata = {
  title: 'Beediyo Kall',
  description: 'Random Video Chat — Connect with people worldwide',
  manifest: '/manifest.json',
  themeColor: '#0a0f1f',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Beediyo Kall',
  },
  other: {
    'worldcoin-app-id': process.env.NEXT_PUBLIC_WORLDCOIN_APP_ID ?? '',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0a0f1f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="overscroll-none">
      <body className="overscroll-none">
        <WorldcoinProvider>
          <AppGuard>{children}</AppGuard>
        </WorldcoinProvider>
      </body>
    </html>
  );
}
