import type { ObjectVersionId, DvText } from '../../shared/OpenEhrTypes.ts'
import type { ObjectRef } from './ObjectRef.ts'
import type { FolderVo } from './FolderVo.ts'

/** Aggregate root describing the directory tree for an EHR. */
export interface DirectoryAggregate {
  readonly uid: ObjectVersionId
  readonly archetypeNodeId?: string
  readonly name: DvText
  readonly items?: ReadonlyArray<ObjectRef>
  readonly folders?: ReadonlyArray<FolderVo>
}
