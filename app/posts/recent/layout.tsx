import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Recent Posts – Latest OnlyFans & Creator Uploads",
  description:
    "Stay up to date with the latest posts from OnlyFans, Fansly, Fanvue and more. Fresh creator content updated in real-time.",
  keywords: [
    "latest onlyfans posts",
    "new fansly uploads",
    "recent creator content",
    "new adult posts today",
    "fresh onlyfans content",
    "latest xxx uploads",
    "new porn posts",
    "today's adult content",
    "live creator feed",
  ],
  alternates: { canonical: "/posts/recent" },
  robots: { index: true, follow: true },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
