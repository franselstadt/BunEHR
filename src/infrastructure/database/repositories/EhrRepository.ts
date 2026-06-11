import { eq, and, desc } from 'drizzle-orm'
import type { Db } from '../client.ts'
import { ehr, ehrStatus } from '../schema.ts'
import type { IEhrRepository, EhrAggregate, EhrStatusVo, EhrStatusVersionedResponse } from '../../../domain/ehr/EhrAggregate.ts'
import type { PartySelf } from '../../../domain/shared/OpenEhrTypes.ts'
import { newUuid } from '../../../domain/shared/IdGenerator.ts'
import {
  buildVersionId, incrementVersionId, ObjectVersionId, HierObjectId,
  DvDateTime, SYSTEM_ID,
} from '../../../domain/shared/OpenEhrTypes.ts'
import {
  EhrNotFoundError, EhrAlreadyExistsError, PreconditionFailedError,
} from '../../../domain/shared/DomainErrors.ts'

export class EhrRepository implements IEhrRepository {
  constructor(private readonly db: Db) {}

  async create(ehrId: string, subjectId: string, subjectNamespace: string, isQueryable: boolean, isModifiable: boolean): Promise<EhrAggregate> {
    const existing = await this.db.select().from(ehr)
      .where(and(eq(ehr.subjectId, subjectId), eq(ehr.subjectNamespace, subjectNamespace)))
      .limit(1)
    if (existing.length > 0) throw new EhrAlreadyExistsError(`Subject ${subjectId} already has an EHR`)

    const existingById = await this.db.select().from(ehr).where(eq(ehr.id, ehrId)).limit(1)
    if (existingById.length > 0) throw new EhrAlreadyExistsError(`EHR ${ehrId} already exists`)

    const now = new Date()
    await this.db.insert(ehr).values({ id: ehrId, subjectId, subjectNamespace, systemId: SYSTEM_ID, isQueryable, isModifiable, timeCreated: now })

    const statusUid = newUuid()
    const statusVid = buildVersionId(statusUid)
    await this.db.insert(ehrStatus).values({
      id: newUuid(), ehrId, uid: statusUid, versionId: statusVid,
      isQueryable, isModifiable, subjectId, subjectNamespace, timeCommitted: now,
    })

    return this.findById(ehrId)
  }

  async findById(ehrId: string): Promise<EhrAggregate> {
    const rows = await this.db.select().from(ehr).where(eq(ehr.id, ehrId)).limit(1)
    if (!rows[0]) throw new EhrNotFoundError(ehrId)
    const status = await this.db.select().from(ehrStatus)
      .where(eq(ehrStatus.ehrId, ehrId)).orderBy(desc(ehrStatus.timeCommitted)).limit(1)
    if (!status[0]) throw new EhrNotFoundError(`EHR status not found for ${ehrId}`)
    return mapEhr(rows[0], status[0])
  }

  async findBySubject(subjectId: string, namespace: string): Promise<EhrAggregate> {
    const rows = await this.db.select().from(ehr)
      .where(and(eq(ehr.subjectId, subjectId), eq(ehr.subjectNamespace, namespace))).limit(1)
    if (!rows[0]) throw new EhrNotFoundError(`No EHR for subject ${subjectId}`)
    return this.findById(rows[0].id)
  }

  async getStatus(ehrId: string): Promise<EhrStatusVo & { _versionId: string }> {
    await this.assertEhrExists(ehrId)
    const rows = await this.db.select().from(ehrStatus)
      .where(eq(ehrStatus.ehrId, ehrId)).orderBy(desc(ehrStatus.timeCommitted)).limit(1)
    if (!rows[0]) throw new EhrNotFoundError(`EHR status not found for ${ehrId}`)
    return { ...mapEhrStatus(rows[0]), _versionId: rows[0].versionId }
  }

  async getStatusAtVersion(ehrId: string, versionUid: string): Promise<EhrStatusVo> {
    await this.assertEhrExists(ehrId)
    const rows = await this.db.select().from(ehrStatus)
      .where(and(eq(ehrStatus.ehrId, ehrId), eq(ehrStatus.versionId, versionUid))).limit(1)
    if (!rows[0]) throw new EhrNotFoundError(`Version ${versionUid} not found`)
    return mapEhrStatus(rows[0])
  }

  async updateStatus(ehrId: string, ifMatch: string, subject: PartySelf | undefined, isQueryable: boolean, isModifiable: boolean): Promise<EhrStatusVo> {
    await this.assertEhrExists(ehrId)
    const current = await this.db.select().from(ehrStatus)
      .where(eq(ehrStatus.ehrId, ehrId)).orderBy(desc(ehrStatus.timeCommitted)).limit(1)
    if (!current[0]) throw new EhrNotFoundError(`EHR status not found for ${ehrId}`)
    if (current[0].versionId !== ifMatch) throw new PreconditionFailedError(`Version mismatch: current=${current[0].versionId}`)

    const newVid = incrementVersionId(current[0].versionId)
    const subjectId  = subject?.externalRef?.id.value ?? current[0].subjectId
    const subjectNs  = subject?.externalRef?.namespace ?? current[0].subjectNamespace
    await this.db.insert(ehrStatus).values({
      id: newUuid(), ehrId, uid: current[0].uid, versionId: newVid,
      precedingVersionUid: current[0].versionId, isQueryable, isModifiable,
      subjectId, subjectNamespace: subjectNs, timeCommitted: new Date(),
    })
    return this.getStatus(ehrId)
  }

  async getVersionedStatus(ehrId: string): Promise<EhrStatusVersionedResponse> {
    await this.assertEhrExists(ehrId)
    const versions = await this.db.select().from(ehrStatus)
      .where(eq(ehrStatus.ehrId, ehrId)).orderBy(desc(ehrStatus.timeCommitted))
    if (!versions[0]) throw new EhrNotFoundError(`No versions for ${ehrId}`)
    const latest = versions[0]
    return {
      uid: HierObjectId(latest.uid),
      ownerId: ObjectVersionId(latest.versionId),
      timeCreated: DvDateTime(versions.at(-1)!.timeCommitted.toISOString()),
      revisionHistory: {
        items: versions.map(v => ({
          versionId: ObjectVersionId(v.versionId),
          audits: [{
            systemId: SYSTEM_ID,
            committer: { name: 'BunEHR System' },
            timeCommitted: DvDateTime(v.timeCommitted.toISOString()),
            changeType: {
              value: v.precedingVersionUid ? 'amendment' : 'creation',
              definingCode: { terminologyId: { value: 'openehr' }, codeString: v.precedingVersionUid ? '250' : '249' },
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

function mapEhr(e: typeof ehr.$inferSelect, s: typeof ehrStatus.$inferSelect): EhrAggregate {
  return {
    ehrId: HierObjectId(e.id),
    systemId: HierObjectId(e.systemId),
    ehrStatus: mapEhrStatus(s),
    timeCreated: DvDateTime(e.timeCreated.toISOString()),
  }
}

function mapEhrStatus(s: typeof ehrStatus.$inferSelect): EhrStatusVo {
  return {
    uid: ObjectVersionId(s.versionId),
    archetypeNodeId: 'openEHR-EHR-EHR_STATUS.generic.v1',
    name: { value: 'EHR Status' },
    subject: {
      externalRef: { id: HierObjectId(s.subjectId), namespace: s.subjectNamespace, type: 'PERSON' },
    },
    isQueryable: s.isQueryable,
    isModifiable: s.isModifiable,
  }
}
