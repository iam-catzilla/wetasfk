import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Watch History",
  description: "Your recently watched videos on Wetasfk.",
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
