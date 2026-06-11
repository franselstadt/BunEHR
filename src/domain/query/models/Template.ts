import type { TemplateInfo } from './TemplateInfo.ts'

/** Full template payload including serialized content. */
export interface Template extends TemplateInfo {
  readonly content: string
}
