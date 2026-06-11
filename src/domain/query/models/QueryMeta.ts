/** Execution metadata returned with AQL query results. */
export interface QueryMeta {
  readonly generator: string
  readonly executedAql?: string
  readonly created?: string
}
