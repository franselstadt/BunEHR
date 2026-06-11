import type { IContributionRepository } from '../../domain/contribution/repositories/IContributionRepository.ts'
import type { ContributionAggregate } from '../../domain/contribution/models/ContributionAggregate.ts'
import type { ContributionVersionRequest } from '../../domain/contribution/models/ContributionVersionRequest.ts'
import type { ContributionAuditRequest } from '../../domain/contribution/models/ContributionAuditRequest.ts'

export class ContributionService {
  constructor(private readonly repo: IContributionRepository) {}
  async createContribution(ehrId: string, versions: ReadonlyArray<ContributionVersionRequest>, audit: ContributionAuditRequest): Promise<ContributionAggregate> { return this.repo.create(ehrId, versions, audit) }
  async getContribution(ehrId: string, uid: string): Promise<ContributionAggregate> { return this.repo.findByUid(ehrId, uid) }
}
