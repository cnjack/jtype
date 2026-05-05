import { useState, useEffect, useCallback } from 'react'
import { api, type SyncConflictItem } from '../api'

interface ConflictResolverProps {
  workspaceId: string
  onResolved?: () => void
}

export function ConflictResolver({ workspaceId, onResolved }: ConflictResolverProps) {
  const [conflicts, setConflicts] = useState<SyncConflictItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [mergedContent, setMergedContent] = useState('')
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState('')

  const loadConflicts = useCallback(async () => {
    try {
      const list = await api.listConflicts(workspaceId)
      setConflicts(list)
      if (list.length === 0) setSelectedIndex(null)
    } catch {
      // silent
    }
  }, [workspaceId])

  useEffect(() => {
    loadConflicts()
  }, [loadConflicts])

  const conflict = selectedIndex !== null ? conflicts[selectedIndex] : null

  const handleSelect = (index: number) => {
    setSelectedIndex(index)
    setMergedContent(conflicts[index]?.localContent ?? '')
    setError('')
  }

  const handleResolve = async (resolution: 'accept_local' | 'accept_cloud' | 'manual_merge') => {
    if (!conflict) return
    setResolving(true)
    setError('')
    try {
      const content = resolution === 'manual_merge' ? mergedContent : undefined
      await api.resolveConflict(workspaceId, conflict.conflictId, resolution, content)
      await loadConflicts()
      setSelectedIndex(null)
      onResolved?.()
    } catch (e) {
      setError(String(e))
    } finally {
      setResolving(false)
    }
  }

  if (conflicts.length === 0) return null

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-amber-200 px-4 py-2">
        <span className="text-sm font-semibold text-amber-800">
          ⚠ {conflicts.length} Conflict{conflicts.length > 1 ? 's' : ''} to Resolve
        </span>
        {conflict && (
          <button
            onClick={() => setSelectedIndex(null)}
            className="text-xs text-amber-700 hover:underline"
          >
            ← Back to list
          </button>
        )}
      </div>

      {!conflict ? (
        // List view
        <div className="p-3 space-y-2">
          {conflicts.map((c, i) => (
            <button
              key={c.conflictId}
              onClick={() => handleSelect(i)}
              className="flex w-full items-center gap-2 rounded border border-amber-200 bg-white p-2 text-left text-sm transition hover:bg-amber-100"
            >
              <span className="text-amber-600">⚠</span>
              <span className="font-medium text-amber-900">{c.relativePath}</span>
            </button>
          ))}
        </div>
      ) : (
        // Merge view
        <div className="flex flex-col">
          <div className="border-b border-amber-200 px-4 py-1.5 text-xs font-medium text-amber-800">
            {conflict.relativePath}
          </div>

          {/* Three-panel diff */}
          <div className="grid grid-cols-3 divide-x divide-amber-200" style={{ minHeight: '300px', maxHeight: '50vh' }}>
            {/* Local */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between bg-blue-50 px-3 py-1.5 border-b border-amber-200">
                <span className="text-xs font-semibold text-blue-700">Local (yours)</span>
                <button
                  onClick={() => setMergedContent(conflict.localContent)}
                  className="rounded px-1.5 py-0.5 text-[10px] text-blue-600 ring-1 ring-blue-300 hover:bg-blue-100"
                >
                  Use this
                </button>
              </div>
              <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words p-3 text-xs leading-relaxed text-gray-700 font-mono">
                {conflict.localContent}
              </pre>
            </div>

            {/* Cloud */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between bg-green-50 px-3 py-1.5 border-b border-amber-200">
                <span className="text-xs font-semibold text-green-700">Cloud (remote)</span>
                <button
                  onClick={() => setMergedContent(conflict.cloudContent)}
                  className="rounded px-1.5 py-0.5 text-[10px] text-green-600 ring-1 ring-green-300 hover:bg-green-100"
                >
                  Use this
                </button>
              </div>
              <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words p-3 text-xs leading-relaxed text-gray-700 font-mono">
                {conflict.cloudContent}
              </pre>
            </div>

            {/* Merged result */}
            <div className="flex flex-col">
              <div className="bg-gray-100 px-3 py-1.5 border-b border-amber-200">
                <span className="text-xs font-semibold text-gray-600">Result (editable)</span>
              </div>
              <textarea
                className="flex-1 resize-none border-0 bg-gray-50 p-3 text-xs leading-relaxed text-gray-800 font-mono focus:outline-none"
                value={mergedContent}
                onChange={(e) => setMergedContent(e.target.value)}
                spellCheck={false}
              />
            </div>
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between border-t border-amber-200 bg-amber-50/50 px-4 py-2">
            <div className="flex items-center gap-2">
              <button
                disabled={resolving}
                onClick={() => handleResolve('accept_local')}
                className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Accept local
              </button>
              <button
                disabled={resolving}
                onClick={() => handleResolve('accept_cloud')}
                className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Accept cloud
              </button>
            </div>
            <div className="flex items-center gap-2">
              {error && <span className="text-xs text-red-600">{error}</span>}
              <button
                disabled={resolving}
                onClick={() => handleResolve('manual_merge')}
                className="rounded bg-indigo-600 px-4 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {resolving ? 'Saving…' : 'Save merged result'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
