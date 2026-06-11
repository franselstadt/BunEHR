/**
 * Recursively converts object keys between camelCase and snake_case.
 * - deepSnakeCase: applied to outgoing JSON responses (camelCase → snake_case)
 * - deepCamelCase: applied to incoming request bodies (snake_case → camelCase)
 */

const toSnake = (key: string): string =>
  key.replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`)

const toCamel = (key: string): string =>
  key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())

export function deepSnakeCase(value: unknown): unknown {
  if (Array.isArray(value))  return value.map(deepSnakeCase)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [toSnake(k), deepSnakeCase(v)])
    )
  }
  return value
}

export function deepCamelCase(value: unknown): unknown {
  if (Array.isArray(value))  return value.map(deepCamelCase)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [toCamel(k), deepCamelCase(v)])
    )
  }
  return value
}
