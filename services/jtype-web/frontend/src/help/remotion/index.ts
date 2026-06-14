// Composition registry for the help center.
//
// Every file in `./compositions/*.tsx` exports a `composition` descriptor; we
// glob-collect them so authors can drop in new explainers without editing a
// central list. Looked up by `videoId` from category/case metadata.

import type { ComponentType } from 'react'

export interface CompositionDescriptor {
  /** Stable id referenced by `CategoryMeta.videoId` / `CaseMeta.videoId`. */
  id: string
  component: ComponentType
  durationInFrames: number
  fps: number
  width: number
  height: number
  /** Short human label (shown on the poster). */
  label?: string
}

const modules = import.meta.glob<{ composition?: CompositionDescriptor }>(
  './compositions/*.tsx',
  { eager: true },
)

export const compositions: Record<string, CompositionDescriptor> = Object.fromEntries(
  Object.values(modules)
    .map((m) => m.composition)
    .filter((c): c is CompositionDescriptor => Boolean(c))
    .map((c) => [c.id, c]),
)

export function getComposition(id: string | undefined): CompositionDescriptor | undefined {
  return id ? compositions[id] : undefined
}
