import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import {
  CreateEhrSchema, UpdateEhrStatusSchema, CompositionSchema,
  CreateContributionSchema, DirectorySchema, AqlBodySchema, StoredQuerySchema,
} from '../Dtos/RequestDtos.ts'
import { handleError } from '../Middleware/ExceptionMiddleware.ts'
import { deepCamelCase } from '../Middleware/JsonNamingMiddleware.ts'
import { PreconditionRequiredError } from '../../domain/shared/DomainErrors.ts'
import type { AppServices } from '../../application/contracts/AppServices.ts'

const asDomain = <T>(v: unknown): T => deepCamelCase(v) as T

const getIfMatch = (c: { req: { header: (k: string) => string | undefined } }): string => {
  const v = c.req.header('If-Match')?.replace(/"/g, '')
  if (!v) throw new PreconditionRequiredError('If-Match header with current version uid is required')
  return v
}

const HF_API_URL = process.env['HF_API_URL'] ?? 'https://api-inference.huggingface.co/models/google/flan-t5-base'
const HF_API_TOKEN = process.env['HF_API_TOKEN']

const fallbackAqlFromPrompt = (prompt: string): string => {
  const text = prompt.toLowerCase()
  if (text.includes('composition') || text.includes('clinical document')) {
    return 'SELECT e/ehr_id/value, c/uid/value, c/name/value FROM EHR e CONTAINS COMPOSITION c'
  }
  if (text.includes('recent') || text.includes('latest')) {
    return 'SELECT e/ehr_id/value, e/time_created/value FROM EHR e ORDER BY e/time_created/value DESC'
  }
  return 'SELECT e/ehr_id/value, e/time_created/value FROM EHR e'
}

const extractAql = (raw: string): string => {
  const cleaned = raw.replace(/```[a-z]*|```/gi, '').trim()
  const firstSelect = cleaned.toUpperCase().indexOf('SELECT ')
  if (firstSelect === -1) return cleaned
  return cleaned.slice(firstSelect).trim()
}

const generateAqlWithAi = async (prompt: string): Promise<{ query: string; provider: string; model: string; usedFallback: boolean }> => {
  const instruction = [
    'You are an OpenEHR AQL assistant.',
    'Convert the user request into a valid AQL query.',
    'Return only one AQL query and nothing else.',
    'Use common OpenEHR paths such as e/ehr_id/value, e/time_created/value, c/uid/value, c/name/value.',
    '',
    `User request: ${prompt}`,
  ].join('\n')

  if (!HF_API_TOKEN) {
    return {
      query: fallbackAqlFromPrompt(prompt),
      provider: 'local-fallback',
      model: 'heuristic-aql',
      usedFallback: true,
    }
  }

  const res = await fetch(HF_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${HF_API_TOKEN}`,
    },
    body: JSON.stringify({
      inputs: instruction,
      parameters: {
        max_new_tokens: 180,
        temperature: 0.1,
        return_full_text: false,
      },
    }),
  })

  if (!res.ok) throw new Error(`AI provider error: ${res.status}`)
  const data = await res.json() as unknown
  const first = Array.isArray(data) ? data[0] : data
  const output = String(
    (first as { generated_text?: string; summary_text?: string; translation_text?: string } | undefined)?.generated_text
      ?? (first as { summary_text?: string } | undefined)?.summary_text
      ?? (first as { translation_text?: string } | undefined)?.translation_text
      ?? '',
  ).trim()

  const query = extractAql(output)
  if (!query.toUpperCase().startsWith('SELECT ')) {
    return {
      query: fallbackAqlFromPrompt(prompt),
      provider: 'local-fallback',
      model: 'heuristic-aql',
      usedFallback: true,
    }
  }
  return {
    query,
    provider: 'huggingface',
    model: HF_API_URL.split('/').at(-1) ?? 'unknown-model',
    usedFallback: false,
  }
}

/** OpenEhrController — all /v1 openEHR REST endpoints */
export function createOpenEhrController(svc: AppServices) {
  const app = new Hono()

  // ── EHR ────────────────────────────────────────────────────────────────────

  app.post('/v1/ehr', zValidator('json', CreateEhrSchema), async (c) => {
    try {
      const raw   = c.req.valid('json')
      const b     = asDomain<{ ehrId?: { value: string }; ehrStatus?: { subject?: never; isQueryable?: boolean; isModifiable?: boolean } }>(raw)
      const prefer = c.req.header('Prefer') ?? ''
      const ehr   = await svc.ehr.createEhr(b.ehrId?.value, b.ehrStatus?.subject, b.ehrStatus?.isQueryable, b.ehrStatus?.isModifiable)
      const ehrId = (ehr.ehrId as { value: string }).value
      c.header('Location', `/v1/ehr/${ehrId}`)
      c.header('ETag', `"${(ehr.ehrStatus.uid as { value: string }).value}"`)
      return prefer.includes('return=representation') ? c.json(ehr, 201) : c.body(null, 201)
    } catch (e) { return handleError(e, c) }
  })

  app.put('/v1/ehr/:ehr_id', zValidator('json', CreateEhrSchema), async (c) => {
    try {
      const b = asDomain<{ ehrStatus?: { subject?: never; isQueryable?: boolean; isModifiable?: boolean } }>(c.req.valid('json'))
      const prefer = c.req.header('Prefer') ?? ''
      const ehr = await svc.ehr.createEhr(c.req.param('ehr_id'), b.ehrStatus?.subject, b.ehrStatus?.isQueryable, b.ehrStatus?.isModifiable)
      c.header('ETag', `"${(ehr.ehrStatus.uid as { value: string }).value}"`)
      return prefer.includes('return=representation') ? c.json(ehr, 201) : c.body(null, 201)
    } catch (e) { return handleError(e, c) }
  })

  app.get('/v1/ehr', async (c) => {
    try {
      const sid = c.req.query('subject_id')
      if (!sid) return c.json({ detail: 'subject_id required' }, 400)
      return c.json(await svc.ehr.getEhrBySubject(sid, c.req.query('subject_namespace') ?? 'local'))
    } catch (e) { return handleError(e, c) }
  })

  app.get('/v1/ehr/:ehr_id', async (c) => {
    try {
      const ehr = await svc.ehr.getEhr(c.req.param('ehr_id'))
      c.header('ETag', `"${(ehr.ehrStatus.uid as { value: string }).value}"`)
      return c.json(ehr)
    } catch (e) { return handleError(e, c) }
  })

  app.get('/v1/ehr/:ehr_id/ehr_status', async (c) => {
    try {
      const st = await svc.ehr.getEhrStatus(c.req.param('ehr_id'))
      c.header('ETag', `"${(st.uid as { value: string }).value}"`)
      return c.json(st)
    } catch (e) { return handleError(e, c) }
  })

  app.get('/v1/ehr/:ehr_id/ehr_status/:version_uid', async (c) => {
    try { return c.json(await svc.ehr.getEhrStatusAtVersion(c.req.param('ehr_id'), c.req.param('version_uid'))) }
    catch (e) { return handleError(e, c) }
  })

  app.put('/v1/ehr/:ehr_id/ehr_status', zValidator('json', UpdateEhrStatusSchema), async (c) => {
    try {
      const b = asDomain<{ subject?: never; isQueryable: boolean; isModifiable: boolean }>(c.req.valid('json'))
      const prefer = c.req.header('Prefer') ?? ''
      const st = await svc.ehr.updateEhrStatus(c.req.param('ehr_id'), getIfMatch(c), b.subject, b.isQueryable, b.isModifiable)
      c.header('ETag', `"${(st.uid as { value: string }).value}"`)
      return prefer.includes('return=representation') ? c.json(st) : c.body(null, 200)
    } catch (e) { return handleError(e, c) }
  })

  app.get('/v1/ehr/:ehr_id/versioned_ehr_status', async (c) => {
    try { return c.json(await svc.ehr.getVersionedEhrStatus(c.req.param('ehr_id'))) }
    catch (e) { return handleError(e, c) }
  })

  // ── COMPOSITION ─────────────────────────────────────────────────────────────

  app.post('/v1/ehr/:ehr_id/composition', zValidator('json', CompositionSchema), async (c) => {
    try {
      const ehrId = c.req.param('ehr_id')
      const prefer = c.req.header('Prefer') ?? ''
      const comp = await svc.composition.createComposition(ehrId, asDomain(c.req.valid('json')))
      const uid = (comp.uid as { value: string }).value
      c.header('Location', `/v1/ehr/${ehrId}/composition/${uid}`)
      c.header('ETag', `"${uid}"`)
      return prefer.includes('return=representation') ? c.json(comp, 201) : c.body(null, 201)
    } catch (e) { return handleError(e, c) }
  })

  app.get('/v1/ehr/:ehr_id/composition/:versioned_object_uid', async (c) => {
    try {
      const comp = await svc.composition.getComposition(c.req.param('ehr_id'), c.req.param('versioned_object_uid'), c.req.query('version_at_time'))
      c.header('ETag', `"${(comp.uid as { value: string }).value}"`)
      return c.json(comp)
    } catch (e) { return handleError(e, c) }
  })

  app.put('/v1/ehr/:ehr_id/composition/:versioned_object_uid', zValidator('json', CompositionSchema), async (c) => {
    try {
      const ehrId = c.req.param('ehr_id')
      const prefer = c.req.header('Prefer') ?? ''
      const comp = await svc.composition.updateComposition(ehrId, c.req.param('versioned_object_uid'), getIfMatch(c), asDomain(c.req.valid('json')))
      const uid = (comp.uid as { value: string }).value
      c.header('ETag', `"${uid}"`)
      c.header('Location', `/v1/ehr/${ehrId}/composition/${uid}`)
      return prefer.includes('return=representation') ? c.json(comp) : c.body(null, 200)
    } catch (e) { return handleError(e, c) }
  })

  app.delete('/v1/ehr/:ehr_id/composition/:preceding_version_uid', async (c) => {
    try { await svc.composition.deleteComposition(c.req.param('ehr_id'), c.req.param('preceding_version_uid')); return c.body(null, 204) }
    catch (e) { return handleError(e, c) }
  })

  app.get('/v1/ehr/:ehr_id/versioned_composition/:versioned_object_uid', async (c) => {
    try { return c.json(await svc.composition.getVersionedComposition(c.req.param('ehr_id'), c.req.param('versioned_object_uid'))) }
    catch (e) { return handleError(e, c) }
  })

  // ── CONTRIBUTION ────────────────────────────────────────────────────────────

  app.post('/v1/ehr/:ehr_id/contribution', zValidator('json', CreateContributionSchema), async (c) => {
    try {
      const b = asDomain<{ versions: never[]; audit: never }>(c.req.valid('json'))
      const prefer = c.req.header('Prefer') ?? ''
      const contrib = await svc.contribution.createContribution(c.req.param('ehr_id'), b.versions, b.audit)
      const uid = (contrib.uid as { value: string }).value
      c.header('Location', `/v1/ehr/${c.req.param('ehr_id')}/contribution/${uid}`)
      return prefer.includes('return=representation') ? c.json(contrib, 201) : c.body(null, 201)
    } catch (e) { return handleError(e, c) }
  })

  app.get('/v1/ehr/:ehr_id/contribution/:contribution_uid', async (c) => {
    try { return c.json(await svc.contribution.getContribution(c.req.param('ehr_id'), c.req.param('contribution_uid'))) }
    catch (e) { return handleError(e, c) }
  })

  // ── DIRECTORY ───────────────────────────────────────────────────────────────

  app.post('/v1/ehr/:ehr_id/directory', zValidator('json', DirectorySchema), async (c) => {
    try {
      const b = asDomain<{ name: never; archetypeNodeId?: string; items?: never[] }>(c.req.valid('json'))
      const prefer = c.req.header('Prefer') ?? ''
      const dir = await svc.directory.createDirectory(c.req.param('ehr_id'), { name: b.name, archetypeNodeId: b.archetypeNodeId, items: b.items })
      c.header('ETag', `"${(dir.uid as { value: string }).value}"`)
      return prefer.includes('return=representation') ? c.json(dir, 201) : c.body(null, 201)
    } catch (e) { return handleError(e, c) }
  })

  app.get('/v1/ehr/:ehr_id/directory', async (c) => {
    try {
      const dir = await svc.directory.getDirectory(c.req.param('ehr_id'), c.req.query('version_at_time'))
      c.header('ETag', `"${(dir.uid as { value: string }).value}"`)
      return c.json(dir)
    } catch (e) { return handleError(e, c) }
  })

  app.get('/v1/ehr/:ehr_id/directory/:version_uid', async (c) => {
    try { return c.json(await svc.directory.getDirectoryAtVersion(c.req.param('ehr_id'), c.req.param('version_uid'), c.req.query('path'))) }
    catch (e) { return handleError(e, c) }
  })

  app.put('/v1/ehr/:ehr_id/directory', zValidator('json', DirectorySchema), async (c) => {
    try {
      const b = asDomain<{ name: never; archetypeNodeId?: string; items?: never[] }>(c.req.valid('json'))
      const prefer = c.req.header('Prefer') ?? ''
      const dir = await svc.directory.updateDirectory(c.req.param('ehr_id'), getIfMatch(c), { name: b.name, archetypeNodeId: b.archetypeNodeId, items: b.items })
      c.header('ETag', `"${(dir.uid as { value: string }).value}"`)
      return prefer.includes('return=representation') ? c.json(dir) : c.body(null, 200)
    } catch (e) { return handleError(e, c) }
  })

  app.delete('/v1/ehr/:ehr_id/directory', async (c) => {
    try { await svc.directory.deleteDirectory(c.req.param('ehr_id'), getIfMatch(c)); return c.body(null, 204) }
    catch (e) { return handleError(e, c) }
  })

  // ── QUERY ───────────────────────────────────────────────────────────────────

  app.post('/v1/query/aql/assist', async (c) => {
    try {
      const body = c.req.header('content-type')?.includes('application/json')
        ? await c.req.json() as { prompt?: string; fetch?: number; offset?: number }
        : { prompt: '' }
      const prompt = (body.prompt ?? '').trim()
      if (!prompt) return c.json({ detail: 'prompt is required' }, 400)

      const generated = await generateAqlWithAi(prompt)
      const result = await svc.query.executeAql(generated.query, body.offset, body.fetch)
      return c.json({
        prompt,
        generatedQuery: generated.query,
        provider: generated.provider,
        model: generated.model,
        usedFallback: generated.usedFallback,
        result,
      })
    } catch (e) { return handleError(e, c) }
  })

  app.get('/v1/query/aql', async (c) => {
    try {
      const q = c.req.query('q') ?? ''
      return c.json(await svc.query.executeAql(q,
        c.req.query('offset') ? parseInt(c.req.query('offset')!, 10) : undefined,
        c.req.query('fetch')  ? parseInt(c.req.query('fetch')!,  10) : undefined,
      ))
    } catch (e) { return handleError(e, c) }
  })

  app.post('/v1/query/aql', zValidator('json', AqlBodySchema), async (c) => {
    try {
      const b = c.req.valid('json')
      return c.json(await svc.query.executeAql(b.q, b.offset, b.fetch, b.query_parameters as Record<string, unknown> | undefined))
    } catch (e) { return handleError(e, c) }
  })

  app.get('/v1/query/stored-queries', async (c) => {
    try { return c.json(await svc.query.listStoredQueries(c.req.query('qualified_query_name'))) }
    catch (e) { return handleError(e, c) }
  })

  app.put('/v1/query/stored-queries/:qualified_query_name/:version', zValidator('json', StoredQuerySchema), async (c) => {
    try {
      const b = c.req.valid('json')
      return c.json(await svc.query.saveStoredQuery(c.req.param('qualified_query_name'), c.req.param('version'), b.q, b.type))
    } catch (e) { return handleError(e, c) }
  })

  app.get('/v1/query/stored-queries/:qualified_query_name', async (c) => {
    try { return c.json(await svc.query.getStoredQuery(c.req.param('qualified_query_name'))) }
    catch (e) { return handleError(e, c) }
  })

  // ── DEFINITION ─────────────────────────────────────────────────────────────

  app.post('/v1/definition/template/adl1.4', async (c) => {
    try {
      const tpl = await svc.definition.uploadTemplate('1.4', await c.req.text())
      c.header('Location', `/v1/definition/template/adl1.4/${tpl.templateId}`)
      return c.req.header('Prefer')?.includes('return=representation') ? c.json(tpl, 201) : c.body(null, 201)
    } catch (e) { return handleError(e, c) }
  })

  app.get('/v1/definition/template/adl1.4', async (c) => {
    try { return c.json(await svc.definition.listTemplates('1.4')) }
    catch (e) { return handleError(e, c) }
  })

  app.get('/v1/definition/template/adl1.4/:template_id', async (c) => {
    try { return c.json(await svc.definition.getTemplate('1.4', c.req.param('template_id'))) }
    catch (e) { return handleError(e, c) }
  })

  app.get('/v1/definition/template/adl1.4/:template_id/example', async (c) => {
    try { return c.json(await svc.definition.getExampleComposition(c.req.param('template_id'))) }
    catch (e) { return handleError(e, c) }
  })

  app.post('/v1/definition/template/adl2', async (c) => {
    try {
      const tpl = await svc.definition.uploadTemplate('2', await c.req.text())
      c.header('Location', `/v1/definition/template/adl2/${tpl.templateId}`)
      return c.req.header('Prefer')?.includes('return=representation') ? c.json(tpl, 201) : c.body(null, 201)
    } catch (e) { return handleError(e, c) }
  })

  app.get('/v1/definition/template/adl2', async (c) => {
    try { return c.json(await svc.definition.listTemplates('2')) }
    catch (e) { return handleError(e, c) }
  })

  app.get('/v1/definition/template/adl2/:template_id', async (c) => {
    try { return c.json(await svc.definition.getTemplate('2', c.req.param('template_id'))) }
    catch (e) { return handleError(e, c) }
  })

  return app
}
