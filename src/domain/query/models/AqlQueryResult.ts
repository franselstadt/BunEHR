import type { QueryColumn } from './QueryColumn.ts'
import type { QueryMeta } from './QueryMeta.ts'

/** Standard openEHR AQL query response payload. */
export interface AqlQueryResult {
  readonly meta?: QueryMeta
  readonly q: string
  readonly columns: ReadonlyArray<QueryColumn>
  readonly rows: ReadonlyArray<ReadonlyArray<unknown>>
}
