import type { IQueryRepository } from '../../domain/query/repositories/IQueryRepository.ts'
import type { AqlQueryResult } from '../../domain/query/models/AqlQueryResult.ts'
import type { StoredQuery } from '../../domain/query/models/StoredQuery.ts'

export class QueryService {
  constructor(private readonly repo: IQueryRepository) {}
  async executeAql(q: string, offset?: number, fetch?: number, params?: Record<string, unknown>): Promise<AqlQueryResult> { return this.repo.executeAql(q, offset, fetch, params) }
  async saveStoredQuery(name: string, version: string, q: string, type = 'aql'): Promise<StoredQuery> { return this.repo.saveStoredQuery(name, version, q, type) }
  async listStoredQueries(prefix?: string): Promise<ReadonlyArray<StoredQuery>> { return this.repo.listStoredQueries(prefix) }
  async getStoredQuery(name: string): Promise<StoredQuery> { return this.repo.getStoredQuery(name) }
}
