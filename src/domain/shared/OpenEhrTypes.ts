/**
 * OpenEHR Reference Model core types (RM 1.1.0).
 * All identifiers are branded strings to prevent semantic confusion.
 */

// ── Branding ─────────────────────────────────────────────────────────────────
declare const __brand: unique symbol
export type Brand<T, B extends string> = T & { readonly [__brand]: B }

export type EhrId          = Brand<string, 'EhrId'>
export type VersionId      = Brand<string, 'VersionId'>
export type ContributionId = Brand<string, 'ContributionId'>
export type TemplateId     = Brand<string, 'TemplateId'>

export const EhrId          = (v: string): EhrId          => v as EhrId
export const VersionId      = (v: string): VersionId      => v as VersionId
export const ContributionId = (v: string): ContributionId => v as ContributionId
export const TemplateId     = (v: string): TemplateId     => v as TemplateId

// ── RM Identification ─────────────────────────────────────────────────────────
export interface HierObjectId   { readonly value: string }
export interface ObjectVersionId { readonly value: string }
export interface TerminologyId  { readonly value: string }

export const HierObjectId    = (value: string): HierObjectId    => ({ value })
export const ObjectVersionId = (value: string): ObjectVersionId => ({ value })
export const TerminologyId   = (value: string): TerminologyId   => ({ value })

// ── Version ID helpers ────────────────────────────────────────────────────────
export const SYSTEM_ID = process.env['SYSTEM_ID'] ?? 'local.bunehr.com'

export const buildVersionId = (objectId: string, version = 1): string =>
  `${objectId}::${SYSTEM_ID}::${version}`

export const incrementVersionId = (versionId: string): string => {
  const [objectId, systemId, v] = versionId.split('::')
  return `${objectId}::${systemId}::${parseInt(v ?? '1', 10) + 1}`
}

export const extractObjectId = (versionId: string): string =>
  versionId.split('::')[0] ?? versionId

// ── Data values ───────────────────────────────────────────────────────────────
export interface CodePhrase {
  readonly terminologyId: TerminologyId
  readonly codeString: string
}
export const CodePhrase = (terminologyId: TerminologyId, codeString: string): CodePhrase =>
  ({ terminologyId, codeString })

export interface DvText    { readonly value: string }
export interface DvCodedText {
  readonly value: string
  readonly definingCode: CodePhrase
}
export interface DvDateTime { readonly value: string }

export const DvText     = (value: string): DvText     => ({ value })
export const DvDateTime = (value: string): DvDateTime => ({ value })

// ── Demographic ───────────────────────────────────────────────────────────────
export interface PartyRef {
  readonly id: HierObjectId
  readonly namespace: string
  readonly type: string
}
export interface PartySelf       { readonly externalRef?: PartyRef }
export interface PartyIdentified {
  readonly name: string
  readonly externalRef?: PartyRef
}

// ── Audit ─────────────────────────────────────────────────────────────────────
export interface AuditDetails {
  readonly systemId: string
  readonly committer: PartyIdentified
  readonly timeCommitted: DvDateTime
  readonly changeType: DvCodedText
  readonly description?: DvText
}

export interface RevisionHistoryItem {
  readonly versionId: ObjectVersionId
  readonly audits: ReadonlyArray<AuditDetails>
}
export interface RevisionHistory {
  readonly items: ReadonlyArray<RevisionHistoryItem>
}
