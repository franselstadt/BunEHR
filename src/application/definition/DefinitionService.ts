import type { IDefinitionRepository } from '../../domain/query/repositories/IDefinitionRepository.ts'
import type { Template } from '../../domain/query/models/Template.ts'
import type { TemplateInfo } from '../../domain/query/models/TemplateInfo.ts'

export class DefinitionService {
  constructor(private readonly repo: IDefinitionRepository) {}
  async uploadTemplate(adlVersion: string, content: string): Promise<Template>                                    { return this.repo.uploadTemplate(adlVersion, content) }
  async listTemplates(adlVersion: string): Promise<ReadonlyArray<TemplateInfo>>                                    { return this.repo.listTemplates(adlVersion) }
  async getTemplate(adlVersion: string, templateId: string): Promise<Template>                                    { return this.repo.getTemplate(adlVersion, templateId) }
  async getExampleComposition(templateId: string): Promise<Record<string, unknown>>                                { return this.repo.getExampleComposition(templateId) }
}
