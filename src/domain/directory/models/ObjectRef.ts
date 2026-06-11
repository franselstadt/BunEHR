import type { HierObjectId } from '../../shared/OpenEhrTypes.ts'

/** Generic object reference used inside folder and directory structures. */
export interface ObjectRef {
  readonly id: HierObjectId
  readonly namespace: string
  readonly type: string
}
