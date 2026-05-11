import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/providers/auth-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { UserThemeProvider } from "@/components/providers/user-theme-provider";
import VisitTracker from "@/components/VisitTracker";
import LoginModal from '@/components/LoginModal';
import RegisterModal from '@/components/RegisterModal';
import FaviconLoader from '@/components/FaviconLoader';
import GlobalPreloader from '@/components/GlobalPreloader';
import TelegramModalWrapper from '@/components/TelegramModalWrapper';
import StructuredData from '@/components/StructuredData';
import { SITE_CONFIG } from '@/lib/site-config';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "arial"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ["monospace"],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0f172a',
};

export async function generateMetadata(): Promise<Metadata> {
  const siteName = SITE_CONFIG.siteName;
  const siteLogo = SITE_CONFIG.siteLogo || '/logo.webp';
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lykibom.com';
  const siteDescription = `${siteName} - Puan kazan, rütbe atla, ödüller kazan! Blackjack, rulet, çark oyunları ve daha fazlası. Günlük görevler, etkinlikler ve çekilişlerle kazanma şansını yakala.`;

  return {
    title: {
      default: `${siteName} | Puan Kazan, Ödüller Kazan`,
      template: `%s | ${siteName}`
    },
    description: siteDescription,
    keywords: [
      siteName.toLowerCase(),
      "puan kazan",
      "rütbe sistemi",
      "ödül",
      "çekiliş",
      "etkinlik",
      "blackjack",
      "rulet",
      "çark oyunu",
      "günlük görevler",
      "online oyun",
      "ücretsiz oyun",
      "bonus",
      "promosyon"
    ],
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: siteUrl,
    },
    icons: {
      icon: { url: siteLogo, type: 'image/webp' },
      apple: { url: siteLogo, type: 'image/webp' },
      shortcut: { url: siteLogo, type: 'image/webp' },
    },
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      title: `${siteName} | Puan Kazan, Ödüller Kazan`,
      description: siteDescription,
      url: siteUrl,
      siteName: siteName,
      type: "website",
      locale: "tr_TR",
      images: [
        {
          url: `${siteUrl}${siteLogo}`,
          width: 1200,
          height: 630,
          alt: `${siteName} - Puan Kazan, Ödüller Kazan`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${siteName} | Puan Kazan, Ödüller Kazan`,
      description: siteDescription,
      images: [`${siteUrl}${siteLogo}`],
    },
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        noimageindex: false,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      // Google Search Console doğrulama kodu buraya eklenecek
      // google: 'your-google-verification-code',
    },
    category: 'entertainment',
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        {/* Preconnect - Kritik kaynaklar için erken bağlantı */}
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />



        {/* Kritik CSS - Render blocking'i azalt */}
        <style dangerouslySetInnerHTML={{__html: `
          *{box-sizing:border-box;margin:0;padding:0}
          html,body{overflow-x:hidden;max-width:100vw}
          body{font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#0f172a;color:#fff;line-height:1.5;-webkit-font-smoothing:antialiased}
          .preloader{position:fixed;inset:0;background:linear-gradient(135deg,#020617,#0f172a,#020617);z-index:9999;display:flex;align-items:center;justify-content:center}
          img,picture,video,canvas,svg{display:block;max-width:100%;height:auto}
          header{position:fixed;top:0;left:0;right:0;z-index:50;background:rgba(15,23,42,.95);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,.1);height:4rem}
          @media(min-width:1024px){header{height:5rem}}

        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen text-white overflow-x-hidden max-w-screen`}
        suppressHydrationWarning
      >
        <GlobalPreloader />
        <StructuredData />
        <QueryProvider>
          <AuthProvider>
            <UserThemeProvider>
              <FaviconLoader />
              <VisitTracker />
              {children}
              <LoginModal />
              <RegisterModal />
              <TelegramModalWrapper />
              <Toaster />
            </UserThemeProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
