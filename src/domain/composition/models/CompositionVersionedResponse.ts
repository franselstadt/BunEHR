import type { HierObjectId, ObjectVersionId, DvDateTime, RevisionHistory } from '../../shared/OpenEhrTypes.ts'

/** Versioned metadata for composition history lookups. */
export interface CompositionVersionedResponse {
  readonly uid: HierObjectId
  readonly ownerId: ObjectVersionId
  readonly timeCreated: DvDateTime
  readonly revisionHistory: RevisionHistory
}
