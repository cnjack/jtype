import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { api, type WorkspaceSummary, type DocumentListItem } from '../api'
import { renderToContainer } from '../lib/markdown'
import { parseFrontmatter, writeFrontmatter } from '../lib/frontmatter'
import type { EditorMode } from '../lib/utils'

export function Workspace() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null)
  const [documents, setDocuments] = useState<DocumentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)
  const [docContent, setDocContent] = useState('')
  const [newPath, setNewPath] = useState('')
  const [saving, setSaving] = useState(false)
  const [editorMode, setEditorMode] = useState<EditorMode>('split')
  const [infoPanel, setInfoPanel] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [dirty, setDirty] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const editorRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!workspaceId) return
    Promise.all([
      api.getWorkspace(workspaceId),
      api.listDocuments(workspaceId),
    ]).then(([ws, docs]) => {
      setWorkspace(ws)
      setDocuments(docs)
    }).finally(() => setLoading(false))
  }, [workspaceId])

  useEffect(() => {
    if (previewRef.current) {
      void renderToContainer(docContent, previewRef.current)
    }
  }, [docContent, editorMode])

  async function openDocument(docId: string) {
    if (!workspaceId) return
    const doc = await api.getDocument(workspaceId, docId)
    setSelectedDoc(docId)
    setDocContent(doc.content)
    setDirty(false)
  }

  async function saveDocument() {
    if (!workspaceId || !selectedDoc) return
    const doc = documents.find(d => d.id === selectedDoc)
    if (!doc) return
    setSaving(true)
    try {
      await api.saveDocument(workspaceId, { relativePath: doc.relativePath, content: docContent })
      setDirty(false)
      const docs = await api.listDocuments(workspaceId)
      setDocuments(docs)
    } finally {
      setSaving(false)
    }
  }

  async function createDocument() {
    if (!workspaceId || !newPath.trim()) return
    await api.saveDocument(workspaceId, { relativePath: newPath.trim(), content: '' })
    setNewPath('')
    const docs = await api.listDocuments(workspaceId)
    setDocuments(docs)
  }

  async function deleteDocument(docId: string) {
    if (!workspaceId) return
    await api.deleteDocument(workspaceId, docId)
    if (selectedDoc === docId) {
      setSelectedDoc(null)
      setDocContent('')
      setDirty(false)
    }
    const docs = await api.listDocuments(workspaceId)
    setDocuments(docs)
  }

  const handleEditorInput = useCallback(() => {
    const content = editorRef.current?.value ?? ''
    setDocContent(content)
    setDirty(true)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 's') {
        e.preventDefault()
        saveDocument()
      }
      if (e.key === 'b') {
        e.preventDefault()
        wrapSelection('**', '**', 'bold text')
      }
      if (e.key === 'i') {
        e.preventDefault()
        wrapSelection('_', '_', 'italic text')
      }
      if (e.key === 'k') {
        e.preventDefault()
        wrapSelection('[', '](url)', 'link text')
      }
      if (e.shiftKey && e.key === 'T') {
        e.preventDefault()
        insertOrEditTable()
      }
    }
  }, [selectedDoc, docContent, documents, workspaceId])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  useEffect(() => {
    if (!contextMenu) return
    const handler = () => setContextMenu(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [contextMenu])

  const parsed = parseFrontmatter(docContent)
  const publishStatus = parsed.data.status || 'draft'

  const getGridClass = (mode: EditorMode) => {
    if (mode === 'write') return 'editor-preview-grid view-mode-write'
    if (mode === 'preview') return 'editor-preview-grid view-mode-preview'
    return 'editor-preview-grid view-mode-split'
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" /></div>

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            onClick={() => setSidebarCollapsed(c => !c)}
          >
            {sidebarCollapsed ? 'Files' : 'Hide'}
          </button>
          <h1 className="text-lg font-bold text-zinc-900 dark:text-white">{workspace?.name}</h1>
          {selectedDoc && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">
                {documents.find(d => d.id === selectedDoc)?.relativePath}
              </span>
              <span className={`status-chip ${dirty ? 'status-chip-warning' : 'status-chip-neutral'}`}>
                {dirty ? 'Unsaved' : 'Saved'}
              </span>
              <span className="status-chip status-chip-neutral">{publishStatus}</span>
            </div>
          )}
        </div>
        {selectedDoc && (
          <button
            onClick={saveDocument}
            disabled={saving || !dirty}
            className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>

      <div className="flex flex-1 gap-3 overflow-hidden">
        {!sidebarCollapsed && (
          <div className="w-56 shrink-0 overflow-y-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 p-2 dark:border-zinc-800">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newPath}
                  onChange={e => setNewPath(e.target.value)}
                  placeholder="path/to/doc.md"
                  className="flex-1 rounded border border-zinc-300 px-2 py-1 text-xs focus:border-brand focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  onKeyDown={e => e.key === 'Enter' && createDocument()}
                />
                <button
                  onClick={createDocument}
                  className="rounded bg-brand px-2 py-1 text-xs text-white hover:bg-brand-dark"
                >
                  +
                </button>
              </div>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {documents.map(doc => (
                <div
                  key={doc.id}
                  className={`flex cursor-pointer items-center justify-between px-2.5 py-1.5 text-xs transition hover:bg-zinc-50 dark:hover:bg-zinc-800 ${selectedDoc === doc.id ? 'bg-brand/5 font-medium text-brand' : 'text-zinc-600 dark:text-zinc-400'}`}
                  onClick={() => openDocument(doc.id)}
                >
                  <span className="truncate">{doc.relativePath}</span>
                  <button
                    onClick={e => { e.stopPropagation(); deleteDocument(doc.id) }}
                    className="ml-1 text-zinc-400 hover:text-red-500"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-[#fbfaf7] dark:border-zinc-800">
          {selectedDoc ? (
            <>
              <div className="flex min-h-9 items-center gap-1 border-b border-stone-200 bg-stone-50 px-3">
                <EditorToolbarButton title="Bold (Ctrl+B)" onClick={() => wrapSelection('**', '**', 'bold text')}>B</EditorToolbarButton>
                <EditorToolbarButton title="Italic (Ctrl+I)" onClick={() => wrapSelection('_', '_', 'italic text')}>I</EditorToolbarButton>
                <EditorToolbarButton title="Link (Ctrl+K)" onClick={() => wrapSelection('[', '](url)', 'link text')}>Link</EditorToolbarButton>
                <EditorToolbarButton title="Inline code" onClick={() => wrapSelection('`', '`', 'code')}>Code</EditorToolbarButton>
                <EditorToolbarButton title="Insert table (Ctrl+Shift+T)" onClick={() => insertOrEditTable()}>Table</EditorToolbarButton>
                <EditorToolbarButton title="Insert formula" onClick={() => insertAtCursor('\n$$\nE = mc^2\n$$\n')}>Math</EditorToolbarButton>
                <EditorToolbarButton title="Insert Mermaid diagram" onClick={() => insertAtCursor('\n```mermaid\nflowchart TD\n  A --> B\n```\n')}>Mermaid</EditorToolbarButton>
                <EditorToolbarButton title="Task list" onClick={() => insertAtCursor('\n- [ ] Task\n')}>Task</EditorToolbarButton>
                <div className="ml-auto flex items-center gap-1 rounded-md border border-stone-200 bg-white p-0.5">
                  {(['write', 'split', 'preview'] as EditorMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`view-mode-button ${editorMode === mode ? 'view-mode-button-active' : ''}`}
                      onClick={() => setEditorMode(mode)}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
                <button className="editor-tool" type="button" title="Document info" onClick={() => setInfoPanel(p => !p)}>Info</button>
              </div>

              <div className={`grid min-h-0 flex-1 ${infoPanel ? 'grid-cols-[minmax(0,1fr)_300px]' : 'grid-cols-[minmax(0,1fr)]'}`}>
                <div className={getGridClass(editorMode)} style={{ position: 'relative' }}>
                  <textarea
                    ref={editorRef}
                    value={docContent}
                    onChange={handleEditorInput}
                    onKeyDown={handleKeyDown}
                    onContextMenu={handleContextMenu}
                    className="h-full w-full min-h-0 resize-none bg-[#fbfaf7] p-6 font-mono text-sm leading-6 text-stone-800 outline-none placeholder:text-stone-400"
                    style={{ position: 'relative', zIndex: 2 }}
                    spellCheck={false}
                    aria-label="Markdown editor"
                    placeholder="Start writing Markdown..."
                  />
                  <article
                    ref={previewRef}
                    className="preview empty min-h-0 overflow-y-auto overflow-x-hidden border-l border-stone-200 bg-stone-50 p-8"
                    style={{ position: 'relative', zIndex: 1 }}
                  >
                    <h2>Select a Markdown file</h2>
                    <p>Your rendered document will appear here.</p>
                  </article>
                </div>

                {infoPanel && (
                  <aside className="min-h-0 overflow-y-auto border-l border-stone-200 bg-stone-50 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm font-semibold text-stone-950">Document Info</p>
                      <button className="subtle-button" type="button" onClick={() => setInfoPanel(false)}>Hide</button>
                    </div>
                    <WebPropertiesSection
                      content={docContent}
                      onChange={(c) => { setDocContent(c); setDirty(true) }}
                    />
                    <WebOutlineSection content={docContent} />
                    <WebLinksSection content={docContent} />
                  </aside>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">
              Select a document to edit
            </div>
          )}
        </div>
      </div>

      {contextMenu && (
        <div
          role="menu"
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button type="button" className="context-menu-button" onClick={() => { wrapSelection('**', '**', 'bold text'); setContextMenu(null) }}>Bold</button>
          <button type="button" className="context-menu-button" onClick={() => { wrapSelection('_', '_', 'italic text'); setContextMenu(null) }}>Italic</button>
          <button type="button" className="context-menu-button" onClick={() => { wrapSelection('[', '](url)', 'link text'); setContextMenu(null) }}>Insert link</button>
          <button type="button" className="context-menu-button" onClick={() => { insertOrEditTable(); setContextMenu(null) }}>Insert table</button>
          <button type="button" className="context-menu-button" onClick={() => { addMarkdownTableRow(); setContextMenu(null) }}>Add table row below</button>
          <button type="button" className="context-menu-button" onClick={() => { insertAtCursor('\n$$\nE = mc^2\n$$\n'); setContextMenu(null) }}>Insert formula</button>
          <button type="button" className="context-menu-button" onClick={() => { insertAtCursor('\n```mermaid\nflowchart TD\n  A --> B\n```\n'); setContextMenu(null) }}>Insert Mermaid diagram</button>
        </div>
      )}
    </div>
  )
}

function EditorToolbarButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className="editor-tool" type="button" title={title} onClick={onClick}>
      {children}
    </button>
  )
}

function WebPropertiesSection({ content, onChange }: { content: string; onChange: (c: string) => void }) {
  const parsed = parseFrontmatter(content)
  const fields = ['title', 'description', 'tags', 'slug', 'status']

  const updateField = (field: string, value: string) => {
    const newContent = writeFrontmatter(content, { [field]: value.trim() })
    onChange(newContent)
  }

  return (
    <section className="document-info-section">
      <p className="text-sm font-semibold text-stone-950">Properties</p>
      <p className="mt-1 text-xs text-stone-500">Edits are written back to YAML frontmatter.</p>
      <div className="mt-3 space-y-3">
        {fields.map((field) => (
          <label key={field} className="block">
            <span className="field-label">{field}</span>
            {field === 'status' ? (
              <select
                className="compact-select mt-1 w-full"
                defaultValue={parsed.data[field] ?? ''}
                aria-label={field}
                onChange={(e) => updateField(field, e.target.value)}
              >
                <option value="">-</option>
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
            ) : (
              <input
                className="field-input"
                defaultValue={parsed.data[field] ?? ''}
                aria-label={field}
                onBlur={(e) => updateField(field, e.target.value)}
              />
            )}
          </label>
        ))}
      </div>
    </section>
  )
}

function WebOutlineSection({ content }: { content: string }) {
  const headings = content.split('\n').flatMap((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    return match ? [{ level: match[1]!.length, title: match[2]!.trim(), line: index }] : []
  })

  return (
    <section className="document-info-section">
      <p className="text-sm font-semibold text-stone-950">Outline</p>
      {headings.length === 0 ? (
        <p className="mt-2 text-xs text-stone-500">No headings found.</p>
      ) : (
        <div className="mt-2 space-y-1">
          {headings.map((h, i) => (
            <button key={i} type="button" className="tree-button" style={{ paddingLeft: `${h.level * 0.5}rem` }}>
              {h.title}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function WebLinksSection({ content }: { content: string }) {
  const links: Array<{ target: string; line: number }> = []
  content.split('\n').forEach((line, index) => {
    for (const match of line.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      links.push({ target: match[1]!, line: index })
    }
    for (const match of line.matchAll(/\[\[([^\]]+)\]\]/g)) {
      links.push({ target: match[1]!, line: index })
    }
  })

  return (
    <section className="document-info-section">
      <p className="text-sm font-semibold text-stone-950">Outgoing links</p>
      <div className="mt-2 space-y-1">
        {links.length === 0 ? (
          <p className="text-xs text-stone-500">No outgoing links.</p>
        ) : (
          links.map((l, i) => (
            <div key={i} className="rounded-md border border-stone-200 px-2 py-1.5 text-xs">
              <span className="font-semibold text-stone-800">{l.target}</span>
              <span className="ml-2 text-stone-500">line {l.line + 1}</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function getEditor(): HTMLTextAreaElement | null {
  return document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Markdown editor"]')
}

function wrapSelection(prefix: string, suffix: string, fallback: string) {
  const editor = getEditor()
  if (!editor) return
  const start = editor.selectionStart
  const end = editor.selectionEnd
  const selected = editor.value.slice(start, end) || fallback
  const next = `${prefix}${selected}${suffix}`
  editor.setRangeText(next, start, end, 'select')
  editor.dispatchEvent(new Event('input', { bubbles: true }))
  editor.focus()
}

function insertAtCursor(text: string) {
  const editor = getEditor()
  if (!editor) return
  editor.setRangeText(text, editor.selectionStart, editor.selectionEnd, 'end')
  editor.dispatchEvent(new Event('input', { bubbles: true }))
  editor.focus()
}

function currentLineIndex(): number {
  const editor = getEditor()
  if (!editor) return 0
  return editor.value.slice(0, editor.selectionStart).split('\n').length - 1
}

function looksLikeTableLine(line = ''): boolean {
  return line.includes('|') && line.trim().split('|').length >= 3
}

function currentTableRange(): { start: number; end: number } | null {
  const editor = getEditor()
  if (!editor) return null
  const lines = editor.value.split('\n')
  let cursorLine = currentLineIndex()
  if (!looksLikeTableLine(lines[cursorLine]) && looksLikeTableLine(lines[cursorLine - 1])) cursorLine -= 1
  if (!looksLikeTableLine(lines[cursorLine])) return null
  let start = cursorLine
  while (start > 0 && looksLikeTableLine(lines[start - 1])) start -= 1
  let end = cursorLine
  while (end < lines.length - 1 && looksLikeTableLine(lines[end + 1])) end += 1
  if (end - start < 1) return null
  return { start, end }
}

function parseTableCells(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim())
}

function insertOrEditTable() {
  const range = currentTableRange()
  if (range) {
    formatMarkdownTable()
    return
  }
  insertAtCursor('\n| Column | Value |\n| --- | --- |\n| Item | Detail |\n')
}

function formatMarkdownTable() {
  const range = currentTableRange()
  const editor = getEditor()
  if (!range || !editor) return
  const lines = editor.value.split('\n')
  const tableLines = lines.slice(range.start, range.end + 1)
  const dataLines = tableLines.filter((l) => !looksLikeSeparator(l))
  if (dataLines.length === 0) return
  const widths = parseTableCells(dataLines[0]!).map(() => 4)
  for (const line of dataLines) {
    parseTableCells(line).forEach((cell, col) => {
      widths[col] = Math.max(widths[col] ?? 4, cell.length)
    })
  }
  const formatted = tableLines.map((line) => {
    if (looksLikeSeparator(line)) {
      return `| ${widths.map((w) => '-'.repeat(w)).join(' | ')} |`
    }
    const cells = parseTableCells(line)
    return `| ${cells.map((cell, column) => cell.padEnd(widths[column] ?? 4, ' ')).join(' | ')} |`
  })
  const allLines = editor.value.split('\n')
  allLines.splice(range.start, range.end - range.start + 1, ...formatted)
  editor.value = allLines.join('\n')
  editor.dispatchEvent(new Event('input', { bubbles: true }))
  editor.focus()
}

function looksLikeSeparator(line: string): boolean {
  return /^\|?\s*[-:]+/.test(line.trim())
}

function addMarkdownTableRow() {
  const range = currentTableRange()
  const editor = getEditor()
  if (!range || !editor) {
    insertOrEditTable()
    return
  }
  const lines = editor.value.split('\n')
  const cells = parseTableCells(lines[range.start]!)
  const row = `| ${cells.map(() => ' ').join(' | ')} |`
  lines.splice(Math.max(currentLineIndex() + 1, range.start + 2), 0, row)
  editor.value = lines.join('\n')
  editor.dispatchEvent(new Event('input', { bubbles: true }))
  editor.focus()
}
