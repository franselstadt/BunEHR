import { eq, and, desc, lte } from 'drizzle-orm'
import type { Db } from '../client.ts'
import { ehr, composition } from '../schema.ts'
import type { CompositionRepository, CompositionAggregate, CompositionVersionedResponse } from '../../../domain/composition/CompositionAggregate.ts'
import { newUuid } from '../../../domain/shared/IdGenerator.ts'
import {
  buildVersionId, incrementVersionId,
  ObjectVersionId, HierObjectId, DvDateTime, SYSTEM_ID,
} from '../../../domain/shared/OpenEhrTypes.ts'
import { EhrNotFoundError, CompositionNotFoundError, PreconditionFailedError } from '../../../domain/shared/DomainErrors.ts'

export class DrizzleCompositionRepository implements CompositionRepository {
  constructor(private readonly db: Db) {}

  async create(ehrId: string, data: Omit<CompositionAggregate, 'uid'>): Promise<CompositionAggregate> {
    await this.assertEhrExists(ehrId)
    const objectId  = newUuid()
    const versionId = buildVersionId(objectId)
    await this.db.insert(composition).values({
      id: newUuid(), ehrId, uid: objectId, versionId,
      templateId:   data.archetypeDetails.templateId.value,
      archetypeId:  data.archetypeDetails.archetypeId.value,
      languageCode: data.language.codeString,
      territoryCode: data.territory.codeString,
      category:     data.category.value,
      lifecycleState: 'COMPLETE',
      composerName: data.composer.name,
      composerId:   data.composer.externalRef?.id.value ?? null,
      content:      data as unknown as Record<string, unknown>,
      timeCommitted: new Date(),
    })
    return this.findByVersionUid(ehrId, versionId)
  }

  async findByVersionUid(ehrId: string, versionedObjectUid: string, versionAtTime?: string): Promise<CompositionAggregate> {
    await this.assertEhrExists(ehrId)
    const isFullVersionId = versionedObjectUid.includes('::')

    let row: typeof composition.$inferSelect | undefined

    if (isFullVersionId) {
      const rows = await this.db.select().from(composition)
        .where(and(eq(composition.ehrId, ehrId), eq(composition.versionId, versionedObjectUid))).limit(1)
      row = rows[0]
    } else if (versionAtTime) {
      const targetTime = new Date(versionAtTime)
      const rows = await this.db.select().from(composition)
        .where(and(eq(composition.ehrId, ehrId), eq(composition.uid, versionedObjectUid), lte(composition.timeCommitted, targetTime)))
        .orderBy(desc(composition.timeCommitted)).limit(1)
      row = rows[0]
    } else {
      const rows = await this.db.select().from(composition)
        .where(and(eq(composition.ehrId, ehrId), eq(composition.uid, versionedObjectUid)))
        .orderBy(desc(composition.timeCommitted)).limit(1)
      row = rows[0]
    }

    if (!row || row.lifecycleState === 'DELETED') throw new CompositionNotFoundError(versionedObjectUid)
    return mapComposition(row)
  }

  async update(ehrId: string, versionedObjectUid: string, ifMatch: string, data: Omit<CompositionAggregate, 'uid'>): Promise<CompositionAggregate> {
    await this.assertEhrExists(ehrId)
    const objectId = versionedObjectUid.includes('::') ? versionedObjectUid.split('::')[0]! : versionedObjectUid
    const current = await this.db.select().from(composition)
      .where(and(eq(composition.ehrId, ehrId), eq(composition.uid, objectId)))
      .orderBy(desc(composition.timeCommitted)).limit(1)
    if (!current[0]) throw new CompositionNotFoundError(objectId)
    if (current[0].versionId !== ifMatch) throw new PreconditionFailedError(`Version mismatch: current=${current[0].versionId}`)

    const newVid = incrementVersionId(current[0].versionId)
    await this.db.insert(composition).values({
      id: newUuid(), ehrId, uid: objectId, versionId: newVid,
      precedingVersionUid: current[0].versionId,
      templateId:   data.archetypeDetails.templateId.value,
      archetypeId:  data.archetypeDetails.archetypeId.value,
      languageCode: data.language.codeString,
      territoryCode: data.territory.codeString,
      category:     data.category.value,
      lifecycleState: 'COMPLETE',
      composerName: data.composer.name,
      composerId:   data.composer.externalRef?.id.value ?? null,
      content:      data as unknown as Record<string, unknown>,
      timeCommitted: new Date(),
    })
    return this.findByVersionUid(ehrId, newVid)
  }

