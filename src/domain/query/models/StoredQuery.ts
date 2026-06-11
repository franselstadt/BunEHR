/** Persisted AQL query definition with version metadata. */
export interface StoredQuery {
  readonly name: string
  readonly qualifiedQueryName: string
  readonly version: string
  readonly type: string
  readonly q: string
  readonly saved?: string
}
