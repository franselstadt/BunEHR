export interface QueryColumn { readonly name: string; readonly path?: string }
export interface QueryMeta   { readonly generator: string; readonly executedAql?: string; readonly created?: string }
export interface AqlQueryResult {
  readonly meta?: QueryMeta
  readonly q: string
  readonly columns: ReadonlyArray<QueryColumn>
  readonly rows: ReadonlyArray<ReadonlyArray<unknown>>
}
export interface StoredQuery {
  readonly name: string
  readonly qualifiedQueryName: string
  readonly version: string
  readonly type: string
  readonly q: string
  readonly saved?: string
}
export interface TemplateInfo { readonly templateId: string; readonly version?: string; readonly concept?: string; readonly createdTimestamp: string }
export interface Template extends TemplateInfo { readonly content: string }

export interface QueryRepository {
  executeAql(q: string, offset?: number, fetch?: number, params?: Record<string, unknown>): Promise<AqlQueryResult>
  saveStoredQuery(qualifiedName: string, version: string, q: string, type: string): Promise<StoredQuery>
  listStoredQueries(prefix?: string): Promise<ReadonlyArray<StoredQuery>>
  getStoredQuery(qualifiedName: string): Promise<StoredQuery>
}
export interface DefinitionRepository {
  uploadTemplate(adlVersion: string, content: string, templateId?: string): Promise<Template>
  listTemplates(adlVersion: string): Promise<ReadonlyArray<TemplateInfo>>
  getTemplate(adlVersion: string, templateId: string): Promise<Template>
  getExampleComposition(templateId: string): Promise<Record<string, unknown>>
}
