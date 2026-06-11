import type { HierObjectId, AuditDetails } from '../../shared/OpenEhrTypes.ts'
import type { ContributionVersion } from './ContributionVersion.ts'

/** Aggregate root that groups related committed versions. */
export interface ContributionAggregate {
  readonly uid: HierObjectId
  readonly versions: ReadonlyArray<ContributionVersion>
  readonly audit: AuditDetails
}
