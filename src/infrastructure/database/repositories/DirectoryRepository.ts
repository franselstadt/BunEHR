import { eq } from 'drizzle-orm'
import type { Db } from '../client.ts'
import { ehr, directory } from '../schema.ts'
import type { IDirectoryRepository, DirectoryAggregate, ObjectRef, FolderVo } from '../../../domain/directory/DirectoryAggregate.ts'
import { newUuid } from '../../../domain/shared/IdGenerator.ts'
import { buildVersionId, incrementVersionId, ObjectVersionId, HierObjectId, DvText } from '../../../domain/shared/OpenEhrTypes.ts'
import { EhrNotFoundError, DirectoryNotFoundError, DirectoryAlreadyExistsError, PreconditionFailedError } from '../../../domain/shared/DomainErrors.ts'

export class DirectoryRepository implements IDirectoryRepository {
  constructor(private readonly db: Db) {}

  async create(ehrId: string, data: Omit<DirectoryAggregate, 'uid'>): Promise<DirectoryAggregate> {
    await this.assertEhrExists(ehrId)
    const existing = await this.db.select({ id: directory.id }).from(directory).where(eq(directory.ehrId, ehrId)).limit(1)
    if (existing[0]) throw new DirectoryAlreadyExistsError(ehrId)

    const uid = newUuid()
    const versionId = buildVersionId(uid)
    const now = new Date()
    await this.db.insert(directory).values({
      id: newUuid(), ehrId, uid, versionId,
      name: data.name.value,
      archetypeId: data.archetypeNodeId ?? null,
      items: data.items ? (data.items as unknown as Record<string, unknown>[]) : null,
      timeCreated: now, timeCommitted: now,
    })
    return this.find(ehrId)
  }

  async find(ehrId: string, _versionAtTime?: string): Promise<DirectoryAggregate> {
    await this.assertEhrExists(ehrId)
    const rows = await this.db.select().from(directory).where(eq(directory.ehrId, ehrId)).limit(1)
    if (!rows[0]) throw new DirectoryNotFoundError(ehrId)
    return mapDirectory(rows[0])
  }

  async findAtVersion(ehrId: string, versionUid: string, _path?: string): Promise<DirectoryAggregate> {
    await this.assertEhrExists(ehrId)
    const rows = await this.db.select().from(directory).where(eq(directory.ehrId, ehrId)).limit(1)
    if (!rows[0] || rows[0].versionId !== versionUid) throw new DirectoryNotFoundError(`${ehrId}/${versionUid}`)
    return mapDirectory(rows[0])
  }

  async update(ehrId: string, ifMatch: string, data: Omit<DirectoryAggregate, 'uid'>): Promise<DirectoryAggregate> {
    await this.assertEhrExists(ehrId)
    const rows = await this.db.select().from(directory).where(eq(directory.ehrId, ehrId)).limit(1)
    if (!rows[0]) throw new DirectoryNotFoundError(ehrId)
    if (rows[0].versionId !== ifMatch) throw new PreconditionFailedError(`Version mismatch: current=${rows[0].versionId}`)

    const newVid = incrementVersionId(rows[0].versionId)
    await this.db.delete(directory).where(eq(directory.ehrId, ehrId))
    await this.db.insert(directory).values({
      id: newUuid(), ehrId, uid: rows[0].uid, versionId: newVid,
      precedingVersionUid: rows[0].versionId,
      name: data.name.value,
      archetypeId: data.archetypeNodeId ?? null,
      items: data.items ? (data.items as unknown as Record<string, unknown>[]) : null,
      timeCreated: rows[0].timeCreated, timeCommitted: new Date(),
    })
    return this.find(ehrId)
  }

  async delete(ehrId: string, ifMatch: string): Promise<void> {
    await this.assertEhrExists(ehrId)
    const rows = await this.db.select().from(directory).where(eq(directory.ehrId, ehrId)).limit(1)
    if (!rows[0]) throw new DirectoryNotFoundError(ehrId)
    if (rows[0].versionId !== ifMatch) throw new PreconditionFailedError(`Version mismatch: current=${rows[0].versionId}`)
    await this.db.delete(directory).where(eq(directory.ehrId, ehrId))
  }

  private async assertEhrExists(ehrId: string): Promise<void> {
    const rows = await this.db.select({ id: ehr.id }).from(ehr).where(eq(ehr.id, ehrId)).limit(1)
    if (!rows[0]) throw new EhrNotFoundError(ehrId)
  }
}

function mapDirectory(row: typeof directory.$inferSelect): DirectoryAggregate {
  const items = row.items as unknown as ObjectRef[] | null
  return {
    uid: ObjectVersionId(row.versionId),
    archetypeNodeId: row.archetypeId ?? undefined,
    name: DvText(row.name),
    items: items ?? undefined,
    folders: undefined,
  }
}
