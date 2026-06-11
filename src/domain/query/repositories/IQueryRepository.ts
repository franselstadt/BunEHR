import type { AqlQueryResult } from '../models/AqlQueryResult.ts'
import type { StoredQuery } from '../models/StoredQuery.ts'

/** Repository contract for AQL query execution and storage. */
export interface IQueryRepository {
  executeAql(q: string, offset?: number, fetch?: number, params?: Record<string, unknown>): Promise<AqlQueryResult>
  saveStoredQuery(qualifiedName: string, version: string, q: string, type: string): Promise<StoredQuery>
  listStoredQueries(prefix?: string): Promise<ReadonlyArray<StoredQuery>>
  getStoredQuery(qualifiedName: string): Promise<StoredQuery>
}
