import type { ObjectVersionId, HierObjectId, DvText } from '../shared/OpenEhrTypes.ts'

export interface ObjectRef { readonly id: HierObjectId; readonly namespace: string; readonly type: string }
export interface FolderVo {
  readonly uid?: ObjectVersionId
  readonly archetypeNodeId?: string
  readonly name: DvText
  readonly items?: ReadonlyArray<ObjectRef>
  readonly folders?: ReadonlyArray<FolderVo>
}
export interface DirectoryAggregate {
  readonly uid: ObjectVersionId
  readonly archetypeNodeId?: string
  readonly name: DvText
  readonly items?: ReadonlyArray<ObjectRef>
  readonly folders?: ReadonlyArray<FolderVo>
}
export interface IDirectoryRepository {
  create(ehrId: string, data: Omit<DirectoryAggregate, 'uid'>): Promise<DirectoryAggregate>
  find(ehrId: string, versionAtTime?: string): Promise<DirectoryAggregate>
  findAtVersion(ehrId: string, versionUid: string, path?: string): Promise<DirectoryAggregate>
  update(ehrId: string, ifMatch: string, data: Omit<DirectoryAggregate, 'uid'>): Promise<DirectoryAggregate>
  delete(ehrId: string, ifMatch: string): Promise<void>
}
