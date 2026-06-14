import { useEffect, useMemo, useState, useCallback } from 'react'
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react'
import {
  api,
  type WorkspaceSummary,
  type ThemeInfo,
  type ThemeSpec,
  type ThemeLayout,
  type ThemeAppearance,
  type ThemeDensity,
} from '../api'
import { ArrowTopRightOnSquareIcon, ChevronDownIcon, SwatchIcon } from '@heroicons/react/24/outline'
import { t, plural } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'

const SAMPLE_MD = `# The quick brown fox

A short paragraph with a [link](#), some **bold** and _italic_ text, and \`inline code\`.

## A second heading

- First list item
- Second list item with more text

> A block quote to show the accent color.

\`\`\`js
function hello() { return 'world' }
\`\`\`

| Column A | Column B |
|----------|----------|
| one      | two      |
`

/** A self-contained panel for site identity + theme selection + custom theme. */
export function SiteThemePanel({
  workspace,
  publicUrl,
}: {
  workspace: WorkspaceSummary
  publicUrl?: string
}) {
  const [loading, setLoading] = useState(true)
  const [themes, setThemes] = useState<ThemeInfo[]>([])
  const [siteName, setSiteName] = useState('')
  const [footerHtml, setFooterHtml] = useState('')
  const [selected, setSelected] = useState('default')
  const [customSpec, setCustomSpec] = useState<ThemeSpec | null>(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([api.listThemes(), api.getSiteSettings(workspace.id)])
      .then(([themeList, site]) => {
        if (cancelled) return
        setThemes(themeList)
        setSiteName(site.name || '')
        setFooterHtml(site.footerHtml || '')
        setSelected(site.theme || 'default')
        setCustomSpec(site.customTheme || null)
      })
      .catch(err => !cancelled && setMessage(String(err?.message || err)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [workspace.id])

  // Debounced live preview whenever the effective theme changes.
  const previewKey = useMemo(
    () => (selected === 'custom' ? JSON.stringify(customSpec) : selected),
    [selected, customSpec],
  )
  useEffect(() => {
    if (loading) return
    let cancelled = false
    const handle = setTimeout(() => {
      api
        .previewSite(workspace.id, {
          content: SAMPLE_MD,
          theme: selected,
          customTheme: selected === 'custom' ? customSpec : null,
        })
        .then(html => !cancelled && setPreviewHtml(html))
        .catch(() => {})
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [previewKey, loading, workspace.id, selected, customSpec])

  const applyBuiltin = useCallback(
    async (id: string) => {
      setSelected(id)
      setSaving(true)
      setMessage('')
      try {
        await api.updateSiteSettings(workspace.id, { theme: id })
        setMessage(t`Theme applied.`)
      } catch (err) {
        setMessage(String((err as Error)?.message || err))
      } finally {
        setSaving(false)
      }
    },
    [workspace.id],
  )

  const startCustom = useCallback(async () => {
    setSelected('custom')
    if (customSpec) return
    // Seed from the currently-selected builtin (or default).
    const base = themes.find(t => t.id === selected)?.id || 'default'
    try {
      const spec = await api.getTheme(base === 'custom' ? 'default' : base)
      setCustomSpec({ ...spec, id: 'custom', name: spec.name + ' (custom)' })
    } catch {
      /* ignore */
    }
  }, [customSpec, themes, selected])

  const seedFromPreset = useCallback(async (id: string) => {
    try {
      const spec = await api.getTheme(id)
      setCustomSpec({ ...spec, id: 'custom', name: spec.name + ' (custom)' })
    } catch (err) {
      setMessage(String((err as Error)?.message || err))
    }
  }, [])

  const saveSite = useCallback(async () => {
    setSaving(true)
    setMessage('')
    try {
      const payload =
        selected === 'custom'
          ? { name: siteName, footerHtml, theme: 'custom', customTheme: customSpec }
          : { name: siteName, footerHtml }
      const next = await api.updateSiteSettings(workspace.id, payload)
      if (next.customTheme) setCustomSpec(next.customTheme)
      setMessage(t`Saved.`)
    } catch (err) {
      setMessage(String((err as Error)?.message || err))
    } finally {
      setSaving(false)
    }
  }, [workspace.id, siteName, footerHtml, selected, customSpec])

  const patchCustom = useCallback((patch: Partial<ThemeSpec>) => {
    setCustomSpec(prev => (prev ? { ...prev, ...patch } : prev))
  }, [])

  if (loading) {
    return <p className="text-sm text-zinc-500"><Trans>Loading site settings…</Trans></p>
  }

  return (
    <div className="space-y-8">
      {/* Site identity */}
      <section className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-800"><Trans>Site name</Trans></label>
          <p className="mb-1.5 text-xs text-zinc-500"><Trans>Shown in the browser title and site header.</Trans></p>
          <input
            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-brand"
            value={siteName}
            placeholder={workspace.publishTitle || workspace.name}
            onChange={e => setSiteName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-800"><Trans>Footer HTML</Trans></label>
          <p className="mb-1.5 text-xs text-zinc-500"><Trans>Optional. A small set of inline tags is allowed (links, emphasis).</Trans></p>
          <textarea
            className="h-20 w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-brand"
            value={footerHtml}
            placeholder={'© 2026 · <a href="/">home</a>'}
            onChange={e => setFooterHtml(e.target.value)}
          />
        </div>
        {publicUrl && (
          <a className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline" href={publicUrl} target="_blank" rel="noreferrer">
            <ArrowTopRightOnSquareIcon className="h-4 w-4" /> <Trans>View published site</Trans>
          </a>
        )}
      </section>

      {/* Theme picker */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <SwatchIcon className="h-4 w-4 text-brand" /> <Trans>Theme</Trans>
          </h3>
          <span className="text-xs text-zinc-500">{plural(themes.length, { one: '# theme', other: '# themes' })}</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {themes.map(th => (
            <ThemeCard key={th.id} theme={th} selected={selected === th.id} onSelect={() => applyBuiltin(th.id)} />
          ))}
          <CustomCard selected={selected === 'custom'} spec={customSpec} onSelect={startCustom} />
        </div>
      </section>

      {/* Custom theme editor */}
      {selected === 'custom' && customSpec && (
        <CustomThemeEditor
          spec={customSpec}
          presets={themes}
          onSeed={seedFromPreset}
          onPatch={patchCustom}
        />
      )}

      {/* Live preview */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-900"><Trans>Live preview</Trans></h3>
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
          <iframe
            title={t`Theme preview`}
            className="h-[420px] w-full"
            sandbox="allow-scripts"
            srcDoc={previewHtml}
          />
        </div>
      </section>

      <div className="flex items-center gap-3 border-t border-black/[0.06] pt-4">
        <button className="primary-button" type="button" disabled={saving} onClick={saveSite}>
          {saving ? t`Saving…` : t`Save site settings`}
        </button>
        {message && <span className="text-sm text-zinc-500">{message}</span>}
      </div>
    </div>
  )
}

// ── Theme cards ────────────────────────────────────────────────────────────────

function ThemeCard({ theme, selected, onSelect }: { theme: ThemeInfo; selected: boolean; onSelect: () => void }) {
  const s = theme.swatch
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex flex-col overflow-hidden rounded-xl border text-left transition ${selected ? 'border-brand ring-2 ring-brand/30' : 'border-black/10 hover:border-brand/40'}`}
      title={theme.description}
    >
      <span className="flex h-14 items-stretch" style={{ background: s.bg }}>
        <span className="m-2 flex flex-1 flex-col justify-between rounded-md p-1.5" style={{ background: s.surface }}>
          <span className="h-1.5 w-8 rounded-full" style={{ background: s.accent }} />
          <span className="h-1 w-10 rounded-full" style={{ background: s.fg, opacity: 0.5 }} />
        </span>
      </span>
      <span className="flex items-center justify-between px-2.5 py-1.5">
        <span className="truncate text-xs font-medium text-zinc-900">{theme.name}</span>
        <span className="ml-1 rounded px-1 text-[10px] uppercase tracking-wide text-zinc-400">{theme.appearance}</span>
      </span>
    </button>
  )
}

function CustomCard({ selected, spec, onSelect }: { selected: boolean; spec: ThemeSpec | null; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col overflow-hidden rounded-xl border text-left transition ${selected ? 'border-brand ring-2 ring-brand/30' : 'border-dashed border-black/20 hover:border-brand/40'}`}
      title={t`Define your own theme`}
    >
      <span className="flex h-14 items-center justify-center" style={spec ? { background: spec.palette.bg } : undefined}>
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: spec ? spec.palette.accent : '#9ca3af' }}>
          <Trans>Custom</Trans>
        </span>
      </span>
      <span className="px-2.5 py-1.5 text-xs font-medium text-zinc-900"><Trans>Your theme</Trans></span>
    </button>
  )
}

// ── Custom theme editor ────────────────────────────────────────────────────────

const FONT_PRESETS: { label: string; value: string }[] = [
  { label: 'Sans (Inter)', value: "Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" },
  { label: 'Serif (Georgia)', value: "Georgia,'Iowan Old Style','Times New Roman',Times,serif" },
  { label: 'Mono', value: "ui-monospace,SFMono-Regular,'JetBrains Mono',Consolas,monospace" },
  { label: 'System', value: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif" },
]

function CustomThemeEditor({
  spec,
  presets,
  onSeed,
  onPatch,
}: {
  spec: ThemeSpec
  presets: ThemeInfo[]
  onSeed: (id: string) => void
  onPatch: (patch: Partial<ThemeSpec>) => void
}) {
  const setPalette = (k: keyof ThemeSpec['palette'], v: string) => onPatch({ palette: { ...spec.palette, [k]: v } })
  const setType = (k: keyof ThemeSpec['typography'], v: string | number) => onPatch({ typography: { ...spec.typography, [k]: v } })
  const setShape = (k: keyof ThemeSpec['shape'], v: string | number) => onPatch({ shape: { ...spec.shape, [k]: v } })

  return (
    <section className="space-y-5 rounded-xl border border-black/[0.06] bg-[#f7faf8] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-900"><Trans>Customize</Trans></h3>
        <Menu as="div" className="relative">
          <MenuButton className="subtle-button flex items-center gap-1 text-xs">
            <Trans>Start from preset</Trans> <ChevronDownIcon className="h-3.5 w-3.5" />
          </MenuButton>
          <MenuItems anchor="bottom end" className="z-[60] mt-1 max-h-72 w-48 overflow-auto rounded-lg border border-black/10 bg-white p-1 shadow-xl">
            {presets.map(p => (
              <MenuItem key={p.id}>
                <button className="block w-full rounded px-2 py-1.5 text-left text-sm data-[focus]:bg-brand-soft" onClick={() => onSeed(p.id)}>
                  {p.name}
                </button>
              </MenuItem>
            ))}
          </MenuItems>
        </Menu>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextRow label={t`Theme name`} value={spec.name} onChange={v => onPatch({ name: v })} />
        <SelectRow
          label={t`Layout`}
          value={spec.layout}
          options={[['sidebar', t`Sidebar`], ['header', t`Top header`], ['minimal', t`Minimal`]]}
          onChange={v => onPatch({ layout: v as ThemeLayout })}
        />
      </div>

      {/* Colors */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500"><Trans>Colors</Trans></p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <ColorRow label={t`Background`} value={spec.palette.bg} onChange={v => setPalette('bg', v)} />
          <ColorRow label={t`Surface`} value={spec.palette.surface} onChange={v => setPalette('surface', v)} />
          <ColorRow label={t`Text`} value={spec.palette.fg} onChange={v => setPalette('fg', v)} />
          <ColorRow label={t`Muted`} value={spec.palette.muted} onChange={v => setPalette('muted', v)} />
          <ColorRow label={t`Accent`} value={spec.palette.accent} onChange={v => setPalette('accent', v)} />
          <ColorRow label={t`Border`} value={spec.palette.border} onChange={v => setPalette('border', v)} />
          <ColorRow label={t`Code bg`} value={spec.palette.codeBg} onChange={v => setPalette('codeBg', v)} />
          <ColorRow label={t`Code text`} value={spec.palette.codeFg} onChange={v => setPalette('codeFg', v)} />
          <SelectRow
            label={t`Appearance`}
            value={spec.palette.appearance}
            options={[['light', t`Light`], ['dark', t`Dark`]]}
            onChange={v => setPalette('appearance', v as ThemeAppearance)}
          />
        </div>
      </div>

      {/* Typography */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500"><Trans>Typography</Trans></p>
        <div className="grid gap-2 sm:grid-cols-2">
          <FontRow label={t`Body font`} value={spec.typography.bodyFont} onChange={v => setType('bodyFont', v)} />
          <FontRow label={t`Heading font`} value={spec.typography.headingFont} onChange={v => setType('headingFont', v)} />
          <NumberRow label={t`Base size`} value={spec.typography.baseSize} min={13} max={22} suffix="px" onChange={v => setType('baseSize', v)} />
          <NumberRow label={t`Content width`} value={spec.typography.contentWidth} min={520} max={1100} step={10} suffix="px" onChange={v => setType('contentWidth', v)} />
          <NumberRow label={t`Line height`} value={spec.typography.lineHeight} min={1.3} max={2.2} step={0.05} onChange={v => setType('lineHeight', v)} />
          <NumberRow label={t`Heading weight`} value={spec.typography.headingWeight} min={400} max={900} step={100} onChange={v => setType('headingWeight', v)} />
        </div>
      </div>

      {/* Shape */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500"><Trans>Shape</Trans></p>
        <div className="grid gap-2 sm:grid-cols-2">
          <NumberRow label={t`Corner radius`} value={spec.shape.radius} min={0} max={28} suffix="px" onChange={v => setShape('radius', v)} />
          <NumberRow label={t`Border width`} value={spec.shape.borderWidth} min={0} max={3} suffix="px" onChange={v => setShape('borderWidth', v)} />
          <NumberRow label={t`Sidebar width`} value={spec.shape.sidebarWidth} min={200} max={360} step={4} suffix="px" onChange={v => setShape('sidebarWidth', v)} />
          <SelectRow
            label={t`Density`}
            value={spec.shape.density}
            options={[['compact', t`Compact`], ['cozy', t`Cozy`], ['comfortable', t`Comfortable`]]}
            onChange={v => setShape('density', v as ThemeDensity)}
          />
        </div>
      </div>

      {/* Custom CSS */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"><Trans>Custom CSS</Trans></label>
        <p className="mb-1.5 text-xs text-zinc-500"><Trans>Appended last. Tags and @import are stripped for safety.</Trans></p>
        <textarea
          className="h-24 w-full resize-y rounded-lg border border-black/10 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-brand"
          value={spec.customCss}
          placeholder={'.prose h1 { letter-spacing: -0.03em; }'}
          onChange={e => onPatch({ customCss: e.target.value })}
        />
      </div>

      <p className="text-xs text-zinc-500"><Trans>Click “Save site settings” below to publish this theme.</Trans></p>
    </section>
  )
}

// ── Small field rows ───────────────────────────────────────────────────────────

function rowLabel(label: string) {
  return <span className="mb-1 block text-xs font-medium text-zinc-600">{label}</span>
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  // The native color input only accepts #rrggbb; show it when possible, but
  // always keep an editable text field for rgb()/hsl()/named colors.
  const hex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'
  return (
    <label className="block">
      {rowLabel(label)}
      <span className="flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-1.5 py-1">
        <input type="color" className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0" value={hex} onChange={e => onChange(e.target.value)} />
        <input className="w-full min-w-0 bg-transparent font-mono text-xs outline-none" value={value} onChange={e => onChange(e.target.value)} />
      </span>
    </label>
  )
}

function TextRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      {rowLabel(label)}
      <input className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-brand" value={value} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

function FontRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      {rowLabel(label)}
      <span className="flex gap-1.5">
        <select
          className="rounded-lg border border-black/10 bg-white px-1.5 py-1.5 text-xs outline-none focus:border-brand"
          value={FONT_PRESETS.find(f => f.value === value)?.value || ''}
          onChange={e => e.target.value && onChange(e.target.value)}
        >
          <option value="">{t`Preset…`}</option>
          {FONT_PRESETS.map(f => <option key={f.label} value={f.value}>{f.label}</option>)}
        </select>
        <input className="w-full min-w-0 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 font-mono text-[11px] outline-none focus:border-brand" value={value} onChange={e => onChange(e.target.value)} />
      </span>
    </label>
  )
}

function SelectRow({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      {rowLabel(label)}
      <select className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-brand" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  )
}

function NumberRow({ label, value, min, max, step = 1, suffix, onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs font-medium text-zinc-600">
        <span>{label}</span>
        <span className="font-mono text-zinc-400">{value}{suffix}</span>
      </span>
      <input type="range" className="w-full accent-brand" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
    </label>
  )
}
