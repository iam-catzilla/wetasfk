import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Popular Posts – Top OnlyFans & Creator Content",
  description:
    "Browse the most popular posts from OnlyFans, Fansly, and other creator platforms. Daily, weekly, and monthly top-rated content all in one place.",
  keywords: [
    "popular onlyfans posts",
    "top fansly content",
    "best creator posts",
    "most liked onlyfans",
    "viral creator content",
    "popular adult creators",
    "trending onlyfans 2025",
    "best onlyfans free",
    "top adult creator posts",
  ],
  alternates: { canonical: "/posts/popular" },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
