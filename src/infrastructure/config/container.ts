import { db } from '../database/client.ts'
import { DrizzleEhrRepository }           from '../database/repositories/EhrRepository.ts'
import { DrizzleCompositionRepository }   from '../database/repositories/CompositionRepository.ts'
import { DrizzleContributionRepository }  from '../database/repositories/ContributionRepository.ts'
import { DrizzleDirectoryRepository }     from '../database/repositories/DirectoryRepository.ts'
import { DrizzleQueryRepository, DrizzleDefinitionRepository } from '../database/repositories/QueryRepository.ts'
import { EhrApplicationService }          from '../../application/ehr/EhrApplicationService.ts'
import { CompositionApplicationService }  from '../../application/composition/CompositionApplicationService.ts'
import { ContributionApplicationService } from '../../application/contribution/ContributionApplicationService.ts'
import { DirectoryApplicationService }    from '../../application/directory/DirectoryApplicationService.ts'
import { QueryApplicationService }        from '../../application/query/QueryApplicationService.ts'
import { DefinitionApplicationService }   from '../../application/definition/DefinitionApplicationService.ts'

const ehrRepo          = new DrizzleEhrRepository(db)
const compositionRepo  = new DrizzleCompositionRepository(db)
const contributionRepo = new DrizzleContributionRepository(db)
const directoryRepo    = new DrizzleDirectoryRepository(db)
const queryRepo        = new DrizzleQueryRepository(db)
const definitionRepo   = new DrizzleDefinitionRepository(db)

export const ehrService          = new EhrApplicationService(ehrRepo)
export const compositionService  = new CompositionApplicationService(compositionRepo)
export const contributionService = new ContributionApplicationService(contributionRepo)
export const directoryService    = new DirectoryApplicationService(directoryRepo)
export const queryService        = new QueryApplicationService(queryRepo)
export const definitionService   = new DefinitionApplicationService(definitionRepo)
