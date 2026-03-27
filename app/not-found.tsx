import Link from "next/link"
import { IconMoodSad } from "@tabler/icons-react"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <IconMoodSad className="mb-4 size-16 text-muted-foreground/30" />
      <h1 className="font-heading text-3xl font-bold">404 — Not Found</h1>
      <p className="mt-2 text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been removed.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Back to Home
      </Link>
    </div>
  )
}
