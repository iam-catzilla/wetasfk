import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Library – Your Playlists",
  description: "Manage your personal video playlists on Wetasfk.",
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
