import { Hono } from 'hono'
import { and, desc, eq } from 'drizzle-orm'
import type { AppServices } from '../../application/contracts/AppServices.ts'
import { db } from '../../infrastructure/database/client.ts'
import {
  ctScanAnalysis,
  ehr,
  imagingDemoAsset,
  ziehlNeelsenAnalysis,
} from '../../infrastructure/database/schema.ts'
import { newUuid } from '../../domain/shared/IdGenerator.ts'

type ZiehlPayload = {
  ehr_id?: string
  image_uri?: string
  demo_asset_id?: string
  source_vendor?: string
  source_model?: string
}

type CtPayload = {
  ehr_id?: string
  image_uri?: string
  study_uid?: string
  source_vendor?: string
  source_model?: string
}

const GE_VENDOR = 'GE Healthcare'
const GE_MODEL = 'GE-AFB-PseudoScope-v0'
const GE_CT_MODEL = 'GE-Revolution-PseudoCT-v0'
const ZN_TILE_SIZE = 64
type DyeMap = { grid: ReadonlyArray<ReadonlyArray<number>>; hotspotCoordinates: ReadonlyArray<{ x: number; y: number }> }

const DEMO_ASSETS = [
  {
    id: 'demo-zn-001',
    modality: 'ZIEHL_NEELSEN',
    sourceVendor: GE_VENDOR,
    sourceModel: GE_MODEL,
    imageUri: 'demo://ge/zn/slide-001.png',
    dyeMap: {
      grid: [
        [0, 1, 1, 2, 0],
        [1, 3, 2, 2, 0],
        [0, 2, 4, 2, 1],
        [0, 1, 2, 1, 0],
      ],
      hotspotCoordinates: [{ x: 2, y: 2 }, { x: 1, y: 1 }],
    },
    bacteriaCount: 17,
    notes: 'Pseudo GE microscope frame from sputum smear.',
  },
  {
    id: 'demo-zn-002',
    modality: 'ZIEHL_NEELSEN',
    sourceVendor: GE_VENDOR,
    sourceModel: GE_MODEL,
    imageUri: 'demo://ge/zn/slide-002.png',
    dyeMap: {
      grid: [
        [0, 0, 0, 1, 0],
        [0, 1, 1, 1, 0],
        [0, 1, 2, 1, 0],
        [0, 0, 1, 0, 0],
      ],
      hotspotCoordinates: [{ x: 2, y: 2 }],
    },
    bacteriaCount: 6,
    notes: 'Pseudo GE microscope frame with low bacillary load.',
  },
  {
    id: 'demo-ct-001',
    modality: 'CT_SCAN',
    sourceVendor: GE_VENDOR,
    sourceModel: GE_CT_MODEL,
    imageUri: 'demo://ge/ct/study-001.dcm',
    dyeMap: null,
    bacteriaCount: null,
    notes: 'Pseudo GE CT thorax slice stack.',
  },
] as const

const sumChars = (value: string): number =>
  [...value].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)

const asDataUrl = (svg: string): string =>
  `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`

