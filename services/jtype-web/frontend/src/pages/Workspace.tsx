import { useEffect, useState, useRef, useCallback } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { api, getStoredUsername, type WorkspaceSummary, type DocumentListItem, type DomainResponse } from '../api'
import { renderToContainer } from '../lib/markdown'
import { parseFrontmatter, writeFrontmatter } from '../lib/frontmatter'
import type { EditorMode } from '../lib/utils'

type WorkspaceSection = 'documents' | 'publishing' | 'domains'

export function Workspace() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const location = useLocation()
  const initialSection = ((location.state as { section?: WorkspaceSection } | null)?.section) ?? 'documents'
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null)
  const [documents, setDocuments] = useState<DocumentListItem[]>([])
  const [domains, setDomains] = useState<DomainResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<WorkspaceSection>(initialSection)
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)
  const [docContent, setDocContent] = useState('')
  const [newPath, setNewPath] = useState('')
  const [saving, setSaving] = useState(false)
  const [workspaceName, setWorkspaceName] = useState('')
  const [publishTitle, setPublishTitle] = useState('')
  const [settingsMessage, setSettingsMessage] = useState('')
  const [newDomain, setNewDomain] = useState('')
  const [certDomainId, setCertDomainId] = useState('')
  const [certChainPem, setCertChainPem] = useState('')
  const [privateKeyPem, setPrivateKeyPem] = useState('')
  const [domainMessage, setDomainMessage] = useState('')
  const [editorMode, setEditorMode] = useState<EditorMode>('split')
  const [infoPanel, setInfoPanel] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [dirty, setDirty] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const editorRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLElement>(null)
  const isSyncingScroll = useRef(false)

  useEffect(() => {
    if (!workspaceId) return
    Promise.all([
      api.getWorkspace(workspaceId),
      api.listDocuments(workspaceId),
      api.listDomains(),
    ]).then(([ws, docs, domainList]) => {
      setWorkspace(ws)
      setDocuments(docs)
      setDomains(domainList)
      setWorkspaceName(ws.name === '.jtype' ? (ws.publishTitle || '') : ws.name)
      setPublishTitle(ws.publishTitle || ws.name)
    }).finally(() => setLoading(false))
  }, [workspaceId])

  useEffect(() => {
    const nextSection = (location.state as { section?: WorkspaceSection } | null)?.section
    if (nextSection) setActiveSection(nextSection)
  }, [location.state])

  useEffect(() => {
    if (activeSection !== 'documents' || !selectedDoc) return
    const editor = editorRef.current
    const preview = previewRef.current
    if (!editor || !preview) return

    const syncScroll = (source: HTMLElement, target: HTMLElement) => {
      if (isSyncingScroll.current) return
      isSyncingScroll.current = true
      const sourceRange = Math.max(1, source.scrollHeight - source.clientHeight)
      const targetRange = Math.max(1, target.scrollHeight - target.clientHeight)
      const ratio = source.scrollTop / sourceRange
      target.scrollTop = ratio * targetRange
      requestAnimationFrame(() => {
        isSyncingScroll.current = false
      })
    }

    const onEditorScroll = () => syncScroll(editor, preview)
    const onPreviewScroll = () => syncScroll(preview, editor)

    editor.addEventListener('scroll', onEditorScroll)
    preview.addEventListener('scroll', onPreviewScroll)

    return () => {
      editor.removeEventListener('scroll', onEditorScroll)
      preview.removeEventListener('scroll', onPreviewScroll)
    }
  }, [activeSection, selectedDoc, editorMode, infoPanel])

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
      const parsedDoc = parseFrontmatter(docContent)
      await api.saveDocument(workspaceId, {
        relativePath: doc.relativePath,
        content: docContent,
        title: parsedDoc.data.title || undefined,
      })
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

  async function saveWorkspaceSettings() {
    if (!workspaceId) return
    setSaving(true)
    try {
      const updated = await api.updateWorkspace(workspaceId, {
        name: workspaceName.trim() || undefined,
        publishTitle: publishTitle.trim() || undefined,
      })
      setWorkspace(updated)
      setWorkspaceName(updated.name)
      setPublishTitle(updated.publishTitle || updated.name)
      setSettingsMessage('Publishing details saved')
      setTimeout(() => setSettingsMessage(''), 2500)
    } finally {
      setSaving(false)
    }
  }

  async function reloadDomains() {
    setDomains(await api.listDomains())
  }

  async function addDomain() {
    if (!newDomain.trim() || !workspaceId) return
    await api.addDomain(newDomain.trim(), workspaceId)
    setNewDomain('')
    await reloadDomains()
  }

  async function verifyDomain(id: string) {
    await api.verifyDomain(id)
    await reloadDomains()
  }

  async function bindDomain(domain: DomainResponse, bind: boolean) {
    await api.bindDomain(domain.id, bind ? workspaceId : undefined)
    await reloadDomains()
  }

  async function uploadCertificate() {
    if (!certDomainId) return
    await api.uploadCertificate(certDomainId, certChainPem, privateKeyPem)
    setCertChainPem('')
    setPrivateKeyPem('')
    setDomainMessage('SSL certificate uploaded')
    setTimeout(() => setDomainMessage(''), 2500)
    await reloadDomains()
  }

  async function setDocumentPublishStatus(status: 'published' | 'draft' | 'archived') {
    if (!workspaceId || !selectedDoc) return
    const doc = documents.find(d => d.id === selectedDoc)
    if (!doc) return
    const nextContent = writeFrontmatter(docContent, { status })
    setSaving(true)
    try {
      await api.saveDocument(workspaceId, {
        relativePath: doc.relativePath,
        content: nextContent,
        title: parseFrontmatter(nextContent).data.title || undefined,
      })
      setDocContent(nextContent)
      setDirty(false)
      setDocuments(await api.listDocuments(workspaceId))
    } finally {
      setSaving(false)
    }
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
  const selectedDocument = selectedDoc ? documents.find(d => d.id === selectedDoc) : null
  const publicUrl = workspace ? `/u/${getStoredUsername() || 'me'}/${workspace.slug}` : ''
  const boundDomains = workspace ? domains.filter(domain => domain.workspaceId === workspace.id) : []
  const availableDomains = workspace ? domains.filter(domain => !domain.workspaceId || domain.workspaceId === workspace.id) : []
  const verifiedDomains = boundDomains.filter(domain => domain.status === 'verified')

  const getGridClass = (mode: EditorMode) => {
    if (mode === 'write') return 'editor-preview-grid view-mode-write'
    if (mode === 'preview') return 'editor-preview-grid view-mode-preview'
    return 'editor-preview-grid view-mode-split'
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" /></div>

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <WorkspaceSectionNav active={activeSection} onChange={setActiveSection} />

      {activeSection === 'publishing' && workspace && (
        <WorkspacePublishingPanel
          workspace={workspace}
          workspaceName={workspaceName}
          publishTitle={publishTitle}
          message={settingsMessage}
          saving={saving}
          publicUrl={publicUrl}
          onNameChange={setWorkspaceName}
          onTitleChange={setPublishTitle}
          onSave={saveWorkspaceSettings}
          onOpenDomains={() => setActiveSection('domains')}
        />
      )}

      {activeSection === 'domains' && workspace && (
        <WorkspaceDomainsPanel
          workspace={workspace}
          domains={availableDomains}
          boundDomains={boundDomains}
          verifiedDomains={verifiedDomains}
          newDomain={newDomain}
          certDomainId={certDomainId}
          certChainPem={certChainPem}
          privateKeyPem={privateKeyPem}
          message={domainMessage}
          onNewDomainChange={setNewDomain}
          onCertDomainChange={setCertDomainId}
          onCertChainChange={setCertChainPem}
          onPrivateKeyChange={setPrivateKeyPem}
          onAddDomain={addDomain}
          onVerifyDomain={verifyDomain}
          onBindDomain={bindDomain}
          onUploadCertificate={uploadCertificate}
        />
      )}

      {activeSection === 'documents' && (
      <>
      <div className="my-5 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-zinc-500 ring-1 ring-black/[0.04] hover:text-brand"
              onClick={() => setSidebarCollapsed(c => !c)}
            >
              {sidebarCollapsed ? 'Show files' : 'Hide files'}
            </button>
            <h1 className="truncate text-2xl font-semibold text-zinc-950 dark:text-white">{displayWorkspaceName(workspace)}</h1>
            {workspace && (
              <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                {workspace.documentCount} docs
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
            <a className="font-semibold text-brand" href={publicUrl} target="_blank" rel="noreferrer">{publicUrl}</a>
            {selectedDoc && <span>{documents.find(d => d.id === selectedDoc)?.relativePath}</span>}
            {selectedDoc && <span className={`status-chip ${dirty ? 'status-chip-warning' : 'status-chip-neutral'}`}>{dirty ? 'Unsaved' : 'Saved'}</span>}
            {selectedDoc && <span className="status-chip status-chip-neutral">{publishStatus}</span>}
          </div>
        </div>
        {selectedDoc && (
          <div className="flex items-center gap-2 rounded-2xl bg-white/75 p-1 shadow-sm shadow-emerald-950/5 ring-1 ring-black/[0.04]">
            <button
              onClick={() => setDocumentPublishStatus(publishStatus === 'published' ? 'draft' : 'published')}
              disabled={saving}
              className="h-9 rounded-xl px-3 text-xs font-semibold text-brand hover:bg-brand/10 disabled:opacity-50"
            >
              {publishStatus === 'published' ? 'Unpublish' : 'Publish'}
            </button>
            <button
              onClick={() => setDocumentPublishStatus('archived')}
              disabled={saving}
              className="h-9 rounded-xl px-3 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 disabled:opacity-50"
            >
              Archive
            </button>
            <button
              onClick={saveDocument}
              disabled={saving || !dirty}
              className="h-9 rounded-xl bg-brand px-4 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
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
                  <span className="min-w-0 truncate">{doc.relativePath}</span>
                  <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${doc.status === 'published' ? 'bg-brand/10 text-brand' : 'bg-zinc-100 text-zinc-500'}`}>{doc.status}</span>
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
                    {selectedDocument && (
                      <section className="document-info-section">
                        <p className="text-sm font-semibold text-stone-950">Publish</p>
                        <p className="mt-1 text-xs text-stone-500">Current status: {publishStatus}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button className="sidebar-action" type="button" onClick={() => setDocumentPublishStatus('published')}>Publish</button>
                          <button className="sidebar-action" type="button" onClick={() => setDocumentPublishStatus('draft')}>Unpublish</button>
                        </div>
                      </section>
                    )}
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
      </>
      )}

      {activeSection === 'documents' && contextMenu && (
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

function WorkspaceSectionNav({ active, onChange }: { active: WorkspaceSection; onChange: (section: WorkspaceSection) => void }) {
  const items: Array<{ id: WorkspaceSection; label: string }> = [
    { id: 'documents', label: 'Documents' },
    { id: 'publishing', label: 'Publishing' },
    { id: 'domains', label: 'Domains' },
  ]
  return (
    <nav className="flex flex-wrap gap-2">
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active === item.id ? 'bg-brand text-white shadow-sm shadow-brand/20' : 'bg-white/70 text-zinc-500 ring-1 ring-black/[0.04] hover:text-brand dark:bg-zinc-900/70'}`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}

function WorkspacePublishingPanel({
  workspace,
  workspaceName,
  publishTitle,
  publicUrl,
  message,
  saving,
  onNameChange,
  onTitleChange,
  onSave,
  onOpenDomains,
}: {
  workspace: WorkspaceSummary
  workspaceName: string
  publishTitle: string
  publicUrl: string
  message: string
  saving: boolean
  onNameChange: (value: string) => void
  onTitleChange: (value: string) => void
  onSave: () => void
  onOpenDomains: () => void
}) {
  const usedPct = Math.min(100, (workspace.storageUsedBytes / Math.max(1, workspace.storageBudgetBytes)) * 100)
  return (
    <section className="mx-auto mt-8 w-full max-w-5xl rounded-[32px] bg-white/85 p-8 shadow-sm shadow-emerald-950/5 ring-1 ring-black/[0.04] dark:bg-zinc-900/85">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Publishing</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-950 dark:text-white">Workspace identity</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Keep the publish name and workspace name here. The workspace slug and storage limit are assigned by the service.
          </p>
        </div>
        <a className="rounded-full bg-brand/10 px-4 py-2 text-sm font-semibold text-brand" href={publicUrl} target="_blank" rel="noreferrer">
          {publicUrl}
        </a>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <WorkspaceField label="Workspace name" value={workspaceName} onChange={onNameChange} />
        <WorkspaceField label="Publish title" value={publishTitle} onChange={onTitleChange} />
        <ReadOnlyField label="Workspace slug" value={workspace.slug} />
        <ReadOnlyField label="Vault space" value={`${formatBytes(workspace.storageBudgetBytes)} allocated`} />
      </div>

      <div className="mt-7 rounded-3xl bg-[#f7faf8] p-5">
        <div className="mb-2 flex justify-between text-sm text-zinc-500">
          <span>Storage used</span>
          <span>{formatBytes(workspace.storageUsedBytes)} / {formatBytes(workspace.storageBudgetBytes)}</span>
        </div>
        <div className="h-2 rounded-full bg-white">
          <div className="h-2 rounded-full bg-brand" style={{ width: `${usedPct}%` }} />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <button className="workspace-card-link" type="button" onClick={onOpenDomains}>Manage custom domains</button>
        <div className="flex items-center gap-3">
          {message && <p className="text-sm font-semibold text-brand">{message}</p>}
          <button className="h-10 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50" onClick={onSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </section>
  )
}

function WorkspaceDomainsPanel({
  workspace,
  domains,
  boundDomains,
  verifiedDomains,
  newDomain,
  certDomainId,
  certChainPem,
  privateKeyPem,
  message,
  onNewDomainChange,
  onCertDomainChange,
  onCertChainChange,
  onPrivateKeyChange,
  onAddDomain,
  onVerifyDomain,
  onBindDomain,
  onUploadCertificate,
}: {
  workspace: WorkspaceSummary
  domains: DomainResponse[]
  boundDomains: DomainResponse[]
  verifiedDomains: DomainResponse[]
  newDomain: string
  certDomainId: string
  certChainPem: string
  privateKeyPem: string
  message: string
  onNewDomainChange: (value: string) => void
  onCertDomainChange: (value: string) => void
  onCertChainChange: (value: string) => void
  onPrivateKeyChange: (value: string) => void
  onAddDomain: () => void
  onVerifyDomain: (id: string) => void
  onBindDomain: (domain: DomainResponse, bind: boolean) => void
  onUploadCertificate: () => void
}) {
  return (
    <div className="mx-auto mt-8 w-full max-w-6xl overflow-y-auto pb-8">
      <section className="rounded-[32px] bg-white/85 p-8 shadow-sm shadow-emerald-950/5 ring-1 ring-black/[0.04] dark:bg-zinc-900/85">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Custom domains</p>
            <h1 className="mt-2 text-3xl font-semibold text-zinc-950 dark:text-white">{displayWorkspaceName(workspace)} domains</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Add domains, verify DNS ownership, bind them to this workspace, and manage SSL certificates from one place.
            </p>
          </div>
          <div className="rounded-2xl bg-[#f7faf8] px-4 py-3 text-sm">
            <span className="font-semibold text-zinc-950">{boundDomains.length}</span>
            <span className="ml-1 text-zinc-500">bound</span>
          </div>
        </div>

        <div className="mt-8 flex gap-2 rounded-2xl bg-[#f7faf8] p-1 ring-1 ring-black/[0.04]">
          <input
            value={newDomain}
            onChange={e => onNewDomainChange(e.target.value)}
            placeholder="docs.example.com"
            className="h-11 flex-1 border-0 bg-transparent px-3 text-sm outline-none placeholder:text-zinc-400"
            onKeyDown={e => e.key === 'Enter' && onAddDomain()}
          />
          <button onClick={onAddDomain} className="h-11 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark">Add domain</button>
        </div>

        <div className="mt-8 grid gap-4">
          {domains.length === 0 ? (
            <div className="rounded-3xl bg-[#f7faf8] p-8 text-center text-sm text-zinc-500">No domains yet.</div>
          ) : (
            domains.map(domain => (
              <DomainRow
                key={domain.id}
                domain={domain}
                isBound={domain.workspaceId === workspace.id}
                onVerify={() => onVerifyDomain(domain.id)}
                onBind={() => onBindDomain(domain, true)}
                onUnbind={() => onBindDomain(domain, false)}
              />
            ))
          )}
        </div>
      </section>

      <section className="mt-5 rounded-[32px] bg-white/85 p-8 shadow-sm shadow-emerald-950/5 ring-1 ring-black/[0.04] dark:bg-zinc-900/85">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">SSL</p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-white">Certificate management</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Upload a PEM certificate for a verified domain. The private key is stored as a hash in the current backend model.
            </p>
          </div>
          {message && <p className="rounded-full bg-brand/10 px-4 py-2 text-sm font-semibold text-brand">{message}</p>}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">Verified domain</span>
              <select
                value={certDomainId}
                onChange={e => onCertDomainChange(e.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border-0 bg-[#f7faf8] px-4 text-sm outline-none ring-1 ring-black/[0.04]"
              >
                <option value="">Select a domain</option>
                {verifiedDomains.map(domain => (
                  <option key={domain.id} value={domain.id}>{domain.domain}</option>
                ))}
              </select>
            </label>
            <button
              className="mt-4 h-11 w-full rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
              onClick={onUploadCertificate}
              disabled={!certDomainId || !certChainPem.trim() || !privateKeyPem.trim()}
            >
              Upload certificate
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <textarea
              value={certChainPem}
              onChange={e => onCertChainChange(e.target.value)}
              placeholder="-----BEGIN CERTIFICATE-----"
              className="min-h-44 rounded-2xl border-0 bg-[#f7faf8] p-4 font-mono text-xs outline-none ring-1 ring-black/[0.04]"
            />
            <textarea
              value={privateKeyPem}
              onChange={e => onPrivateKeyChange(e.target.value)}
              placeholder="-----BEGIN PRIVATE KEY-----"
              className="min-h-44 rounded-2xl border-0 bg-[#f7faf8] p-4 font-mono text-xs outline-none ring-1 ring-black/[0.04]"
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function DomainRow({
  domain,
  isBound,
  onVerify,
  onBind,
  onUnbind,
}: {
  domain: DomainResponse
  isBound: boolean
  onVerify: () => void
  onBind: () => void
  onUnbind: () => void
}) {
  const verified = domain.status === 'verified'
  return (
    <article className="rounded-3xl bg-[#f7faf8] p-5 ring-1 ring-black/[0.04]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-950">{domain.domain}</h3>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Status label={verified ? 'DNS verified' : 'DNS pending'} tone={verified ? 'success' : 'pending'} />
            <Status label={isBound ? 'Bound here' : domain.workspaceName ? `Bound to ${domain.workspaceName}` : 'Unbound'} tone={isBound ? 'success' : 'neutral'} />
            <Status label={domain.sslStatus ? `SSL ${domain.sslStatus}` : 'SSL not configured'} tone={domain.sslStatus ? 'success' : 'neutral'} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!verified && <button className="workspace-card-link" onClick={onVerify}>Verify DNS</button>}
          {isBound ? (
            <button className="workspace-card-link" onClick={onUnbind}>Unbind</button>
          ) : (
            <button className="workspace-card-link" onClick={onBind}>Bind here</button>
          )}
        </div>
      </div>
      {!verified && (
        <div className="mt-4 rounded-2xl bg-white p-4 text-xs text-zinc-500">
          Add TXT record <code className="rounded bg-[#eef3f1] px-1.5 py-1 font-mono text-zinc-800">{domain.dnsTxtRecord}</code>, then verify DNS.
        </div>
      )}
      {domain.sslExpiresAt && <p className="mt-3 text-xs text-zinc-500">SSL expires at {domain.sslExpiresAt}</p>}
    </article>
  )
}

function WorkspaceField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border-0 bg-[#f7faf8] px-4 text-sm text-zinc-950 outline-none ring-1 ring-black/[0.04] focus:ring-2 focus:ring-brand/30 dark:bg-zinc-950 dark:text-white"
      />
    </label>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">{label}</span>
      <div className="mt-2 flex h-12 items-center rounded-2xl bg-[#f7faf8] px-4 text-sm font-semibold text-zinc-600 ring-1 ring-black/[0.04] dark:bg-zinc-950 dark:text-zinc-300">
        {value}
      </div>
    </div>
  )
}

function Status({ label, tone }: { label: string; tone: 'success' | 'pending' | 'neutral' }) {
  const classes = tone === 'success'
    ? 'bg-brand/10 text-brand'
    : tone === 'pending'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-white text-zinc-500'
  return <span className={`rounded-full px-2.5 py-1 font-semibold ${classes}`}>{label}</span>
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
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

function displayWorkspaceName(workspace: WorkspaceSummary | null): string {
  if (!workspace) return 'Workspace'
  if (workspace.name === '.jtype') return workspace.publishTitle || 'JType Vault'
  return workspace.name
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
