import type { ContributionAggregate } from '../models/ContributionAggregate.ts'
import type { ContributionVersionRequest } from '../models/ContributionVersionRequest.ts'
import type { ContributionAuditRequest } from '../models/ContributionAuditRequest.ts'

/** Repository contract for contribution persistence operations. */
export interface IContributionRepository {
  create(ehrId: string, versions: ReadonlyArray<ContributionVersionRequest>, audit: ContributionAuditRequest): Promise<ContributionAggregate>
  findByUid(ehrId: string, uid: string): Promise<ContributionAggregate>
}
