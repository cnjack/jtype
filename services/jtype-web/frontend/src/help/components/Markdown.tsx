// Renders a Markdown string into the help "prose" surface using the shared
// renderer (marked + DOMPurify + KaTeX + mermaid). After rendering it slugs the
// h2/h3 headings so the Article "on this page" sidebar can deep-link to them.

import { useEffect, useRef } from 'react'
import { renderToContainer } from '@shared/lib/markdown'

export interface Heading {
  id: string
  text: string
  level: 2 | 3
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w一-鿿\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function Markdown({
  content,
  className = '',
  onHeadings,
}: {
  content: string
  className?: string
  onHeadings?: (headings: Heading[]) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let active = true
    void (async () => {
      await renderToContainer(content, el)
      if (!active) return
      const seen = new Map<string, number>()
      const headings: Heading[] = []
      el.querySelectorAll('h2, h3').forEach((node) => {
        const heading = node as HTMLHeadingElement
        const text = heading.textContent ?? ''
        let id = slugify(text) || 'section'
        const count = seen.get(id) ?? 0
        seen.set(id, count + 1)
        if (count > 0) id = `${id}-${count}`
        heading.id = id
        heading.classList.add('help-anchor')
        headings.push({ id, text, level: heading.tagName === 'H3' ? 3 : 2 })
      })
      onHeadings?.(headings)
    })()
    return () => {
      active = false
    }
  }, [content, onHeadings])

  return <div ref={ref} className={`help-prose ${className}`.trim()} />
}
