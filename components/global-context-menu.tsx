"use client"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
import { useRouter } from "next/navigation"
import {
  IconChevronLeft,
  IconChevronRight,
  IconRotateClockwise,
  IconHome,
} from "@tabler/icons-react"

export function GlobalContextMenu({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  return (
    <ContextMenu>
      <ContextMenuTrigger className="min-h-screen w-full">
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => router.back()}>
          <IconChevronLeft className="mr-2 h-4 w-4" />
          Back
        </ContextMenuItem>
        <ContextMenuItem onClick={() => router.forward()}>
          <IconChevronRight className="mr-2 h-4 w-4" />
          Forward
        </ContextMenuItem>
        <ContextMenuItem onClick={() => window.location.reload()}>
          <IconRotateClockwise className="mr-2 h-4 w-4" />
          Reload
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => router.push("/")}>
          <IconHome className="mr-2 h-4 w-4" />
          Home
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
