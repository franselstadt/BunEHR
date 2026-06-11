import { eq, like } from 'drizzle-orm'
import type { Db } from '../client.ts'
import { composition, ehr, storedQuery, templateDefinition } from '../schema.ts'
import type { QueryRepository, DefinitionRepository, AqlQueryResult, StoredQuery, Template, TemplateInfo } from '../../../domain/query/QueryModels.ts'
import { TemplateNotFoundError } from '../../../domain/shared/DomainErrors.ts'

// ── AQL Query Repository ─────────────────────────────────────────────────────

export class DrizzleQueryRepository implements QueryRepository {
  constructor(private readonly db: Db) {}

  async executeAql(q: string, offset = 0, fetch = 20, _params?: Record<string, unknown>): Promise<AqlQueryResult> {
    const upper = q.toUpperCase()

    if (upper.includes('EHR') && upper.includes('COMPOSITION')) {
      const rows = await this.db.select({
        ehrId: composition.ehrId, uid: composition.uid,
        name: composition.templateId, templateId: composition.templateId,
      }).from(composition).limit(fetch).offset(offset)
      return {
        meta: { generator: 'BunEHR/1.0.0', executedAql: q, created: new Date().toISOString() },
        q,
        columns: [
          { name: 'e/ehr_id/value', path: '/ehr_id/value' },
          { name: 'c/uid/value', path: '/uid/value' },
          { name: 'c/name/value', path: '/name/value' },
          { name: 'c/archetype_details/template_id/value', path: '/archetype_details/template_id/value' },
        ],
        rows: rows.map(r => [r.ehrId, r.uid, r.name, r.templateId]),
      }
    }

    if (upper.includes('EHR')) {
      const rows = await this.db.select({ id: ehr.id, timeCreated: ehr.timeCreated }).from(ehr).limit(fetch).offset(offset)
      return {
        meta: { generator: 'BunEHR/1.0.0', executedAql: q, created: new Date().toISOString() },
        q,
        columns: [
          { name: 'e/ehr_id/value', path: '/ehr_id/value' },
          { name: 'e/time_created/value', path: '/time_created/value' },
        ],
        rows: rows.map(r => [r.id, r.timeCreated.toISOString()]),
      }
    }

    return { meta: { generator: 'BunEHR/1.0.0', executedAql: q }, q, columns: [], rows: [] }
  }

  async saveStoredQuery(qualifiedName: string, version: string, q: string, type: string): Promise<StoredQuery> {
    const now = new Date()
    await this.db.insert(storedQuery).values({ qualifiedName, version, aqlQuery: q, type, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: storedQuery.qualifiedName, set: { aqlQuery: q, version, updatedAt: now } })
    return { name: qualifiedName.split('::').at(-1) ?? qualifiedName, qualifiedQueryName: qualifiedName, version, type, q, saved: now.toISOString() }
  }

  async listStoredQueries(prefix?: string): Promise<ReadonlyArray<StoredQuery>> {
    const rows = prefix
      ? await this.db.select().from(storedQuery).where(like(storedQuery.qualifiedName, `${prefix}%`))
      : await this.db.select().from(storedQuery)
    return rows.map(r => ({ name: r.qualifiedName.split('::').at(-1) ?? r.qualifiedName, qualifiedQueryName: r.qualifiedName, version: r.version, type: r.type, q: r.aqlQuery, saved: r.createdAt.toISOString() }))
  }

  async getStoredQuery(qualifiedName: string): Promise<StoredQuery> {
    const rows = await this.db.select().from(storedQuery).where(eq(storedQuery.qualifiedName, qualifiedName)).limit(1)
    if (!rows[0]) throw new TemplateNotFoundError(qualifiedName)
    const r = rows[0]
    return { name: r.qualifiedName.split('::').at(-1) ?? r.qualifiedName, qualifiedQueryName: r.qualifiedName, version: r.version, type: r.type, q: r.aqlQuery, saved: r.createdAt.toISOString() }
  }
}

// ── Definition/Template Repository ───────────────────────────────────────────

export class DrizzleDefinitionRepository implements DefinitionRepository {
  constructor(private readonly db: Db) {}

  async uploadTemplate(adlVersion: string, content: string, _templateId?: string): Promise<Template> {
    const extracted = extractTemplateId(content) ?? `template-${Date.now()}`
    const now = new Date()
    await this.db.insert(templateDefinition).values({
      templateId: extracted, adlVersion, content,
      version: extractVersion(content) ?? null,
      concept: extractConcept(content) ?? null,
      createdAt: now,
    }).onConflictDoUpdate({ target: templateDefinition.templateId, set: { content, adlVersion, updatedAt: now } as never })
    return { templateId: extracted, adlVersion, content, createdTimestamp: now.toISOString() }
  }

  async listTemplates(adlVersion: string): Promise<ReadonlyArray<TemplateInfo>> {
    const rows = await this.db.select().from(templateDefinition).where(eq(templateDefinition.adlVersion, adlVersion))
    return rows.map(r => ({ templateId: r.templateId, version: r.version ?? undefined, concept: r.concept ?? undefined, createdTimestamp: r.createdAt.toISOString() }))
  }

  async getTemplate(adlVersion: string, templateId: string): Promise<Template> {
    const rows = await this.db.select().from(templateDefinition)
      .where(eq(templateDefinition.templateId, templateId)).limit(1)
    const r = rows.find(x => x.adlVersion === adlVersion) ?? rows[0]
    if (!r) throw new TemplateNotFoundError(templateId)
    return { templateId: r.templateId, version: r.version ?? undefined, concept: r.concept ?? undefined, content: r.content, createdTimestamp: r.createdAt.toISOString() }
  }

  async getExampleComposition(templateId: string): Promise<Record<string, unknown>> {
    const rows = await this.db.select({ templateId: templateDefinition.templateId }).from(templateDefinition)
      .where(eq(templateDefinition.templateId, templateId)).limit(1)
    if (!rows[0]) throw new TemplateNotFoundError(templateId)
    return {
      _type: 'COMPOSITION',
      archetype_node_id: 'openEHR-EHR-COMPOSITION.encounter.v1',
      name: { value: 'Example Composition' },
      archetype_details: { archetype_id: { value: 'openEHR-EHR-COMPOSITION.encounter.v1' }, template_id: { value: templateId }, rm_version: '1.1.0' },
      language: { terminology_id: { value: 'ISO_639-1' }, code_string: 'en' },
      territory: { terminology_id: { value: 'ISO_3166-1' }, code_string: 'US' },
      category: { value: 'event', defining_code: { terminology_id: { value: 'openehr' }, code_string: '433' } },
      composer: { name: 'Example Composer' },
      content: [],
    }
  }
}

const extractTemplateId = (content: string): string | undefined =>
  Regex.templateId.exec(content)?.[1]
const extractVersion = (content: string): string | undefined =>
  Regex.version.exec(content)?.[1]
const extractConcept = (content: string): string | undefined =>
  Regex.concept.exec(content)?.[1]

const Regex = {
  templateId: /template_id\s*=\s*<"([^"]+)"/,
  version:    /version\s*=\s*<"([^"]+)"/,
  concept:    /concept\s*=\s*<"([^"]+)"/,
}
