import { useState, useCallback, useEffect } from 'react'
import {
  saveDocumentOffline,
  deleteDocumentOffline,
  getPendingSaves,
  clearPendingSave,
  getSyncState,
  updateSyncState,
  updateDocumentCache,
  findPendingSave,
} from '../lib/offlineDb'
import type { PendingSave } from '../lib/offlineDb'
import { httpRequest } from '../lib/http'

export interface ReconcileResult {
  pushed: number
  conflicts: number
  errors: number
}

export function useOfflineSync(workspaceId: string | undefined) {
  const [hasPending, setHasPending] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [reconciling, setReconciling] = useState(false)

  useEffect(() => {
    if (!workspaceId) {
      setHasPending(false)
      setPendingCount(0)
      return
    }
    getPendingSaves(workspaceId).then(saves => {
      setHasPending(saves.length > 0)
      setPendingCount(saves.length)
    })
  }, [workspaceId])

  const saveOffline = useCallback(async (
    relativePath: string,
    content: string,
    baseContentHash: string,
    baseContent: string,
  ) => {
    if (!workspaceId) return
    try {
      const existingPending = await findPendingSave(workspaceId, relativePath)
      await saveDocumentOffline(workspaceId, relativePath, content, baseContentHash, baseContent)
      setHasPending(true)
      setPendingCount(prev => prev + (existingPending ? 0 : 1))
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || (e.target?.error?.name === 'QuotaExceededError')) {
        throw new Error('Storage quota exceeded. Please free up browser storage space.')
      }
      throw e
    }
  }, [workspaceId])

  const deleteOffline = useCallback(async (relativePath: string) => {
    if (!workspaceId) return
    await deleteDocumentOffline(workspaceId, relativePath)
    setHasPending(true)
  }, [workspaceId])

  const reconcile = useCallback(async (token: string): Promise<ReconcileResult> => {
    if (!workspaceId) return { pushed: 0, conflicts: 0, errors: 0 }
    setReconciling(true)
    const result: ReconcileResult = { pushed: 0, conflicts: 0, errors: 0 }
    try {
      const syncState = await getSyncState(workspaceId)
      const sinceClock = syncState?.lastSyncedClock ?? 0

      const pullRes = await httpRequest(`/api/v1/workspaces/${workspaceId}/sync/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sinceClock }),
      })
      if (!pullRes.ok) throw new Error('Pull failed')
      const pullData = await pullRes.json()
      const cloudChanges: Array<{
        relativePath: string
        action: string
        content?: string
        contentHash?: string
        updatedClock?: number
        deletedBy?: string
      }> = pullData.changes ?? []
      const maxClock = pullData.workspaceClock ?? sinceClock

      const pending = await getPendingSaves(workspaceId)
      const cloudMap = new Map(cloudChanges.map(c => [c.relativePath, c]))

      const toPush: PendingSave[] = []
      for (const save of pending) {
        const cloud = cloudMap.get(save.relativePath)
        const localDeleted = save.content === '__DELETED__'
        const cloudDeleted = cloud?.action === 'deleted'

        if (localDeleted && cloudDeleted) {
          await clearPendingSave(save.id!)
          continue
        }
        if (localDeleted && cloud && !cloudDeleted) {
          result.conflicts++
          await clearPendingSave(save.id!)
          continue
        }
        if (!localDeleted && cloudDeleted) {
          toPush.push(save)
          continue
        }
        if (!localDeleted && cloud && !cloudDeleted) {
          toPush.push(save)
          continue
        }
        toPush.push(save)
      }

      const pushDocs = toPush
        .filter(s => s.content !== '__DELETED__')
        .map(s => ({
          relativePath: s.relativePath,
          content: s.content,
          baseContentHash: s.baseContentHash || undefined,
          baseContent: s.baseContent || undefined,
        }))
      const pushDeleted = toPush
        .filter(s => s.content === '__DELETED__')
        .map(s => ({ relativePath: s.relativePath }))

      if (pushDocs.length > 0 || pushDeleted.length > 0) {
        try {
          const pushRes = await httpRequest(`/api/v1/workspaces/${workspaceId}/sync/push`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              documents: pushDocs,
              deletedPaths: pushDeleted,
            }),
          })
          if (pushRes.ok) {
            const pushData = await pushRes.json().catch(() => ({}))
            const accepted = pushData.accepted ?? 0
            result.pushed += accepted
            for (const doc of pushData.documents ?? []) {
              await updateDocumentCache(
                workspaceId,
                doc.relativePath,
                doc.content,
                doc.contentHash,
                doc.updatedClock || doc.clock || 0,
              )
            }
            for (const save of toPush) {
              await clearPendingSave(save.id!)
            }
          } else {
            const body = await pushRes.json().catch(() => ({}))
            if (body.conflicts && body.conflicts.length > 0) {
              result.conflicts += body.conflicts.length
              for (const save of toPush) {
                await clearPendingSave(save.id!)
              }
            } else {
              result.errors += toPush.length
            }
          }
        } catch {
          result.errors += toPush.length
        }
      } else {
        for (const save of toPush) {
          await clearPendingSave(save.id!)
        }
      }

      for (const change of cloudChanges) {
        const isPending = toPush.some(p => p.relativePath === change.relativePath)
        if (isPending) continue
        if (change.action === 'deleted') continue
        if (change.content !== undefined && change.contentHash !== undefined && change.updatedClock !== undefined) {
          await updateDocumentCache(
            workspaceId,
            change.relativePath,
            change.content,
            change.contentHash,
            change.updatedClock,
          )
        }
      }

      await updateSyncState(workspaceId, maxClock)

      const remaining = await getPendingSaves(workspaceId)
      setHasPending(remaining.length > 0)
      setPendingCount(remaining.length)
    } finally {
      setReconciling(false)
    }
    return result
  }, [workspaceId])

  return { hasPending, pendingCount, reconciling, saveOffline, deleteOffline, reconcile }
}