const znSvg = (dyeMap: DyeMap, includeDots: boolean): string => {
  const width = (dyeMap.grid[0]?.length ?? 5) * ZN_TILE_SIZE
  const height = dyeMap.grid.length * ZN_TILE_SIZE
  const cells = dyeMap.grid.flatMap((row, y) =>
    row.map((value, x) => {
      const saturation = 30 + (value * 14)
      const lightness = 78 - (value * 8)
      return `<rect x="${x * ZN_TILE_SIZE}" y="${y * ZN_TILE_SIZE}" width="${ZN_TILE_SIZE}" height="${ZN_TILE_SIZE}" fill="hsl(340 ${saturation}% ${lightness}%)" stroke="#ffffff" stroke-width="1" />`
    }),
  ).join('')
  const dots = includeDots
    ? dyeMap.hotspotCoordinates.map((p) => `<circle cx="${p.x * ZN_TILE_SIZE + ZN_TILE_SIZE / 2}" cy="${p.y * ZN_TILE_SIZE + ZN_TILE_SIZE / 2}" r="10" fill="#1d4ed8" stroke="#ffffff" stroke-width="2" />`).join('')
    : ''
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect x="0" y="0" width="${width}" height="${height}" fill="#fdf2f8" />`,
    cells,
    dots,
    '</svg>',
  ].join('')
}

const ctSvg = (lesionMap: { upperLobeRight: number; upperLobeLeft: number; lowerLobeRight: number; lowerLobeLeft: number; cavityPresent: boolean; pleuralEffusion: boolean }, includeDots: boolean): string => {
  const width = 480
  const height = 320
  const dots = includeDots ? [
    { x: 170, y: 105, score: lesionMap.upperLobeLeft },
    { x: 310, y: 105, score: lesionMap.upperLobeRight },
    { x: 170, y: 220, score: lesionMap.lowerLobeLeft },
    { x: 310, y: 220, score: lesionMap.lowerLobeRight },
  ].map((d) => {
    const radius = 8 + Math.round(d.score * 28)
    return `<circle cx="${d.x}" cy="${d.y}" r="${radius}" fill="rgba(239,68,68,0.45)" stroke="#ef4444" stroke-width="2" />`
  }).join('') : ''
  const cavity = includeDots && lesionMap.cavityPresent
    ? '<circle cx="240" cy="150" r="24" fill="none" stroke="#f97316" stroke-width="4" stroke-dasharray="6 4" />'
    : ''
  const effusion = includeDots && lesionMap.pleuralEffusion
    ? '<ellipse cx="240" cy="270" rx="170" ry="20" fill="rgba(59,130,246,0.35)" />'
    : ''
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<rect width="100%" height="100%" fill="#0f172a" />',
    '<ellipse cx="170" cy="160" rx="95" ry="132" fill="#1f2937" stroke="#475569" stroke-width="2"/>',
    '<ellipse cx="310" cy="160" rx="95" ry="132" fill="#1f2937" stroke="#475569" stroke-width="2"/>',
    '<rect x="228" y="40" width="24" height="220" rx="10" fill="#334155" />',
    dots,
    cavity,
    effusion,
    '</svg>',
  ].join('')
}

const buildDyeMap = (seed: number) => {
  const grid = [...Array(4)].map((_, y) =>
    [...Array(5)].map((__, x) => ((seed + x * 7 + y * 11) % 5)),
  )
  const hotspotCoordinates = grid.flatMap((row, y) =>
    row.flatMap((v, x) => (v >= 3 ? [{ x, y }] : [])),
  )
  return { grid, hotspotCoordinates }
}

const defaultCtLesionMap = {
  upperLobeRight: 0.18,
  upperLobeLeft: 0.11,
  lowerLobeRight: 0.15,
  lowerLobeLeft: 0.09,
  cavityPresent: false,
  pleuralEffusion: false,
}

const bacillaryBand = (bacteriaCount: number): 'NEGATIVE' | 'SCANTY' | '1+' | '2+' | '3+' => {
  if (bacteriaCount <= 0) return 'NEGATIVE'
  if (bacteriaCount <= 9) return 'SCANTY'
  if (bacteriaCount <= 19) return '1+'
  if (bacteriaCount <= 40) return '2+'
  return '3+'
}

async function ensureEhrExists(ehrId: string): Promise<boolean> {
  const row = await db.select({ id: ehr.id }).from(ehr).where(eq(ehr.id, ehrId)).limit(1)
  return Boolean(row[0])
}

export function createImagingAiController(services: AppServices) {
  const app = new Hono()

  app.get('/health', (c) => c.json({
    status: 'UP',
    module: 'AI Imaging',
    routes: [
      'POST /api/ai/seed-imaging-demo',
      'GET /api/ai/demo-images',
      'POST /api/ai/ziehl-neelsen/analyze',
      'POST /api/ai/ct-scan/analyze',
      'GET /api/ai/results/{ehr_id}',
    ],
  }))

  app.post('/seed-imaging-demo', async (c) => {
    let inserted = 0
    for (const asset of DEMO_ASSETS) {
      try {
        await db.insert(imagingDemoAsset).values({
          id: asset.id,
          modality: asset.modality,
          sourceVendor: asset.sourceVendor,
          sourceModel: asset.sourceModel,
          imageUri: asset.imageUri,
          imageData: asset.modality === 'ZIEHL_NEELSEN'
            ? asDataUrl(znSvg(asset.dyeMap as DyeMap, true))
            : asDataUrl(ctSvg(defaultCtLesionMap, true)),
          dyeMap: asset.dyeMap,
          bacteriaCount: asset.bacteriaCount,
          notes: asset.notes,
        }).onConflictDoUpdate({
          target: imagingDemoAsset.id,
          set: {
            modality: asset.modality,
            sourceVendor: asset.sourceVendor,
            sourceModel: asset.sourceModel,
            imageUri: asset.imageUri,
            imageData: asset.modality === 'ZIEHL_NEELSEN'
              ? asDataUrl(znSvg(asset.dyeMap as DyeMap, true))
              : asDataUrl(ctSvg(defaultCtLesionMap, true)),
            dyeMap: asset.dyeMap,
            bacteriaCount: asset.bacteriaCount,
            notes: asset.notes,
          },
        })
        inserted++
      } catch {
        // no-op
      }
    }
    return c.json({
      message: 'Imaging demo assets are available in PostgreSQL.',
      inserted,
      totalAssets: DEMO_ASSETS.length,
      pseudoIntegration: `${GE_VENDOR} ${GE_MODEL}`,
    })
  })

  app.get('/demo-images', async (c) => {
    const rows = await db.select().from(imagingDemoAsset).orderBy(imagingDemoAsset.modality, imagingDemoAsset.id)
    return c.json({ results: rows })
  })

  app.post('/ziehl-neelsen/analyze', async (c) => {
    const body = await c.req.json() as ZiehlPayload
    const ehrId = String(body.ehr_id ?? '')
    if (!ehrId) return c.json({ detail: 'ehr_id is required' }, 400)
    if (!(await ensureEhrExists(ehrId))) return c.json({ detail: `EHR not found: ${ehrId}` }, 404)

    const imageUri = String(body.image_uri ?? '').trim()
    const demoAssetId = body.demo_asset_id ? String(body.demo_asset_id) : null

    let sourceVendor = body.source_vendor ? String(body.source_vendor) : GE_VENDOR
    let sourceModel = body.source_model ? String(body.source_model) : GE_MODEL
    let dyeMap = buildDyeMap(sumChars(imageUri || demoAssetId || ehrId))
    let bacteriaCount = Math.max(0, Math.round((sumChars(imageUri || ehrId) % 45)))
    let sourceImageData = asDataUrl(znSvg(dyeMap, false))

    if (demoAssetId) {
      const demoRows = await db.select().from(imagingDemoAsset).where(eq(imagingDemoAsset.id, demoAssetId)).limit(1)
      const demo = demoRows[0]
      if (!demo) return c.json({ detail: `Demo asset not found: ${demoAssetId}` }, 404)
      sourceVendor = demo.sourceVendor
      sourceModel = demo.sourceModel
      if (demo.dyeMap) dyeMap = demo.dyeMap as ReturnType<typeof buildDyeMap>
      if (demo.bacteriaCount !== null) bacteriaCount = demo.bacteriaCount
      sourceImageData = demo.imageData
    } else if (!imageUri) {
      return c.json({ detail: 'image_uri or demo_asset_id is required' }, 400)
    }

    const acidFastScore = Number((Math.min(100, bacteriaCount * 2.2) / 100).toFixed(2))
    const aiConfidence = Number((0.72 + ((sumChars(ehrId + sourceModel) % 23) / 100)).toFixed(2))
    const band = bacillaryBand(bacteriaCount)
    const interpretation = band === 'NEGATIVE'
      ? 'No acid-fast bacilli detected in Ziehl-Neelsen smear.'
      : `Acid-fast bacilli detected (${band}); recommend confirmatory TB workflow.`
    const analyzedImageData = asDataUrl(znSvg(dyeMap, true))

    const analysisId = newUuid()
    const analyzedAt = new Date()
    await db.insert(ziehlNeelsenAnalysis).values({
      id: analysisId,
      ehrId,
      demoAssetId,
      sourceVendor,
      sourceModel,
      imageUri: imageUri || `demo://${demoAssetId}`,
      analyzedImageData,
      dyeMap,
      bacteriaCount,
      acidFastScore: acidFastScore.toString(),
      bacillaryLoadBand: band,
      aiConfidence: aiConfidence.toString(),
      interpretation,
      analyzedAt,
    })

    const composition = await services.composition.createComposition(ehrId, {
      archetypeNodeId: 'openEHR-EHR-COMPOSITION.laboratory_result.v1',
      name: { value: 'Ziehl-Neelsen AI Result' },
      archetypeDetails: {
        archetypeId: { value: 'openEHR-EHR-COMPOSITION.laboratory_result.v1' },
        templateId: { value: 'BunEHR-ZiehlNeelsen-AI.v1' },
        rmVersion: '1.1.0',
      },
      language: { terminologyId: { value: 'ISO_639-1' }, codeString: 'en' },
      territory: { terminologyId: { value: 'ISO_3166-1' }, codeString: 'US' },
      category: { value: 'event', definingCode: { terminologyId: { value: 'openehr' }, codeString: '433' } },
      composer: { name: 'BunEHR AI Imaging Module' },
      context: {
        startTime: { value: analyzedAt.toISOString() },
        setting: { value: 'Primary medical care', definingCode: { terminologyId: { value: 'openehr' }, codeString: '228' } },
      },
      content: [{
        archetypeNodeId: 'at0001',
        name: { value: 'Ziehl-Neelsen stain analysis' },
        data: {
          analysis_id: analysisId,
          source_vendor: sourceVendor,
          source_model: sourceModel,
          image_uri: imageUri || `demo://${demoAssetId}`,
          source_image_data: sourceImageData,
          analyzed_image_data: analyzedImageData,
          dye_map: dyeMap,
          bacteria_count: bacteriaCount,
          bacillary_load_band: band,
          acid_fast_score: acidFastScore,
          ai_confidence: aiConfidence,
          interpretation,
        },
      }],
    })

    return c.json({
      analysisId,
      ehrId,
      sourceVendor,
      sourceModel,
      bacteriaCount,
      bacillaryLoadBand: band,
      acidFastScore,
      aiConfidence,
      interpretation,
      dyeMap,
      sourceImageData,
      analyzedImageData,
      ehrCompositionVersionUid: composition.uid.value,
    }, 201)
  })

  app.get('/ziehl-neelsen/analyze', (c) => {
    return c.json({
      detail: 'Use POST for this endpoint.',
      example: {
        method: 'POST',
        path: '/api/ai/ziehl-neelsen/analyze',
        body: { ehr_id: 'ehr-001', demo_asset_id: 'demo-zn-001' },
      },
    }, 405)
  })

  app.post('/ct-scan/analyze', async (c) => {
    const body = await c.req.json() as CtPayload
    const ehrId = String(body.ehr_id ?? '')
    if (!ehrId) return c.json({ detail: 'ehr_id is required' }, 400)
    if (!(await ensureEhrExists(ehrId))) return c.json({ detail: `EHR not found: ${ehrId}` }, 404)
    const imageUri = String(body.image_uri ?? '').trim()
    if (!imageUri) return c.json({ detail: 'image_uri is required' }, 400)

    const sourceVendor = body.source_vendor ? String(body.source_vendor) : GE_VENDOR
    const sourceModel = body.source_model ? String(body.source_model) : GE_CT_MODEL
    const studyUid = body.study_uid ? String(body.study_uid) : `study-${newUuid().slice(0, 12)}`

    const seed = sumChars(`${ehrId}:${imageUri}:${studyUid}`)
    const noduleCount = seed % 9
    const cavityPresent = seed % 4 === 0
    const pleuralEffusion = seed % 6 === 0
    const consolidationPercent = Number(((seed % 48) + 8).toFixed(2))
    const tbSuspicionScore = Number((Math.min(100, noduleCount * 10 + consolidationPercent + (cavityPresent ? 12 : 0)) / 100).toFixed(2))
    const aiConfidence = Number((0.7 + ((seed % 25) / 100)).toFixed(2))
    const lesionMap = {
      upperLobeRight: Number(((seed % 27) / 100).toFixed(2)),
      upperLobeLeft: Number((((seed + 11) % 27) / 100).toFixed(2)),
      lowerLobeRight: Number((((seed + 17) % 35) / 100).toFixed(2)),
      lowerLobeLeft: Number((((seed + 23) % 35) / 100).toFixed(2)),
      cavityPresent,
      pleuralEffusion,
    }
    const impression = tbSuspicionScore >= 0.65
      ? 'Pattern suggests active pulmonary TB; correlate with smear and molecular test.'
      : 'No high-likelihood TB pattern; continue clinical monitoring.'
    const sourceImageData = asDataUrl(ctSvg(lesionMap, false))
    const analyzedImageData = asDataUrl(ctSvg(lesionMap, true))

    const analysisId = newUuid()
    const analyzedAt = new Date()
    await db.insert(ctScanAnalysis).values({
      id: analysisId,
      ehrId,
      studyUid,
      imageUri,
      analyzedImageData,
      sourceVendor,
      sourceModel,
      lesionMap,
      cavityPresent,
      pleuralEffusion,
      noduleCount,
      consolidationPercent: consolidationPercent.toString(),
      tbSuspicionScore: tbSuspicionScore.toString(),
      aiConfidence: aiConfidence.toString(),
      impression,
      analyzedAt,
    })

    const latestZn = await db.select().from(ziehlNeelsenAnalysis)
      .where(and(eq(ziehlNeelsenAnalysis.ehrId, ehrId)))
      .orderBy(desc(ziehlNeelsenAnalysis.analyzedAt))
      .limit(1)

    const composition = await services.composition.createComposition(ehrId, {
      archetypeNodeId: 'openEHR-EHR-COMPOSITION.imaging_exam_result.v1',
      name: { value: 'CT Scan AI Result' },
      archetypeDetails: {
        archetypeId: { value: 'openEHR-EHR-COMPOSITION.imaging_exam_result.v1' },
        templateId: { value: 'BunEHR-CT-AI.v1' },
        rmVersion: '1.1.0',
      },
      language: { terminologyId: { value: 'ISO_639-1' }, codeString: 'en' },
      territory: { terminologyId: { value: 'ISO_3166-1' }, codeString: 'US' },
      category: { value: 'event', definingCode: { terminologyId: { value: 'openehr' }, codeString: '433' } },
      composer: { name: 'BunEHR AI Imaging Module' },
      context: {
        startTime: { value: analyzedAt.toISOString() },
        setting: { value: 'Secondary medical care', definingCode: { terminologyId: { value: 'openehr' }, codeString: '229' } },
      },
      content: [{
        archetypeNodeId: 'at0002',
        name: { value: 'Chest CT AI analysis' },
        data: {
          analysis_id: analysisId,
          study_uid: studyUid,
          image_uri: imageUri,
          source_image_data: sourceImageData,
          analyzed_image_data: analyzedImageData,
          source_vendor: sourceVendor,
          source_model: sourceModel,
          nodule_count: noduleCount,
          consolidation_percent: consolidationPercent,
          cavity_present: cavityPresent,
          pleural_effusion: pleuralEffusion,
          tb_suspicion_score: tbSuspicionScore,
          ai_confidence: aiConfidence,
          impression,
          latest_ziehl_neelsen_result: latestZn[0] ? {
            analysis_id: latestZn[0].id,
            bacteria_count: latestZn[0].bacteriaCount,
            bacillary_load_band: latestZn[0].bacillaryLoadBand,
            analyzed_at: latestZn[0].analyzedAt.toISOString(),
          } : null,
        },
      }],
    })

    return c.json({
      analysisId,
      ehrId,
      studyUid,
      sourceVendor,
      sourceModel,
      noduleCount,
      consolidationPercent,
      cavityPresent,
      pleuralEffusion,
      tbSuspicionScore,
      aiConfidence,
      impression,
      lesionMap,
      sourceImageData,
      analyzedImageData,
      linkedZiehlNeelsen: latestZn[0] ? {
        analysisId: latestZn[0].id,
        bacteriaCount: latestZn[0].bacteriaCount,
        bacillaryLoadBand: latestZn[0].bacillaryLoadBand,
      } : null,
      ehrCompositionVersionUid: composition.uid.value,
    }, 201)
  })

  app.get('/ct-scan/analyze', (c) => {
    return c.json({
      detail: 'Use POST for this endpoint.',
      example: {
        method: 'POST',
        path: '/api/ai/ct-scan/analyze',
        body: { ehr_id: 'ehr-001', image_uri: 'demo://ge/ct/study-001.dcm' },
      },
    }, 405)
  })

  app.get('/results/:ehr_id', async (c) => {
    const ehrId = c.req.param('ehr_id')
    const znRows = await db.select().from(ziehlNeelsenAnalysis)
      .where(eq(ziehlNeelsenAnalysis.ehrId, ehrId))
      .orderBy(desc(ziehlNeelsenAnalysis.analyzedAt))
    const ctRows = await db.select().from(ctScanAnalysis)
      .where(eq(ctScanAnalysis.ehrId, ehrId))
      .orderBy(desc(ctScanAnalysis.analyzedAt))
    return c.json({ ehrId, ziehlNeelsen: znRows, ctScan: ctRows })
  })

  return app
}
