import type { IDirectoryRepository } from '../../domain/directory/repositories/IDirectoryRepository.ts'
import type { DirectoryAggregate } from '../../domain/directory/models/DirectoryAggregate.ts'

export class DirectoryService {
  constructor(private readonly repo: IDirectoryRepository) {}
  async createDirectory(ehrId: string, data: Omit<DirectoryAggregate, 'uid'>): Promise<DirectoryAggregate>       { return this.repo.create(ehrId, data) }
  async getDirectory(ehrId: string, versionAtTime?: string): Promise<DirectoryAggregate>                          { return this.repo.find(ehrId, versionAtTime) }
  async getDirectoryAtVersion(ehrId: string, versionUid: string, path?: string): Promise<DirectoryAggregate>      { return this.repo.findAtVersion(ehrId, versionUid, path) }
  async updateDirectory(ehrId: string, ifMatch: string, data: Omit<DirectoryAggregate, 'uid'>): Promise<DirectoryAggregate> { return this.repo.update(ehrId, ifMatch, data) }
  async deleteDirectory(ehrId: string, ifMatch: string): Promise<void>                                            { return this.repo.delete(ehrId, ifMatch) }
}
