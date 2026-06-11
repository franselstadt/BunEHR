import type { HierObjectId, ObjectVersionId, PartySelf, DvDateTime, RevisionHistory } from '../shared/OpenEhrTypes.ts'

export interface EhrStatusVo {
  readonly uid: ObjectVersionId
  readonly archetypeNodeId: string
  readonly name: { readonly value: string }
  readonly subject: PartySelf
  readonly isQueryable: boolean
  readonly isModifiable: boolean
}

export interface EhrAggregate {
  readonly ehrId: HierObjectId
  readonly systemId: HierObjectId
  readonly ehrStatus: EhrStatusVo
  readonly timeCreated: DvDateTime
}

export interface EhrStatusVersionedResponse {
  readonly uid: HierObjectId
  readonly ownerId: ObjectVersionId
  readonly timeCreated: DvDateTime
  readonly revisionHistory: RevisionHistory
}

// ── Repository port ───────────────────────────────────────────────────────────
export interface IEhrRepository {
  create(ehrId: string, subjectId: string, subjectNamespace: string, isQueryable: boolean, isModifiable: boolean): Promise<EhrAggregate>
  findById(ehrId: string): Promise<EhrAggregate>
  findBySubject(subjectId: string, namespace: string): Promise<EhrAggregate>
  getStatus(ehrId: string): Promise<EhrStatusVo & { _versionId: string }>
  getStatusAtVersion(ehrId: string, versionUid: string): Promise<EhrStatusVo>
  updateStatus(ehrId: string, ifMatchVersionId: string, subject: PartySelf | undefined, isQueryable: boolean, isModifiable: boolean): Promise<EhrStatusVo>
  getVersionedStatus(ehrId: string): Promise<EhrStatusVersionedResponse>
}
