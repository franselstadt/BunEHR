import type { IEhrRepository, EhrAggregate, EhrStatusVo, EhrStatusVersionedResponse } from '../../domain/ehr/EhrAggregate.ts'
import type { PartySelf } from '../../domain/shared/OpenEhrTypes.ts'
import type { IEhrService } from '../contracts/IEhrService.ts'
import { newUuid } from '../../domain/shared/IdGenerator.ts'

export class EhrService implements IEhrService {
  constructor(private readonly repo: IEhrRepository) {}

  async createEhr(requestedEhrId?: string, subject?: PartySelf, isQueryable = true, isModifiable = true): Promise<EhrAggregate> {
    const ehrId          = requestedEhrId ?? newUuid()
    const subjectId      = subject?.externalRef?.id.value ?? newUuid()
    const subjectNs      = subject?.externalRef?.namespace ?? 'local'
    return this.repo.create(ehrId, subjectId, subjectNs, isQueryable, isModifiable)
  }

  async getEhr(ehrId: string): Promise<EhrAggregate>                                                       { return this.repo.findById(ehrId) }
  async getEhrBySubject(subjectId: string, namespace: string): Promise<EhrAggregate>                       { return this.repo.findBySubject(subjectId, namespace) }
  async getEhrStatus(ehrId: string): Promise<EhrStatusVo & { _versionId: string }>                        { return this.repo.getStatus(ehrId) }
  async getEhrStatusAtVersion(ehrId: string, versionUid: string): Promise<EhrStatusVo>                    { return this.repo.getStatusAtVersion(ehrId, versionUid) }
  async updateEhrStatus(ehrId: string, ifMatch: string, subject?: PartySelf, isQueryable = true, isModifiable = true): Promise<EhrStatusVo> {
    return this.repo.updateStatus(ehrId, ifMatch, subject, isQueryable, isModifiable)
  }
  async getVersionedEhrStatus(ehrId: string): Promise<EhrStatusVersionedResponse>                         { return this.repo.getVersionedStatus(ehrId) }
}
