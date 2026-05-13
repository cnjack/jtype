import { useState, useEffect, useCallback } from 'react'
import { api, type SyncConflictItem } from '../api'
import { ConflictResolver as SharedConflictResolver, type ConflictResolution } from '@shared/components/ConflictResolver'

interface ConflictResolverProps {
  workspaceId: string
  onResolved?: () => void
}

export function ConflictResolver({ workspaceId, onResolved }: ConflictResolverProps) {
  const [conflicts, setConflicts] = useState<SyncConflictItem[]>([])
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState('')

  const loadConflicts = useCallback(async () => {
    try {
      const list = await api.listConflicts(workspaceId)
      setConflicts(list)
    } catch {
      // silent
    }
  }, [workspaceId])

  useEffect(() => {
    loadConflicts()
  }, [loadConflicts])

  const handleResolve = async (conflictId: string, resolution: ConflictResolution, mergedContent?: string) => {
    setResolving(true)
    setError('')
    try {
      await api.resolveConflict(workspaceId, conflictId, resolution, mergedContent)
      await loadConflicts()
      onResolved?.()
    } catch (e) {
      setError(String(e))
    } finally {
      setResolving(false)
    }
  }

  if (conflicts.length === 0) return null

  return (
    <SharedConflictResolver
      conflicts={conflicts}
      resolving={resolving}
      error={error}
      onResolve={handleResolve}
    />
  )
}
