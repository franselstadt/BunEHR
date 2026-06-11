export class DomainError extends Error {
  constructor(message: string, readonly code: string) {
    super(message)
    this.name = this.constructor.name
  }
}
export class EhrNotFoundError        extends DomainError { constructor(id: string)  { super(`EHR not found: ${id}`, 'EHR_NOT_FOUND') } }
export class EhrAlreadyExistsError   extends DomainError { constructor(id: string)  { super(`EHR already exists: ${id}`, 'EHR_CONFLICT') } }
export class CompositionNotFoundError extends DomainError { constructor(id: string) { super(`Composition not found: ${id}`, 'COMPOSITION_NOT_FOUND') } }
export class ContributionNotFoundError extends DomainError { constructor(id: string){ super(`Contribution not found: ${id}`, 'CONTRIBUTION_NOT_FOUND') } }
export class DirectoryNotFoundError  extends DomainError { constructor(id: string)  { super(`Directory not found: ${id}`, 'DIRECTORY_NOT_FOUND') } }
export class DirectoryAlreadyExistsError extends DomainError { constructor(id: string) { super(`Directory already exists: ${id}`, 'DIRECTORY_CONFLICT') } }
export class TemplateNotFoundError   extends DomainError { constructor(id: string)  { super(`Template not found: ${id}`, 'TEMPLATE_NOT_FOUND') } }
export class PreconditionFailedError extends DomainError { constructor(msg: string) { super(msg, 'PRECONDITION_FAILED') } }
export class PreconditionRequiredError extends DomainError { constructor(msg: string){ super(msg, 'PRECONDITION_REQUIRED') } }
export class ValidationError         extends DomainError { constructor(msg: string) { super(msg, 'VALIDATION_ERROR') } }
export class InvalidAqlError         extends DomainError { constructor(msg: string) { super(msg, 'INVALID_AQL') } }
