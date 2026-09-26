import './globals.css';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Inter, Montserrat } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { getSiteSettings } from '@/lib/site-settings';
import { Toaster } from '@/components/ui/toaster';
import AuthHeader from '@/components/layout/auth-header';
import Footer from '@/components/layout/footer';
import { SupabaseProvider } from '@/components/providers/supabase-provider';
import { RouteLoadingProvider } from '@/components/route-loading-provider';
import RouteLoadingOverlay from '@/components/route-loading-overlay';
import { cookies } from 'next/headers';
import {    
  DEFAULT_LOCALE, 
  LANGUAGE_COOKIE_KEY, 
  readLocaleFromCookieValue,
} from '@/lib/i18n';
import { LanguageProvider } from '@/components/providers/language-provider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});
 
const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
});  
     
const siteName = 'Warka Learn';
const siteDescription =
  'Warka Learn is an online learning platform for practical skills, business training, English learning, and technology education in Ethiopia.';
const baseUrl = 'https://warka.site';
const logoUrl = `${baseUrl}/assets/Icon/android-chrome-512x512.png`;
   
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteName,
  url: baseUrl,
  logo: logoUrl,
  description: siteDescription,
  sameAs: ['https://www.facebook.com/warkalearn', 'https://www.linkedin.com/company/warka-learn'],
};   
   
export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: `${siteName} | Online Courses, Business Skills & English Learning`,
    template: `%s | ${siteName}`,
  },    
  description: siteDescription,
  keywords: [
    'Warka',
    'Warka Learn',
    'Warka Site',
    'Warka online learning',
    'warka learning platform',
    'warka language courses',
    'online courses',
    'Ethiopia',
    'technology courses',
    'business courses',
    'English learning',
    'learn online',
    'professional training',
  ],   
  applicationName: siteName,
  category: 'education',
  creator: 'Warka Learn',
  publisher: 'Warka Learn',
  alternates: {
    canonical: '/',
    languages: {
      en: baseUrl,
    },   
  },   
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: `${siteName} | Learn practical skills online`,
    description: siteDescription,
    url: baseUrl,
    siteName,
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: logoUrl,
        width: 512,
        height: 512,
        alt: `${siteName} logo`,
      },   
    ],  
  },   
  twitter: {
    card: 'summary_large_image',
    title: `${siteName} | Learn practical skills online`,
    description: siteDescription,
    images: [logoUrl],
  },
  icons: {
    icon: [
      { url: '/assets/Icon/favicon.ico', sizes: 'any' },
      { url: '/assets/Icon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/assets/Icon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],   
    shortcut: '/assets/Icon/favicon.ico',
    apple: '/assets/Icon/apple-touch-icon.png',
  },   
  manifest: '/assets/Icon/site.webmanifest',
};   
   
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();
  const defaultTheme = settings?.default_theme ?? 'dark';
  const cookieStore = cookies();
  const initialLocale =
    readLocaleFromCookieValue(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value) ??
    DEFAULT_LOCALE;

  return (
    <html lang={initialLocale} suppressHydrationWarning>
      <body className={`${inter.variable} ${montserrat.variable} font-sans min-h-screen flex flex-col`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme={defaultTheme}
          enableSystem
        >
          <LanguageProvider initialLocale={initialLocale}>
            <SupabaseProvider>
              <Suspense fallback={null}>
                <RouteLoadingProvider>
                  <RouteLoadingOverlay />
                 <AuthHeader />
                  <main className="flex-grow w-full">
                    {children}
                  </main>
                  <Footer />
                  <Toaster />
                </RouteLoadingProvider>
              </Suspense>
            </SupabaseProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );      
}  