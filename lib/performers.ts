export function normalizePerformerName(name: string): string {
  return decodeURIComponent(name)
    .replace(/\+/g, " ")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function dedupePerformers(names: string[]): string[] {
  const seen = new Set<string>()
  const deduped: string[] = []

  for (const name of names) {
    const normalized = normalizePerformerName(name)
    const key = normalized.toLowerCase()
    if (!normalized || seen.has(key)) {
      continue
    }

    seen.add(key)
    deduped.push(normalized)
  }

  return deduped
}

export function performerSlug(name: string): string {
  return normalizePerformerName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function performerNameFromSlug(slug: string): string {
  return normalizePerformerName(slug)
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function matchesPerformerName(left: string, right: string): boolean {
  return (
    normalizePerformerName(left).toLowerCase() ===
    normalizePerformerName(right).toLowerCase()
  )
}
