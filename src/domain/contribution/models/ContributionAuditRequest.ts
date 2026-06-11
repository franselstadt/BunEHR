import type { DvCodedText, DvText, PartyIdentified } from '../../shared/OpenEhrTypes.ts'

/** Commit audit metadata required when creating a contribution. */
export interface ContributionAuditRequest {
  readonly systemId?: string
  readonly committer: PartyIdentified
  readonly changeType: DvCodedText
  readonly description?: DvText
}
