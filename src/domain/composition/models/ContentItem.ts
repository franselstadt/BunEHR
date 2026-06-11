import type { DvText } from '../../shared/OpenEhrTypes.ts'
import type { ArchetypeDetails } from './ArchetypeDetails.ts'

/** Content node included in a composition payload. */
export interface ContentItem {
  readonly archetypeNodeId: string
  readonly name: DvText
  readonly archetypeDetails?: ArchetypeDetails
  readonly data?: Record<string, unknown>
}
