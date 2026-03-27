import { Geist_Mono, Inter, Manrope } from "next/font/google"
import { Suspense } from "react"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Navbar } from "@/components/navbar"
import { SourceSync } from "@/components/source-sync"
import { cn } from "@/lib/utils"

const manropeHeading = Manrope({
  subsets: ["latin"],
  variable: "--font-heading",
})

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata = {
  title: "Wetasfk — Free HD Adult Videos",
  description: "Stream free HD adult videos. Fast, clean, ad-free experience.",
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
        <ThemeProvider>
          <Navbar />
          <Suspense>
            <SourceSync />
          </Suspense>
          <main className="mx-auto max-w-450 px-4 py-6 lg:px-6">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
