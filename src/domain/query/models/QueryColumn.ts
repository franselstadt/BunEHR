/** Single projected column returned by an AQL query. */
export interface QueryColumn {
  readonly name: string
  readonly path?: string
}
