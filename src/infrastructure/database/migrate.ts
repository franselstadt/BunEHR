/**
 * Run Drizzle migrations against the configured database.
 * Usage: bun run src/infrastructure/database/migrate.ts
 */
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const url = process.env['DATABASE_URL'] ?? 'postgres://ehr_user:ehr_pass@localhost:5433/ehrdb'

const sql = postgres(url, { max: 1 })
const db  = drizzle(sql)

console.log('Running migrations...')
await migrate(db, { migrationsFolder: './src/infrastructure/database/migrations' })
console.log('Migrations complete.')
await sql.end()