  async delete(ehrId: string, precedingVersionUid: string): Promise<void> {
    await this.assertEhrExists(ehrId)
    const objectId = precedingVersionUid.split('::')[0]!
    const current = await this.db.select().from(composition)
      .where(and(eq(composition.ehrId, ehrId), eq(composition.uid, objectId)))
      .orderBy(desc(composition.timeCommitted)).limit(1)
    if (!current[0]) throw new CompositionNotFoundError(objectId)

    const deletedVid = incrementVersionId(current[0].versionId)
    await this.db.insert(composition).values({
      id: newUuid(), ehrId, uid: objectId, versionId: deletedVid,
      precedingVersionUid: current[0].versionId,
      templateId: current[0].templateId, archetypeId: current[0].archetypeId ?? null,
      languageCode: current[0].languageCode, territoryCode: current[0].territoryCode,
      category: current[0].category, lifecycleState: 'DELETED',
      composerName: current[0].composerName, composerId: current[0].composerId ?? null,
      content: current[0].content as Record<string, unknown>,
      timeCommitted: new Date(),
    })
  }

  async getVersioned(ehrId: string, versionedObjectUid: string): Promise<CompositionVersionedResponse> {
    await this.assertEhrExists(ehrId)
    const objectId = versionedObjectUid.split('::')[0]!
    const versions = await this.db.select().from(composition)
      .where(and(eq(composition.ehrId, ehrId), eq(composition.uid, objectId)))
      .orderBy(desc(composition.timeCommitted))
    if (!versions[0]) throw new CompositionNotFoundError(objectId)
    const latest = versions[0]
    return {
      uid: HierObjectId(objectId),
      ownerId: ObjectVersionId(latest.versionId),
      timeCreated: DvDateTime(versions.at(-1)!.timeCommitted.toISOString()),
      revisionHistory: {
        items: versions.map(v => ({
          versionId: ObjectVersionId(v.versionId),
          audits: [{
            systemId: SYSTEM_ID,
            committer: { name: v.composerName },
            timeCommitted: DvDateTime(v.timeCommitted.toISOString()),
            changeType: {
              value: v.precedingVersionUid ? 'modification' : 'creation',
              definingCode: { terminologyId: { value: 'openehr' }, codeString: v.precedingVersionUid ? '251' : '249' },
            },
          }],
        })),
      },
    }
  }

  private async assertEhrExists(ehrId: string): Promise<void> {
    const rows = await this.db.select({ id: ehr.id }).from(ehr).where(eq(ehr.id, ehrId)).limit(1)
    if (!rows[0]) throw new EhrNotFoundError(ehrId)
  }
}

function mapComposition(row: typeof composition.$inferSelect): CompositionAggregate {
  const stored = row.content as Record<string, unknown>
  return {
    uid: ObjectVersionId(row.versionId),
    archetypeNodeId: (stored['archetypeNodeId'] as string) ?? row.archetypeId ?? 'openEHR-EHR-COMPOSITION.encounter.v1',
    name: { value: (stored['name'] as { value: string } | undefined)?.value ?? row.templateId },
    archetypeDetails: {
      archetypeId: { value: row.archetypeId ?? '' },
      templateId:  { value: row.templateId },
      rmVersion:   '1.1.0',
    },
    language:  { terminologyId: { value: 'ISO_639-1' }, codeString: row.languageCode },
    territory: { terminologyId: { value: 'ISO_3166-1' }, codeString: row.territoryCode },
    category:  { value: row.category, definingCode: { terminologyId: { value: 'openehr' }, codeString: '433' } },
    composer:  { name: row.composerName, externalRef: row.composerId ? { id: HierObjectId(row.composerId), namespace: 'local', type: 'PERSON' } : undefined },
    context:   (stored['context'] as never) ?? undefined,
    content:   (stored['content'] as never) ?? undefined,
  }
}
