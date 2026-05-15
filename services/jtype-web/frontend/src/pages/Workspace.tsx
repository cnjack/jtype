import { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react'
import { Menu, MenuButton, MenuItems, MenuItem, Dialog, DialogPanel } from '@headlessui/react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api, getStoredUsername, setSessionId, type WorkspaceSummary, type DocumentListItem, type FolderListItem, type DomainResponse, type TrashItem, type MemberInfo, type InviteListItem, type InviteResponse, type PublishStatusResponse } from '../api'
import { renderToContainer } from '@shared/lib/markdown'
import { parseFrontmatter, writeFrontmatter } from '@shared/lib/frontmatter'
import type { EditorMode } from '@shared/lib/types'
import { usePrompt, useConfirm } from '@shared/components/PromptDialogContext'
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
  ShareIcon,
  ClipboardDocumentCheckIcon,
  PencilSquareIcon,
  ViewColumnsIcon,
  EyeIcon,
  InformationCircleIcon,
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
  UserGroupIcon,
  UserMinusIcon,
  ExclamationTriangleIcon,
  ArrowRightStartOnRectangleIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'

type WorkspaceSection = 'documents' | 'trash' | 'publishing' | 'domains'
type WorkspaceSettingsSection = 'general' | 'trash' | 'domains' | 'members'
type FloatingTooltipState = {
  label: string
  x: number
  y: number
}

export function Workspace() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const prompt = usePrompt()
  const confirm = useConfirm()
  const initialSection = ((location.state as { section?: WorkspaceSection } | null)?.section) ?? 'documents'
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null)
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([])
  const [documents, setDocuments] = useState<DocumentListItem[]>([])
  const [folders, setFolders] = useState<FolderListItem[]>([])
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
  const [focusMode, setFocusMode] = useState(false)
  const [editorContextMenu, setEditorContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [treeContextMenu, setTreeContextMenu] = useState<{ node: WebTreeNode; x: number; y: number } | null>(null)
  const [floatingTooltip, setFloatingTooltip] = useState<FloatingTooltipState | null>(null)
  const [dirty, setDirty] = useState(false)
  const [publishState, setPublishState] = useState<PublishStatusResponse | null>(null)
  const sidebarCollapsed = false
  const [loadedContentHash, setLoadedContentHash] = useState<string | null>(null)
  const [loadedContent, setLoadedContent] = useState<string | null>(null)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set<string>())
  const [favoriteVersion, setFavoriteVersion] = useState(0)
  const [staleWarning, setStaleWarning] = useState<{ editedBy: string; wasDirty: boolean } | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const { status: wsStatus, sessionId: wsSessionId, subscribe: wsSubscribe } = useWorkspaceSocket(workspace?.id)
  const { hasPending, pendingCount, reconciling, saveOffline, reconcile } = useOfflineSync(workspace?.id)
  const canEditContent = workspace?.role !== 'viewer'
  const canManageWorkspace = workspace?.role === 'owner' || workspace?.role === 'admin'

  const showTooltip = useCallback((label: string, element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    setFloatingTooltip({
      label,
      x: Math.min(Math.max(rect.left + rect.width / 2, 12), window.innerWidth - 12),
      y: rect.bottom + 8,
    })
  }, [])

  const hideTooltip = useCallback(() => setFloatingTooltip(null), [])

  const tooltipProps = useCallback((label: string) => ({
    onMouseEnter: (event: React.MouseEvent<HTMLElement>) => showTooltip(label, event.currentTarget),
    onMouseLeave: hideTooltip,
    onFocus: (event: React.FocusEvent<HTMLElement>) => showTooltip(label, event.currentTarget),
    onBlur: hideTooltip,
  }), [hideTooltip, showTooltip])

  // Keep the REST client's session ID in sync with the WS connection
  useEffect(() => { setSessionId(wsSessionId) }, [wsSessionId])

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
      api.listFolders(workspaceId),
      api.listDocuments(workspaceId),
      api.listTrash(workspaceId),
      api.listDomains(),
    ]).then(([workspaceList, ws, folderList, docs, trash, domainList]) => {
      setWorkspaces(workspaceList.workspaces)
      setWorkspace(ws)
      setFolders(folderList)
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
              setStatusMessage(t`This document was deleted by another user.`)
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
          api.listFolders(workspace.id).then(setFolders)
          api.listDocuments(workspace.id).then(setDocuments)
          api.listTrash(workspace.id).then(setTrashItems)
          break
        case 'document:publish-changed':
          api.listDocuments(workspace.id).then(setDocuments)
          if (selectedDoc && event.documentId === selectedDoc) {
            api.getPublishStatus(workspace.id, selectedDoc).then(setPublishState).catch(() => undefined)
          }
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
          api.listFolders(workspace.id).then(setFolders)
        })
      }
    }
  }, [wsStatus, hasPending, workspace?.id, reconcile])

  useEffect(() => {
    if (wsStatus === 'connected' || !workspace?.id) return
    const timer = setInterval(() => {
      api.listFolders(workspace.id).then(setFolders)
      api.listDocuments(workspace.id).then(setDocuments)
    }, 10_000)
    return () => clearInterval(timer)
  }, [wsStatus, workspace?.id])

  async function openDocument(docId: string) {
    if (!workspaceId) return
    const [doc, publish] = await Promise.all([
      api.getDocument(workspaceId, docId),
      api.getPublishStatus(workspaceId, docId).catch(() => null),
    ])
    setSelectedDoc(docId)
    setDocContent(doc.content)
    setLoadedContentHash(doc.contentHash)
    setLoadedContent(doc.content)
    setPublishState(publish)
    setDirty(false)
  }

  const toggleFavorite = useCallback(() => {
    if (!selectedDoc) return
    toggleFavoriteDoc(selectedDoc, workspaceId)
    setFavoriteVersion(v => v + 1)
  }, [selectedDoc, workspaceId])

  async function saveDocument() {
    if (!workspaceId || !selectedDoc) return
    if (!canEditContent) {
      setStatusMessage(t`Viewer access is read-only.`)
      setTimeout(() => setStatusMessage(''), 3000)
      return
    }
    const doc = documents.find(d => d.id === selectedDoc)
    if (!doc) return
    setSaving(true)
    try {
      const parsedDoc = parseFrontmatter(docContent)
      try {
        const result = await api.saveDocument(workspaceId, {
          relativePath: doc.relativePath,
          content: docContent,
          title: parsedDoc.data.title || undefined,
          baseContentHash: loadedContentHash || undefined,
          baseContent: loadedContent || undefined,
        })
        setLoadedContentHash(result.contentHash)
        setLoadedContent(docContent)
        setDirty(false)
        setDocuments(await api.listDocuments(workspaceId))
        return
      } catch { /* fall through to offline */ }
      await saveOffline(doc.relativePath, docContent, loadedContentHash || '', loadedContent || '')
      setDirty(false)
      setStatusMessage(t`Saved offline. Will sync when reconnected.`)
      setTimeout(() => setStatusMessage(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function createDocument() {
    if (!workspaceId) return
    if (!canEditContent) {
      setStatusMessage(t`Viewer access is read-only.`)
      setTimeout(() => setStatusMessage(''), 3000)
      return
    }
    const path = await prompt(t`Document path (e.g. notes/hello.md):`)
    if (!path?.trim()) return
    await api.saveDocument(workspaceId, { relativePath: path.trim(), content: '' })
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
    const [folderList, docs, trash] = await Promise.all([
      api.listFolders(workspaceId),
      api.listDocuments(workspaceId),
      api.listTrash(workspaceId),
    ])
    setFolders(folderList)
    setDocuments(docs)
    setTrashItems(trash)
  }

  async function saveWorkspaceSettings() {
    if (!workspaceId) return
    if (!canManageWorkspace) {
      setSettingsMessage(t`Only owners and admins can change workspace settings`)
      setTimeout(() => setSettingsMessage(''), 2500)
      return
    }
    setSaving(true)
    try {
      const updated = await api.updateWorkspace(workspaceId, {
        name: workspaceName.trim() || undefined,
        publishTitle: publishTitle.trim() || undefined,
      })
      setWorkspace(updated)
      setWorkspaceName(updated.name)
      setPublishTitle(updated.publishTitle || updated.name)
      setSettingsMessage(t`Publishing details saved`)
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
    if (!canManageWorkspace) return
    await api.addDomain(newDomain.trim(), workspaceId)
    setNewDomain('')
    await reloadDomains()
  }

  async function verifyDomain(id: string) {
    if (!canManageWorkspace) return
    await api.verifyDomain(id)
    await reloadDomains()
  }

  async function bindDomain(domain: DomainResponse, bind: boolean) {
    if (!canManageWorkspace) return
    await api.bindDomain(domain.id, bind ? workspaceId : undefined)
    await reloadDomains()
  }

  async function uploadCertificate() {
    if (!certDomainId) return
    if (!canManageWorkspace) return
    await api.uploadCertificate(certDomainId, certChainPem, privateKeyPem)
    setCertChainPem('')
    setPrivateKeyPem('')
    setDomainMessage(t`SSL certificate uploaded`)
    setTimeout(() => setDomainMessage(''), 2500)
    await reloadDomains()
  }

  async function refreshPublishState(docId: string, fallback?: { isPublished: boolean; publishedAt: string; contentHash: string }) {
    if (!workspaceId) return
    setPublishState(await api.getPublishStatus(workspaceId, docId).catch(() => fallback ? ({
      documentId: docId,
      isPublished: fallback.isPublished,
      publishedAt: fallback.publishedAt,
      currentHash: fallback.contentHash,
      publishedHash: fallback.contentHash,
      hasUnpublishedChanges: false,
    }) : null))
  }

  async function publishDocumentsByIds(docIds: string[]) {
    if (!workspaceId || docIds.length === 0) return
    if (!canEditContent) {
      setStatusMessage(t`Viewer access is read-only.`)
      setTimeout(() => setStatusMessage(''), 3000)
      return
    }
    const uniqueIds = Array.from(new Set(docIds))
    if (selectedDoc && uniqueIds.includes(selectedDoc) && dirty) await saveDocument()
    setSaving(true)
    try {
      let selectedResult: { isPublished: boolean; publishedAt: string; contentHash: string } | undefined
      for (const docId of uniqueIds) {
        const result = await api.publishDocument(workspaceId, docId)
        if (docId === selectedDoc) selectedResult = result
      }
      if (selectedDoc && uniqueIds.includes(selectedDoc)) await refreshPublishState(selectedDoc, selectedResult)
      setDocuments(await api.listDocuments(workspaceId))
      setStatusMessage(uniqueIds.length === 1 ? t`Document published.` : t`${uniqueIds.length} documents published.`)
      setTimeout(() => setStatusMessage(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function unpublishDocumentsByIds(docIds: string[]) {
    if (!workspaceId || docIds.length === 0) return
    if (!canEditContent) return
    const uniqueIds = Array.from(new Set(docIds))
    const doc = uniqueIds.length === 1 ? documents.find(d => d.id === uniqueIds[0]) : null
    const message = doc
      ? t`Remove "${doc.relativePath}" from the public site?`
      : t`Remove ${uniqueIds.length} documents from the public site?`
    const confirmed = await confirm(message, { title: uniqueIds.length === 1 ? t`Unpublish document` : t`Unpublish documents`, destructive: true })
    if (!confirmed) return
    setSaving(true)
    try {
      for (const docId of uniqueIds) {
        await api.unpublishDocument(workspaceId, docId)
      }
      if (selectedDoc && uniqueIds.includes(selectedDoc)) await refreshPublishState(selectedDoc)
      setDocuments(await api.listDocuments(workspaceId))
      setStatusMessage(uniqueIds.length === 1 ? t`Document unpublished.` : t`${uniqueIds.length} documents unpublished.`)
      setTimeout(() => setStatusMessage(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function publishSelectedDocument() {
    if (!selectedDoc) return
    await publishDocumentsByIds([selectedDoc])
  }

  async function unpublishSelectedDocument() {
    if (!selectedDoc) return
    await unpublishDocumentsByIds([selectedDoc])
  }

  async function deleteDocument(docId: string) {
    if (!workspaceId) return
    if (!canEditContent) {
      setStatusMessage(t`Viewer access is read-only.`)
      setTimeout(() => setStatusMessage(''), 3000)
      return
    }
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
    if (!canEditContent) return
    await api.restoreTrash(workspaceId, trashId)
    await reloadDocumentsAndTrash()
  }

  async function deleteTrashItem(trashId: string) {
    if (!workspaceId) return
    if (!canEditContent) return
    await api.deleteTrash(workspaceId, trashId)
    setTrashItems(items => items.filter(item => item.id !== trashId))
  }

  async function emptyTrash() {
    if (!workspaceId || trashItems.length === 0) return
    if (!canEditContent) return
    await api.emptyTrash(workspaceId)
    setTrashItems([])
  }

  const handleEditorInput = useCallback(() => {
    if (!canEditContent) return
    const content = editorRef.current?.value ?? ''
    setDocContent(content)
    setDirty(true)
  }, [canEditContent])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!canEditContent) return
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
  }, [canEditContent, selectedDoc, docContent, documents, workspaceId])

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

  const selectedDocument = selectedDoc ? documents.find(d => d.id === selectedDoc) ?? null : null
  const documentLocation = selectedDocument?.relativePath && selectedDocument.relativePath.includes('/') ? selectedDocument.relativePath.replace(/\/[^/]+$/, '') : ''
  const fileName = selectedDocument?.relativePath ? selectedDocument.relativePath.split('/').pop() || '' : ''
  const isFavorite = selectedDoc ? (() => {
    const key = `web-favorites:${workspaceId || 'global'}`
    const ids: string[] = JSON.parse(localStorage.getItem(key) || '[]')
    return ids.includes(selectedDoc)
  })() : false
  const publicUrl = workspace ? `/u/${getStoredUsername() || 'me'}/${workspace.slug}` : ''
  const documentPublicPath = selectedDocument
    ? selectedDocument.relativePath.replace(/\\/g, '/').replace(/\.(md|markdown|mdown|mkd)$/i, '')
    : ''
  const documentPublicUrl = publicUrl && documentPublicPath ? `${publicUrl}/${documentPublicPath}` : publicUrl
  const isPublished = publishState?.isPublished ?? selectedDocument?.isPublished ?? false
  const hasUnpublishedChanges = Boolean(isPublished && (dirty || publishState?.hasUnpublishedChanges))
  const publishedDocuments = useMemo(() => documents.filter(doc => doc.isPublished), [documents])
  const unpublishedDocuments = useMemo(() => documents.filter(doc => !doc.isPublished), [documents])
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
        <div className={`grid overflow-hidden ${focusMode ? 'grid-cols-[minmax(0,1fr)]' : 'grid-cols-[272px_minmax(0,1fr)]'}`}>
          {!sidebarCollapsed && !focusMode && (
            <aside className="flex min-h-0 flex-col border-r border-black/[0.04] bg-[#f7faf8]">
              <div className="p-5 pb-4">
                <CloudWorkspaceSwitcher
                  workspace={workspace}
                  workspaces={workspaces}
                  activeWorkspaceId={workspaceId || ''}
                  newWorkspaceName={newWorkspaceName}
                  onNewWorkspaceNameChange={setNewWorkspaceName}
                  onCreateWorkspace={createCloudWorkspace}
                  onOpenSettings={() => {
                    setSettingsSection('general')
                    setSettingsOpen(true)
                  }}
                />
                <div className="mt-3 flex gap-1.5">
                  <button
                    className="sidebar-action flex-1"
                    type="button"
                    title={t`New Document`}
                    disabled={!workspace || !canEditContent}
                    onClick={createDocument}
                  >
                    <DocumentPlusIcon className="h-4 w-4" />
                    <span className="ml-1.5"><Trans>New Document</Trans></span>
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <WebDocExplorer
                  workspaceId={workspaceId}
                  folders={folders}
                  documents={documents}
                  selectedDoc={selectedDoc}
                  onOpen={openDocument}
                  onDelete={deleteDocument}
                  onPublish={docId => publishDocumentsByIds([docId])}
                  onUnpublish={docId => unpublishDocumentsByIds([docId])}
                  onDocumentsChange={setDocuments}
                  onFoldersChange={setFolders}
                  onSaveDocument={async (data) => {
                    if (!workspaceId) throw new Error('No workspace')
                    await api.saveDocument(workspaceId, data)
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
                  readOnly={!canEditContent}
                />
              </div>
            </aside>
          )}

        <section className="flex min-w-0 flex-col overflow-hidden bg-[#fbfdfb]">
          {selectedDoc ? (
            <>
              <div className="flex min-h-[56px] items-center justify-between gap-3 border-b border-black/[0.04] bg-white/60 px-5 backdrop-blur-xl">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex min-w-0 items-baseline gap-1">
                      {workspace && documentLocation && (
                        <span className="shrink-0 truncate text-xs text-[#9aa6a1]">
                          {workspace.name}
                          {documentLocation ? ` / ${documentLocation.replace(/\//g, " / ")}` : ""}
                          {" / "}
                        </span>
                      )}
                      <p className="truncate text-sm font-semibold text-stone-950">{fileName}</p>
                    </div>
                    {selectedDoc && (
                      <button
                        type="button"
                        className={`editor-tool h-8 w-8 px-0 ${isFavorite ? "text-amber-500 hover:text-amber-600" : ""}`}
                        aria-label={isFavorite ? t`Remove from favorites` : t`Add to favorites`}
                        aria-pressed={isFavorite}
                        title={isFavorite ? t`Remove from favorites` : t`Add to favorites`}
                        onClick={toggleFavorite}
                      >
                        <StarIcon className="h-4 w-4" fill={isFavorite ? "currentColor" : "none"} />
                      </button>
                    )}
                    {workspace && selectedDocument?.relativePath && canEditContent && (
                      <button
                        type="button"
                        className="editor-tool h-8 w-8 px-0 hover:text-red-700"
                        aria-label={t`Move to trash`}
                        title={t`Move to trash`}
                        onClick={() => { if (selectedDoc) { void deleteDocument(selectedDoc); setSelectedDoc(null) } }}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="header-action-group">
                  {!dirty || <span className="status-chip status-chip-warning"><Trans>Unsaved</Trans></span>}
                  {selectedDoc && canEditContent && (!isPublished || hasUnpublishedChanges) && (
                    <span className="header-tooltip header-tooltip-end group">
                      <button
                        className={`header-icon-button ${
                          hasUnpublishedChanges
                            ? 'header-icon-button-warning'
                            : 'header-icon-button-primary'
                        }`}
                        type="button"
                        aria-label={hasUnpublishedChanges ? t`Republish` : t`Publish`}
                        aria-disabled={saving}
                        {...tooltipProps(hasUnpublishedChanges ? t`Republish` : t`Publish`)}
                        onClick={() => {
                          if (saving) return
                          void publishSelectedDocument()
                        }}
                      >
                        {hasUnpublishedChanges ? <ArrowPathIcon className="h-4 w-4" /> : <ArrowUpTrayIcon className="h-4 w-4" />}
                      </button>
                    </span>
                  )}
                  {isPublished && canEditContent && (
                    <button
                      className="header-icon-button header-icon-button-danger"
                      type="button"
                      aria-label={t`Unpublish`}
                      aria-disabled={saving}
                      {...tooltipProps(t`Unpublish`)}
                      onClick={() => {
                        if (saving) return
                        void unpublishSelectedDocument()
                      }}
                    >
                      <LinkSlashIcon className="h-4 w-4" />
                    </button>
                  )}
                  {!canEditContent && <span className="status-chip status-chip-neutral"><Trans>Read-only</Trans></span>}
                  {selectedDoc && (
                    <span className="header-tooltip header-tooltip-end group">
                      <button
                        className={`header-icon-button ${dirty ? 'header-icon-button-primary' : ''}`}
                        type="button"
                        aria-label={dirty ? t`Save` : t`No unsaved changes`}
                        aria-disabled={!dirty || !canEditContent}
                        {...tooltipProps(dirty ? t`Save` : t`No unsaved changes`)}
                        onClick={() => {
                          if (!dirty || !canEditContent) return
                          void saveDocument()
                        }}
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                      </button>
                    </span>
                  )}
                </div>
              </div>
              {workspaceId && canEditContent && <ConflictResolver workspaceId={workspaceId} onResolved={reloadDocumentsAndTrash} />}
              {staleWarning && (
                <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-between text-sm">
                  <span><Trans>&#x26A0; Modified by {staleWarning.editedBy}{staleWarning.wasDirty ? '. You have unsaved changes.' : ''}</Trans></span>
                  <div className="flex gap-2">
                    <button onClick={async () => {
                      if (!workspaceId || !selectedDocument) return
                      const doc = await api.getDocument(workspaceId, selectedDocument.id)
                      setDocContent(doc.content)
                      setLoadedContentHash(doc.contentHash)
                      setLoadedContent(doc.content)
                      setDirty(false)
                      setStaleWarning(null)
                    }} className="text-red-600 hover:underline"><Trans>Reload{staleWarning.wasDirty ? ' (discard)' : ''}</Trans></button>
                    {staleWarning.wasDirty && canEditContent && <button onClick={() => { saveDocument(); setStaleWarning(null) }} className="text-blue-600 hover:underline"><Trans>Save mine</Trans></button>}
                  </div>
                </div>
              )}
              <div className="flex min-h-12 items-center gap-1 border-b border-black/[0.04] bg-[#fbfdfb] px-5">
                <EditorToolbarButton title={t`Bold (Ctrl+B)`} disabled={!canEditContent} tooltipProps={tooltipProps(t`Bold (Ctrl+B)`)} onClick={() => wrapSelection('**', '**', 'bold text')}>
                  <BoldIcon className="h-4 w-4" />
                </EditorToolbarButton>
                <EditorToolbarButton title={t`Italic (Ctrl+I)`} disabled={!canEditContent} tooltipProps={tooltipProps(t`Italic (Ctrl+I)`)} onClick={() => wrapSelection('_', '_', 'italic text')}>
                  <ItalicIcon className="h-4 w-4" />
                </EditorToolbarButton>
                <EditorToolbarButton title={t`Link (Ctrl+K)`} disabled={!canEditContent} tooltipProps={tooltipProps(t`Link (Ctrl+K)`)} onClick={() => wrapSelection('[', '](url)', 'link text')}>
                  <LinkIcon className="h-4 w-4" />
                </EditorToolbarButton>
                <EditorToolbarButton title={t`Inline code`} disabled={!canEditContent} tooltipProps={tooltipProps(t`Inline code`)} onClick={() => wrapSelection('`', '`', 'code')}>
                  <CodeBracketIcon className="h-4 w-4" />
                </EditorToolbarButton>
                <EditorToolbarButton title={t`Insert table (Ctrl+Shift+T)`} disabled={!canEditContent} tooltipProps={tooltipProps(t`Insert table (Ctrl+Shift+T)`)} onClick={() => insertOrEditTable()}>
                  <TableCellsIcon className="h-4 w-4" />
                </EditorToolbarButton>
                <EditorToolbarButton title={t`Insert formula`} disabled={!canEditContent} tooltipProps={tooltipProps(t`Insert formula`)} onClick={() => insertAtCursor('\n$$\nE = mc^2\n$$\n')}>
                  <VariableIcon className="h-4 w-4" />
                </EditorToolbarButton>
                <EditorToolbarButton title={t`Insert Mermaid diagram`} disabled={!canEditContent} tooltipProps={tooltipProps(t`Insert Mermaid diagram`)} onClick={() => insertAtCursor('\n```mermaid\nflowchart TD\n  A --> B\n```\n')}>
                  <ShareIcon className="h-4 w-4" />
                </EditorToolbarButton>
                <EditorToolbarButton title={t`Task list`} disabled={!canEditContent} tooltipProps={tooltipProps(t`Task list`)} onClick={() => insertAtCursor('\n- [ ] Task\n')}>
                  <ClipboardDocumentCheckIcon className="h-4 w-4" />
                </EditorToolbarButton>
                <div className="ml-auto flex items-center gap-1 rounded-full bg-[#eef5f1] p-1">
                  <button
                    type="button"
                    className={`view-mode-button ${editorMode === 'write' ? 'view-mode-button-active' : ''}`}
                    aria-label={t`Write`}
                    {...tooltipProps(t`Write`)}
                    onClick={() => setEditorMode('write')}
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className={`view-mode-button ${editorMode === 'split' ? 'view-mode-button-active' : ''}`}
                    aria-label={t`Split`}
                    {...tooltipProps(t`Split`)}
                    onClick={() => setEditorMode('split')}
                  >
                    <ViewColumnsIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className={`view-mode-button ${editorMode === 'preview' ? 'view-mode-button-active' : ''}`}
                    aria-label={t`Preview`}
                    {...tooltipProps(t`Preview`)}
                    onClick={() => setEditorMode('preview')}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </div>
                <button className="editor-tool" type="button" aria-label={t`Document info`} {...tooltipProps(t`Document info`)} onClick={() => setInfoPanel(p => !p)}>
                  <InformationCircleIcon className="h-4 w-4" />
                </button>
                <button className="editor-tool" type="button" aria-label={focusMode ? t`Exit focus mode` : t`Focus mode`} {...tooltipProps(focusMode ? t`Exit focus mode` : t`Focus mode`)} onClick={() => setFocusMode(p => !p)}>
                  {focusMode ? <ArrowsPointingInIcon className="h-4 w-4" /> : <ArrowsPointingOutIcon className="h-4 w-4" />}
                </button>
              </div>

              <div className={`grid min-h-0 flex-1 ${infoPanel ? 'grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-[minmax(0,1fr)]'}`}>
                <div className={getGridClass(editorMode)} style={{ position: 'relative' }}>
                  <textarea
                    ref={editorRef}
                    value={docContent}
                    onChange={canEditContent ? handleEditorInput : undefined}
                    onKeyDown={handleKeyDown}
                    onContextMenu={canEditContent ? handleContextMenu : undefined}
                    readOnly={!canEditContent}
                    className="h-full w-full min-h-0 resize-none bg-white/40 p-8 font-mono text-[13px] leading-7 text-stone-800 outline-none placeholder:text-[#9aa6a1]"
                    style={{ position: 'relative', zIndex: 2 }}
                    spellCheck={false}
                    aria-label={t`Markdown editor`}
                    placeholder={t`Start writing Markdown...`}
                  />
                  <article
                    ref={previewRef}
                    className="preview empty min-h-0 overflow-y-auto overflow-x-hidden border-l border-black/[0.04] bg-[#f8fbf9] p-10"
                    style={{ position: 'relative', zIndex: 1 }}
                  >
                    <h2><Trans>Select a Markdown file</Trans></h2>
                    <p><Trans>Your rendered document will appear here.</Trans></p>
                  </article>
                </div>

                {infoPanel && (
                  <aside className="min-h-0 overflow-y-auto border-l border-black/[0.04] bg-[#f6faf7] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm font-semibold text-stone-950"><Trans>Document Info</Trans></p>
                      <button className="subtle-button aspect-square px-0" type="button" title={t`Hide`} onClick={() => setInfoPanel(false)}><XMarkIcon className="h-4 w-4" /></button>
                    </div>
                    {selectedDocument && (
                      <WebPublishSection
                        publishState={publishState}
                        isPublished={isPublished}
                        hasUnpublishedChanges={Boolean(hasUnpublishedChanges)}
                        publishedUrl={documentPublicUrl}
                        canEdit={canEditContent}
                        saving={saving}
                        onPublish={publishSelectedDocument}
                        onUnpublish={unpublishSelectedDocument}
                      />
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
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand"><Trans>Vault ready</Trans></p>
                  <h2 className="mt-4 text-4xl font-semibold tracking-[-0.035em] text-stone-950">{displayWorkspaceName(workspace)}</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5f6d68]">
                    <Trans>Choose a note or create a new one.</Trans>
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <button
                      className="toolbar-button toolbar-button-primary"
                      type="button"
                      onClick={createDocument}
                      disabled={!canEditContent}
                    >
                      <Trans>New Document</Trans>
                    </button>
                    <button
                      className="toolbar-button"
                      type="button"
                      onClick={() => {
                        const first = documents[0]
                        if (first) openDocument(first.id)
                      }}
                    >
                      <Trans>Quick open</Trans>
                    </button>
                  </div>
                </div>

                <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <section className="panel-card p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-stone-950"><Trans>Documents</Trans></p>
                      <span className="text-xs text-[#6b7773]">{t`${documents.length} Markdown file${documents.length === 1 ? '' : 's'}`}</span>
                    </div>
                    <div className="space-y-1">
                      {documents.length === 0 ? (
                        <div className="rounded-md border border-dashed border-stone-300 p-4">
                          <p className="text-sm font-semibold text-stone-800"><Trans>No notes yet.</Trans></p>
                          <p className="mt-1 text-sm text-stone-500"><Trans>Create your first Markdown note.</Trans></p>
                        </div>
                      ) : (
                        documents.slice(0, 12).map(doc => (
                          <button key={doc.id} type="button" className={`command-row ${selectedDoc === doc.id ? 'bg-[#e8f6f2] ring-1 ring-brand/15' : ''}`} onClick={() => openDocument(doc.id)}>
                            <span className="min-w-0">
                              <span className={`block truncate font-semibold ${selectedDoc === doc.id ? 'text-brand' : ''}`}>{doc.relativePath.replace(/\.(md|markdown|mdown|mkd)$/i, '')}</span>
                              <span className="block truncate text-xs text-stone-500">{doc.relativePath}</span>
                            </span>
                            <span className={`shrink-0 text-xs ${selectedDoc === doc.id ? 'text-brand font-semibold' : 'text-stone-500'}`}><Trans>Markdown</Trans></span>
                          </button>
                        ))
                      )}
                    </div>
                  </section>

                  <aside className="panel-card p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-stone-950"><Trans>Publishing</Trans></p>
                      <span className="status-chip status-chip-success"><Trans>{publishedDocuments.length} live</Trans></span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-[#5f6d68]">
                      <div className="rounded-lg bg-[#f4f8f6] p-3">
                        <p className="font-semibold text-stone-900">{publishedDocuments.length}</p>
                        <p className="mt-1"><Trans>Published</Trans></p>
                      </div>
                      <div className="rounded-lg bg-[#f4f8f6] p-3">
                        <p className="font-semibold text-stone-900">{unpublishedDocuments.length}</p>
                        <p className="mt-1"><Trans>Draft only</Trans></p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <button
                        type="button"
                        className="toolbar-button toolbar-button-primary w-full justify-center gap-2"
                        disabled={!canEditContent || unpublishedDocuments.length === 0 || saving}
                        onClick={() => { void publishDocumentsByIds(unpublishedDocuments.map(doc => doc.id)) }}
                      >
                        <ArrowUpTrayIcon className="h-4 w-4" />
                        <Trans>Publish drafts</Trans>
                      </button>
                      <button
                        type="button"
                        className="toolbar-button w-full justify-center gap-2"
                        disabled={!canEditContent || publishedDocuments.length === 0 || saving}
                        onClick={() => { void publishDocumentsByIds(publishedDocuments.map(doc => doc.id)) }}
                      >
                        <ArrowPathIcon className="h-4 w-4" />
                        <Trans>Republish live docs</Trans>
                      </button>
                      <button
                        type="button"
                        className="toolbar-button w-full justify-center gap-2 text-red-700 hover:text-red-800"
                        disabled={!canEditContent || publishedDocuments.length === 0 || saving}
                        onClick={() => { void unpublishDocumentsByIds(publishedDocuments.map(doc => doc.id)) }}
                      >
                        <LinkSlashIcon className="h-4 w-4" />
                        <Trans>Unpublish live docs</Trans>
                      </button>
                    </div>
                    <button
                      type="button"
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-dark"
                      onClick={() => {
                        setSettingsSection('general')
                        setSettingsOpen(true)
                      }}
                    >
                      <Cog6ToothIcon className="h-4 w-4" />
                      <Trans>Site settings</Trans>
                    </button>
                  </aside>

                </div>
              </div>
            </div>
          )}
        </section>
      </div>
      )}

      <div id="operation-log" className="col-span-full flex items-center justify-between border-t border-black/[0.04] bg-white/70 px-5 py-3 text-xs text-[#6b7773]">
        <span>{statusMessage || (selectedDoc ? `Opened ${documents.find(d => d.id === selectedDoc)?.relativePath || 'document'}.` : t`Select a document to edit.`)}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          {reconciling ? (
            <span className="flex items-center gap-1.5 font-medium text-yellow-600"><span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" /><Trans>Syncing...</Trans></span>
          ) : wsStatus === 'connected' ? (
            <span className="flex items-center gap-1.5 font-medium text-green-600"><span className="w-2 h-2 rounded-full bg-green-500" /><Trans>Connected</Trans></span>
          ) : wsStatus === 'connecting' ? (
            <span className="flex items-center gap-1.5 font-medium text-yellow-600"><span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" /><Trans>Connecting...</Trans></span>
          ) : (
            <span className="flex items-center gap-1.5 font-medium text-red-500"><span className="w-2 h-2 rounded-full bg-red-500" />{hasPending ? t`Offline (${pendingCount} saved)` : t`Offline`}</span>
          )}
        </span>
      </div>

      {activeSection === 'documents' && canEditContent && editorContextMenu && (
        <div
          role="menu"
          className="context-menu"
          style={{ left: editorContextMenu.x, top: editorContextMenu.y }}
        >
          <button type="button" className="context-menu-button" onClick={() => { wrapSelection('**', '**', 'bold text'); setEditorContextMenu(null) }}><BoldIcon className="mr-2 h-3.5 w-3.5" /><Trans>Bold</Trans></button>
          <button type="button" className="context-menu-button" onClick={() => { wrapSelection('_', '_', 'italic text'); setEditorContextMenu(null) }}><ItalicIcon className="mr-2 h-3.5 w-3.5" /><Trans>Italic</Trans></button>
          <button type="button" className="context-menu-button" onClick={() => { wrapSelection('[', '](url)', 'link text'); setEditorContextMenu(null) }}><LinkIcon className="mr-2 h-3.5 w-3.5" /><Trans>Insert link</Trans></button>
          <button type="button" className="context-menu-button" onClick={() => { insertOrEditTable(); setEditorContextMenu(null) }}><TableCellsIcon className="mr-2 h-3.5 w-3.5" /><Trans>Insert table</Trans></button>
          <button type="button" className="context-menu-button" onClick={() => { addMarkdownTableRow(); setEditorContextMenu(null) }}><TableCellsIcon className="mr-2 h-3.5 w-3.5" /><Trans>Add table row below</Trans></button>
          <button type="button" className="context-menu-button" onClick={() => { insertAtCursor('\n$$\nE = mc^2\n$$\n'); setEditorContextMenu(null) }}><VariableIcon className="mr-2 h-3.5 w-3.5" /><Trans>Insert formula</Trans></button>
          <button type="button" className="context-menu-button" onClick={() => { insertAtCursor('\n```mermaid\nflowchart TD\n  A --> B\n```\n'); setEditorContextMenu(null) }}><ShareIcon className="mr-2 h-3.5 w-3.5" /><Trans>Insert Mermaid diagram</Trans></button>
        </div>
      )}
      {floatingTooltip && (
        <div className="floating-tooltip" style={{ left: floatingTooltip.x, top: floatingTooltip.y }}>
          {floatingTooltip.label}
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
  onOpenSettings,
}: {
  workspace: WorkspaceSummary | null
  workspaces: WorkspaceSummary[]
  activeWorkspaceId: string
  newWorkspaceName: string
  onNewWorkspaceNameChange: (value: string) => void
  onCreateWorkspace: () => void
  onOpenSettings: () => void
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
            {workspace ? t`${workspace.documentCount} documents` : t`Choose a cloud workspace`}
          </span>
        </span>
        <ChevronDownIcon className="h-4 w-4 shrink-0 text-zinc-400" />
      </MenuButton>

      <MenuItems className="absolute left-0 top-12 z-[100] w-[320px] overflow-hidden rounded-xl border border-black/[0.06] bg-[#fbfdfb] shadow-2xl shadow-stone-900/15">
        <div className="max-h-64 overflow-y-auto p-2">
          {workspaces.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-500"><Trans>No cloud workspaces yet.</Trans></p>
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
                    <span className="block truncate text-xs font-normal text-zinc-500"><Trans>{ws.documentCount} documents</Trans></span>
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
              placeholder={t`New cloud workspace`}
              onKeyDown={e => e.key === 'Enter' && onCreateWorkspace()}
            />
            <button className="sidebar-action gap-1" type="button" onClick={onCreateWorkspace}>
              <PlusIcon className="h-3.5 w-3.5" />
              <Trans>New</Trans>
            </button>
          </div>
        </div>
        <div className="border-t border-black/[0.06] p-2">
          <MenuItem>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-zinc-700 transition data-[focus]:bg-[#e8f6f2] data-[focus]:text-brand disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={!workspace}
              onClick={onOpenSettings}
            >
              <Cog6ToothIcon className="h-4 w-4 shrink-0 text-zinc-500" />
              <span className="min-w-0 text-left">
                <span className="block truncate font-semibold"><Trans>Workspace settings</Trans></span>
                <span className="block truncate text-xs text-zinc-500"><Trans>Members, domains, publishing</Trans></span>
              </span>
            </button>
          </MenuItem>
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
    { id: 'general', label: t`General`, description: t`Name, publishing identity, and storage` },
    { id: 'members', label: t`Members`, description: t`Team members and invitations` },
    { id: 'domains', label: t`Domains`, description: t`Custom domains and SSL` },
    { id: 'trash', label: t`Trash`, description: t`Restore or delete cloud documents` },
  ]
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-stone-950/35 px-5 py-6 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center px-5 py-6">
        <DialogPanel className="grid h-[min(760px,92vh)] w-full max-w-6xl overflow-hidden rounded-2xl border border-white/70 bg-[#fbfdfb] shadow-2xl shadow-stone-900/25 md:grid-cols-[240px_minmax(0,1fr)]" aria-label={t`Cloud workspace settings`}>
          <aside className="border-r border-black/[0.04] bg-[#f7faf8] p-4">
            <div className="mb-5 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-semibold text-brand ring-1 ring-black/[0.04]">
                {displayWorkspaceName(workspace).charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-zinc-950">{displayWorkspaceName(workspace)}</span>
                <span className="block truncate text-xs text-zinc-500"><Trans>Cloud workspace</Trans></span>
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
                  {active === 'general' ? t`General` : active === 'domains' ? t`Domains` : active === 'members' ? t`Members` : t`Trash`}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {active === 'general' ? t`Manage cloud workspace name, publishing title, and storage.` : active === 'domains' ? t`Bind custom domains and manage certificates.` : active === 'members' ? t`Manage team members, invitations, and access.` : t`Restore deleted documents or remove them permanently.`}
                </p>
              </div>
              <button className="subtle-button aspect-square px-0" type="button" title={t`Close`} onClick={onClose}><XMarkIcon className="h-4 w-4" /></button>
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
            {active === 'members' && (
              <MembersPanel workspace={workspace} onWorkspaceDeleted={onClose} />
            )}
          </main>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

function MembersPanel({
  workspace,
  onWorkspaceDeleted,
}: {
  workspace: WorkspaceSummary
  onWorkspaceDeleted?: () => void
}) {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const [members, setMembers] = useState<MemberInfo[]>([])
  const [pendingInvites, setPendingInvites] = useState<InviteListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('editor')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteMessage, setInviteMessage] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const currentUsername = getStoredUsername()
  const isOwner = workspace.role === 'owner'
  const isAdminOrOwner = workspace.role === 'owner' || workspace.role === 'admin'

  const canAdmin = isAdminOrOwner

  useEffect(() => {
    setLoading(true)
    const tasks: Promise<unknown>[] = [
      api.listMembers(workspace.id).then(setMembers),
    ]
    if (canAdmin) {
      tasks.push(api.listInvites(workspace.id).then(setPendingInvites))
    }
    Promise.all(tasks).finally(() => setLoading(false))
  }, [workspace.id, canAdmin])

  async function handleInvite() {
    setInviteMessage('')
    try {
      const result: InviteResponse = await api.createInvite(workspace.id, {
        email: inviteEmail.trim() || undefined,
        role: inviteRole,
      })
      const link = `${window.location.origin}/invites/${result.inviteToken}`
      setInviteLink(link)
      setInviteEmail('')
      setInviteMessage(t`Invite created.`)
      if (canAdmin) {
        const invites = await api.listInvites(workspace.id)
        setPendingInvites(invites)
      }
    } catch (err) {
      setInviteMessage(err instanceof Error ? err.message : t`Failed to create invite.`)
    }
  }

  async function handleRevoke(inviteId: string) {
    await api.revokeInvite(workspace.id, inviteId)
    setPendingInvites(invites => invites.filter(i => i.inviteId !== inviteId))
  }

  async function handleRoleChange(userId: string, role: string) {
    await api.updateMemberRole(workspace.id, userId, role)
    setMembers(ms => ms.map(m => m.userId === userId ? { ...m, role } : m))
  }

  async function handleRemove(userId: string) {
    const ok = await confirm(t`Remove this member from the workspace?`, { title: t`Remove member` })
    if (!ok) return
    await api.removeMember(workspace.id, userId)
    setMembers(ms => ms.filter(m => m.userId !== userId))
    setActionMessage(t`Member removed.`)
    setTimeout(() => setActionMessage(''), 3000)
  }

  async function handleLeave() {
    setShowLeaveConfirm(false)
    try {
      await api.leaveWorkspace(workspace.id)
      navigate('/workspaces', { replace: true })
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : t`Failed to leave workspace.`)
      setTimeout(() => setActionMessage(''), 4000)
    }
  }

  async function handleDelete() {
    if (deleteConfirmName !== workspace.name) return
    setShowDeleteConfirm(false)
    try {
      await api.deleteWorkspace(workspace.id)
      navigate('/workspaces', { replace: true })
      onWorkspaceDeleted?.()
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : t`Failed to delete workspace.`)
      setTimeout(() => setActionMessage(''), 4000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Invite section */}
      <section>
        <p className="mb-3 text-sm font-semibold text-zinc-950"><Trans>Invite people</Trans></p>
        <div className="flex gap-2">
          <input
            className="sync-input flex-1"
            type="email"
            placeholder={t`Email (optional)`}
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
          />
          <Menu as="div" className="relative">
            <MenuButton type="button" className="sidebar-action gap-1 capitalize">
              {inviteRole}
              <ChevronDownIcon className="h-3.5 w-3.5" />
            </MenuButton>
            <MenuItems className="absolute right-0 top-9 z-20 w-36 overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-xl">
              {['editor', 'viewer', 'admin'].map(r => (
                <MenuItem key={r}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm capitalize transition hover:bg-[#e8f6f2] data-[focus]:bg-[#e8f6f2]"
                    onClick={() => setInviteRole(r)}
                  >
                    {inviteRole === r && <CheckIcon className="h-3.5 w-3.5 text-brand" />}
                    <span className={inviteRole === r ? 'text-brand font-semibold' : ''}>{r}</span>
                  </button>
                </MenuItem>
              ))}
            </MenuItems>
          </Menu>
          <button type="button" className="sidebar-action bg-brand text-white hover:bg-brand/90" onClick={handleInvite}>
            <UserGroupIcon className="h-4 w-4" />
            <span className="ml-1"><Trans>Invite</Trans></span>
          </button>
        </div>
        {inviteMessage && (
          <p className="mt-2 text-xs text-zinc-500">{inviteMessage}</p>
        )}
        {inviteLink && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#eef7f4] px-3 py-2">
            <input
              className="min-w-0 flex-1 bg-transparent text-xs font-mono text-zinc-700 outline-none"
              readOnly
              value={inviteLink}
            />
            <button
              type="button"
              title={t`Copy link`}
              className="shrink-0 text-brand hover:text-brand/80"
              onClick={() => { navigator.clipboard.writeText(inviteLink); setInviteMessage(t`Link copied!`) }}
            >
              <ClipboardIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>

      {/* Pending invites */}
      {canAdmin && pendingInvites.length > 0 && (
        <section>
          <p className="mb-3 text-sm font-semibold text-zinc-950"><Trans>Pending invites</Trans></p>
          <div className="space-y-1">
            {pendingInvites.map(invite => (
              <div key={invite.inviteId} className="flex items-center gap-3 rounded-lg bg-[#f7faf8] px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-zinc-600">{invite.email || <span className="text-zinc-400 italic"><Trans>no email</Trans></span>}</span>
                <span className="shrink-0 text-xs capitalize text-zinc-500">{invite.role}</span>
                <span className="shrink-0 text-xs text-zinc-400">{new Date(invite.createdAt).toLocaleDateString()}</span>
                <button
                  type="button"
                  title={t`Revoke invite`}
                  className="shrink-0 text-zinc-400 hover:text-red-600"
                  onClick={() => handleRevoke(invite.inviteId)}
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Members list */}
      <section>
        <p className="mb-3 text-sm font-semibold text-zinc-950"><Trans>Members ({members.length})</Trans></p>
        <div className="space-y-1">
          {members.map(member => {
            const isMe = member.username === currentUsername
            const canEdit = isOwner || (workspace.role === 'admin' && member.role !== 'owner' && member.role !== 'admin')
            return (
              <div key={member.userId} className="flex items-center gap-3 rounded-lg bg-[#f7faf8] px-3 py-2 text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-zinc-700 ring-1 ring-black/[0.04]">
                  {member.username.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-zinc-950">{member.username}{isMe && <span className="ml-1 text-xs font-normal text-zinc-400"><Trans>(you)</Trans></span>}</span>
                </span>
                {canEdit && !isMe ? (
                  <Menu as="div" className="relative shrink-0">
                    <MenuButton type="button" className="flex items-center gap-1 rounded-md px-2 py-1 text-xs capitalize text-zinc-600 hover:bg-white hover:ring-1 hover:ring-black/[0.06]">
                      {member.role}
                      <ChevronDownIcon className="h-3 w-3" />
                    </MenuButton>
                    <MenuItems className="absolute right-0 top-8 z-20 w-32 overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-xl">
                      {['admin', 'editor', 'viewer'].map(r => (
                        <MenuItem key={r}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm capitalize hover:bg-[#e8f6f2] data-[focus]:bg-[#e8f6f2]"
                            onClick={() => handleRoleChange(member.userId, r)}
                          >
                            {member.role === r && <CheckIcon className="h-3.5 w-3.5 text-brand" />}
                            <span className={member.role === r ? 'text-brand font-semibold' : ''}>{r}</span>
                          </button>
                        </MenuItem>
                      ))}
                    </MenuItems>
                  </Menu>
                ) : (
                  <span className="shrink-0 text-xs capitalize text-zinc-500">{member.role}</span>
                )}
                {canEdit && !isMe && (
                  <button
                    type="button"
                    title={t`Remove member`}
                    className="shrink-0 text-zinc-300 hover:text-red-600"
                    onClick={() => handleRemove(member.userId)}
                  >
                    <UserMinusIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {actionMessage && (
        <p className="text-xs text-zinc-500">{actionMessage}</p>
      )}

      {/* Danger zone */}
      <section className="rounded-xl border border-red-100 bg-red-50/40 p-5">
        <p className="mb-4 text-sm font-semibold text-red-700"><Trans>Danger zone</Trans></p>
        <div className="space-y-3">
          {!isOwner && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-950"><Trans>Leave workspace</Trans></p>
                <p className="text-xs text-zinc-500"><Trans>You will lose access to all cloud documents.</Trans></p>
              </div>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 transition hover:bg-red-100"
                onClick={() => setShowLeaveConfirm(true)}
              >
                <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
                <Trans>Leave</Trans>
              </button>
            </div>
          )}
          {isOwner && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-950"><Trans>Transfer ownership</Trans></p>
                  <p className="text-xs text-zinc-500"><Trans>Pass ownership to another admin member.</Trans></p>
                </div>
                <button
                  type="button"
                  title={t`Transfer ownership (select a member above)`}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-100"
                  onClick={async () => {
                    const admins = members.filter(m => m.role === 'admin')
                    const firstAdmin = admins[0]
                    if (!firstAdmin) {
                      setActionMessage(t`Promote a member to admin first before transferring ownership.`)
                      setTimeout(() => setActionMessage(''), 4000)
                      return
                    }
                    const ok = await confirm(
                      t`Transfer ownership to ${firstAdmin.username}? You will become an admin.`,
                      { title: t`Transfer ownership` },
                    )
                    if (!ok) return
                    try {
                      await api.transferOwnership(workspace.id, firstAdmin.userId)
                      const updated = await api.listMembers(workspace.id)
                      setMembers(updated)
                      setActionMessage(t`Ownership transferred.`)
                      setTimeout(() => setActionMessage(''), 3000)
                    } catch (err) {
                      setActionMessage(err instanceof Error ? err.message : t`Transfer failed.`)
                      setTimeout(() => setActionMessage(''), 4000)
                    }
                  }}
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  <Trans>Transfer</Trans>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-950"><Trans>Delete workspace</Trans></p>
                  <p className="text-xs text-zinc-500"><Trans>Permanently remove this workspace and all documents.</Trans></p>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 transition hover:bg-red-100"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  <Trans>Delete</Trans>
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Leave confirm dialog */}
      <Dialog open={showLeaveConfirm} onClose={() => setShowLeaveConfirm(false)} className="relative z-[60]">
        <div className="fixed inset-0 bg-stone-950/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
              <ArrowRightStartOnRectangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-zinc-950"><Trans>Leave workspace?</Trans></h3>
            <p className="mb-6 text-sm text-zinc-500">
              <Trans>You will lose access to all cloud documents. Your local files are unaffected.</Trans>
            </p>
            <div className="flex gap-3">
              <button type="button" className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50" onClick={() => setShowLeaveConfirm(false)}><Trans>Cancel</Trans></button>
              <button type="button" className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700" onClick={handleLeave}><Trans>Leave</Trans></button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} className="relative z-[60]">
        <div className="fixed inset-0 bg-stone-950/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-zinc-950"><Trans>Delete workspace?</Trans></h3>
            <p className="mb-4 text-sm text-zinc-500">
              <Trans>This will permanently delete <strong>{workspace.name}</strong> and all its documents. This cannot be undone.</Trans>
            </p>
            <p className="mb-2 text-xs font-semibold text-zinc-700"><Trans>Type the workspace name to confirm:</Trans></p>
            <input
              className="sync-input mb-4"
              placeholder={workspace.name}
              value={deleteConfirmName}
              onChange={e => setDeleteConfirmName(e.target.value)}
            />
            <div className="flex gap-3">
              <button type="button" className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmName('') }}><Trans>Cancel</Trans></button>
              <button
                type="button"
                disabled={deleteConfirmName !== workspace.name}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
                onClick={handleDelete}
              >
                <Trans>Delete</Trans>
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand"><Trans>Trash</Trans></p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-950 dark:text-white"><Trans>Deleted documents</Trans></h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            <Trans>Restore cloud workspace documents or permanently remove them from trash.</Trans>
          </p>
        </div>
        {items.length > 0 && (
          <button className="workspace-card-link text-red-700 hover:text-red-800" type="button" title={t`Empty trash`} onClick={onEmpty}>
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-8 grid gap-3">
        {items.length === 0 ? (
          <div className="rounded-3xl bg-[#f7faf8] p-8 text-center text-sm text-zinc-500"><Trans>Trash is empty.</Trans></div>
        ) : (
          items.map(item => (
            <article key={item.id} className="rounded-3xl bg-[#f7faf8] p-5 ring-1 ring-black/[0.04]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-zinc-950">{item.relativePath}</h3>
                  <p className="mt-1 text-sm text-zinc-500">{item.title || t`Untitled document`}</p>
                  <p className="mt-2 text-xs text-zinc-400"><Trans>Deleted {formatDateTime(item.deletedAt)} / Expires {formatDateTime(item.expiresAt)}</Trans></p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="workspace-card-link" type="button" title={t`Restore`} onClick={() => onRestore(item.id)}>
                    <ArrowUturnLeftIcon className="h-4 w-4" />
                  </button>
                  <button className="workspace-card-link text-red-700 hover:text-red-800" type="button" title={t`Delete forever`} onClick={() => onDeleteForever(item.id)}>
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand"><Trans>Publishing</Trans></p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-950 dark:text-white"><Trans>Workspace identity</Trans></h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            <Trans>Keep the publish name and workspace name here. The workspace slug and storage limit are assigned by the service.</Trans>
          </p>
        </div>
        <a className="rounded-full bg-brand/10 px-4 py-2 text-sm font-semibold text-brand" href={publicUrl} target="_blank" rel="noreferrer">
          {publicUrl}
        </a>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <WorkspaceField label={t`Workspace name`} value={workspaceName} onChange={onNameChange} />
        <WorkspaceField label={t`Publish title`} value={publishTitle} onChange={onTitleChange} />
        <ReadOnlyField label={t`Workspace slug`} value={workspace.slug} />
        <ReadOnlyField label={t`Vault space`} value={`${formatBytes(workspace.storageBudgetBytes)} allocated`} />
      </div>

      <div className="mt-7 rounded-3xl bg-[#f7faf8] p-5">
        <div className="mb-2 flex justify-between text-sm text-zinc-500">
          <span><Trans>Storage used</Trans></span>
          <span>{formatBytes(workspace.storageUsedBytes)} / {formatBytes(workspace.storageBudgetBytes)}</span>
        </div>
        <div className="h-2 rounded-full bg-white">
          <div className="h-2 rounded-full bg-brand" style={{ width: `${usedPct}%` }} />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <button className="workspace-card-link" type="button" onClick={onOpenDomains}><Trans>Manage custom domains</Trans></button>
        <div className="flex items-center gap-3">
          {message && <p className="text-sm font-semibold text-brand">{message}</p>}
          <button className="h-10 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50" onClick={onSave} disabled={saving}>
            {saving ? t`Saving...` : t`Save`}
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand"><Trans>Custom domains</Trans></p>
            <h1 className="mt-2 text-3xl font-semibold text-zinc-950 dark:text-white">{displayWorkspaceName(workspace)} domains</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              <Trans>Add domains, verify DNS ownership, bind them to this workspace, and manage SSL certificates from one place.</Trans>
            </p>
          </div>
          <div className="rounded-2xl bg-[#f7faf8] px-4 py-3 text-sm">
            <span className="font-semibold text-zinc-950">{boundDomains.length}</span>
            <span className="ml-1 text-zinc-500"><Trans>bound</Trans></span>
          </div>
        </div>

        <div className="mt-8 flex gap-2 rounded-2xl bg-[#f7faf8] p-1 ring-1 ring-black/[0.04]">
          <input
            value={newDomain}
            onChange={e => onNewDomainChange(e.target.value)}
            placeholder={t`docs.example.com`}
            className="h-11 flex-1 border-0 bg-transparent px-3 text-sm outline-none placeholder:text-zinc-400"
            onKeyDown={e => e.key === 'Enter' && onAddDomain()}
          />
          <button onClick={onAddDomain} className="h-11 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark" title={t`Add domain`}>
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-8 grid gap-4">
          {domains.length === 0 ? (
            <div className="rounded-3xl bg-[#f7faf8] p-8 text-center text-sm text-zinc-500"><Trans>No domains yet.</Trans></div>
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand"><Trans>SSL</Trans></p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-white"><Trans>Certificate management</Trans></h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              <Trans>Upload a PEM certificate for a verified domain. The private key is stored as a hash in the current backend model.</Trans>
            </p>
          </div>
          {message && <p className="rounded-full bg-brand/10 px-4 py-2 text-sm font-semibold text-brand">{message}</p>}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400"><Trans>Verified domain</Trans></span>
              <select
                value={certDomainId}
                onChange={e => onCertDomainChange(e.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border-0 bg-[#f7faf8] px-4 text-sm outline-none ring-1 ring-black/[0.04]"
              >
                <option value=""><Trans>Select a domain</Trans></option>
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
              placeholder={t`-----BEGIN CERTIFICATE-----`}
              className="min-h-44 rounded-2xl border-0 bg-[#f7faf8] p-4 font-mono text-xs outline-none ring-1 ring-black/[0.04]"
            />
            <textarea
              value={privateKeyPem}
              onChange={e => onPrivateKeyChange(e.target.value)}
              placeholder={t`-----BEGIN PRIVATE KEY-----`}
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
            <Status label={verified ? t`DNS verified` : t`DNS pending`} tone={verified ? 'success' : 'pending'} />
            <Status label={isBound ? t`Bound here` : domain.workspaceName ? t`Bound to ${domain.workspaceName}` : t`Unbound`} tone={isBound ? 'success' : 'neutral'} />
            <Status label={domain.sslStatus ? t`SSL ${domain.sslStatus}` : t`SSL not configured`} tone={domain.sslStatus ? 'success' : 'neutral'} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!verified && <button className="workspace-card-link" title={t`Verify DNS`} onClick={onVerify}><CheckCircleIcon className="h-4 w-4" /></button>}
          {isBound ? (
            <button className="workspace-card-link" title={t`Unbind`} onClick={onUnbind}><LinkSlashIcon className="h-4 w-4" /></button>
          ) : (
            <button className="workspace-card-link" title={t`Bind here`} onClick={onBind}><LinkIcon className="h-4 w-4" /></button>
          )}
        </div>
      </div>
      {!verified && (
        <div className="mt-4 rounded-2xl bg-white p-4 text-xs text-zinc-500">
          <Trans>Add TXT record <code className="rounded bg-[#eef3f1] px-1.5 py-1 font-mono text-zinc-800">{domain.dnsTxtRecord}</code>, then verify DNS.</Trans>
        </div>
      )}
      {domain.sslExpiresAt && <p className="mt-3 text-xs text-zinc-500"><Trans>SSL expires at {domain.sslExpiresAt}</Trans></p>}
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

function EditorToolbarButton({ title, disabled = false, onClick, tooltipProps, children }: { title: string; disabled?: boolean; onClick: () => void; tooltipProps?: React.HTMLAttributes<HTMLButtonElement>; children: React.ReactNode }) {
  return (
    <button className="editor-tool" type="button" aria-label={title} aria-disabled={disabled} {...tooltipProps} onClick={() => { if (!disabled) onClick() }}>
      {children}
    </button>
  )
}

function WebPropertiesSection({ content, onChange }: { content: string; onChange: (c: string) => void }) {
  const parsed = parseFrontmatter(content)
  const fields = ['title', 'description', 'tags', 'slug']

  const updateField = (field: string, value: string) => {
    const newContent = writeFrontmatter(content, { [field]: value.trim() })
    onChange(newContent)
  }

  return (
    <section className="document-info-section">
      <p className="text-sm font-semibold text-stone-950"><Trans>Properties</Trans></p>
      <p className="mt-1 text-xs text-stone-500"><Trans>Edits are written back to YAML frontmatter.</Trans></p>
      <div className="mt-3 space-y-3">
        {fields.map((field) => (
          <label key={field} className="block">
            <span className="field-label">{field}</span>
            <input
              className="field-input"
              defaultValue={parsed.data[field] ?? ''}
              aria-label={field}
              onBlur={(e) => updateField(field, e.target.value)}
            />
          </label>
        ))}
      </div>
    </section>
  )
}

function WebPublishSection({
  publishState,
  isPublished,
  hasUnpublishedChanges,
  publishedUrl,
  canEdit,
  saving,
  onPublish,
  onUnpublish,
}: {
  publishState: PublishStatusResponse | null
  isPublished: boolean
  hasUnpublishedChanges: boolean
  publishedUrl: string
  canEdit: boolean
  saving: boolean
  onPublish: () => Promise<void>
  onUnpublish: () => Promise<void>
}) {
  return (
    <section className="document-info-section">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-stone-950"><Trans>Publish</Trans></p>
        <span className={`status-chip ${isPublished ? (hasUnpublishedChanges ? 'status-chip-warning' : 'status-chip-success') : 'status-chip-neutral'}`}>
          {isPublished ? (hasUnpublishedChanges ? t`Changed` : t`Published`) : t`Not published`}
        </span>
      </div>
      {publishState?.publishedAt && (
        <p className="mt-2 text-xs text-stone-500"><Trans>Published {new Date(publishState.publishedAt).toLocaleString()}</Trans></p>
      )}
      {hasUnpublishedChanges && (
        <p className="mt-2 text-xs text-amber-700"><Trans>The public snapshot is behind the current document.</Trans></p>
      )}
      {isPublished && (
        <a className="mt-3 block truncate text-xs font-semibold text-teal-700" href={publishedUrl} target="_blank" rel="noreferrer">
          <Trans>View public page</Trans>
        </a>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          className={`sidebar-action ${hasUnpublishedChanges ? 'bg-amber-500 text-white hover:bg-amber-600 hover:text-white' : ''}`}
          type="button"
          title={hasUnpublishedChanges ? t`Republish` : t`Publish`}
          disabled={!canEdit || saving}
          onClick={() => { void onPublish() }}
        >
          {hasUnpublishedChanges ? <ArrowPathIcon className="h-4 w-4" /> : <ArrowUpTrayIcon className="h-4 w-4" />}
        </button>
        <button
          className="sidebar-action hover:text-red-700"
          type="button"
          title={t`Unpublish`}
          disabled={!canEdit || saving || !isPublished}
          onClick={() => { void onUnpublish() }}
        >
          <LinkSlashIcon className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-3 text-xs text-stone-500"><Trans>Publishing uses a server snapshot; frontmatter status is treated as user metadata.</Trans></p>
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
      <p className="text-sm font-semibold text-stone-950"><Trans>Outline</Trans></p>
      {headings.length === 0 ? (
        <p className="mt-2 text-xs text-stone-500"><Trans>No headings found.</Trans></p>
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
      <p className="text-sm font-semibold text-stone-950"><Trans>Outgoing links</Trans></p>
      <div className="mt-2 space-y-1">
        {links.length === 0 ? (
          <p className="text-xs text-stone-500"><Trans>No outgoing links.</Trans></p>
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
  folder?: FolderListItem
  doc?: DocumentListItem
  children: WebTreeNode[]
}

function buildDocTree(folders: FolderListItem[], documents: DocumentListItem[]): WebTreeNode[] {
  const root: WebTreeNode[] = []
  const folderMap = new Map<string, WebTreeNode>()

  const ensureFolder = (folderPath: string, folder?: FolderListItem): WebTreeNode => {
    if (folderMap.has(folderPath)) {
      const existing = folderMap.get(folderPath)!
      if (folder) existing.folder = folder
      return existing
    }
    const parts = folderPath.split('/')
    const name = parts[parts.length - 1]!
    const node: WebTreeNode = { name, path: folderPath, kind: 'folder', folder, children: [] }
    folderMap.set(folderPath, node)
    if (parts.length > 1) {
      const parent = ensureFolder(parts.slice(0, -1).join('/'))
      parent.children.push(node)
    } else {
      root.push(node)
    }
    return node
  }

  for (const folder of folders) {
    ensureFolder(folder.relativePath, folder)
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
  return ids.map(id => ({ id, relativePath: id, title: '', isPublished: false, contentHash: '', updatedClock: 0, versionId: null }))
}

function toggleFavoriteDoc(docId: string, workspaceId?: string) {
  const key = `web-favorites:${workspaceId || 'global'}`
  const ids: string[] = JSON.parse(localStorage.getItem(key) || '[]')
  const next = ids.includes(docId) ? ids.filter(i => i !== docId) : [docId, ...ids]
  localStorage.setItem(key, JSON.stringify(next))
}

function WebDocExplorer({
  workspaceId,
  folders,
  documents,
  selectedDoc,
  onOpen,
  onDelete,
  onPublish,
  onUnpublish,
  onDocumentsChange,
  onFoldersChange,
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
  readOnly,
}: {
  workspaceId: string | undefined
  folders: FolderListItem[]
  documents: DocumentListItem[]
  selectedDoc: string | null
  onOpen: (docId: string) => void
  onDelete: (docId: string) => void
  onPublish: (docId: string) => Promise<void> | void
  onUnpublish: (docId: string) => Promise<void> | void
  onDocumentsChange: (docs: DocumentListItem[]) => void
  onFoldersChange: (folders: FolderListItem[]) => void
  onSaveDocument: (data: { relativePath: string; content: string; title?: string }) => Promise<void>
  readOnly: boolean
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
  const tree = useMemo(() => buildDocTree(folders, documents), [folders, documents])
  const folderPaths = useMemo(() => allFolderPaths(tree), [tree])
  const allExpanded = folderPaths.size > 0 && folderPaths.size === expanded.size

  const toggleExpandCollapse = useCallback(() => {
    if (allExpanded) {
      setExpanded(new Set<string>())
    } else {
      setExpanded(new Set(folderPaths))
    }
  }, [allExpanded, folderPaths, setExpanded])

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

  const handleCreateFolder = async (parentPath = '') => {
    if (!workspaceId) return
    if (readOnly) return
    const name = await prompt(t`New folder name:`)
    if (!name?.trim()) return
    const relativePath = parentPath ? `${parentPath}/${name.trim()}` : name.trim()
    await api.createFolder(workspaceId, relativePath)
    const folderList = await api.listFolders(workspaceId)
    onFoldersChange(folderList)
    setExpanded(new Set(expanded).add(relativePath))
  }

  const handleCreateDocInFolder = async (folderPath: string) => {
    if (!workspaceId) return
    if (readOnly) return
    const name = await prompt(t`New document name (e.g. note.md):`)
    if (!name?.trim()) return
    const relativePath = `${folderPath}/${name.trim()}`
    await onSaveDocument({ relativePath, content: '' })
    const docs = await api.listDocuments(workspaceId)
    onDocumentsChange(docs)
    onFoldersChange(await api.listFolders(workspaceId))
    setExpanded(new Set(expanded).add(folderPath))
  }

  const handleDeleteFolder = async (folderPath: string) => {
    if (!workspaceId) return
    if (readOnly) return
    const confirmed = await confirmDialog(t`Delete folder "${folderPath}" and all its contents?`, { title: t`Delete folder`, destructive: true })
    if (!confirmed) return
    try {
      const children = documents.filter(d => d.relativePath.startsWith(folderPath + '/'))
      for (const child of children) {
        await api.deleteDocument(workspaceId, child.id)
      }
      const folder = folders.find(f => f.relativePath === folderPath)
      if (folder) await api.deleteFolder(workspaceId, folder.id)
      for (const childFolder of folders.filter(f => f.relativePath.startsWith(folderPath + '/'))) {
        await api.deleteFolder(workspaceId, childFolder.id).catch(() => undefined)
      }
      const folderList = await api.listFolders(workspaceId)
      const docs = await api.listDocuments(workspaceId)
      onFoldersChange(folderList)
      onDocumentsChange(docs)
    } catch (err) {
      alert(String(err))
    }
  }

  const handleRenameDoc = async (doc: DocumentListItem) => {
    if (!workspaceId) return
    if (readOnly) return
    const newName = await prompt(t`Rename to:`, doc.relativePath)
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
        placeholder={t`Search files...`}
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      {filteredResults ? (
        <div className="mt-3 space-y-1">
          {filteredResults.length === 0 ? (
            <p className="text-xs text-stone-500"><Trans>No matches.</Trans></p>
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
                <p className="text-xs font-semibold uppercase text-stone-500"><Trans>Favorites</Trans></p>
                <button
                  className="subtle-button aspect-square px-0"
                  type="button"
                  title={t`Toggle favorite`}
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
                    <span className="text-stone-500"><Trans>Favorite</Trans></span>
                    <span className="truncate font-semibold">{doc.relativePath.replace(/\.(md|markdown|mdown|mkd)$/i, '')}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <nav className="mt-2" aria-label={t`Workspace files`}>
            <div className="mb-1 flex items-center justify-end gap-0.5">
              <button
                className="subtle-button aspect-square px-0"
                type="button"
                title={t`New folder`}
                disabled={readOnly}
                onClick={() => handleCreateFolder()}
              >
                <FolderPlusIcon className="h-3.5 w-3.5" />
              </button>
              <button
                className="subtle-button aspect-square px-0"
                type="button"
                title={allExpanded ? t`Collapse all` : t`Expand all`}
                onClick={toggleExpandCollapse}
                disabled={folderPaths.size === 0}
              >
                {allExpanded
                  ? <ArrowsPointingInIcon className="h-3.5 w-3.5" />
                  : <ArrowsPointingOutIcon className="h-3.5 w-3.5" />}
              </button>
            </div>
            {tree.length === 0 ? (
              <p className="rounded-md border border-dashed border-stone-300 p-3 text-sm text-stone-500">
                <Trans>No documents yet.</Trans>
              </p>
            ) : (
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
            )}
          </nav>

          <section className="mt-5 border-t border-emerald-900/10 pt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase text-stone-500"><Trans>Trash</Trans></p>
              {trashItems.length > 0 && (
                <button
                  className="subtle-button aspect-square px-0"
                  type="button"
                  title={t`Empty trash`}
                  disabled={readOnly}
                  onClick={async () => { if (await confirmDialog(t`Permanently delete all items in trash?`, { title: t`Empty trash`, destructive: true })) onEmptyTrash() }}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="space-y-1">
              {trashItems.length === 0 ? (
                <p className="text-xs text-stone-500"><Trans>No deleted documents.</Trans></p>
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
                          title={t`Restore`}
                          disabled={readOnly}
                          onClick={() => onRestoreTrash(item.id)}
                        >
                          <ArrowUturnLeftIcon className="h-4 w-4" />
                        </button>
                        <button
                          className="subtle-button aspect-square px-0 text-red-400 hover:text-red-600"
                          type="button"
                          title={t`Permanently delete`}
                          disabled={readOnly}
                          onClick={async () => { if (await confirmDialog(t`Permanently delete this item?`, { title: t`Permanently delete`, destructive: true })) onDeleteTrash(item.id) }}
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
              {!readOnly && (
                <>
                  <button
                    type="button"
                    className="context-menu-button"
                    onClick={() => { void handleCreateDocInFolder(treeContextMenu.node.path); setTreeContextMenu(null) }}
                  >
                    <DocumentPlusIcon className="mr-2 h-3.5 w-3.5" /><Trans>New document</Trans>
                  </button>
                  <button
                    type="button"
                    className="context-menu-button"
                    onClick={() => { void handleCreateFolder(treeContextMenu.node.path); setTreeContextMenu(null) }}
                  >
                    <FolderPlusIcon className="mr-2 h-3.5 w-3.5" /><Trans>New folder</Trans>
                  </button>
                  <div className="my-1 border-t border-stone-200" />
                  <button
                    type="button"
                    className="context-menu-button text-red-700 hover:text-red-800"
                    onClick={() => { void handleDeleteFolder(treeContextMenu.node.path); setTreeContextMenu(null) }}
                  >
                    <TrashIcon className="mr-2 h-3.5 w-3.5" /><Trans>Delete folder</Trans>
                  </button>
                </>
              )}
            </>
          )}
          {treeContextMenu.node.kind === 'document' && treeContextMenu.node.doc && (
            <>
              <button
                type="button"
                className="context-menu-button"
                onClick={() => { onOpen(treeContextMenu.node.doc!.id); setTreeContextMenu(null) }}
              >
                <FolderOpenIcon className="mr-2 h-3.5 w-3.5" /><Trans>Open</Trans>
              </button>
              {!readOnly && (
                <button
                  type="button"
                  className="context-menu-button"
                  onClick={() => { void handleRenameDoc(treeContextMenu.node.doc!); }}
                >
                  <PencilIcon className="mr-2 h-3.5 w-3.5" /><Trans>Rename</Trans>
                </button>
              )}
              {!readOnly && (
                <>
                  <div className="my-1 border-t border-stone-200" />
                  <button
                    type="button"
                    className="context-menu-button"
                    onClick={() => { void onPublish(treeContextMenu.node.doc!.id); setTreeContextMenu(null) }}
                  >
                    {treeContextMenu.node.doc.isPublished ? <ArrowPathIcon className="mr-2 h-3.5 w-3.5" /> : <ArrowUpTrayIcon className="mr-2 h-3.5 w-3.5" />}
                    {treeContextMenu.node.doc.isPublished ? t`Republish` : t`Publish`}
                  </button>
                  {treeContextMenu.node.doc.isPublished && (
                    <button
                      type="button"
                      className="context-menu-button text-red-700 hover:text-red-800"
                      onClick={() => { void onUnpublish(treeContextMenu.node.doc!.id); setTreeContextMenu(null) }}
                    >
                      <LinkSlashIcon className="mr-2 h-3.5 w-3.5" /><Trans>Unpublish</Trans>
                    </button>
                  )}
                </>
              )}
              <div className="my-1 border-t border-stone-200" />
              <button
                type="button"
                className="context-menu-button"
                onClick={() => {
                  void navigator.clipboard.writeText(treeContextMenu.node.doc!.relativePath)
                  setTreeContextMenu(null)
                }}
              >
                <ClipboardIcon className="mr-2 h-3.5 w-3.5" /><Trans>Copy path</Trans>
              </button>
              {!readOnly && (
                <button
                  type="button"
                  className="context-menu-button text-red-700 hover:text-red-800"
                  onClick={() => { onDelete(treeContextMenu.node.doc!.id); setTreeContextMenu(null) }}
                >
                  <TrashIcon className="mr-2 h-3.5 w-3.5" /><Trans>Move to trash</Trans>
                </button>
              )}
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
        {!isFolder && node.doc?.isPublished && (
          <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[#008884]" title={t`Published`} />
        )}
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
