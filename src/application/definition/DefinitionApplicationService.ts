import type { DefinitionRepository, Template, TemplateInfo } from '../../domain/query/QueryModels.ts'

export class DefinitionApplicationService {
  constructor(private readonly repo: DefinitionRepository) {}
  async uploadTemplate(adlVersion: string, content: string): Promise<Template>                                    { return this.repo.uploadTemplate(adlVersion, content) }
  async listTemplates(adlVersion: string): Promise<ReadonlyArray<TemplateInfo>>                                    { return this.repo.listTemplates(adlVersion) }
  async getTemplate(adlVersion: string, templateId: string): Promise<Template>                                    { return this.repo.getTemplate(adlVersion, templateId) }
  async getExampleComposition(templateId: string): Promise<Record<string, unknown>>                                { return this.repo.getExampleComposition(templateId) }
}
