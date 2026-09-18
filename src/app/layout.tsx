import type { Metadata, Viewport } from 'next';
import { Barlow, Source_Serif_4 } from 'next/font/google';

import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import { waterlooTheme } from '@/lib/university-theme';

import './globals.css';

const barlow = Barlow({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-barlow',
  weight: ['400', '500', '600', '700', '900'],
});

const sourceSerif = Source_Serif_4({
  display: 'swap',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-source-serif',
  weight: '400',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Trovun Waterloo | Student Marketplace',
    template: '%s | Trovun Waterloo',
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: 'Trovun' }],
  creator: 'Trovun',
  publisher: 'Trovun',
  category: 'student marketplace',
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_CA',
    siteName: 'Trovun',
    title: 'Trovun Waterloo | Student Marketplace',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Trovun — the student marketplace for Waterloo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trovun Waterloo | Student Marketplace',
    description: SITE_DESCRIPTION,
    images: ['/opengraph-image'],
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: waterlooTheme.colors.ink,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" data-university={waterlooTheme.id} lang="en">
      <body className={`${barlow.variable} ${sourceSerif.variable}`}>{children}</body>
    </html>
  );
}
