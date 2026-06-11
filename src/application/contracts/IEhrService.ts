import type { EhrAggregate, EhrStatusVo, EhrStatusVersionedResponse } from '../../domain/ehr/EhrAggregate.ts'
import type { PartySelf } from '../../domain/shared/OpenEhrTypes.ts'

/** Application service contract for EHR use cases. */
export interface IEhrService {
  createEhr(requestedEhrId?: string, subject?: PartySelf, isQueryable?: boolean, isModifiable?: boolean): Promise<EhrAggregate>
  getEhr(ehrId: string): Promise<EhrAggregate>
  getEhrBySubject(subjectId: string, namespace: string): Promise<EhrAggregate>
  getEhrStatus(ehrId: string): Promise<EhrStatusVo & { _versionId: string }>
  getEhrStatusAtVersion(ehrId: string, versionUid: string): Promise<EhrStatusVo>
  updateEhrStatus(ehrId: string, ifMatch: string, subject?: PartySelf, isQueryable?: boolean, isModifiable?: boolean): Promise<EhrStatusVo>
  getVersionedEhrStatus(ehrId: string): Promise<EhrStatusVersionedResponse>
}
