import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.ts'

const url = process.env['DATABASE_URL'] ?? 'postgres://ehr_user:ehr_pass@localhost:5433/ehrdb'

const sql = postgres(url, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
  onnotice: () => {},
})

export const db = drizzle(sql, { schema })
export type Db = typeof db
