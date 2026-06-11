<div align="center">

<img src="frontend/public/logo.png" alt="BunEHR logo" height="80" />

# BunEHR

**Open-source Electronic Health Record system — openEHR REST API v1**

[![openEHR v1](https://img.shields.io/badge/openEHR-REST%20API%20v1-2563EB?style=flat-square)](https://specifications.openehr.org/)
[![Bun](https://img.shields.io/badge/Runtime-Bun%201.2-F472B6?style=flat-square)](https://bun.sh)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-336791?style=flat-square)](https://postgresql.org)
[![Hono](https://img.shields.io/badge/Framework-Hono-E36002?style=flat-square)](https://hono.dev)
[![Drizzle](https://img.shields.io/badge/ORM-Drizzle-C5F74F?style=flat-square&labelColor=222)](https://orm.drizzle.team)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20MUI%20v6-61DAFB?style=flat-square&labelColor=222)](https://mui.com)
[![License](https://img.shields.io/badge/License-Apache%202.0-green?style=flat-square)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-franselstadt%2FBunEHR-181717?style=flat-square&logo=github)](https://github.com/franselstadt/BunEHR)

</div>

---

## What is BunEHR?

**BunEHR** is a production-grade Electronic Health Record system implementing the full **openEHR REST API v1** specification. It provides a standards-compliant REST API and a modern hospital dashboard frontend — both powered by the same PostgreSQL backend.

Data stored in BunEHR is interoperable with any other openEHR v1-compliant system (EHRbase, Better Platform, etc.) without transformation. Your clinical data is portable by design.

### Feature highlights

| Feature | Description |
|---|---|
| **Full openEHR REST API v1** | EHR, COMPOSITION, CONTRIBUTION, DIRECTORY, AQL, DEFINITION — all 37 endpoints |
| **Bun runtime** | 30× faster startup than Node.js, native TypeScript, built-in WebSocket |
| **PostgreSQL 16 + JSONB** | Compositions stored as JSONB with GIN indexes for AQL execution |
| **Drizzle ORM** | Type-safe SQL — schema is the single source of truth for DB + TypeScript types |
| **Real-time WebSocket** | Live clinical events (admissions, critical alerts, lab results) |
| **Hospital map** | Interactive Leaflet map with patient ward locations |
| **Vital sign charts** | 24-hour trending with clinical normal range reference lines |
| **DDD architecture** | Domain-driven design — clinical rules isolated from infrastructure |
| **AI Imaging module (idea in progress)** | Ziehl-Neelsen stain + CT pseudo-analysis with GE microscope/CT demo feeds, saved back into EHR compositions |
| **Demo by Frans Elstadt** | Dedicated to Daisy 🐾 — Miniature Schnauzer, South Africa |

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [Bun](https://bun.sh) (for local development)

### 1. Start the stack

```bash
git clone https://github.com/franselstadt/BunEHR.git
cd BunEHR
cp .env .env.local     # adjust credentials if needed
docker compose up -d
```

| Service | URL | Credentials |
|---|---|---|
| **BunEHR API** | http://localhost:3000 | — |
| **Swagger UI** | http://localhost:3000/docs | — |
| **PostgreSQL** | localhost:5433 | `ehr_user` / `ehr_pass` |
| **pgAdmin** | http://localhost:5050 | `admin@bunehr.com` / `admin` |

### 2. Start the frontend

```bash
cd frontend && bun install && bun run dev
# → http://localhost:5173
```

### 3. Seed sample patients

```bash
curl -X POST http://localhost:3000/api/seed
```

---

## Why Domain-Driven Design (DDD) for an EHR?

Domain-Driven Design is not optional in healthcare software — **it is the only architecture that can satisfy the competing demands of clinical correctness, regulatory compliance, and long-term maintainability**.

### The problem DDD solves

A traditional layered architecture (controllers → services → database) puts clinical business rules into service classes that directly call database queries. This creates three critical problems in an EHR context:

1. **Clinical invariants are invisible** — the rule "a composition can never be overwritten, only versioned" exists as a convention, not as an enforced boundary. Any developer can bypass it by calling the repository directly.

2. **Regulatory compliance becomes an afterthought** — HIPAA requires an immutable audit trail. GDPR requires data minimisation. NHS DSP Toolkit requires documented access controls. These are domain rules, not infrastructure concerns — but without DDD, they end up scattered across service methods and database triggers.

3. **Untestable business logic** — clinical rules that mix SQL with business decisions require a running database to test. For software where bugs have patient safety implications, this is unacceptable.

### How BunEHR applies DDD

```
src/domain/          ← Pure clinical logic. Zero framework imports.
├── ehr/             ← EHR aggregate root — enforces: one EHR per patient, EHR is permanent
├── composition/     ← COMPOSITION aggregate — enforces: updates create new versions, never overwrites
├── contribution/    ← CONTRIBUTION aggregate — enforces: every change has an auditor and reason
├── directory/       ← DIRECTORY aggregate — enforces: one folder hierarchy per EHR
└── shared/          ← openEHR value objects (HierObjectId, VersionId, DvText, AuditDetails)
```

**Dependency rule:** `Interface → Application → Domain ← Infrastructure`

The domain layer never imports from infrastructure. Clinical rules that matter — append-only versioning, mandatory audit trails, the one-EHR-per-patient invariant — are expressed as TypeScript types and interfaces in the domain layer. They cannot be bypassed by infrastructure code.

### DDD in the EHR space — why it matters clinically

| Clinical requirement | Without DDD | With DDD (BunEHR) |
|---|---|---|
| **Immutable audit trail** | Database trigger or convention | CONTRIBUTION aggregate — enforced at domain boundary |
| **Append-only versioning** | Developer discipline | `CompositionRepository` port has no `update()` — only `create()` with new version |
| **One EHR per patient** | Database UNIQUE constraint | `EhrAggregate` invariant + database constraint |
| **Mandatory audit fields** | Nullable DB columns | `ContributionAuditRequest` type — required fields are non-optional |
| **Testable clinical rules** | Need running database | Mock `EhrRepository` — test clinical rules in milliseconds |
| **Regulatory compliance** | Comment in a service method | Domain type system makes non-compliant states impossible to represent |

> **The bottom line:** In an EHR system, a bug is not just a broken feature — it is potentially a harm to a patient. DDD makes the clinical rules explicit, enforceable, and testable independently of any framework or database.

---

## Why Drizzle ORM?

Drizzle is a **TypeScript-first SQL query builder** — not a traditional ORM. The distinction matters deeply for a healthcare system.

### The ORM problem in healthcare

Traditional ORMs (TypeORM, Hibernate) use reflection, decorators, and "magic" to map objects to tables. They abstract away SQL to the point where developers lose sight of what queries are actually being executed. In a healthcare system where every query must be auditable and performant (vital signs for ICU patients cannot wait on an N+1 query), this abstraction is dangerous.

### What Drizzle does differently

```typescript
// The schema IS the TypeScript type — no separate interface to maintain:
export const composition = pgTable('composition', {
  id:      text('id').primaryKey(),
  content: jsonb('content').notNull(),          // JSONB — native PostgreSQL
  time_committed: timestamp('time_committed', {
    withTimezone: true                           // TIMESTAMPTZ — timezone-aware
  }).notNull(),
})

// Type derived automatically — always in sync with the schema:
export type CompositionRow = typeof composition.$inferSelect
// → { id: string; content: unknown; time_committed: Date; ... }
```

**The query is transparent — you see exactly what SQL is generated:**

```typescript
// Readable, typed, and predictable:
const rows = await db
  .select()
  .from(composition)
  .where(and(eq(composition.ehrId, ehrId), eq(composition.uid, uid)))
  .orderBy(desc(composition.timeCommitted))
  .limit(1)
```

### Drizzle vs alternatives

| Concern | Drizzle | Prisma | TypeORM |
|---|---|---|---|
| **Bundle size** | ~50KB | ~200MB (Rust engine) | ~5MB |
| **Startup time** | Zero overhead | Rust sidecar process | Reflect-metadata scan |
| **Type safety** | Schema → `$inferSelect` | Schema → generate step | Decorators + reflect |
| **SQL visibility** | Transparent | Hidden | Mixed |
| **Bun compatibility** | Native ESM ✓ | Issues with Rust engine | reflect-metadata issues |
| **JSONB support** | Native `jsonb()` column | Json type (less precise) | Manual configuration |
| **Migration** | Auto from schema diff | Auto (separate step) | Manual or auto |

### Why this matters for an EHR

- **No N+1 queries:** Clinical data must be returned fast. Drizzle's explicit query builder means you always know exactly how many SQL statements are executed.
- **No magic deletes:** When a composition is "deleted", it must be a logical delete (new version with `lifecycle_state = 'DELETED'`). With Drizzle, there are no framework-level `.destroy()` methods to accidentally call.
- **Schema as compliance artifact:** The `schema.ts` file is a precise record of the database structure. It can be reviewed as part of a regulatory audit — unlike a Prisma schema that generates a separate client.
- **Reproducible migrations:** `bun run db:generate` produces deterministic SQL from schema diffs. Every schema change is reviewed, versioned, and applied in order.

---

## Architecture

BunEHR follows **Clean Architecture**:

```
src/
├── Api/                         ← Presentation (Controllers, DTOs, Program.ts)
│   ├── Controllers/             ← OpenEhrController, PatientsController, …
│   ├── Middleware/              ← ExceptionMiddleware, JsonNamingMiddleware
│   ├── Dtos/                    ← Request DTOs (Zod validation)
│   └── Program.ts               ← HTTP pipeline
├── application/                 ← Use cases
│   ├── contracts/               ← I*Service interfaces
│   ├── ehr/EhrService.ts
│   ├── patient/PatientService.ts
│   └── …
├── domain/                      ← Models + repository ports (1 type per file)
│   ├── ehr/models/              ← EhrAggregate, EhrStatusVo, …
│   ├── ehr/repositories/        ← IEhrRepository
│   ├── composition/models/      ← CompositionAggregate, EventContext, …
│   └── …                        ← same pattern for contribution/directory/query
├── infrastructure/              ← Drizzle repos + DependencyInjection.ts
│   ├── config/DependencyInjection.ts
│   └── seed/                    ← Demo data
└── index.ts                     ← Host entry point
```

**New to the codebase?** Start with [docs/layer-guide.md](docs/layer-guide.md) for folder layout, naming, and request flow.

---

## openEHR Concepts

| Concept | Plain English | PostgreSQL table |
|---|---|---|
| **EHR** | One digital record per patient (UUID) | `ehr` |
| **EHR_STATUS** | Who the EHR belongs to — versioned, append-only | `ehr_status` |
| **COMPOSITION** | A clinical document (blood pressure, encounter, prescription) | `composition` (JSONB) |
| **CONTRIBUTION** | Audited change-set — who changed what, when, and why | `contribution` |
| **DIRECTORY** | Folder hierarchy inside an EHR | `directory` |
| **AQL** | Archetype Query Language — SQL for clinical data | Executed on all tables |
| **VERSION UID** | `uuid::system::N` — append-only, every change preserved | Version columns in all tables |

---

## API Reference

Full Swagger UI: **http://localhost:3000/docs** · OpenAPI JSON: **http://localhost:3000/api-docs**

```http
# EHR
POST   /v1/ehr                              Create EHR
GET    /v1/ehr/{ehr_id}                     Get EHR
GET    /v1/ehr?subject_id=X                 Find by patient ID

# COMPOSITION
POST   /v1/ehr/{ehr_id}/composition         Create clinical document
GET    /v1/ehr/{ehr_id}/composition/{uid}   Get composition
PUT    /v1/ehr/{ehr_id}/composition/{uid}   Update (If-Match required)
DELETE /v1/ehr/{ehr_id}/composition/{uid}   Logical delete (preserves history)

# AQL
POST   /v1/query/aql                        Execute AQL query
PUT    /v1/query/stored-queries/{name}/{v}  Save named query

# WebSocket
WS     /ws                                  Live clinical event feed
```

---

## AI Imaging Module (Idea In Progress)

An in-progress module now exists for tuberculosis-focused imaging triage workflows.

- **Ziehl-Neelsen analyzer** (`POST /api/ai/ziehl-neelsen/analyze`)
  - Accepts demo asset IDs or image URIs.
  - Generates pseudo AI outputs: dye map grid, acid-fast bacilli count, bacillary load band, confidence.
  - Mimics **GE microscope** integration via pseudo device metadata.
- **CT scan analyzer** (`POST /api/ai/ct-scan/analyze`)
  - Computes pseudo lesion map, nodule count, consolidation %, TB suspicion score, confidence, impression.
  - Mimics **GE CT** integration metadata for demo workflows.
- **Demo imaging assets in PostgreSQL** (`POST /api/ai/seed-imaging-demo`, `GET /api/ai/demo-images`)
  - Demo image metadata and dye maps are persisted in normalized tables, not in-memory arrays.
- **Results pushed into openEHR compositions**
  - Each analysis automatically creates a new composition in the patient EHR.
  - CT composition payload links the latest Ziehl-Neelsen result when present.

### New AI imaging endpoints

```http
POST /api/ai/seed-imaging-demo               Seed demo GE pseudo imaging assets
GET  /api/ai/demo-images                     List demo images and dye maps
POST /api/ai/ziehl-neelsen/analyze           Analyze stain image and write result to EHR
POST /api/ai/ct-scan/analyze                 Analyze CT scan and write result to EHR
GET  /api/ai/results/{ehr_id}                Read combined AI analysis history for an EHR
```

---

## Why Bun?

| Metric | Bun 1.2 | Node.js 20 |
|---|---|---|
| Package install | **1.2s cold** | 18.4s |
| Server startup | **~6ms** | ~180ms |
| HTTP throughput | **~120k req/s** | ~62k req/s |
| TypeScript | **Native — no build step** | ts-node / esbuild |
| WebSocket | **Built-in Bun.serve()** | Requires ws / socket.io |
| `.env` loading | **Built-in** | Requires dotenv package |
| Docker image | **~120MB** | ~600MB |

---

## Docker

```bash
docker compose up -d                    # start all services
docker compose up -d --build bun-ehr   # rebuild after code changes
docker compose logs -f bun-ehr         # tail logs
docker compose down -v                 # wipe data and stop
```

---

## Development

```bash
bun install                # install dependencies
bun run db:generate        # generate migration from schema changes
bun run db:migrate         # apply migrations manually
bun run dev                # start with hot reload (bun --watch)
bun run db:studio          # open Drizzle Studio GUI
```

---

## Architecture Document

Full architecture reference — DDD rationale, all files annotated, database schema, API reference, and security model:

- **Markdown:** [docs/architecture.md](docs/architecture.md) (recommended)
- **HTML:** [docs/architecture.html](docs/architecture.html) (print / browser)
- **Index:** [docs/README.md](docs/README.md)

---

## A Personal Note

<div align="center">
<img src="frontend/public/franselstadt.png" alt="Frans Elstadt, the BunEHR mascot, and Daisy at the Golden Gate Bridge" width="340" />
</div>

I built BunEHR while starting over in the United States — new country, new rules, and the quiet weight of everything I left behind. South Africa is home to people I love and work I am proud of. It is also a place where many of us learned to live with a background hum of risk that left marks. Hypervigilance. Poor sleep. Clinicians call some of what I carried **PTSD**. I called it Tuesday for a long time.

**Daisy** — my small black Miniature Schnauzer — did not fix that by herself. No dog does. What she did was stay. Through nights when I replayed incidents I did not want to name. Through mornings when my hands would not stop shaking. She sat on my feet while I debugged. She greeted me like the day was worth starting. She was routine when routine was medicine.

When I made the decision to build a life in the United States, Daisy could not come on the first flight. She stayed with family in South Africa — **safe, loved, and not with me**. Every month apart is a line item on my heart.

Stable work means eventually the veterinary bills, travel, and import costs to **bring Daisy home**. That is not a small goal tucked into a footnote. It is one of the main reasons I take the work seriously.

> *She is not decoration. She is the reason stability is not abstract for me.*
> *That is why the demo password is* `daisy`*.*

---

## License

Apache 2.0 — see [LICENSE](LICENSE)

---

*Demo by Frans Elstadt · [BunEHR v1.0.0](https://github.com/franselstadt/BunEHR) · openEHR REST API v1*
