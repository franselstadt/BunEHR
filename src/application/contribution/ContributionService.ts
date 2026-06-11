import type { IContributionRepository, ContributionAggregate, ContributionVersionRequest, ContributionAuditRequest } from '../../domain/contribution/ContributionAggregate.ts'

export class ContributionService {
  constructor(private readonly repo: IContributionRepository) {}
  async createContribution(ehrId: string, versions: ReadonlyArray<ContributionVersionRequest>, audit: ContributionAuditRequest): Promise<ContributionAggregate> { return this.repo.create(ehrId, versions, audit) }
  async getContribution(ehrId: string, uid: string): Promise<ContributionAggregate> { return this.repo.findByUid(ehrId, uid) }
}
