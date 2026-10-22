import './globals.css';
import { AuthProvider } from '../lib/authContext';
import { ThemeProvider } from '../components/ThemeProvider';
import AppShell from '../components/AppShell';

export const metadata = {
  title: 'UtilityPay | B2B Vendor Invoicing & Rental Management',
  description: 'Enterprise B2B fintech vendor invoicing and commercial rental payouts engine.',
  manifest: '/manifest.json',
  applicationName: 'UtilityPay',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'UtilityPay',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#090D16',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#090D16" />
        <meta name="apple-mobile-web-app-title" content="UtilityPay" />
        <meta name="application-name" content="UtilityPay" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="bg-slate-100 dark:bg-black text-slate-900 dark:text-slate-100 antialiased selection:bg-indigo-500 selection:text-white min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
