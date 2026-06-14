// Shared visual language for the help-center Remotion explainers.
// Pulled from `shared/styles/tokens.css` so videos match the product brand.

export const brand = {
  teal: '#008884',
  tealLight: '#22b8ad',
  tealDark: '#006f6b',
  soft: '#e8f6f2',
  ink: '#0d0d0c',
  inkSoft: '#4b5753',
  paper: '#f5f8f6',
  paperEdge: '#eef3f0',
  amber: '#fbbf24',
  amberDeep: '#f59e0b',
  gray: '#6f817a',
  line: 'rgba(13,13,12,0.08)',
  white: '#ffffff',
} as const

export const FONT =
  "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
export const MONO =
  "'JetBrains Mono', ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace"

/** Default canvas for every help explainer (16:9, 30fps). */
export const VIDEO = { width: 1280, height: 720, fps: 30 } as const

/** A soft page-grid background used across explainers. */
export const GRID_BG =
  'radial-gradient(circle at 18% 12%, rgba(0,136,132,0.14), transparent 30%),' +
  'radial-gradient(circle at 82% 18%, rgba(251,191,36,0.12), transparent 26%),' +
  'linear-gradient(180deg, #fbfdfb, #f1f6f3)'
