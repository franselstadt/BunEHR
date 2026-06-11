import { eq, and } from 'drizzle-orm'
import type { Db } from '../client.ts'
import { ehr, contribution, contributionVersion } from '../schema.ts'
import type { IContributionRepository, ContributionAggregate, ContributionVersionRequest, ContributionAuditRequest } from '../../../domain/contribution/ContributionAggregate.ts'
import { newUuid } from '../../../domain/shared/IdGenerator.ts'
import { HierObjectId, ObjectVersionId, DvDateTime, SYSTEM_ID } from '../../../domain/shared/OpenEhrTypes.ts'
import { EhrNotFoundError, ContributionNotFoundError } from '../../../domain/shared/DomainErrors.ts'

export class ContributionRepository implements IContributionRepository {
  constructor(private readonly db: Db) {}

  async create(ehrId: string, versions: ReadonlyArray<ContributionVersionRequest>, audit: ContributionAuditRequest): Promise<ContributionAggregate> {
    const ehrRows = await this.db.select({ id: ehr.id }).from(ehr).where(eq(ehr.id, ehrId)).limit(1)
    if (!ehrRows[0]) throw new EhrNotFoundError(ehrId)

    const uid = newUuid()
    const entity = await this.db.insert(contribution).values({
      id: newUuid(), ehrId, uid,
      auditType: audit.changeType.value.toUpperCase(),
      auditorId: audit.committer.externalRef?.id.value ?? null,
      auditorName: audit.committer.name,
      systemId: audit.systemId ?? SYSTEM_ID,
      description: audit.description?.value ?? null,
      timeCommitted: new Date(),
    }).returning()

    if (!entity[0]) throw new Error('Failed to insert contribution')

    const versionRows = await Promise.all(versions.map(async (v) => {
      const vVersionId = v.uid?.value ?? `${newUuid()}::${SYSTEM_ID}::1`
      const vType = detectVersionType(v.data)
      const row = await this.db.insert(contributionVersion).values({
        id: newUuid(), contributionId: entity[0]!.id, versionId: vVersionId, type: vType,
      }).returning()
      return row[0]!
    }))

    return {
      uid: HierObjectId(uid),
      versions: versionRows.map(v => ({ id: ObjectVersionId(v.versionId), type: v.type })),
      audit: {
        systemId: entity[0].systemId,
        committer: audit.committer,
        timeCommitted: DvDateTime(entity[0].timeCommitted.toISOString()),
        changeType: audit.changeType,
        description: audit.description,
      },
    }
  }

  async findByUid(ehrId: string, uid: string): Promise<ContributionAggregate> {
    const ehrRows = await this.db.select({ id: ehr.id }).from(ehr).where(eq(ehr.id, ehrId)).limit(1)
    if (!ehrRows[0]) throw new EhrNotFoundError(ehrId)
    const rows = await this.db.select().from(contribution).where(and(eq(contribution.ehrId, ehrId), eq(contribution.uid, uid))).limit(1)
    if (!rows[0]) throw new ContributionNotFoundError(uid)
    const versions = await this.db.select().from(contributionVersion).where(eq(contributionVersion.contributionId, rows[0].id))
    return {
      uid: HierObjectId(rows[0].uid),
      versions: versions.map(v => ({ id: ObjectVersionId(v.versionId), type: v.type })),
      audit: {
        systemId: rows[0].systemId,
        committer: { name: rows[0].auditorName ?? 'Unknown', externalRef: rows[0].auditorId ? { id: HierObjectId(rows[0].auditorId), namespace: 'local', type: 'PERSON' } : undefined },
        timeCommitted: DvDateTime(rows[0].timeCommitted.toISOString()),
        changeType: { value: rows[0].auditType.toLowerCase(), definingCode: { terminologyId: { value: 'openehr' }, codeString: '249' } },
        description: rows[0].description ? { value: rows[0].description } : undefined,
      },
    }
  }
}

const detectVersionType = (data: Record<string, unknown>): string => {
  const s = JSON.stringify(data).toUpperCase()
  if (s.includes('COMPOSITION')) return 'COMPOSITION'
  if (s.includes('EHR_STATUS'))  return 'EHR_STATUS'
  if (s.includes('FOLDER'))      return 'FOLDER'
  return 'COMPOSITION'
}
