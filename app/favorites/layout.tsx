import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Favorites – Saved Videos & Models",
  description: "Your saved favorite videos and followed creators on Wetasfk.",
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
