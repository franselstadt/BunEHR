import type { HierObjectId, ObjectVersionId, AuditDetails, DvCodedText, DvText, PartyIdentified } from '../shared/OpenEhrTypes.ts'

export interface ContributionVersion { readonly id: ObjectVersionId; readonly type: string }
export interface ContributionAggregate {
  readonly uid: HierObjectId
  readonly versions: ReadonlyArray<ContributionVersion>
  readonly audit: AuditDetails
}
export interface ContributionAuditRequest {
  readonly systemId?: string
  readonly committer: PartyIdentified
  readonly changeType: DvCodedText
  readonly description?: DvText
}
export interface ContributionVersionRequest {
  readonly contribution: { readonly id: HierObjectId }
  readonly data: Record<string, unknown>
  readonly commitAudit: ContributionAuditRequest
  readonly uid?: ObjectVersionId
  readonly precedingVersionUid?: ObjectVersionId
}
export interface IContributionRepository {
  create(ehrId: string, versions: ReadonlyArray<ContributionVersionRequest>, audit: ContributionAuditRequest): Promise<ContributionAggregate>
  findByUid(ehrId: string, uid: string): Promise<ContributionAggregate>
}
