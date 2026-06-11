import type { HierObjectId, ObjectVersionId } from '../../shared/OpenEhrTypes.ts'
import type { ContributionAuditRequest } from './ContributionAuditRequest.ts'

/** Request payload for adding a version to a contribution. */
export interface ContributionVersionRequest {
  readonly contribution: { readonly id: HierObjectId }
  readonly data: Record<string, unknown>
  readonly commitAudit: ContributionAuditRequest
  readonly uid?: ObjectVersionId
  readonly precedingVersionUid?: ObjectVersionId
}
