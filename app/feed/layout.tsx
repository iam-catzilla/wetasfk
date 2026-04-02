import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Feed – Posts from Followed Creators",
  description:
    "Your personalized feed of latest posts from creators you follow on OnlyFans, Fansly and more.",
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
