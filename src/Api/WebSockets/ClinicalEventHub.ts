/**
 * WebSocket manager for real-time clinical event broadcasting.
 *
 * Uses Bun's native WebSocket server support.
 * Connected clients receive live events such as:
 *  - Patient admissions and discharges
 *  - Critical vital sign alerts
 *  - Lab result notifications
 *  - Medication updates
 *
 * The server also emits a simulated demo event every 8 seconds so
 * the activity feed looks alive in a demo environment without needing
 * real clinical integrations.
 */

import type { ServerWebSocket } from 'bun'

/** Shape of a live clinical event */
export interface LiveEvent {
  id:          string
  type:        'admission' | 'discharge' | 'critical_alert' | 'lab_result' | 'medication' | 'vitals_update'
  patientId:   string
  patientName: string
  ward:        string
  message:     string
  severity:    'info' | 'warning' | 'error' | 'success'
  timestamp:   string
}

const clients = new Set<ServerWebSocket<unknown>>()

/** Broadcast a clinical event to all connected WebSocket clients */
export function broadcast(event: LiveEvent): void {
  const payload = JSON.stringify(event)
  for (const ws of clients) {
    try { ws.send(payload) } catch { clients.delete(ws) }
  }
}

/** WebSocket handler object passed to Bun.serve() */
export const websocketHandler = {
  open(ws: ServerWebSocket<unknown>) {
    clients.add(ws)
    // Send a welcome event so the client knows it's connected
    ws.send(JSON.stringify({
      id: crypto.randomUUID(),
      type: 'info',
      patientId: 'system',
      patientName: 'Meblock EHR',
      ward: 'System',
      message: `Live feed connected · ${clients.size} client(s) online`,
      severity: 'info',
      timestamp: new Date().toISOString(),
    }))
  },
  close(ws: ServerWebSocket<unknown>) {
    clients.delete(ws)
  },
  message(_ws: ServerWebSocket<unknown>, _msg: string | Buffer) {
    // Client → server messages are not used yet
  },
}

// ── Demo event simulator ──────────────────────────────────────────────────────

const DEMO_EVENTS: Omit<LiveEvent, 'id' | 'timestamp'>[] = [
  { type: 'admission',      patientId: 'ehr-013', patientName: 'New Admission',   ward: 'Emergency',        message: 'New patient admitted via A&E — triage in progress', severity: 'info' },
  { type: 'critical_alert', patientId: 'ehr-002', patientName: 'James Okafor',    ward: 'Emergency',        message: '⚠ SpO₂ dropped to 88% — respiratory team paged',    severity: 'error' },
  { type: 'lab_result',     patientId: 'ehr-004', patientName: 'Thomas Müller',   ward: 'ICU',              message: 'Troponin result available — elevated 4.2 µg/L',       severity: 'warning' },
  { type: 'vitals_update',  patientId: 'ehr-001', patientName: 'Margaret Chen',   ward: 'Cardiology',       message: 'BP reduced to 138/85 after Furosemide dose',          severity: 'success' },
  { type: 'medication',     patientId: 'ehr-008', patientName: 'Carlos Rivera',   ward: 'General Medicine', message: 'IV antibiotics administered — Amoxicillin 1g',        severity: 'info' },
  { type: 'discharge',      patientId: 'ehr-005', patientName: 'Amelia Williams', ward: 'Orthopedics',      message: 'Discharge papers signed — follow-up in 6 weeks',       severity: 'success' },
  { type: 'critical_alert', patientId: 'ehr-012', patientName: 'Ibrahim Hassan',  ward: 'Emergency',        message: 'Peak flow < 33% predicted — escalate to ICU review',  severity: 'error' },
  { type: 'lab_result',     patientId: 'ehr-007', patientName: 'Sophie Dubois',   ward: 'Oncology',         message: 'WBC 1.8 × 10⁹/L — neutropenia protocol initiated',     severity: 'warning' },
]

let demoIndex = 0

/** Start emitting demo events every 8 seconds (for demo environments) */
export function startDemoEventStream(): void {
  setInterval(() => {
    if (clients.size === 0) return
    const template = DEMO_EVENTS[demoIndex % DEMO_EVENTS.length]!
    broadcast({ ...template, id: crypto.randomUUID(), timestamp: new Date().toISOString() })
    demoIndex++
  }, 8000)
}
