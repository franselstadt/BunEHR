import type { QueryRepository, AqlQueryResult, StoredQuery } from '../../domain/query/QueryModels.ts'

export class QueryApplicationService {
  constructor(private readonly repo: QueryRepository) {}
  async executeAql(q: string, offset?: number, fetch?: number, params?: Record<string, unknown>): Promise<AqlQueryResult> { return this.repo.executeAql(q, offset, fetch, params) }
  async saveStoredQuery(name: string, version: string, q: string, type = 'aql'): Promise<StoredQuery> { return this.repo.saveStoredQuery(name, version, q, type) }
  async listStoredQueries(prefix?: string): Promise<ReadonlyArray<StoredQuery>> { return this.repo.listStoredQueries(prefix) }
  async getStoredQuery(name: string): Promise<StoredQuery> { return this.repo.getStoredQuery(name) }
}
