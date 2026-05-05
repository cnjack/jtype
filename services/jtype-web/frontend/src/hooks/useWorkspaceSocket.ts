import { useState, useRef, useCallback, useEffect } from 'react'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

interface PendingEntry {
  resolve: (value: any) => void
  reject: (reason: any) => void
  timer: ReturnType<typeof setTimeout>
}

export function useWorkspaceSocket(workspaceId: string | undefined) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [workspaceClock, setWorkspaceClock] = useState<number>(0)
  const wsRef = useRef<WebSocket | null>(null)
  const pendingRef = useRef<Map<string, PendingEntry>>(new Map())
  const listenersRef = useRef<Set<(event: any) => void>>(new Set())
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const mountRef = useRef(true)
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = useCallback(() => {
    if (pingRef.current) {
      clearInterval(pingRef.current)
      pingRef.current = null
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.onopen = null
      wsRef.current.onclose = null
      wsRef.current.onmessage = null
      wsRef.current.onerror = null
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close()
      }
      wsRef.current = null
    }
    for (const [, entry] of pendingRef.current) {
      clearTimeout(entry.timer)
      entry.reject(new Error('WebSocket closed'))
    }
    pendingRef.current.clear()
  }, [])

  const getBackoffDelay = useCallback(() => {
    const delays = [1000, 2000, 4000, 8000, 16000, 30000, 60000]
    const idx = Math.min(reconnectAttemptsRef.current, delays.length - 1)
    return delays[idx]!
  }, [])

  const connect = useCallback(() => {
    if (!workspaceId || !mountRef.current) return

    cleanup()

    const token = localStorage.getItem('jtype.token')
    if (!token) return

    setStatus('connecting')

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${proto}//${window.location.host}/api/v1/workspaces/${workspaceId}/live?token=${encodeURIComponent(token)}&clientType=web`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
    }

    ws.onmessage = (event) => {
      let msg: any
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }

      if (msg.type === 'ack') {
        const entry = pendingRef.current.get(msg.ref)
        if (entry) {
          clearTimeout(entry.timer)
          pendingRef.current.delete(msg.ref)
          entry.resolve(msg)
        }
        return
      }

      if (msg.type === 'connected') {
        setSessionId(msg.sessionId ?? null)
        setWorkspaceClock(msg.workspaceClock ?? 0)
        setStatus('connected')
        reconnectAttemptsRef.current = 0

        if (pingRef.current) clearInterval(pingRef.current)
        pingRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }))
          }
        }, 30000)
        return
      }

      if (msg.type === 'pong') {
        return
      }

      for (const fn of listenersRef.current) {
        try { fn(msg) } catch { /* ignore */ }
      }
    }

    ws.onclose = () => {
      setStatus('disconnected')
      if (!mountRef.current) return
      const delay = getBackoffDelay()
      reconnectAttemptsRef.current += 1
      reconnectTimerRef.current = setTimeout(() => {
        if (mountRef.current) connect()
      }, delay)
    }

    ws.onerror = () => {
    }
  }, [workspaceId, cleanup, getBackoffDelay])

  useEffect(() => {
    mountRef.current = true
    if (workspaceId) {
      connect()
    }
    return () => {
      mountRef.current = false
      cleanup()
    }
  }, [workspaceId, connect, cleanup])

  const request = useCallback((msg: Record<string, any>): Promise<any> => {
    return new Promise((resolve, reject) => {
      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'))
        return
      }
      const ref = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      const timer = setTimeout(() => {
        pendingRef.current.delete(ref)
        reject(new Error('Request timeout'))
      }, 30000)
      pendingRef.current.set(ref, { resolve, reject, timer })
      ws.send(JSON.stringify({ ...msg, ref }))
    })
  }, [])

  const subscribe = useCallback((fn: (event: any) => void): (() => void) => {
    listenersRef.current.add(fn)
    return () => {
      listenersRef.current.delete(fn)
    }
  }, [])

  return { status, sessionId, request, subscribe, workspaceClock }
}
