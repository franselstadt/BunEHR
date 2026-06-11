export interface ImagingDemoAsset {
  id: string
  modality: 'ZIEHL_NEELSEN' | 'CT_SCAN'
  sourceVendor: string
  sourceModel: string
  imageUri: string
  imageData: string
  dyeMap: unknown
  bacteriaCount: number | null
}

export interface ZiehlResult {
  analysisId: string
  ehrId: string
  sourceVendor: string
  sourceModel: string
  bacteriaCount: number
  bacillaryLoadBand: string
  acidFastScore: number
  aiConfidence: number
  interpretation: string
  dyeMap: unknown
  sourceImageData: string
  analyzedImageData: string
  ehrCompositionVersionUid: string
}

export interface CtResult {
  analysisId: string
  ehrId: string
  studyUid: string
  sourceVendor: string
  sourceModel: string
  noduleCount: number
  consolidationPercent: number
  cavityPresent: boolean
  pleuralEffusion: boolean
  tbSuspicionScore: number
  aiConfidence: number
  impression: string
  lesionMap: unknown
  sourceImageData: string
  analyzedImageData: string
  linkedZiehlNeelsen: null | {
    analysisId: string
    bacteriaCount: number
    bacillaryLoadBand: string
  }
  ehrCompositionVersionUid: string
}

export interface ImagingHistory {
  ehrId: string
  ziehlNeelsen: Array<Record<string, unknown>>
  ctScan: Array<Record<string, unknown>>
}

const request = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error((err as { detail?: string }).detail ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const seedImagingDemo = () =>
  request<{ message: string; inserted: number; totalAssets: number }>('POST', '/api/ai/seed-imaging-demo')

export const getImagingDemoAssets = () =>
  request<{ results: ImagingDemoAsset[] }>('GET', '/api/ai/demo-images')

export const runZiehlNeelsenAnalysis = (payload: { ehr_id: string; image_uri?: string; demo_asset_id?: string }) =>
  request<ZiehlResult>('POST', '/api/ai/ziehl-neelsen/analyze', payload)

export const runCtScanAnalysis = (payload: { ehr_id: string; image_uri: string; study_uid?: string }) =>
  request<CtResult>('POST', '/api/ai/ct-scan/analyze', payload)

export const getImagingHistory = (ehrId: string) =>
  request<ImagingHistory>('GET', `/api/ai/results/${ehrId}`)
