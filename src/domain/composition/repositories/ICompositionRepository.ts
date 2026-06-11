import type { CompositionAggregate } from '../models/CompositionAggregate.ts'
import type { CompositionVersionedResponse } from '../models/CompositionVersionedResponse.ts'

/** Repository contract for composition persistence operations. */
export interface ICompositionRepository {
  create(ehrId: string, data: Omit<CompositionAggregate, 'uid'>): Promise<CompositionAggregate>
  findByVersionUid(ehrId: string, versionedObjectUid: string, versionAtTime?: string): Promise<CompositionAggregate>
  update(ehrId: string, versionedObjectUid: string, ifMatch: string, data: Omit<CompositionAggregate, 'uid'>): Promise<CompositionAggregate>
  delete(ehrId: string, precedingVersionUid: string): Promise<void>
  getVersioned(ehrId: string, versionedObjectUid: string): Promise<CompositionVersionedResponse>
}
