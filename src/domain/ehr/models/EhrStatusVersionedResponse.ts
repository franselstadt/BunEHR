import type { HierObjectId, ObjectVersionId, DvDateTime, RevisionHistory } from '../../shared/OpenEhrTypes.ts'

/** Versioned metadata for EHR status history lookups. */
export interface EhrStatusVersionedResponse {
  readonly uid: HierObjectId
  readonly ownerId: ObjectVersionId
  readonly timeCreated: DvDateTime
  readonly revisionHistory: RevisionHistory
}
