import type { IEhrService } from './IEhrService.ts'
import type { CompositionService } from '../composition/CompositionService.ts'
import type { ContributionService } from '../contribution/ContributionService.ts'
import type { DirectoryService } from '../directory/DirectoryService.ts'
import type { QueryService } from '../query/QueryService.ts'
import type { DefinitionService } from '../definition/DefinitionService.ts'
import type { IPatientService } from './IPatientService.ts'

/** Root service registry passed to controllers at startup. */
export interface AppServices {
  readonly ehr: IEhrService
  readonly composition: CompositionService
  readonly contribution: ContributionService
  readonly directory: DirectoryService
  readonly query: QueryService
  readonly definition: DefinitionService
  readonly patients: IPatientService
}
