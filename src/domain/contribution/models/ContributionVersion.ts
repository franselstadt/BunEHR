import type { ObjectVersionId } from '../../shared/OpenEhrTypes.ts'

/** Single version reference tracked under a contribution. */
export interface ContributionVersion {
  readonly id: ObjectVersionId
  readonly type: string
}
