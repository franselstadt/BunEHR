import type { Template } from '../models/Template.ts'
import type { TemplateInfo } from '../models/TemplateInfo.ts'

/** Repository contract for template definition operations. */
export interface IDefinitionRepository {
  uploadTemplate(adlVersion: string, content: string, templateId?: string): Promise<Template>
  listTemplates(adlVersion: string): Promise<ReadonlyArray<TemplateInfo>>
  getTemplate(adlVersion: string, templateId: string): Promise<Template>
  getExampleComposition(templateId: string): Promise<Record<string, unknown>>
}
