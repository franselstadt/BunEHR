import type { ObjectVersionId, HierObjectId, CodePhrase, DvText, DvCodedText, DvDateTime, PartyIdentified, RevisionHistory } from '../shared/OpenEhrTypes.ts'

export interface ArchetypeDetails {
  readonly archetypeId: { readonly value: string }
  readonly templateId:  { readonly value: string }
  readonly rmVersion:   string
}
export interface EventContext {
  readonly startTime: DvDateTime
  readonly endTime?: DvDateTime
  readonly location?: string
  readonly setting: DvCodedText
  readonly healthCareFacility?: PartyIdentified
}
export interface ContentItem {
  readonly archetypeNodeId: string
  readonly name: DvText
  readonly archetypeDetails?: ArchetypeDetails
  readonly data?: Record<string, unknown>
}

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

export interface CompositionVersionedResponse {
  readonly uid: HierObjectId
  readonly ownerId: ObjectVersionId
  readonly timeCreated: DvDateTime
  readonly revisionHistory: RevisionHistory
}

export interface CompositionRepository {
  create(ehrId: string, data: Omit<CompositionAggregate, 'uid'>): Promise<CompositionAggregate>
  findByVersionUid(ehrId: string, versionedObjectUid: string, versionAtTime?: string): Promise<CompositionAggregate>
  update(ehrId: string, versionedObjectUid: string, ifMatch: string, data: Omit<CompositionAggregate, 'uid'>): Promise<CompositionAggregate>
  delete(ehrId: string, precedingVersionUid: string): Promise<void>
  getVersioned(ehrId: string, versionedObjectUid: string): Promise<CompositionVersionedResponse>
}
