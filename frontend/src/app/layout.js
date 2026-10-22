import './globals.css';
import { AuthProvider } from '../lib/authContext';
import AppShell from '../components/AppShell';

export const metadata = {
  title: 'UtilityPay | B2B Vendor Invoicing & Rental Management',
  description: 'Enterprise B2B fintech vendor invoicing and commercial rental payouts engine.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'UtilityPay',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f172a',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body className="bg-black text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
