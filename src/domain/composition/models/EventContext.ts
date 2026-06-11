import type { DvCodedText, DvDateTime, PartyIdentified } from '../../shared/OpenEhrTypes.ts'

/** Clinical context metadata for a composition event. */
export interface EventContext {
  readonly startTime: DvDateTime
  readonly endTime?: DvDateTime
  readonly location?: string
  readonly setting: DvCodedText
  readonly healthCareFacility?: PartyIdentified
}
