/**
 * useWebSocket — real-time event feed hook.
 *
 * Connects to the BunEHR WebSocket endpoint and pushes live clinical
 * events (admissions, critical alerts, lab results, etc.) to consumers.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import type { LiveEvent } from '../types/openehr.ts'

const MAX_EVENTS = 50  // Keep last N events in memory

interface UseWebSocketReturn {
  events:    LiveEvent[]
  connected: boolean
  /** Clear the event buffer */
  clear:     () => void
}

export function useWebSocket(): UseWebSocketReturn {
  const [events,    setEvents]    = useState<LiveEvent[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen  = () => { setConnected(true); console.info('[WS] Connected to BunEHR live feed') }
      ws.onclose = () => {
        setConnected(false)
        // Auto-reconnect after 3 seconds
        retryRef.current = setTimeout(connect, 3000)
      }
      ws.onerror = (err) => console.warn('[WS] Error:', err)
      ws.onmessage = (msg) => {
        try {
          const event = JSON.parse(msg.data as string) as LiveEvent
          setEvents(prev => [event, ...prev].slice(0, MAX_EVENTS))
        } catch { /* ignore malformed messages */ }
      }
    } catch { /* WebSocket not available in this environment */ }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const clear = useCallback(() => setEvents([]), [])

  return { events, connected, clear }
}
