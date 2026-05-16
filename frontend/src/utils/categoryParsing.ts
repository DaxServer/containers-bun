const CATEGORY_REGEX = /\[\[Category:([^\]|]+)(?:\|[^\]]+)?\]\]/gi

export const parseCategoryNames = (text: string): string[] => {
  const matches = [...text.matchAll(CATEGORY_REGEX)]
  return [
    ...new Set(
      matches
        .map((m) => {
          const name = m[1]!.trim().replace(/_/g, ' ')
          return name ? name.charAt(0).toUpperCase() + name.slice(1) : null
        })
        .filter((n): n is string => n !== null),
    ),
  ]
}
