import { z } from 'zod'

const HierObjectId   = z.object({ value: z.string() })
const TerminologyId  = z.object({ value: z.string() })
const CodePhrase     = z.object({ terminology_id: TerminologyId, code_string: z.string() })
const DvText         = z.object({ value: z.string() })
const DvCodedText    = z.object({ value: z.string(), defining_code: CodePhrase })
const DvDateTime     = z.object({ value: z.string() })
const PartyRef       = z.object({ id: HierObjectId, namespace: z.string(), type: z.string() })
const PartySelf      = z.object({ external_ref: PartyRef.optional() })
const PartyIdentified = z.object({ name: z.string(), external_ref: PartyRef.optional() })

export const CreateEhrSchema = z.object({
  ehr_id: HierObjectId.optional(),
  ehr_status: z.object({
    subject: PartySelf.optional(),
    is_queryable: z.boolean().optional().default(true),
    is_modifiable: z.boolean().optional().default(true),
  }).optional(),
})

export const UpdateEhrStatusSchema = z.object({
  subject: PartySelf.optional(),
  is_queryable: z.boolean().default(true),
  is_modifiable: z.boolean().default(true),
})

const ArchetypeDetails = z.object({
  archetype_id: z.object({ value: z.string() }),
  template_id:  z.object({ value: z.string() }),
  rm_version:   z.string().optional().default('1.1.0'),
})
const EventContext = z.object({
  start_time: DvDateTime,
  end_time:   DvDateTime.optional(),
  location:   z.string().optional(),
  setting:    DvCodedText,
  health_care_facility: PartyIdentified.optional(),
})
const ContentItem = z.object({
  archetype_node_id: z.string(),
  name: DvText,
  data: z.record(z.unknown()).optional(),
})

export const CompositionSchema = z.object({
  archetype_node_id: z.string(),
  name:              DvText,
  archetype_details: ArchetypeDetails,
  language:          CodePhrase,
  territory:         CodePhrase,
  category:          DvCodedText,
  composer:          PartyIdentified,
  context:           EventContext.optional(),
  content:           z.array(ContentItem).optional(),
})

const ContributionAudit = z.object({
  system_id:   z.string().optional(),
  committer:   PartyIdentified,
  change_type: DvCodedText,
  description: DvText.optional(),
})
export const CreateContributionSchema = z.object({
  versions: z.array(z.object({
    contribution: z.object({ id: HierObjectId }),
    data:         z.record(z.unknown()),
    commit_audit: ContributionAudit,
    uid:          z.object({ value: z.string() }).optional(),
  })),
  audit: ContributionAudit,
})

export const DirectorySchema = z.object({
  archetype_node_id: z.string().optional(),
  name: DvText.optional().default({ value: 'root' }),
  items: z.array(z.object({ id: HierObjectId, namespace: z.string(), type: z.string() })).optional(),
})

export const AqlBodySchema = z.object({
  q:      z.string().min(1),
  offset: z.number().int().nonnegative().optional(),
  fetch:  z.number().int().positive().optional(),
  query_parameters: z.record(z.unknown()).optional(),
})
export const StoredQuerySchema = z.object({ q: z.string().min(1), type: z.string().optional().default('aql') })

export type CreateEhrInput          = z.infer<typeof CreateEhrSchema>
export type UpdateEhrStatusInput    = z.infer<typeof UpdateEhrStatusSchema>
export type CompositionInput        = z.infer<typeof CompositionSchema>
export type CreateContributionInput = z.infer<typeof CreateContributionSchema>
export type DirectoryInput          = z.infer<typeof DirectorySchema>
export type AqlBodyInput            = z.infer<typeof AqlBodySchema>
