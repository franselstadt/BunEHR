import type { DirectoryAggregate } from '../models/DirectoryAggregate.ts'

/** Repository contract for directory persistence operations. */
export interface IDirectoryRepository {
  create(ehrId: string, data: Omit<DirectoryAggregate, 'uid'>): Promise<DirectoryAggregate>
  find(ehrId: string, versionAtTime?: string): Promise<DirectoryAggregate>
  findAtVersion(ehrId: string, versionUid: string, path?: string): Promise<DirectoryAggregate>
  update(ehrId: string, ifMatch: string, data: Omit<DirectoryAggregate, 'uid'>): Promise<DirectoryAggregate>
  delete(ehrId: string, ifMatch: string): Promise<void>
}
