import './globals.css';
import { AuthProvider } from '../lib/authContext';
import { ThemeProvider } from '../components/ThemeProvider';
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#090d16' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
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
