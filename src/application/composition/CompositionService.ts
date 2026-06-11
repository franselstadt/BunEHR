import type { ICompositionRepository, CompositionAggregate, CompositionVersionedResponse } from '../../domain/composition/CompositionAggregate.ts'

export class CompositionService {
  constructor(private readonly repo: ICompositionRepository) {}

  async createComposition(ehrId: string, data: Omit<CompositionAggregate, 'uid'>): Promise<CompositionAggregate>          { return this.repo.create(ehrId, data) }
  async getComposition(ehrId: string, uid: string, versionAtTime?: string): Promise<CompositionAggregate>                  { return this.repo.findByVersionUid(ehrId, uid, versionAtTime) }
  async updateComposition(ehrId: string, uid: string, ifMatch: string, data: Omit<CompositionAggregate, 'uid'>): Promise<CompositionAggregate> { return this.repo.update(ehrId, uid, ifMatch, data) }
  async deleteComposition(ehrId: string, precedingVersionUid: string): Promise<void>                                       { return this.repo.delete(ehrId, precedingVersionUid) }
  async getVersionedComposition(ehrId: string, uid: string): Promise<CompositionVersionedResponse>                         { return this.repo.getVersioned(ehrId, uid) }
}
