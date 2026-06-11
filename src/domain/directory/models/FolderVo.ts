import type { ObjectVersionId, DvText } from '../../shared/OpenEhrTypes.ts'
import type { ObjectRef } from './ObjectRef.ts'

/** Folder value object used for nested directory trees. */
export interface FolderVo {
  readonly uid?: ObjectVersionId
  readonly archetypeNodeId?: string
  readonly name: DvText
  readonly items?: ReadonlyArray<ObjectRef>
  readonly folders?: ReadonlyArray<FolderVo>
}
