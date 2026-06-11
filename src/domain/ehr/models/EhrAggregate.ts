import type { HierObjectId, DvDateTime } from '../../shared/OpenEhrTypes.ts'
import type { EhrStatusVo } from './EhrStatusVo.ts'

/** Aggregate root for an EHR instance. */
export interface EhrAggregate {
  readonly ehrId: HierObjectId
  readonly systemId: HierObjectId
  readonly ehrStatus: EhrStatusVo
  readonly timeCreated: DvDateTime
}
