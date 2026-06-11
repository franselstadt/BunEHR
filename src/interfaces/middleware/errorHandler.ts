import type { Context } from 'hono'
import { ZodError } from 'zod'
import {
  DomainError, EhrNotFoundError, CompositionNotFoundError,
  ContributionNotFoundError, DirectoryNotFoundError, TemplateNotFoundError,
  EhrAlreadyExistsError, DirectoryAlreadyExistsError,
  PreconditionFailedError, PreconditionRequiredError,
  ValidationError, InvalidAqlError,
} from '../../domain/shared/DomainErrors.ts'

export function handleError(err: unknown, c: Context): Response {
  const path = new URL(c.req.url).pathname
  const base = {
    type: 'https://specifications.openehr.org/releases/ITS-REST/latest',
    instance: path,
    timestamp: new Date().toISOString(),
  }

  if (err instanceof ZodError) {
    const detail = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
    return c.json({ ...base, status: 400, title: 'Bad Request', detail }, 400)
  }
  if (err instanceof EhrNotFoundError || err instanceof CompositionNotFoundError ||
      err instanceof ContributionNotFoundError || err instanceof DirectoryNotFoundError ||
      err instanceof TemplateNotFoundError)
    return c.json({ ...base, status: 404, title: 'Not Found', detail: err.message }, 404)
  if (err instanceof EhrAlreadyExistsError || err instanceof DirectoryAlreadyExistsError)
    return c.json({ ...base, status: 409, title: 'Conflict', detail: err.message }, 409)
  if (err instanceof PreconditionFailedError)
    return c.json({ ...base, status: 412, title: 'Precondition Failed', detail: err.message }, 412)
  if (err instanceof PreconditionRequiredError)
    return c.json({ ...base, status: 428, title: 'Precondition Required', detail: err.message }, 428)
  if (err instanceof ValidationError || err instanceof InvalidAqlError)
    return c.json({ ...base, status: 422, title: 'Unprocessable Entity', detail: err.message }, 422)
  if (err instanceof DomainError)
    return c.json({ ...base, status: 400, title: err.code, detail: err.message }, 400)

  console.error('[BunEHR]', err)
  return c.json({ ...base, status: 500, title: 'Internal Server Error', detail: 'An unexpected error occurred' }, 500)
}
