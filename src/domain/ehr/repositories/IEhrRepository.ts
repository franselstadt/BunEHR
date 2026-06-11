import type { PartySelf } from '../../shared/OpenEhrTypes.ts'
import type { EhrAggregate } from '../models/EhrAggregate.ts'
import type { EhrStatusVo } from '../models/EhrStatusVo.ts'
import type { EhrStatusVersionedResponse } from '../models/EhrStatusVersionedResponse.ts'

/** Repository contract for EHR persistence operations. */
export interface IEhrRepository {
  create(ehrId: string, subjectId: string, subjectNamespace: string, isQueryable: boolean, isModifiable: boolean): Promise<EhrAggregate>
  findById(ehrId: string): Promise<EhrAggregate>
  findBySubject(subjectId: string, namespace: string): Promise<EhrAggregate>
  getStatus(ehrId: string): Promise<EhrStatusVo & { _versionId: string }>
  getStatusAtVersion(ehrId: string, versionUid: string): Promise<EhrStatusVo>
  updateStatus(ehrId: string, ifMatchVersionId: string, subject: PartySelf | undefined, isQueryable: boolean, isModifiable: boolean): Promise<EhrStatusVo>
  getVersionedStatus(ehrId: string): Promise<EhrStatusVersionedResponse>
}
