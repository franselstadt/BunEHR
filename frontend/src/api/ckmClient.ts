export interface CkmStatus {
  rootPath: string
  repository: string
  exists: boolean
  hasRepo: boolean
  branch: string
  lastCommit: string
  error: string | null
}

export interface CkmTreeEntry {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modifiedAt: string
}

export interface CkmTreeResponse {
  scope: 'local' | 'remote'
  path: string
  entries: CkmTreeEntry[]
}

export interface CkmFileResponse {
  scope: 'local' | 'remote'
  path: string
  size: number
  modifiedAt: string
  content: string
}

const request = async <T>(method: string, path: string): Promise<T> => {
  const res = await fetch(path, { method, headers: { Accept: 'application/json' } })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error((err as { detail?: string }).detail ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const getCkmStatus = () => request<CkmStatus>('GET', '/api/ckm/status')

export const syncCkmMirror = () => request<{ ok: boolean; rootPath: string; repository: string; lastCommit: string }>('POST', '/api/ckm/sync')

export const seedCkmDemo = () => request<{ ok: boolean; rootPath: string; filesWritten: number; message: string }>('POST', '/api/ckm/seed-demo')

export const listCkmTree = (scope: 'local' | 'remote', path = '') =>
  request<CkmTreeResponse>('GET', `/api/ckm/tree?scope=${scope}&path=${encodeURIComponent(path)}`)

export const readCkmFile = (scope: 'local' | 'remote', path: string) =>
  request<CkmFileResponse>('GET', `/api/ckm/file?scope=${scope}&path=${encodeURIComponent(path)}`)
