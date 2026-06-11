/** Composition root — wire repositories and application services. */
import { db } from '../database/client.ts'
import { EhrRepository } from '../database/repositories/EhrRepository.ts'
import { CompositionRepository } from '../database/repositories/CompositionRepository.ts'
import { ContributionRepository } from '../database/repositories/ContributionRepository.ts'
import { DirectoryRepository } from '../database/repositories/DirectoryRepository.ts'
import { QueryRepository, DefinitionRepository } from '../database/repositories/QueryRepository.ts'
import { PatientRepository } from '../database/repositories/PatientRepository.ts'
import { EhrService } from '../../application/ehr/EhrService.ts'
import { CompositionService } from '../../application/composition/CompositionService.ts'
import { ContributionService } from '../../application/contribution/ContributionService.ts'
import { DirectoryService } from '../../application/directory/DirectoryService.ts'
import { QueryService } from '../../application/query/QueryService.ts'
import { DefinitionService } from '../../application/definition/DefinitionService.ts'
import { PatientService } from '../../application/patient/PatientService.ts'
import type { AppServices } from '../../application/contracts/AppServices.ts'

function registerServices(): AppServices {
  const ehrRepository         = new EhrRepository(db)
  const compositionRepository = new CompositionRepository(db)
  const contributionRepository = new ContributionRepository(db)
  const directoryRepository   = new DirectoryRepository(db)
  const queryRepository       = new QueryRepository(db)
  const definitionRepository  = new DefinitionRepository(db)
  const patientRepository     = new PatientRepository(db)

  const ehrService = new EhrService(ehrRepository)

  return {
    ehr: ehrService,
    composition:  new CompositionService(compositionRepository),
    contribution: new ContributionService(contributionRepository),
    directory:    new DirectoryService(directoryRepository),
    query:        new QueryService(queryRepository),
    definition:   new DefinitionService(definitionRepository),
    patients:     new PatientService(patientRepository, ehrService),
  }
}

/** Singleton service registry — inject into controllers */
export const services: AppServices = registerServices()

/** Back-compat exports used by legacy imports */
export const ehrService          = services.ehr
export const compositionService  = services.composition
export const contributionService = services.contribution
export const directoryService    = services.directory
export const queryService        = services.query
export const definitionService   = services.definition
export const patientService      = services.patients
