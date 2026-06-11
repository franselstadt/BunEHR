/** Lightweight metadata record for a stored template. */
export interface TemplateInfo {
  readonly templateId: string
  readonly version?: string
  readonly concept?: string
  readonly createdTimestamp: string
}
