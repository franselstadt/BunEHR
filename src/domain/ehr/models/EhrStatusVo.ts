import type { ObjectVersionId, PartySelf } from '../../shared/OpenEhrTypes.ts'

/** Value object representing the current EHR status. */
export interface EhrStatusVo {
  readonly uid: ObjectVersionId
  readonly archetypeNodeId: string
  readonly name: { readonly value: string }
  readonly subject: PartySelf
  readonly isQueryable: boolean
  readonly isModifiable: boolean
}
