import { Geist_Mono, Inter, Manrope } from "next/font/google"
import { Suspense } from "react"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Navbar } from "@/components/navbar"
import { SourceSync } from "@/components/source-sync"
import { SourceProvider } from "@/lib/source-context"
import { FavoritesProvider } from "@/lib/favorites-context"
import { GlobalContextMenu } from "@/components/global-context-menu"
import { cn } from "@/lib/utils"
import type { Metadata } from "next"

const manropeHeading = Manrope({
  subsets: ["latin"],
  variable: "--font-heading",
})

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://wetasfk.com"
const SITE_NAME = "Wetasfk"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Wetasfk – Free HD Adult Videos, OnlyFans & Creator Content",
    template: "%s | Wetasfk",
  },
  description:
    "Stream free HD adult videos from EpornerHQ, xvideos, xnxx, motherless and more. Watch OnlyFans & Fansly creator content, trending videos, and top models – all in one clean, ad-free platform.",
  keywords: [
    // Brand
    "wetasfk",
    "wet as fk",
    // Generic high-volume
    "free adult videos",
    "free porn videos",
    "free HD porn",
    "watch porn online",
    "adult videos online",
    "xxx videos",
    "porn tube",
    "free xxx",
    // Platform aggregator
    "onlyfans free",
    "fansly free",
    "creator content",
    "onlyfans leaks",
    "fanvue free",
    "coomer",
    "kemono",
    "porn aggregator",
    "multi source porn",
    // Video sources covered
    "eporner",
    "hqporner",
    "xnxx",
    "motherless",
    "sxyprn",
    "vjav",
    "javmost",
    "missav",
    "supjav",
    "7mmtv",
    "pornhoarder",
    // Content types
    "trending porn videos",
    "popular xxx videos",
    "HD sex videos",
    "amateur porn",
    "JAV",
    "japanese adult video",
    "asian porn",
    "big tits porn",
    "milf porn",
    "teen porn 18+",
    "lesbian porn",
    "anal porn",
    "blowjob videos",
    "creampie videos",
    "hardcore porn",
    // Features
    "no ads porn",
    "ad-free porn",
    "fast porn streaming",
    "porn without ads",
    "porn playlist",
    "save videos",
    "watch history",
    "video favorites",
    // Intent-based
    "best free porn sites",
    "top porn aggregator",
    "porn search engine",
    "find onlyfans models",
    "search porn videos",
    "download free porn",
    "stream porn free",
    "watch xxx online free",
    "free sex videos",
    // Long-tail
    "free hd porn no ads",
    "clean porn site",
    "fast porn site 2025",
    "all porn sites in one",
    "multi platform porn viewer",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "adult entertainment",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Wetasfk – Free HD Adult Videos, OnlyFans & Creator Content",
    description:
      "Stream free HD adult videos from multiple sources. Watch OnlyFans & creator content in one clean, ad-free platform.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Wetasfk – Free HD Adult Video Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wetasfk – Free HD Adult Videos, OnlyFans & Creator Content",
    description:
      "Stream free HD adult videos from multiple sources. Watch OnlyFans & creator content in one clean, ad-free platform.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: SITE_URL,
  },
  other: {
    rating: "adult",
    "ICRA-rating": "RTA-5042-1996-1400-1577-RTA",
    "RTA-label": "RTA-5042-1996-1400-1577-RTA",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable,
        manropeHeading.variable
      )}
    >
      <body className="min-h-screen bg-background">
        {/* JSON-LD: WebSite schema with SearchAction for Google Sitelinks Search */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Wetasfk",
              url: SITE_URL,
              description:
                "Free HD adult video aggregator. Stream from EpornerHQ, xnxx, motherless and more – ad-free.",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        {/* JSON-LD: Organization schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Wetasfk",
              url: SITE_URL,
              logo: `${SITE_URL}/android-chrome-512x512.png`,
              sameAs: [],
            }),
          }}
        />
        <ThemeProvider>
          <GlobalContextMenu>
            <SourceProvider>
              <FavoritesProvider>
                <Navbar />
                <Suspense>
                  <SourceSync />
                </Suspense>
                <main className="px-3 py-6 md:px-6">{children}</main>
              </FavoritesProvider>
            </SourceProvider>
          </GlobalContextMenu>
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  )
}
