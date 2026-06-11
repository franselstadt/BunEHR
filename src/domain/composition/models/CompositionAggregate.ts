import type { ObjectVersionId, CodePhrase, DvText, DvCodedText, PartyIdentified } from '../../shared/OpenEhrTypes.ts'
import type { ArchetypeDetails } from './ArchetypeDetails.ts'
import type { EventContext } from './EventContext.ts'
import type { ContentItem } from './ContentItem.ts'

/** Aggregate root describing a clinical composition instance. */
export interface CompositionAggregate {
  readonly uid: ObjectVersionId
  readonly archetypeNodeId: string
  readonly name: DvText
  readonly archetypeDetails: ArchetypeDetails
  readonly language: CodePhrase
  readonly territory: CodePhrase
  readonly category: DvCodedText
  readonly composer: PartyIdentified
  readonly context?: EventContext
  readonly content?: ReadonlyArray<ContentItem>
}
