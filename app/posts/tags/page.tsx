import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

export default async function TagsPage() {
  // Mock tags since we don't have a confirmed endpoint format
  const tags = [
    "cosplay",
    "bikini",
    "lingerie",
    "video",
    "photo",
    "exclusive",
    "outdoor",
    "indoor",
    "selfie",
    "professional",
    "bts",
    "chat",
  ]

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <Separator orientation="vertical" className="h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Tags</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <h1 className="mb-2 text-4xl font-bold tracking-tight">
            Popular Tags
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Browse content by category and style.
          </p>
        </div>

        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="cursor-pointer px-4 py-2 text-sm transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              #{tag}
            </Badge>
          ))}
        </div>
      </div>
    </>
  )
}
