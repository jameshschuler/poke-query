import { marked } from 'marked'

export type AppUpdateEntry = {
  slug: string
  title: string
  date: string
  summary: string
  html: string
}

type RawAppUpdateEntry = {
  slug: string
  markdown: string
}

type FrontmatterResult = {
  data: Record<string, string>
  content: string
}

function parseFrontmatter(markdown: string): FrontmatterResult {
  const normalized = markdown.replace(/^\uFEFF/, '')
  const match = normalized.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/)

  if (!match) {
    return {
      data: {},
      content: normalized.trim(),
    }
  }

  const data: Record<string, string> = {}

  for (const line of match[1].split(/\r?\n/)) {
    const colonIndex = line.indexOf(':')
    if (colonIndex < 0) {
      continue
    }

    const key = line.slice(0, colonIndex).trim()
    const value = line
      .slice(colonIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '')

    if (key) {
      data[key] = value
    }
  }

  return {
    data,
    content: match[2].trim(),
  }
}

function formatSummary(content: string): string {
  const firstParagraph = content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .find(Boolean)

  if (!firstParagraph) {
    return 'PokeQuery update.'
  }

  return firstParagraph.replace(/\s+/g, ' ').trim()
}

export function parseAppUpdates(
  entries: RawAppUpdateEntry[],
): AppUpdateEntry[] {
  return entries
    .map(({ slug, markdown }) => {
      const parsed = parseFrontmatter(markdown)
      const title = parsed.data.title?.trim() || 'App Update'
      const date = parsed.data.date?.trim() || '1970-01-01'
      const summary =
        parsed.data.summary?.trim() || formatSummary(parsed.content)

      return {
        slug,
        title,
        date,
        summary,
        html: marked.parse(parsed.content, {
          mangle: false,
          headerIds: false,
        }) as string,
      }
    })
    .sort((left, right) => right.date.localeCompare(left.date))
}
