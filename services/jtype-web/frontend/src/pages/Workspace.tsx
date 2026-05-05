import { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react'
import { Menu, MenuButton, MenuItems, MenuItem, Dialog, DialogPanel } from '@headlessui/react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api, getStoredUsername, type WorkspaceSummary, type DocumentListItem, type DomainResponse, type TrashItem } from '../api'
import { renderToContainer } from '../lib/markdown'
import { parseFrontmatter, writeFrontmatter } from '../lib/frontmatter'
import type { EditorMode } from '../lib/utils'
import { usePrompt, useConfirm } from '../components/PromptDialogContext'
import { useWorkspaceSocket } from '../hooks/useWorkspaceSocket'
import { useOfflineSync } from '../hooks/useOfflineSync'
import { ConflictResolver } from '../components/ConflictResolver'
import {
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  CodeBracketIcon,
  TableCellsIcon,
  VariableIcon,
  ArrowPathIcon,
  ClipboardDocumentCheckIcon,
  PencilSquareIcon,
  ViewColumnsIcon,
  EyeIcon,
  InformationCircleIcon,
  GlobeAltIcon,
  ArchiveBoxIcon,
  XMarkIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  LinkSlashIcon,
  ArrowUpTrayIcon,
  PlusIcon,
  DocumentPlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckIcon,
  FolderIcon,
  FolderOpenIcon,
  DocumentTextIcon,
  StarIcon,
  FolderPlusIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  PencilIcon,
  ClipboardIcon,

} from '@heroicons/react/24/outline'

type WorkspaceSection = 'documents' | 'trash' | 'publishing' | 'domains'
type WorkspaceSettingsSection = 'general' | 'trash' | 'domains'

export function Workspace() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const initialSection = ((location.state as { section?: WorkspaceSection } | null)?.section) ?? 'documents'
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null)
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([])
  const [documents, setDocuments] = useState<DocumentListItem[]>([])
  const [trashItems, setTrashItems] = useState<TrashItem[]>([])
  const [domains, setDomains] = useState<DomainResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<WorkspaceSection>('documents')
  const [settingsOpen, setSettingsOpen] = useState(initialSection !== 'documents')
  const [settingsSection, setSettingsSection] = useState<WorkspaceSettingsSection>(initialSection === 'trash' || initialSection === 'domains' ? initialSection : 'general')
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)
  const [docContent, setDocContent] = useState('')
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
  const [editorContextMenu, setEditorContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [treeContextMenu, setTreeContextMenu] = useState<{ node: WebTreeNode; x: number; y: number } | null>(null)
  const [dirty, setDirty] = useState(false)
  const sidebarCollapsed = false
  const [loadedContentHash, setLoadedContentHash] = useState<string | null>(null)
  const [loadedContent, setLoadedContent] = useState<string | null>(null)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set<string>())
  const [favoriteVersion, setFavoriteVersion] = useState(0)
  const [staleWarning, setStaleWarning] = useState<{ editedBy: string; wasDirty: boolean } | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const { status: wsStatus, sessionId: wsSessionId, request: wsRequest, subscribe: wsSubscribe } = useWorkspaceSocket(workspace?.id)
  const { hasPending, pendingCount, reconciling, saveOffline, reconcile } = useOfflineSync(workspace?.id)

  // Persist expanded folder state per workspace
  useEffect(() => {
    if (!workspaceId) return
    localStorage.setItem(`web-expanded:${workspaceId}`, JSON.stringify([...expanded]))
  }, [expanded, workspaceId])

  useEffect(() => {
    if (!workspaceId) return
    const saved = localStorage.getItem(`web-expanded:${workspaceId}`)
    if (saved) {
      try { setExpanded(new Set(JSON.parse(saved))) } catch { /* ignore */ }
    }
  }, [workspaceId])

  const editorRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLElement>(null)
  const isSyncingScroll = useRef(false)

  useEffect(() => {
    if (!workspaceId) return
    Promise.all([
      api.listWorkspaces(),
      api.getWorkspace(workspaceId),
      api.listDocuments(workspaceId),
      api.listTrash(workspaceId),
      api.listDomains(),
    ]).then(([workspaceList, ws, docs, trash, domainList]) => {
      setWorkspaces(workspaceList.workspaces)
      setWorkspace(ws)
      setDocuments(docs)
      setTrashItems(trash)
      setDomains(domainList)
      setWorkspaceName(ws.name === '.jtype' ? (ws.publishTitle || '') : ws.name)
      setPublishTitle(ws.publishTitle || ws.name)
    }).finally(() => setLoading(false))
  }, [workspaceId])

  useEffect(() => {
    const nextSection = (location.state as { section?: WorkspaceSection } | null)?.section
    if (!nextSection) return
    if (nextSection === 'documents') {
      setSettingsOpen(false)
      setActiveSection('documents')
      return
    }
    setSettingsSection(nextSection === 'domains' || nextSection === 'trash' ? nextSection : 'general')
    setSettingsOpen(true)
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
    if (!previewRef.current) return
    if (editorMode === 'write') return
    const container = previewRef.current
    const content = docContent
    const timer = setTimeout(() => {
      void renderToContainer(content, container)
    }, 120)
    return () => clearTimeout(timer)
  }, [docContent, editorMode])

  useEffect(() => {
    if (!wsSubscribe || !workspace?.id) return
    return wsSubscribe((event: any) => {
      if (event.sourceSessionId === wsSessionId) return
      switch (event.type) {
        case 'document:changed':
          api.listDocuments(workspace.id).then(setDocuments)
          if (selectedDoc) {
            const curDoc = documents.find(d => d.id === selectedDoc)
            if (curDoc && event.relativePath === curDoc.relativePath) {
              if (dirty) {
                setStaleWarning({ editedBy: event.editedBy || 'another user', wasDirty: true })
              } else {
                api.getDocument(workspace.id, selectedDoc).then(doc => {
                  setDocContent(doc.content)
                  setLoadedContentHash(doc.contentHash)
                  setLoadedContent(doc.content)
                })
              }
            }
          }
          break
        case 'document:deleted':
          api.listDocuments(workspace.id).then(setDocuments)
          api.listTrash(workspace.id).then(setTrashItems)
          if (selectedDoc) {
            const curDoc = documents.find(d => d.id === selectedDoc)
            if (curDoc && event.relativePath === curDoc.relativePath) {
              setStatusMessage('This document was deleted by another user.')
              setTimeout(() => setStatusMessage(''), 4000)
              setSelectedDoc(null)
              setDocContent('')
              setDirty(false)
            }
          }
          break
        case 'document:trashed':
          api.listDocuments(workspace.id).then(setDocuments)
          api.listTrash(workspace.id).then(setTrashItems)
          break
        case 'sync:required':
          api.listDocuments(workspace.id).then(setDocuments)
          api.listTrash(workspace.id).then(setTrashItems)
          break
      }
    })
  }, [wsSubscribe, wsSessionId, workspace?.id, selectedDoc, documents, dirty])

  useEffect(() => {
    if (wsStatus === 'connected' && hasPending && workspace?.id) {
      const token = localStorage.getItem('jtype.token')
      if (token) {
        reconcile(token).then(result => {
          if (result.conflicts > 0) {
            setStaleWarning({ editedBy: 'sync conflict', wasDirty: false })
          }
          if (result.pushed > 0) {
            setStatusMessage(`${result.pushed} offline change${result.pushed > 1 ? 's' : ''} synced.`)
            setTimeout(() => setStatusMessage(''), 3000)
          }
          if (result.conflicts > 0) {
            setStatusMessage(`${result.conflicts} conflict${result.conflicts > 1 ? 's' : ''} need attention.`)
            setTimeout(() => setStatusMessage(''), 5000)
          }
          api.listDocuments(workspace.id).then(setDocuments)
        })
      }
    }
  }, [wsStatus, hasPending, workspace?.id, reconcile])

  useEffect(() => {
    if (wsStatus === 'connected' || !workspace?.id) return
    const timer = setInterval(() => {
      api.listDocuments(workspace.id).then(setDocuments)
    }, 10_000)
    return () => clearInterval(timer)
  }, [wsStatus, workspace?.id])

  async function openDocument(docId: string) {
    if (!workspaceId) return
    const doc = await api.getDocument(workspaceId, docId)
    setSelectedDoc(docId)
    setDocContent(doc.content)
    setLoadedContentHash(doc.contentHash)
    setLoadedContent(doc.content)
    setDirty(false)
  }

  async function saveDocument() {
    if (!workspaceId || !selectedDoc) return
    const doc = documents.find(d => d.id === selectedDoc)
    if (!doc) return
    setSaving(true)
    try {
      const parsedDoc = parseFrontmatter(docContent)
      if (wsStatus === 'connected') {
        try {
          const ack = await wsRequest({
            type: 'document:save',
            relativePath: doc.relativePath,
            content: docContent,
            title: parsedDoc.data.title || undefined,
            baseContentHash: loadedContentHash || undefined,
            baseContent: loadedContent || undefined,
          })
          if (ack.ok && ack.document) {
            setLoadedContentHash(ack.document.contentHash)
            setLoadedContent(docContent)
            setDirty(false)
            setDocuments(await api.listDocuments(workspaceId))
            return
          }
        } catch { /* fall through to offline */ }
      }
      await saveOffline(doc.relativePath, docContent, loadedContentHash || '', loadedContent || '')
      setDirty(false)
      setStatusMessage('Saved offline. Will sync when reconnected.')
      setTimeout(() => setStatusMessage(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function createDocument() {
    if (!workspaceId) return
    const path = await prompt('Document path (e.g. notes/hello.md):')
    if (!path?.trim()) return
    if (wsStatus !== 'connected') {
      setStatusMessage('Not connected. Please wait for the connection to be established.')
      setTimeout(() => setStatusMessage(''), 3000)
      return
    }
    const ack = await wsRequest({ type: 'document:save', relativePath: path.trim(), content: '' })
    if (!ack.ok) throw new Error(ack.error || 'Save failed')
    const docs = await api.listDocuments(workspaceId)
    setDocuments(docs)
  }

  async function createCloudWorkspace() {
    if (!newWorkspaceName.trim()) return
    const ws = await api.createWorkspace(newWorkspaceName.trim())
    setNewWorkspaceName('')
    navigate(`/workspaces/${ws.id}`)
  }

  async function reloadDocumentsAndTrash() {
    if (!workspaceId) return
    const [docs, trash] = await Promise.all([
      api.listDocuments(workspaceId),
      api.listTrash(workspaceId),
    ])
    setDocuments(docs)
    setTrashItems(trash)
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
      const ack = await wsRequest({
        type: 'document:save',
        relativePath: doc.relativePath,
        content: nextContent,
        title: parseFrontmatter(nextContent).data.title || undefined,
        baseContentHash: loadedContentHash || undefined,
        baseContent: loadedContent || undefined,
      })
      if (ack.ok) {
        setDocContent(nextContent)
        setLoadedContentHash(ack.document?.contentHash ?? loadedContentHash)
        setLoadedContent(nextContent)
        setDirty(false)
        setDocuments(await api.listDocuments(workspaceId))
      }
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
    await reloadDocumentsAndTrash()
  }

  async function restoreTrashItem(trashId: string) {
    if (!workspaceId) return
    await api.restoreTrash(workspaceId, trashId)
    await reloadDocumentsAndTrash()
  }

  async function deleteTrashItem(trashId: string) {
    if (!workspaceId) return
    await api.deleteTrash(workspaceId, trashId)
    setTrashItems(items => items.filter(item => item.id !== trashId))
  }

  async function emptyTrash() {
    if (!workspaceId || trashItems.length === 0) return
    await api.emptyTrash(workspaceId)
    setTrashItems([])
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
    setEditorContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  useEffect(() => {
    if (!editorContextMenu) return
    const handler = () => setEditorContextMenu(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [editorContextMenu])

  useEffect(() => {
    if (!treeContextMenu) return
    const handler = () => setTreeContextMenu(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [treeContextMenu])

  const parsed = parseFrontmatter(docContent)
  const publishStatus = parsed.data.status || 'draft'
  const selectedDocument = selectedDoc ? documents.find(d => d.id === selectedDoc) ?? null : null
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
    <div className="grid h-[calc(100vh-4rem)] grid-rows-[1fr_auto] overflow-hidden bg-[#fbfdfb]">
      {workspace && (
        <WorkspaceSettingsDialog
          open={settingsOpen}
          workspace={workspace}
          active={settingsSection}
          workspaceName={workspaceName}
          publishTitle={publishTitle}
          publicUrl={publicUrl}
          message={settingsMessage}
          saving={saving}
          trashItems={trashItems}
          domains={availableDomains}
          boundDomains={boundDomains}
          verifiedDomains={verifiedDomains}
          newDomain={newDomain}
          certDomainId={certDomainId}
          certChainPem={certChainPem}
          privateKeyPem={privateKeyPem}
          domainMessage={domainMessage}
          onChange={setSettingsSection}
          onClose={() => setSettingsOpen(false)}
          onNameChange={setWorkspaceName}
          onTitleChange={setPublishTitle}
          onSave={saveWorkspaceSettings}
          onOpenDomains={() => setSettingsSection('domains')}
          onRestore={restoreTrashItem}
          onDeleteForever={deleteTrashItem}
          onEmpty={emptyTrash}
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
        <div className="grid grid-cols-[272px_minmax(0,1fr)] overflow-hidden">
          {!sidebarCollapsed && (
            <aside className="flex min-h-0 flex-col border-r border-black/[0.04] bg-[#f7faf8]">
              <div className="p-5 pb-4">
                <CloudWorkspaceSwitcher
                  workspace={workspace}
                  workspaces={workspaces}
                  activeWorkspaceId={workspaceId || ''}
                  newWorkspaceName={newWorkspaceName}
                  onNewWorkspaceNameChange={setNewWorkspaceName}
                  onCreateWorkspace={createCloudWorkspace}
                />
                <div className="mt-3 flex gap-1.5">
                  <button
                    className="sidebar-action flex-1"
                    type="button"
                    title="New Document"
                    disabled={!workspace}
                    onClick={createDocument}
                  >
                    <DocumentPlusIcon className="h-4 w-4" />
                    <span className="ml-1.5">New Document</span>
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <WebDocExplorer
                  workspaceId={workspaceId}
                  documents={documents}
                  selectedDoc={selectedDoc}
                  onOpen={openDocument}
                  onDelete={deleteDocument}
                  onDocumentsChange={setDocuments}
                  onSaveDocument={async (data) => {
                    const ack = await wsRequest({ type: 'document:save', ...data })
                    if (!ack.ok) throw new Error(ack.error || 'Save failed')
                  }}
                  trashItems={trashItems}
                  onRestoreTrash={restoreTrashItem}
                  onDeleteTrash={deleteTrashItem}
                  onEmptyTrash={emptyTrash}
                  query={query}
                  setQuery={setQuery}
                  expanded={expanded}
                  setExpanded={setExpanded}
                  favoriteVersion={favoriteVersion}
                  setFavoriteVersion={setFavoriteVersion}
                  treeContextMenu={treeContextMenu}
                  setTreeContextMenu={setTreeContextMenu}
                />
              </div>
            </aside>
          )}

        <section className="flex min-w-0 flex-col overflow-hidden bg-[#fbfdfb]">
          {selectedDoc ? (
            <>
              <div className="flex min-h-[68px] items-center justify-between gap-3 border-b border-black/[0.04] bg-white/70 px-6 backdrop-blur-xl">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-950">
                    {selectedDocument ? selectedDocument.title || selectedDocument.relativePath : displayWorkspaceName(workspace)}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <a className="truncate font-semibold text-brand" href={publicUrl} target="_blank" rel="noreferrer">{publicUrl}</a>
                    {selectedDoc && <span className="truncate">{documents.find(d => d.id === selectedDoc)?.relativePath}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`status-chip ${dirty ? 'status-chip-warning' : 'status-chip-neutral'}`}>{dirty ? 'Unsaved' : 'Saved'}</span>
                  <span className="status-chip status-chip-neutral">{publishStatus}</span>
                  <button
                    onClick={() => setDocumentPublishStatus(publishStatus === 'published' ? 'draft' : 'published')}
                    disabled={saving}
                    className="editor-tool"
                    title={publishStatus === 'published' ? 'Unpublish' : 'Publish'}
                  >
                    {publishStatus === 'published' ? <ArrowUturnLeftIcon className="h-4 w-4" /> : <GlobeAltIcon className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => setDocumentPublishStatus('archived')}
                    disabled={saving}
                    className="editor-tool"
                    title="Archive"
                  >
                    <ArchiveBoxIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={saveDocument}
                    disabled={saving || !dirty}
                    className="sidebar-action bg-brand px-3 text-white hover:bg-brand-dark hover:text-white"
                    title={saving ? 'Saving...' : 'Save'}
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {workspaceId && <ConflictResolver workspaceId={workspaceId} onResolved={reloadDocumentsAndTrash} />}
              {staleWarning && (
                <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-between text-sm">
                  <span>&#x26A0; Modified by {staleWarning.editedBy}{staleWarning.wasDirty ? '. You have unsaved changes.' : ''}</span>
                  <div className="flex gap-2">
                    <button onClick={async () => {
                      if (!workspaceId || !selectedDocument) return
                      const doc = await api.getDocument(workspaceId, selectedDocument.id)
                      setDocContent(doc.content)
                      setLoadedContentHash(doc.contentHash)
                      setLoadedContent(doc.content)
                      setDirty(false)
                      setStaleWarning(null)
                    }} className="text-red-600 hover:underline">Reload{staleWarning.wasDirty ? ' (discard)' : ''}</button>
                    {staleWarning.wasDirty && <button onClick={() => { saveDocument(); setStaleWarning(null) }} className="text-blue-600 hover:underline">Save mine</button>}
                  </div>
                </div>
              )}
              <div className="flex min-h-12 items-center gap-1 border-b border-black/[0.04] bg-[#fbfdfb] px-5">
                <EditorToolbarButton title="Bold (Ctrl+B)" onClick={() => wrapSelection('**', '**', 'bold text')}>
                  <BoldIcon className="h-4 w-4" />
                </EditorToolbarButton>
                <EditorToolbarButton title="Italic (Ctrl+I)" onClick={() => wrapSelection('_', '_', 'italic text')}>
                  <ItalicIcon className="h-4 w-4" />
                </EditorToolbarButton>
                <EditorToolbarButton title="Link (Ctrl+K)" onClick={() => wrapSelection('[', '](url)', 'link text')}>
                  <LinkIcon className="h-4 w-4" />
                </EditorToolbarButton>
                <EditorToolbarButton title="Inline code" onClick={() => wrapSelection('`', '`', 'code')}>
                  <CodeBracketIcon className="h-4 w-4" />
                </EditorToolbarButton>
                <EditorToolbarButton title="Insert table (Ctrl+Shift+T)" onClick={() => insertOrEditTable()}>
                  <TableCellsIcon className="h-4 w-4" />
                </EditorToolbarButton>
                <EditorToolbarButton title="Insert formula" onClick={() => insertAtCursor('\n$$\nE = mc^2\n$$\n')}>
                  <VariableIcon className="h-4 w-4" />
                </EditorToolbarButton>
                <EditorToolbarButton title="Insert Mermaid diagram" onClick={() => insertAtCursor('\n```mermaid\nflowchart TD\n  A --> B\n```\n')}>
                  <ArrowPathIcon className="h-4 w-4" />
                </EditorToolbarButton>
                <EditorToolbarButton title="Task list" onClick={() => insertAtCursor('\n- [ ] Task\n')}>
                  <ClipboardDocumentCheckIcon className="h-4 w-4" />
                </EditorToolbarButton>
                <div className="ml-auto flex items-center gap-1 rounded-full bg-[#eef5f1] p-1">
                  <button
                    type="button"
                    className={`view-mode-button ${editorMode === 'write' ? 'view-mode-button-active' : ''}`}
                    title="Write"
                    onClick={() => setEditorMode('write')}
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className={`view-mode-button ${editorMode === 'split' ? 'view-mode-button-active' : ''}`}
                    title="Split"
                    onClick={() => setEditorMode('split')}
                  >
                    <ViewColumnsIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className={`view-mode-button ${editorMode === 'preview' ? 'view-mode-button-active' : ''}`}
                    title="Preview"
                    onClick={() => setEditorMode('preview')}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </div>
                <button className="editor-tool" type="button" title="Document info" onClick={() => setInfoPanel(p => !p)}>
                  <InformationCircleIcon className="h-4 w-4" />
                </button>
              </div>

              <div className={`grid min-h-0 flex-1 ${infoPanel ? 'grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-[minmax(0,1fr)]'}`}>
                <div className={getGridClass(editorMode)} style={{ position: 'relative' }}>
                  <textarea
                    ref={editorRef}
                    value={docContent}
                    onChange={handleEditorInput}
                    onKeyDown={handleKeyDown}
                    onContextMenu={handleContextMenu}
                    className="h-full w-full min-h-0 resize-none bg-white/40 p-8 font-mono text-[13px] leading-7 text-stone-800 outline-none placeholder:text-[#9aa6a1]"
                    style={{ position: 'relative', zIndex: 2 }}
                    spellCheck={false}
                    aria-label="Markdown editor"
                    placeholder="Start writing Markdown..."
                  />
                  <article
                    ref={previewRef}
                    className="preview empty min-h-0 overflow-y-auto overflow-x-hidden border-l border-black/[0.04] bg-[#f8fbf9] p-10"
                    style={{ position: 'relative', zIndex: 1 }}
                  >
                    <h2>Select a Markdown file</h2>
                    <p>Your rendered document will appear here.</p>
                  </article>
                </div>

                {infoPanel && (
                  <aside className="min-h-0 overflow-y-auto border-l border-black/[0.04] bg-[#f6faf7] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm font-semibold text-stone-950">Document Info</p>
                      <button className="subtle-button aspect-square px-0" type="button" title="Hide" onClick={() => setInfoPanel(false)}><XMarkIcon className="h-4 w-4" /></button>
                    </div>
                    {selectedDocument && (
                      <section className="document-info-section">
                        <p className="text-sm font-semibold text-stone-950">Publish</p>
                        <p className="mt-1 text-xs text-stone-500">Current status: {publishStatus}</p>
                        <div className="mt-3">
                          <StatusSelect
                            value={publishStatus}
                            onChange={(value) => setDocumentPublishStatus(value as 'draft' | 'published' | 'archived')}
                          />
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
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <div className="mx-auto w-full max-w-6xl px-10 py-12">
                <div className="max-w-3xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Vault ready</p>
                  <h2 className="mt-4 text-4xl font-semibold tracking-[-0.035em] text-stone-950">{displayWorkspaceName(workspace)}</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5f6d68]">
                    Choose a note or create a new one.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <button
                      className="toolbar-button toolbar-button-primary"
                      type="button"
                      onClick={createDocument}
                    >
                      New Document
                    </button>
                    <button
                      className="toolbar-button"
                      type="button"
                      onClick={() => {
                        const first = documents[0]
                        if (first) openDocument(first.id)
                      }}
                    >
                      Quick open
                    </button>
                  </div>
                </div>

                <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <section className="panel-card p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-stone-950">Documents</p>
                      <span className="text-xs text-[#6b7773]">{documents.length} Markdown file{documents.length === 1 ? '' : 's'}</span>
                    </div>
                    <div className="space-y-1">
                      {documents.length === 0 ? (
                        <div className="rounded-md border border-dashed border-stone-300 p-4">
                          <p className="text-sm font-semibold text-stone-800">No notes yet.</p>
                          <p className="mt-1 text-sm text-stone-500">Create your first Markdown note.</p>
                        </div>
                      ) : (
                        documents.slice(0, 12).map(doc => (
                          <button key={doc.id} type="button" className={`command-row ${selectedDoc === doc.id ? 'bg-[#e8f6f2] ring-1 ring-brand/15' : ''}`} onClick={() => openDocument(doc.id)}>
                            <span className="min-w-0">
                              <span className={`block truncate font-semibold ${selectedDoc === doc.id ? 'text-brand' : ''}`}>{doc.relativePath.replace(/\.(md|markdown|mdown|mkd)$/i, '')}</span>
                              <span className="block truncate text-xs text-stone-500">{doc.relativePath}</span>
                            </span>
                            <span className={`shrink-0 text-xs ${selectedDoc === doc.id ? 'text-brand font-semibold' : 'text-stone-500'}`}>Markdown</span>
                          </button>
                        ))
                      )}
                    </div>
                  </section>


                </div>
              </div>
            </div>
          )}
        </section>
      </div>
      )}

      <div id="operation-log" className="col-span-full flex items-center justify-between border-t border-black/[0.04] bg-white/70 px-5 py-3 text-xs text-[#6b7773]">
        <span>{statusMessage || (selectedDoc ? `Opened ${documents.find(d => d.id === selectedDoc)?.relativePath || 'document'}.` : 'Select a document to edit.')}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          {reconciling ? (
            <span className="flex items-center gap-1.5 font-medium text-yellow-600"><span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />Syncing...</span>
          ) : wsStatus === 'connected' ? (
            <span className="flex items-center gap-1.5 font-medium text-green-600"><span className="w-2 h-2 rounded-full bg-green-500" />Connected</span>
          ) : wsStatus === 'connecting' ? (
            <span className="flex items-center gap-1.5 font-medium text-yellow-600"><span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />Connecting...</span>
          ) : (
            <span className="flex items-center gap-1.5 font-medium text-red-500"><span className="w-2 h-2 rounded-full bg-red-500" />{hasPending ? `Offline (${pendingCount} saved)` : 'Offline'}</span>
          )}
        </span>
      </div>

      {activeSection === 'documents' && editorContextMenu && (
        <div
          role="menu"
          className="context-menu"
          style={{ left: editorContextMenu.x, top: editorContextMenu.y }}
        >
          <button type="button" className="context-menu-button" onClick={() => { wrapSelection('**', '**', 'bold text'); setEditorContextMenu(null) }}><BoldIcon className="mr-2 h-3.5 w-3.5" />Bold</button>
          <button type="button" className="context-menu-button" onClick={() => { wrapSelection('_', '_', 'italic text'); setEditorContextMenu(null) }}><ItalicIcon className="mr-2 h-3.5 w-3.5" />Italic</button>
          <button type="button" className="context-menu-button" onClick={() => { wrapSelection('[', '](url)', 'link text'); setEditorContextMenu(null) }}><LinkIcon className="mr-2 h-3.5 w-3.5" />Insert link</button>
          <button type="button" className="context-menu-button" onClick={() => { insertOrEditTable(); setEditorContextMenu(null) }}><TableCellsIcon className="mr-2 h-3.5 w-3.5" />Insert table</button>
          <button type="button" className="context-menu-button" onClick={() => { addMarkdownTableRow(); setEditorContextMenu(null) }}><TableCellsIcon className="mr-2 h-3.5 w-3.5" />Add table row below</button>
          <button type="button" className="context-menu-button" onClick={() => { insertAtCursor('\n$$\nE = mc^2\n$$\n'); setEditorContextMenu(null) }}><VariableIcon className="mr-2 h-3.5 w-3.5" />Insert formula</button>
          <button type="button" className="context-menu-button" onClick={() => { insertAtCursor('\n```mermaid\nflowchart TD\n  A --> B\n```\n'); setEditorContextMenu(null) }}><ArrowPathIcon className="mr-2 h-3.5 w-3.5" />Insert Mermaid diagram</button>
        </div>
      )}
    </div>
  )
}

function CloudWorkspaceSwitcher({
  workspace,
  workspaces,
  activeWorkspaceId,
  newWorkspaceName,
  onNewWorkspaceNameChange,
  onCreateWorkspace,
}: {
  workspace: WorkspaceSummary | null
  workspaces: WorkspaceSummary[]
  activeWorkspaceId: string
  newWorkspaceName: string
  onNewWorkspaceNameChange: (value: string) => void
  onCreateWorkspace: () => void
}) {
  return (
    <Menu as="div" className="relative">
      <MenuButton
        type="button"
        className="flex w-full items-center gap-2 rounded-xl bg-white/75 px-2.5 py-2 text-left shadow-sm shadow-emerald-950/5 ring-1 ring-black/[0.04] transition hover:bg-white hover:ring-brand/20"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#eef7f4] text-sm font-semibold text-brand">
          {displayWorkspaceName(workspace).charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-stone-950">{displayWorkspaceName(workspace)}</span>
          <span className="block truncate text-xs text-[#6b7773]">
            {workspace ? `${workspace.documentCount} documents` : 'Choose a cloud workspace'}
          </span>
        </span>
        <ChevronDownIcon className="h-4 w-4 shrink-0 text-zinc-400" />
      </MenuButton>

      <MenuItems className="absolute left-0 top-12 z-[100] w-[320px] overflow-hidden rounded-xl border border-black/[0.06] bg-[#fbfdfb] shadow-2xl shadow-stone-900/15">
        <div className="max-h-64 overflow-y-auto p-2">
          {workspaces.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-500">No cloud workspaces yet.</p>
          ) : (
            workspaces.map(ws => (
              <MenuItem key={ws.id}>
                <Link
                  to={`/workspaces/${ws.id}`}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition data-[focus]:bg-[#e8f6f2] ${ws.id === activeWorkspaceId ? 'bg-[#e8f6f2] font-semibold text-brand' : 'text-zinc-700'}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-zinc-500 ring-1 ring-black/[0.04]">
                    {displayWorkspaceName(ws).charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{displayWorkspaceName(ws)}</span>
                    <span className="block truncate text-xs font-normal text-zinc-500">{ws.documentCount} documents</span>
                  </span>
                  {ws.id === activeWorkspaceId && <CheckIcon className="h-4 w-4 shrink-0 text-brand" />}
                </Link>
              </MenuItem>
            ))
          )}
        </div>
        <div className="border-t border-black/[0.06] p-2">
          <div className="flex gap-1.5">
            <input
              className="sync-input"
              value={newWorkspaceName}
              onChange={e => onNewWorkspaceNameChange(e.target.value)}
              placeholder="New cloud workspace"
              onKeyDown={e => e.key === 'Enter' && onCreateWorkspace()}
            />
            <button className="sidebar-action gap-1" type="button" onClick={onCreateWorkspace}>
              <PlusIcon className="h-3.5 w-3.5" />
              New
            </button>
          </div>
        </div>
      </MenuItems>
    </Menu>
  )
}

function WorkspaceSettingsDialog({
  workspace,
  active,
  workspaceName,
  publishTitle,
  publicUrl,
  message,
  saving,
  trashItems,
  domains,
  boundDomains,
  verifiedDomains,
  newDomain,
  certDomainId,
  certChainPem,
  privateKeyPem,
  domainMessage,
  open,
  onChange,
  onClose,
  onNameChange,
  onTitleChange,
  onSave,
  onOpenDomains,
  onRestore,
  onDeleteForever,
  onEmpty,
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
  active: WorkspaceSettingsSection
  workspaceName: string
  publishTitle: string
  publicUrl: string
  message: string
  saving: boolean
  trashItems: TrashItem[]
  domains: DomainResponse[]
  boundDomains: DomainResponse[]
  verifiedDomains: DomainResponse[]
  newDomain: string
  certDomainId: string
  certChainPem: string
  privateKeyPem: string
  domainMessage: string
  open: boolean
  onChange: (section: WorkspaceSettingsSection) => void
  onClose: () => void
  onNameChange: (value: string) => void
  onTitleChange: (value: string) => void
  onSave: () => void
  onOpenDomains: () => void
  onRestore: (trashId: string) => void
  onDeleteForever: (trashId: string) => void
  onEmpty: () => void
  onNewDomainChange: (value: string) => void
  onCertDomainChange: (value: string) => void
  onCertChainChange: (value: string) => void
  onPrivateKeyChange: (value: string) => void
  onAddDomain: () => void
  onVerifyDomain: (id: string) => void
  onBindDomain: (domain: DomainResponse, bind: boolean) => void
  onUploadCertificate: () => void
}) {
  const items: Array<{ id: WorkspaceSettingsSection; label: string; description: string }> = [
    { id: 'general', label: 'General', description: 'Name, publishing identity, and storage' },
    { id: 'domains', label: 'Domains', description: 'Custom domains and SSL' },
    { id: 'trash', label: 'Trash', description: 'Restore or delete cloud documents' },
  ]
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-stone-950/35 px-5 py-6 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center px-5 py-6">
        <DialogPanel className="grid h-[min(760px,92vh)] w-full max-w-6xl overflow-hidden rounded-2xl border border-white/70 bg-[#fbfdfb] shadow-2xl shadow-stone-900/25 md:grid-cols-[240px_minmax(0,1fr)]" aria-label="Cloud workspace settings">
          <aside className="border-r border-black/[0.04] bg-[#f7faf8] p-4">
            <div className="mb-5 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-semibold text-brand ring-1 ring-black/[0.04]">
                {displayWorkspaceName(workspace).charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-zinc-950">{displayWorkspaceName(workspace)}</span>
                <span className="block truncate text-xs text-zinc-500">Cloud workspace</span>
              </span>
            </div>
            <nav className="space-y-1">
              {items.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`w-full rounded-lg px-3 py-2 text-left transition ${active === item.id ? 'bg-white font-semibold text-brand shadow-sm shadow-emerald-950/5 ring-1 ring-brand/10' : 'text-zinc-600 hover:bg-white/80 hover:text-zinc-950'}`}
                  onClick={() => onChange(item.id)}
                >
                  <span className="block text-sm">{item.label}</span>
                  <span className="block text-xs font-normal text-zinc-500">{item.description}</span>
                </button>
              ))}
            </nav>
          </aside>
          <main className="min-h-0 overflow-y-auto p-8">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-semibold text-zinc-950">
                  {active === 'general' ? 'General' : active === 'domains' ? 'Domains' : 'Trash'}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {active === 'general' ? 'Manage cloud workspace name, publishing title, and storage.' : active === 'domains' ? 'Bind custom domains and manage certificates.' : 'Restore deleted documents or remove them permanently.'}
                </p>
              </div>
              <button className="subtle-button aspect-square px-0" type="button" title="Close" onClick={onClose}><XMarkIcon className="h-4 w-4" /></button>
            </div>
            {active === 'general' && (
              <WorkspacePublishingPanel
                workspace={workspace}
                workspaceName={workspaceName}
                publishTitle={publishTitle}
                publicUrl={publicUrl}
                message={message}
                saving={saving}
                embedded
                onNameChange={onNameChange}
                onTitleChange={onTitleChange}
                onSave={onSave}
                onOpenDomains={onOpenDomains}
              />
            )}
            {active === 'domains' && (
              <WorkspaceDomainsPanel
                workspace={workspace}
                domains={domains}
                boundDomains={boundDomains}
                verifiedDomains={verifiedDomains}
                newDomain={newDomain}
                certDomainId={certDomainId}
                certChainPem={certChainPem}
                privateKeyPem={privateKeyPem}
                message={domainMessage}
                embedded
                onNewDomainChange={onNewDomainChange}
                onCertDomainChange={onCertDomainChange}
                onCertChainChange={onCertChainChange}
                onPrivateKeyChange={onPrivateKeyChange}
                onAddDomain={onAddDomain}
                onVerifyDomain={onVerifyDomain}
                onBindDomain={onBindDomain}
                onUploadCertificate={onUploadCertificate}
              />
            )}
            {active === 'trash' && (
              <WorkspaceTrashPanel
                items={trashItems}
                embedded
                onRestore={onRestore}
                onDeleteForever={onDeleteForever}
                onEmpty={onEmpty}
              />
            )}
          </main>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

function WorkspaceTrashPanel({
  items,
  embedded = false,
  onRestore,
  onDeleteForever,
  onEmpty,
}: {
  items: TrashItem[]
  embedded?: boolean
  onRestore: (trashId: string) => void
  onDeleteForever: (trashId: string) => void
  onEmpty: () => void
}) {
  return (
    <section className={embedded ? "w-full" : "mx-auto mt-8 w-full max-w-5xl rounded-[32px] bg-white/85 p-8 shadow-sm shadow-emerald-950/5 ring-1 ring-black/[0.04] dark:bg-zinc-900/85"}>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Trash</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-950 dark:text-white">Deleted documents</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Restore cloud workspace documents or permanently remove them from trash.
          </p>
        </div>
        {items.length > 0 && (
          <button className="workspace-card-link text-red-700 hover:text-red-800" type="button" title="Empty trash" onClick={onEmpty}>
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-8 grid gap-3">
        {items.length === 0 ? (
          <div className="rounded-3xl bg-[#f7faf8] p-8 text-center text-sm text-zinc-500">Trash is empty.</div>
        ) : (
          items.map(item => (
            <article key={item.id} className="rounded-3xl bg-[#f7faf8] p-5 ring-1 ring-black/[0.04]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-zinc-950">{item.relativePath}</h3>
                  <p className="mt-1 text-sm text-zinc-500">{item.title || 'Untitled document'}</p>
                  <p className="mt-2 text-xs text-zinc-400">Deleted {formatDateTime(item.deletedAt)} / Expires {formatDateTime(item.expiresAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="workspace-card-link" type="button" title="Restore" onClick={() => onRestore(item.id)}>
                    <ArrowUturnLeftIcon className="h-4 w-4" />
                  </button>
                  <button className="workspace-card-link text-red-700 hover:text-red-800" type="button" title="Delete forever" onClick={() => onDeleteForever(item.id)}>
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

function WorkspacePublishingPanel({
  workspace,
  workspaceName,
  publishTitle,
  publicUrl,
  message,
  saving,
  embedded = false,
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
  embedded?: boolean
  onNameChange: (value: string) => void
  onTitleChange: (value: string) => void
  onSave: () => void
  onOpenDomains: () => void
}) {
  const usedPct = Math.min(100, (workspace.storageUsedBytes / Math.max(1, workspace.storageBudgetBytes)) * 100)
  return (
    <section className={embedded ? "w-full" : "mx-auto mt-8 w-full max-w-5xl rounded-[32px] bg-white/85 p-8 shadow-sm shadow-emerald-950/5 ring-1 ring-black/[0.04] dark:bg-zinc-900/85"}>
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
  embedded = false,
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
  embedded?: boolean
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
    <div className={embedded ? "w-full pb-2" : "mx-auto mt-8 w-full max-w-6xl overflow-y-auto pb-8"}>
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
          <button onClick={onAddDomain} className="h-11 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark" title="Add domain">
            <PlusIcon className="h-4 w-4" />
          </button>
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
              <ArrowUpTrayIcon className="h-4 w-4" />
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
          {!verified && <button className="workspace-card-link" title="Verify DNS" onClick={onVerify}><CheckCircleIcon className="h-4 w-4" /></button>}
          {isBound ? (
            <button className="workspace-card-link" title="Unbind" onClick={onUnbind}><LinkSlashIcon className="h-4 w-4" /></button>
          ) : (
            <button className="workspace-card-link" title="Bind here" onClick={onBind}><LinkIcon className="h-4 w-4" /></button>
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

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || 'unknown'
  return date.toLocaleString()
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
              <StatusSelect
                value={parsed.data[field] ?? ''}
                onChange={(value) => updateField(field, value)}
              />
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

function StatusSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const options = [
    { label: '—', value: '' },
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' },
  ]
  const active = options.find(o => o.value === value) ?? options[0]!

  return (
    <Menu as="div" className="relative mt-1 w-full">
      <MenuButton className="compact-select flex w-full items-center justify-between text-left">
        <span>{active.label}</span>
        <ChevronDownIcon className="h-3 w-3 text-stone-400" />
      </MenuButton>
      <MenuItems
        transition
        className="absolute left-0 z-50 mt-1 w-full origin-top rounded-lg border border-black/[0.06] bg-white p-1 shadow-lg shadow-stone-900/10 outline-none transition focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0"
      >
        {options.map((option) => (
          <MenuItem key={option.value}>
            {({ focus }) => (
              <button
                className={`flex w-full items-center rounded-md px-3 py-2 text-sm transition ${
                  focus ? 'bg-[#e8f6f2] text-brand' : 'text-stone-700'
                } ${active.value === option.value ? 'font-semibold' : ''}`}
                onClick={() => onChange(option.value)}
              >
                {option.label}
              </button>
            )}
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
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

// -- Folder tree for web dashboard sidebar --

interface WebTreeNode {
  name: string
  path: string
  kind: 'folder' | 'document'
  doc?: DocumentListItem
  children: WebTreeNode[]
}

function buildDocTree(documents: DocumentListItem[]): WebTreeNode[] {
  const root: WebTreeNode[] = []
  const folderMap = new Map<string, WebTreeNode>()

  const ensureFolder = (folderPath: string): WebTreeNode => {
    if (folderMap.has(folderPath)) return folderMap.get(folderPath)!
    const parts = folderPath.split('/')
    const name = parts[parts.length - 1]!
    const node: WebTreeNode = { name, path: folderPath, kind: 'folder', children: [] }
    folderMap.set(folderPath, node)
    if (parts.length > 1) {
      const parent = ensureFolder(parts.slice(0, -1).join('/'))
      parent.children.push(node)
    } else {
      root.push(node)
    }
    return node
  }

  for (const doc of documents) {
    const parts = doc.relativePath.split('/')
    const fileName = parts[parts.length - 1]!
    const leaf: WebTreeNode = { name: fileName, path: doc.relativePath, kind: 'document', doc, children: [] }
    if (parts.length > 1) {
      const parent = ensureFolder(parts.slice(0, -1).join('/'))
      parent.children.push(leaf)
    } else {
      root.push(leaf)
    }
  }

  const sortNodes = (nodes: WebTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
    for (const n of nodes) if (n.kind === 'folder') sortNodes(n.children)
  }
  sortNodes(root)
  return root
}

function allFolderPaths(nodes: WebTreeNode[]): Set<string> {
  const paths = new Set<string>()
  const walk = (list: WebTreeNode[]) => {
    for (const n of list) {
      if (n.kind === 'folder') {
        paths.add(n.path)
        walk(n.children)
      }
    }
  }
  walk(nodes)
  return paths
}

function readFavorites(workspaceId?: string): DocumentListItem[] {
  const key = `web-favorites:${workspaceId || 'global'}`
  const ids: string[] = JSON.parse(localStorage.getItem(key) || '[]')
  return ids.map(id => ({ id, relativePath: id, title: '', status: 'draft', contentHash: '', updatedClock: 0, versionId: null }))
}

function toggleFavoriteDoc(docId: string, workspaceId?: string) {
  const key = `web-favorites:${workspaceId || 'global'}`
  const ids: string[] = JSON.parse(localStorage.getItem(key) || '[]')
  const next = ids.includes(docId) ? ids.filter(i => i !== docId) : [docId, ...ids]
  localStorage.setItem(key, JSON.stringify(next))
}

function WebDocExplorer({
  workspaceId,
  documents,
  selectedDoc,
  onOpen,
  onDelete,
  onDocumentsChange,
  trashItems,
  onRestoreTrash,
  onDeleteTrash,
  onEmptyTrash,
  query,
  setQuery,
  expanded,
  setExpanded,
  favoriteVersion,
  setFavoriteVersion,
  treeContextMenu,
  setTreeContextMenu,
  onSaveDocument,
}: {
  workspaceId: string | undefined
  documents: DocumentListItem[]
  selectedDoc: string | null
  onOpen: (docId: string) => void
  onDelete: (docId: string) => void
  onDocumentsChange: (docs: DocumentListItem[]) => void
  onSaveDocument: (data: { relativePath: string; content: string; title?: string }) => Promise<void>
  trashItems: TrashItem[]
  onRestoreTrash: (id: string) => void
  onDeleteTrash: (id: string) => void
  onEmptyTrash: () => void
  query: string
  setQuery: (q: string) => void
  expanded: Set<string>
  setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>
  favoriteVersion: number
  setFavoriteVersion: React.Dispatch<React.SetStateAction<number>>
  treeContextMenu: { node: WebTreeNode; x: number; y: number } | null
  setTreeContextMenu: (c: { node: WebTreeNode; x: number; y: number } | null) => void
}) {
  const prompt = usePrompt()
  const confirmDialog = useConfirm()
  const tree = useMemo(() => buildDocTree(documents), [documents])
  const folders = useMemo(() => allFolderPaths(tree), [tree])
  const allExpanded = folders.size > 0 && folders.size === expanded.size

  const toggleExpandCollapse = useCallback(() => {
    if (allExpanded) {
      setExpanded(new Set<string>())
    } else {
      setExpanded(new Set(folders))
    }
  }, [allExpanded, folders, setExpanded])

  const handleToggle = useCallback((path: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [setExpanded])

  const favorites = useMemo(() => {
    const favIds = new Set(readFavorites(workspaceId).map(d => d.id))
    return documents.filter(d => favIds.has(d.id))
  }, [documents, workspaceId, favoriteVersion])

  const filteredResults = useMemo(() => {
    if (!query) return null
    return documents
      .filter(d => `${d.relativePath} ${d.title}`.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 30)
  }, [documents, query])

  const handleCreateFolder = async () => {
    if (!workspaceId) return
    const name = await prompt('New folder name:')
    if (!name?.trim()) return
    const placeholderPath = `${name.trim()}/.gitkeep`
    await onSaveDocument({ relativePath: placeholderPath, content: '' })
    const docs = await api.listDocuments(workspaceId)
    onDocumentsChange(docs)
  }

  const handleCreateDocInFolder = async (folderPath: string) => {
    if (!workspaceId) return
    const name = await prompt('New document name (e.g. note.md):')
    if (!name?.trim()) return
    const relativePath = `${folderPath}/${name.trim()}`
    await onSaveDocument({ relativePath, content: '' })
    const docs = await api.listDocuments(workspaceId)
    onDocumentsChange(docs)
    setExpanded(new Set(expanded).add(folderPath))
  }

  const handleDeleteFolder = async (folderPath: string) => {
    if (!workspaceId) return
    const confirmed = await confirmDialog('Delete folder', `Delete folder "${folderPath}" and all its contents?`, true)
    if (!confirmed) return
    try {
      const children = documents.filter(d => d.relativePath.startsWith(folderPath + '/'))
      for (const child of children) {
        await api.deleteDocument(workspaceId, child.id)
      }
      const docs = await api.listDocuments(workspaceId)
      onDocumentsChange(docs)
    } catch (err) {
      alert(String(err))
    }
  }

  const handleRenameDoc = async (doc: DocumentListItem) => {
    if (!workspaceId) return
    const newName = await prompt('Rename to:', doc.relativePath)
    if (!newName || newName === doc.relativePath) return
    try {
      const fullDoc = await api.getDocument(workspaceId, doc.id)
      await onSaveDocument({
        relativePath: newName.trim(),
        content: fullDoc.content,
        title: fullDoc.title || undefined,
      })
      await api.deleteDocument(workspaceId, doc.id)
      const docs = await api.listDocuments(workspaceId)
      onDocumentsChange(docs)
      setTreeContextMenu(null)
    } catch (err) {
      alert(String(err))
    }
  }

  return (
    <div className="px-3 pb-4">
      <input
        className="sync-input"
        placeholder="Search files..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      {filteredResults ? (
        <div className="mt-3 space-y-1">
          {filteredResults.length === 0 ? (
            <p className="text-xs text-stone-500">No matches.</p>
          ) : (
            filteredResults.map(doc => (
              <button key={doc.id} type="button" className="command-row" onClick={() => onOpen(doc.id)}>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{doc.relativePath.replace(/\.(md|markdown|mdown|mkd)$/i, '')}</span>
                  <span className="block truncate text-xs text-stone-500">{doc.relativePath}</span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : (
        <>
          {favorites.length > 0 && (
            <>
              <div className="mb-2 mt-4 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-stone-500">Favorites</p>
                <button
                  className="subtle-button aspect-square px-0"
                  type="button"
                  title="Toggle favorite"
                  disabled={!selectedDoc}
                  onClick={() => {
                    if (selectedDoc) {
                      toggleFavoriteDoc(selectedDoc, workspaceId)
                      setFavoriteVersion(v => v + 1)
                    }
                  }}
                >
                  <StarIcon className="h-4 w-4" />
                </button>
              </div>
              <div id="favorite-list" className="space-y-1">
                {favorites.map(doc => (
                  <button key={doc.id} type="button" className="tree-button text-xs" onClick={() => onOpen(doc.id)}>
                    <span className="text-stone-500">Favorite</span>
                    <span className="truncate font-semibold">{doc.relativePath.replace(/\.(md|markdown|mdown|mkd)$/i, '')}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <nav className="mt-2" aria-label="Workspace files">
            {documents.length === 0 ? (
              <p className="rounded-md border border-dashed border-stone-300 p-3 text-sm text-stone-500">
                No documents yet.
              </p>
            ) : (
              <>
                <div className="mb-1 flex items-center justify-end gap-0.5">
                  <button
                    className="subtle-button aspect-square px-0"
                    type="button"
                    title="New folder"
                    onClick={handleCreateFolder}
                  >
                    <FolderPlusIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="subtle-button aspect-square px-0"
                    type="button"
                    title={allExpanded ? 'Collapse all' : 'Expand all'}
                    onClick={toggleExpandCollapse}
                  >
                    {allExpanded
                      ? <ArrowsPointingInIcon className="h-3.5 w-3.5" />
                      : <ArrowsPointingOutIcon className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <ul className="space-y-1">
                  {tree.map(node => (
                    <WebTreeNodeRow
                      key={node.path}
                      node={node}
                      depth={0}
                      expanded={expanded}
                      selectedDoc={selectedDoc}
                      onToggle={handleToggle}
                      onOpen={onOpen}
                      onContextMenu={(n, x, y) => setTreeContextMenu({ node: n, x, y })}
                    />
                  ))}
                </ul>
              </>
            )}
          </nav>

          <section className="mt-5 border-t border-emerald-900/10 pt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase text-stone-500">Trash</p>
              {trashItems.length > 0 && (
                <button
                  className="subtle-button aspect-square px-0"
                  type="button"
                  title="Empty trash"
                  onClick={async () => { if (await confirmDialog('Empty trash', 'Permanently delete all items in trash?', true)) onEmptyTrash() }}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="space-y-1">
              {trashItems.length === 0 ? (
                <p className="text-xs text-stone-500">No deleted documents.</p>
              ) : (
                trashItems.map(item => (
                  <div key={item.id} className="rounded-lg px-2.5 py-2 text-xs text-[#4b5753] hover:bg-white/80">
                    <p className="min-w-0 truncate font-semibold">{item.relativePath}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="truncate text-stone-500">{formatTrashTime(item.deletedAt)}</span>
                      <div className="flex gap-1">
                        <button
                          className="subtle-button aspect-square px-0"
                          type="button"
                          title="Restore"
                          onClick={() => onRestoreTrash(item.id)}
                        >
                          <ArrowUturnLeftIcon className="h-4 w-4" />
                        </button>
                        <button
                          className="subtle-button aspect-square px-0 text-red-400 hover:text-red-600"
                          type="button"
                          title="Permanently delete"
                          onClick={async () => { if (await confirmDialog('Permanently delete', 'Permanently delete this item?', true)) onDeleteTrash(item.id) }}
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}

      {treeContextMenu && (
        <div
          role="menu"
          className="context-menu"
          style={{ left: treeContextMenu.x, top: treeContextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          {treeContextMenu.node.kind === 'folder' && (
            <>
              <button
                type="button"
                className="context-menu-button"
                onClick={() => { void handleCreateDocInFolder(treeContextMenu.node.path); setTreeContextMenu(null) }}
              >
                <DocumentPlusIcon className="mr-2 h-3.5 w-3.5" />New document
              </button>
              <button
                type="button"
                className="context-menu-button"
                onClick={() => { void handleCreateFolder(); setTreeContextMenu(null) }}
              >
                <FolderPlusIcon className="mr-2 h-3.5 w-3.5" />New folder
              </button>
              <div className="my-1 border-t border-stone-200" />
              <button
                type="button"
                className="context-menu-button text-red-700 hover:text-red-800"
                onClick={() => { void handleDeleteFolder(treeContextMenu.node.path); setTreeContextMenu(null) }}
              >
                <TrashIcon className="mr-2 h-3.5 w-3.5" />Delete folder
              </button>
            </>
          )}
          {treeContextMenu.node.kind === 'document' && treeContextMenu.node.doc && (
            <>
              <button
                type="button"
                className="context-menu-button"
                onClick={() => { onOpen(treeContextMenu.node.doc!.id); setTreeContextMenu(null) }}
              >
                <FolderOpenIcon className="mr-2 h-3.5 w-3.5" />Open
              </button>
              <button
                type="button"
                className="context-menu-button"
                onClick={() => { void handleRenameDoc(treeContextMenu.node.doc!); }}
              >
                <PencilIcon className="mr-2 h-3.5 w-3.5" />Rename
              </button>
              <div className="my-1 border-t border-stone-200" />
              <button
                type="button"
                className="context-menu-button"
                onClick={() => {
                  void navigator.clipboard.writeText(treeContextMenu.node.doc!.relativePath)
                  setTreeContextMenu(null)
                }}
              >
                <ClipboardIcon className="mr-2 h-3.5 w-3.5" />Copy path
              </button>
              <button
                type="button"
                className="context-menu-button text-red-700 hover:text-red-800"
                onClick={() => { onDelete(treeContextMenu.node.doc!.id); setTreeContextMenu(null) }}
              >
                <TrashIcon className="mr-2 h-3.5 w-3.5" />Move to trash
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const WebTreeNodeRow = memo(function WebTreeNodeRow({
  node,
  depth,
  expanded,
  selectedDoc,
  onToggle,
  onOpen,
  onContextMenu,
}: {
  node: WebTreeNode
  depth: number
  expanded: Set<string>
  selectedDoc: string | null
  onToggle: (path: string) => void
  onOpen: (docId: string) => void
  onContextMenu: (node: WebTreeNode, x: number, y: number) => void
}) {
  const isFolder = node.kind === 'folder'
  const isExpanded = isFolder && expanded.has(node.path)
  const isActive = !isFolder && node.doc?.id === selectedDoc

  return (
    <li>
      <button
        type="button"
        className={`tree-button ${isActive ? 'tree-button-active' : ''}`}
        style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
        onClick={() => {
          if (isFolder) onToggle(node.path)
          else if (node.doc) onOpen(node.doc.id)
        }}
        onContextMenu={e => {
          e.preventDefault()
          e.stopPropagation()
          onContextMenu(node, e.clientX, e.clientY)
        }}
      >
        {isFolder ? (
          <span className="shrink-0 text-[#8a9691]">
            {isExpanded ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
          </span>
        ) : null}
        <span className="shrink-0 text-[#8a9691]">
          {isFolder ? <FolderIcon className="h-3.5 w-3.5" /> : <DocumentTextIcon className="h-3.5 w-3.5" />}
        </span>
        <span className={`truncate ${isFolder ? 'font-semibold text-[#4b5753]' : ''}`}>{node.name}</span>
      </button>
      {isFolder && isExpanded && node.children.length > 0 && (
        <ul className="mt-0.5 space-y-0.5">
          {node.children.map(child => (
            <WebTreeNodeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selectedDoc={selectedDoc}
              onToggle={onToggle}
              onOpen={onOpen}
              onContextMenu={onContextMenu}
            />
          ))}
        </ul>
      )}
    </li>
  )
})

function formatTrashTime(value: string | number): string {
  const ts = typeof value === 'string' ? new Date(value).getTime() : value * 1000
  if (Number.isNaN(ts)) return 'Deleted'
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function displayWorkspaceName(workspace: WorkspaceSummary | null): string {
  if (!workspace) return 'JType Cloud'
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
