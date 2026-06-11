# BunEHR — Architecture Reference

> **Full openEHR REST API v1 · Hospital Information System**  
> Repository: [github.com/franselstadt/BunEHR](https://github.com/franselstadt/BunEHR)  
> Author: Frans Elstadt · Version 1.0.0 · June 2026 · Apache 2.0

---

## Executive Summary

BunEHR is a **full-stack, open-source Electronic Health Record (EHR) system** that implements the complete openEHR REST API v1 specification. It demonstrates what a modern, standards-compliant, high-performance EHR looks like when built with Bun, TypeScript, Drizzle ORM, and PostgreSQL 16.

| Metric | Value |
|---|---|
| openEHR API endpoints | 37+ |
| Backend TypeScript files | 40 |
| Frontend source files | 21 |
| PostgreSQL tables | 14 |
| Sample patients | 12 |
| DDD layers | 4 |

### What it does

- Stores and manages Electronic Health Records following the international openEHR standard
- Serves all openEHR REST API v1 endpoints with correct status codes, ETag headers, and versioning
- Provides a clinical dashboard with interactive hospital maps, vital sign charts, and live WebSocket events
- Persists clinical compositions as PostgreSQL JSONB for fast querying
- Maintains an immutable append-only version history for regulatory audit trails
- Includes ICD-10 lookup, CPT procedure codes, financial records, and Medicare eligibility

### Why it matters

- **Interoperability:** Data works with EHRbase, Better Platform, or any openEHR v1 system worldwide
- **Standards-compliant:** EHR IDs, version UIDs, and AQL responses match the openEHR specification
- **Regulatory-ready:** Append-only versioning and CONTRIBUTION audit trails support HIPAA, GDPR, and NHS DSP Toolkit requirements
- **Modern stack:** ~120MB Docker image, native TypeScript, 30× faster startup than typical Node.js setups

---

## 1. Overview

### What is BunEHR?

BunEHR is a production-grade Electronic Health Record system implementing the full **openEHR REST API v1** specification. It provides both a standards-compliant REST API for clinical data management and a modern hospital dashboard frontend for clinical staff.

The name reflects its foundation: **BunEHR** as the platform, and **Bun** as the high-performance JavaScript runtime powering the backend.

### Core philosophy

| Principle | Description |
|---|---|
| **Standards-first** | Every API response matches openEHR canonical JSON. Data is portable without transformation. |
| **Domain-driven** | Clinical rules live in the domain layer with zero framework dependencies. |
| **Clinician-first UX** | Every dashboard page includes plain-English guides explaining openEHR concepts. |

### Technology choices

| Concern | Choice | Alternative | Reason |
|---|---|---|---|
| Runtime | **Bun 1.2** | Node.js 20 | 30× faster startup, native TypeScript, built-in WebSocket |
| Framework | **Hono** | Express / Fastify | Ultrafast, TypeScript-first middleware |
| ORM | **Drizzle** | Prisma / TypeORM | Zero overhead, schema = types, ~50KB vs ~200MB |
| Database | **PostgreSQL 16** | MongoDB | JSONB + indexes for AQL, TIMESTAMPTZ for clinical data |
| Validation | **Zod** | Yup / Joi | Runtime validation + TypeScript inference |
| WebSocket | **Bun native** | socket.io / ws | Zero dependencies, RFC 6455 |
| Frontend | **React 18 + MUI v6** | Next.js | Complete component library, custom theme |
| Maps | **react-leaflet** | Mapbox | Open-source, no API key |
| Charts | **Recharts** | D3 | ReferenceLine for clinical normal ranges |
| Containers | **Docker Compose** | Kubernetes (dev) | Single-command local startup |

---

## 2. Why Bun?

Choosing a runtime for healthcare software affects patient safety (emergency deployment startup time), compliance (dependency audit surface), and operational cost.

### The problem with Node.js

A typical Node.js TypeScript EHR backend requires packages *before writing business logic*:

- `ts-node` or `tsx` — run TypeScript in development
- `esbuild` or `tsc` — compile for production
- `dotenv` — load `.env` files
- `nodemon` — hot reload
- `ws` or `socket.io` — WebSocket
- `jest` + `ts-jest` — tests

Each package adds transitive dependencies, version constraints, and CVE surface area.

> **Healthcare compliance note:** Under HIPAA and NHS DSP Toolkit guidelines, all dependencies must be audited and patched. Bun eliminates several packages entirely.

### What Bun provides natively

| Feature | Benefit |
|---|---|
| TypeScript transpiler | Run `.ts` directly — no build step in dev or prod |
| `.env` loading | Automatic on startup |
| WebSocket server | `Bun.serve({ fetch, websocket })` — zero extra packages |
| Test runner | Jest-compatible `expect()`, ~0.6s startup |

```typescript
export default {
  port: 3000,
  fetch(req: Request, server: Server) {
    if (new URL(req.url).pathname === '/ws') {
      server.upgrade(req)
      return undefined
    }
    return app.fetch(req)
  },
  websocket: websocketHandler,
}
```

### Performance benchmarks

| Metric | Bun 1.2 | Node.js 20 |
|---|---|---|
| Package install (cold) | **1.2s** | 18.4s |
| Server startup | **~6ms** | ~180ms |
| HTTP throughput | **~120k req/s** | ~62k req/s |
| Test runner startup | **~0.6s** | ~8s (Jest) |
| Docker image | **~120MB** | ~600MB |

### Clinical system impact

- **30× faster pod startup** — health checks pass in milliseconds during failover
- **5× smaller Docker image** — critical for air-gapped or low-bandwidth hospital networks
- **15× faster CI** — faster feedback for clinical software engineers
- **Smaller attack surface** — fewer packages to audit for CVEs

Production dependencies: `hono`, `drizzle-orm`, `postgres`, `zod`, `@hono/zod-openapi`, `@hono/swagger-ui`.

---

## 3. The openEHR Standard

openEHR is an international open standard (ISO 18308) for electronic health records. Unlike HL7 FHIR (message exchange), openEHR focuses on **persistent, queryable clinical knowledge representation** with built-in versioning, audit trails, and AQL.

### Why openEHR over HL7 FHIR?

FHIR excels at point-of-care data exchange. openEHR excels at durable longitudinal patient records with mandatory versioning and audit. BunEHR uses openEHR as its primary model.

### EHR — Electronic Health Record

**Plain English:** A digital folder for exactly one patient (UUID `ehrId`). Root of all clinical data.

**Technical:** Contains EHR_STATUS, optional DIRECTORY, and CONTRIBUTION references. The ehrId is permanent for the patient's lifetime.

```json
{
  "ehr_id": { "value": "550e8400-e29b-41d4-a716-446655440000" },
  "system_id": { "value": "local.bunehr.com" },
  "ehr_status": {
    "uid": { "value": "abc-123::local.bunehr.com::1" },
    "subject": {
      "external_ref": {
        "id": { "value": "patient-001" },
        "namespace": "local",
        "type": "PERSON"
      }
    },
    "is_queryable": true,
    "is_modifiable": true
  },
  "time_created": { "value": "2026-06-10T14:00:00Z" }
}
```

### COMPOSITION — Clinical Document

**Plain English:** A clinical document — blood pressure, discharge summary, prescription.

**Technical:** Conforms to a TEMPLATE (archetype instantiation). Has `uid`, `language`, `territory`, `category`, `composer`, `context`, and `content`.

### Versioning — Append-Only Model

Clinical records are **never overwritten**. Every update creates a new version:

```
uuid::system_id::version_number

550e8400-...::local.bunehr.com::1   ← first version
550e8400-...::local.bunehr.com::2   ← after update
550e8400-...::local.bunehr.com::3   ← after second update
```

In BunEHR, `composition` and `ehr_status` tables only receive `INSERT` statements — no `UPDATE`.

### AQL — Archetype Query Language

SQL for clinical data. Traverses the Reference Model using archetype paths:

```sql
SELECT e/ehr_id/value, c/uid/value, c/name/value
FROM EHR e
CONTAINS COMPOSITION c[openEHR-EHR-COMPOSITION.encounter.v1]
WHERE e/ehr_id/value = $ehrId
ORDER BY c/context/start_time/value DESC
```

### CONTRIBUTION — Mandatory Audit Trail

Groups versioned objects committed together with mandatory audit: *who*, *when*, *why*. Required by openEHR; satisfies HIPAA §164.312(b), GDPR Article 5(1)(f), NHS DSP Toolkit.

### openEHR vs HL7 FHIR

| Dimension | openEHR | HL7 FHIR |
|---|---|---|
| Primary focus | Persistent EHR storage | Message exchange |
| Versioning | Built-in, mandatory, append-only | Optional |
| Query language | AQL | FHIRPath + REST search |
| Audit trail | CONTRIBUTION model, mandatory | AuditEvent, optional |
| Best for | Longitudinal patient records | Point-of-care exchange |

---

## 4. Domain-Driven Design Architecture

**Fundamental rule:** Code that models how EHRs work must never depend on HTTP or SQL.

### The four layers

```
Interface → Application → Domain ← Infrastructure
```

| Layer | Path | Responsibility |
|---|---|---|
| **Domain** | `src/domain/` | Aggregates, value objects, repository ports. Zero framework imports. |
| **Application** | `src/application/` | Thin use-case orchestrators. One method per user story. |
| **Infrastructure** | `src/infrastructure/` | Drizzle repositories, schema, DI container. |
| **Interface** | `src/interfaces/` | Hono routes, Zod validation, WebSocket, middleware. |

### Repository pattern — ports and adapters

| Domain Port | Infrastructure Adapter | Database Operation |
|---|---|---|
| `EhrRepository.create()` | `DrizzleEhrRepository` | INSERT INTO ehr + ehr_status |
| `EhrRepository.updateStatus()` | `DrizzleEhrRepository` | INSERT new ehr_status row |
| `CompositionRepository.create()` | `DrizzleCompositionRepository` | INSERT composition JSONB |
| `CompositionRepository.update()` | `DrizzleCompositionRepository` | INSERT new version row |
| `CompositionRepository.delete()` | `DrizzleCompositionRepository` | INSERT row with lifecycle_state = DELETED |
| `QueryRepository.executeAql()` | `DrizzleQueryRepository` | Pattern-matched Drizzle SELECT |

### Why DDD for healthcare

- **Regulatory compliance:** Audit trails embedded in the data model via CONTRIBUTION aggregates
- **Clinical safety:** Composition cannot be physically deleted — only marked DELETED
- **Testability:** Domain logic tested with mock repositories — no database required
- **Interoperability:** Port to EHRbase by replacing repository adapters only
- **Ubiquitous language:** EHR, COMPOSITION, CONTRIBUTION mean the same in code and clinical docs

### DDD in EHR systems — clinical requirements mapping

| Requirement | Without DDD | BunEHR DDD Solution |
|---|---|---|
| Immutable audit trail | DB trigger or convention | CONTRIBUTION aggregate at domain boundary |
| Append-only versioning | Developer discipline | Repository port has no overwrite method |
| One EHR per patient | UNIQUE constraint only | `EhrAggregate` invariant + DB constraint |
| Mandatory audit fields | Nullable columns | Non-optional TypeScript types |
| Testable clinical rules | Need running database | Mock repositories, tests in milliseconds |
| Concurrent update safety | Last-write-wins | If-Match → `PreconditionFailedError` |

---

## 5. System Architecture Diagram

### Request lifecycle

1. Browser sends `POST /v1/ehr` with JSON body
2. Vite proxy (dev) or nginx (Docker) forwards to Bun server :3000
3. Hono router runs middleware (timing, logger, secureHeaders, CORS, snake_case)
4. Zod validates body against `CreateEhrSchema` — 400 on invalid input
5. Route handler converts snake_case → camelCase via `deepCamelCase()`
6. `EhrApplicationService.createEhr()` orchestrates the use case
7. `IdGenerator.newUuid()` generates ehrId
8. `DrizzleEhrRepository.create()` executes INSERTs
9. Response middleware converts camelCase → snake_case via `deepSnakeCase()`
10. **201 Created** with `Location` header (and body if `Prefer: return=representation`)

### Component architecture

```
  Browser / Clinician
       │
       ▼
  ┌─────────────────────────────┐
  │   React 18 + MUI v6         │  Dashboard, Patients, Records, Finance
  │   Leaflet Map · Recharts    │
  │   useWebSocket() hook       │─────────────────────┐
  └──────────────┬──────────────┘                      │ WS
                 │ HTTP                                  ▼
                 ▼                      ┌───────────────────────┐
  ┌─────────────────────────────┐      │  Bun Native WebSocket  │
  │   Hono HTTP Server :3000    │      │  broadcast() to clients│
  │   Zod · snake_case middleware│      └───────────────────────┘
  └──────────────┬──────────────┘
                 ▼
  ┌─────────────────────────────┐
  │   Application Services      │
  └──────────────┬──────────────┘
                 ▼
  ┌─────────────────────────────┐
  │   Domain Models             │  Pure TypeScript
  └──────────────┬──────────────┘
                 ▼
  ┌─────────────────────────────┐
  │   Drizzle Repositories      │
  └──────────────┬──────────────┘
                 ▼
  ┌─────────────────────────────┐
  │   PostgreSQL 16             │  JSONB · TIMESTAMPTZ · indexes
  └─────────────────────────────┘
```

---

## 6. Domain Layer

Pure clinical logic. Zero framework dependencies.

### `src/domain/shared/OpenEhrTypes.ts`

All openEHR RM 1.1.0 value objects: `HierObjectId`, `ObjectVersionId`, `DvText`, `DvCodedText`, `DvDateTime`, `PartySelf`, `PartyIdentified`, `AuditDetails`, `RevisionHistory`. Exports `SYSTEM_ID`, `buildVersionId()`, `incrementVersionId()`, `extractObjectId()`. Branded types prevent mixing `EhrId` and `VersionId`.

### `src/domain/shared/DomainErrors.ts`

Typed error hierarchy: `EhrNotFoundError`, `EhrAlreadyExistsError`, `CompositionNotFoundError`, `ContributionNotFoundError`, `DirectoryNotFoundError`, `TemplateNotFoundError`, `PreconditionFailedError`, `PreconditionRequiredError`, `ValidationError`, `InvalidAqlError`. Mapped to RFC 7807 in the interface layer.

### `src/domain/shared/IdGenerator.ts`

`crypto.randomUUID()` wrapper — mockable in tests.

### `src/domain/ehr/EhrAggregate.ts`

EHR aggregate root, `EhrStatusVo`, and `EhrRepository` port: `create`, `findById`, `findBySubject`, `getStatus`, `updateStatus`, `getVersionedStatus`.

### `src/domain/composition/CompositionAggregate.ts`

COMPOSITION aggregate, `CompositionRepository` port. Versioning invariant: no overwrite, only new versions.

### `src/domain/contribution/ContributionAggregate.ts`

CONTRIBUTION aggregate for atomic change-sets with mandatory audit.

### `src/domain/directory/DirectoryAggregate.ts`

DIRECTORY folder hierarchy. One directory per EHR invariant.

### `src/domain/query/QueryModels.ts`

AQL result types, stored query types, template types. `QueryRepository` and `DefinitionRepository` ports.

---

## 7. Application Layer

Thin orchestrators — one method per user story. No business logic.

| Service | Methods |
|---|---|
| `EhrApplicationService` | createEhr, getEhr, getEhrBySubject, getEhrStatus, updateEhrStatus, getVersionedEhrStatus |
| `CompositionApplicationService` | createComposition, getComposition, updateComposition, deleteComposition, getVersionedComposition |
| `ContributionApplicationService` | createContribution, getContribution |
| `DirectoryApplicationService` | createDirectory, getDirectory, updateDirectory, deleteDirectory |
| `QueryApplicationService` | executeAql, saveStoredQuery, listStoredQueries, getStoredQuery |
| `DefinitionApplicationService` | uploadTemplate, listTemplates, getTemplate |

Each constructor takes a repository **port**, not a Drizzle implementation.

---

## 8. Infrastructure Layer

### `src/infrastructure/database/schema.ts`

Single source of truth for all 14 PostgreSQL tables. Uses `text()` for IDs, `jsonb()` for clinical content, `timestamp({ withTimezone: true })` for all dates, `numeric()` for financial amounts. Exports row types via `$inferSelect`.

### `src/infrastructure/database/client.ts`

postgres.js connection pool wrapped in Drizzle. Shared across all repositories.

### `src/infrastructure/database/migrate.ts`

Drizzle migration runner — executes on startup and as `bun run db:migrate`.

### Repository adapters

| File | Port | Key behaviour |
|---|---|---|
| `EhrRepository.ts` | `EhrRepository` | Duplicate check, append-only ehr_status |
| `CompositionRepository.ts` | `CompositionRepository` | If-Match, version increment, logical delete |
| `ContributionRepository.ts` | `ContributionRepository` | Atomic change-set inserts |
| `DirectoryRepository.ts` | `DirectoryRepository` | One directory per EHR |
| `QueryRepository.ts` | `QueryRepository`, `DefinitionRepository` | AQL pattern matching |

### `src/infrastructure/config/container.ts`

Manual DI — wires 5 repositories into 6 application services. All dependencies visible in one file.

---

## 9. Interface Layer

### `src/interfaces/rest/routes.ts`

All openEHR REST API v1 Hono route handlers. Pattern: validate → `deepCamelCase` → application service → response headers (ETag, Location) → error handler.

### `src/interfaces/rest/schemas.ts`

Zod schemas for all request bodies. Inferred TypeScript types: `CreateEhrInput`, `CompositionInput`, etc.

### `src/interfaces/rest/openapi.ts`

OpenAPI 3.0 spec with clinical descriptions. Served at `/api-docs`, rendered at `/docs`.

### `src/interfaces/rest/patientApiRoutes.ts`

BFF routes: `/api/patients`, `/api/seed`, `/api/patients/:id/vitals`.

### `src/interfaces/rest/clinicalRoutes.ts`

Clinical finance routes: ICD-10, CPT procedures, financial records, Medicare eligibility (see [Section 18](#18-clinical--finance-module)).

### `src/interfaces/rest/websocket.ts`

WebSocket manager: `broadcast(event)`, `websocketHandler`, `startDemoEventStream()`.

### `src/interfaces/middleware/snakeCase.ts`

Anti-corruption layer: `deepSnakeCase` (responses), `deepCamelCase` (requests).

### `src/interfaces/middleware/errorHandler.ts`

Maps `DomainError` → RFC 7807 Problem Details HTTP responses.

### `src/index.ts`

Bootstrap: migrations, Hono app, `export default { fetch, websocket }` for Bun auto-start, demo event stream.

---

## 10. Complete Backend File Registry

| File | Layer | Purpose |
|---|---|---|
| `src/index.ts` | Entry | Bootstrap, migrations, Bun.serve |
| `src/sampleData.ts` | Shared | 12 sample patients with vitals, GPS, wards |
| `src/clinicalData.ts` | Shared | ICD-10, CPT, financial, Medicare seed data |
| `src/domain/shared/OpenEhrTypes.ts` | Domain | openEHR RM value objects |
| `src/domain/shared/DomainErrors.ts` | Domain | Typed error hierarchy |
| `src/domain/shared/IdGenerator.ts` | Domain | UUID generator |
| `src/domain/ehr/EhrAggregate.ts` | Domain | EHR aggregate + port |
| `src/domain/composition/CompositionAggregate.ts` | Domain | COMPOSITION aggregate + port |
| `src/domain/contribution/ContributionAggregate.ts` | Domain | CONTRIBUTION aggregate |
| `src/domain/directory/DirectoryAggregate.ts` | Domain | DIRECTORY aggregate |
| `src/domain/query/QueryModels.ts` | Domain | AQL + template ports |
| `src/application/ehr/EhrApplicationService.ts` | Application | 8 EHR use cases |
| `src/application/composition/CompositionApplicationService.ts` | Application | 5 COMPOSITION use cases |
| `src/application/contribution/ContributionApplicationService.ts` | Application | 2 CONTRIBUTION use cases |
| `src/application/directory/DirectoryApplicationService.ts` | Application | 5 DIRECTORY use cases |
| `src/application/query/QueryApplicationService.ts` | Application | 4 AQL use cases |
| `src/application/definition/DefinitionApplicationService.ts` | Application | 4 template use cases |
| `src/infrastructure/database/schema.ts` | Infrastructure | Drizzle schema (14 tables) |
| `src/infrastructure/database/client.ts` | Infrastructure | Connection pool |
| `src/infrastructure/database/migrate.ts` | Infrastructure | Migration runner |
| `src/infrastructure/database/repositories/*.ts` | Infrastructure | Port implementations |
| `src/infrastructure/config/container.ts` | Infrastructure | Manual DI |
| `src/interfaces/rest/routes.ts` | Interface | openEHR route handlers |
| `src/interfaces/rest/schemas.ts` | Interface | Zod validation |
| `src/interfaces/rest/openapi.ts` | Interface | OpenAPI spec |
| `src/interfaces/rest/websocket.ts` | Interface | WebSocket broadcaster |
| `src/interfaces/rest/patientApiRoutes.ts` | Interface | Patient BFF |
| `src/interfaces/rest/clinicalRoutes.ts` | Interface | Clinical finance API |
| `src/interfaces/middleware/snakeCase.ts` | Interface | Case conversion |
| `src/interfaces/middleware/errorHandler.ts` | Interface | RFC 7807 mapping |

---

## 11. Frontend Architecture

### Stack

| Package | Version | Purpose |
|---|---|---|
| React | 18.3 | UI framework |
| Material UI | v6 | Component library |
| React Router | v7 | Routing + outlet context |
| react-leaflet | 4.2 | Hospital map |
| Recharts | 2.15 | Vital sign charts |
| Vite | 6.0 | Build tool + dev proxy |

### BunEHR design system (Ghibli / Claude aesthetic)

Warm parchment palette with muted pastels:

| Token | Value | Usage |
|---|---|---|
| Primary | Periwinkle `#7B93B8` | Links, headings, CTAs |
| Success | Sage `#8FAE93` | Normal vitals, success states |
| Accent | Terracotta `#B8846A` | Warnings, accents |
| Parchment | `#F7F3EC` | Page background |
| Ink | `#3B3228` | Body text |
| Sidebar | `#2C2820` | Dark navigation |

Typography: Cormorant Garamond (headings) + Nunito (body). Theme defined in `frontend/src/theme/medblocksTheme.ts`.

### Page architecture

Every page includes:

1. **Header** — title + plain-English description
2. **Main content** — page-specific UI
3. **PageGuide FAB** — floating `?` button with openEHR concept explanation, API endpoints, curl examples

### Routes

| Path | Page | Description |
|---|---|---|
| `/` | DashboardPage | Stats, map, charts, live feed |
| `/patients` | PatientsPage | Search, filter, patient cards |
| `/patients/:ehrId` | PatientDetailPage | Vitals, documents, raw openEHR |
| `/records` | ClinicalRecordsPage | Browse/create compositions, ICD-10 linking |
| `/finance` | FinancePage | Financial summary, ICD-10/CPT, Medicare |
| `/openehr`, `/aql` | OpenEHRPage | Concepts, AQL runner, integration |
| `/about` | AboutPage | Project story, Daisy, tech stack |

### WebSocket state management

`useWebSocket()` called once in `AppLayout.tsx`. Events passed via `useOutletContext()`:

- One connection per session
- Events persist across navigation
- Auto-reconnect after 3 seconds
- Live feed on Dashboard updates without polling

---

## 12. Frontend File Reference

| File | Purpose |
|---|---|
| `src/main.tsx` | React root, global CSS, Leaflet marker fix |
| `src/App.tsx` | Router + all page routes |
| `src/theme/medblocksTheme.ts` | MUI theme — Ghibli/Claude palette |
| `src/types/openehr.ts` | openEHR + frontend TypeScript types |
| `src/api/ehrClient.ts` | Type-safe API client |
| `src/api/samplePatients.ts` | Demo patient data |
| `src/api/clinicalDataFrontend.ts` | Frontend clinical/finance seed data |
| `src/api/sampleClinicalData.ts` | Clinical data helpers |
| `src/hooks/useWebSocket.ts` | Auto-reconnecting WebSocket hook |
| `src/components/layout/TopBar.tsx` | Logo, live status, ICD-10 lookup toggle |
| `src/components/layout/Sidebar.tsx` | Navigation sidebar |
| `src/components/layout/AppLayout.tsx` | Shell + WebSocket context |
| `src/components/shared/PageGuide.tsx` | Floating guide FAB |
| `src/components/shared/Icd10Lookup.tsx` | Full-screen ICD-10 search modal |
| `src/pages/DashboardPage.tsx` | Hospital overview |
| `src/pages/PatientsPage.tsx` | Patient list |
| `src/pages/PatientDetailPage.tsx` | Patient detail with vitals |
| `src/pages/ClinicalRecordsPage.tsx` | Clinical document browser |
| `src/pages/FinancePage.tsx` | Financial module |
| `src/pages/OpenEHRPage.tsx` | openEHR explorer + AQL |
| `src/pages/AboutPage.tsx` | About + Daisy's story |

---

## 13. Database Schema

14 PostgreSQL tables. Design principles:

- **TEXT for IDs** — UUID strings, Drizzle-friendly
- **JSONB for clinical content** — compositions, directory items, audit details
- **TIMESTAMPTZ everywhere** — timezone-aware clinical timestamps
- **Append-only for versioned tables** — ehr_status, composition never UPDATE
- **CASCADE deletes** — removing an EHR cleans up all related records

### Core openEHR tables

#### `ehr`

| Column | Type | Description |
|---|---|---|
| id | TEXT PK | Globally unique EHR identifier |
| subject_id | TEXT NOT NULL | Patient ID in demographics system |
| subject_namespace | TEXT | Namespace (default `local`) |
| system_id | TEXT | openEHR system ID for version UIDs |
| is_queryable | BOOLEAN | Appears in AQL results |
| is_modifiable | BOOLEAN | Compositions can be modified |
| time_created | TIMESTAMPTZ | Creation timestamp |

**Index:** `uq_ehr_subject` UNIQUE (subject_id, subject_namespace)

#### `ehr_status` (append-only)

| Column | Type | Description |
|---|---|---|
| id | TEXT PK | Row ID (new UUID per version) |
| ehr_id | TEXT FK | Parent EHR |
| uid | TEXT | Object UUID (constant across versions) |
| version_id | TEXT | Full version UID `uuid::system::N` |
| preceding_version_uid | TEXT | Version chain link |
| other_details | JSONB | Additional metadata |
| commit_audit | JSONB | Audit details for this version |
| time_committed | TIMESTAMPTZ | Commit timestamp |

#### `composition` (append-only, JSONB)

| Column | Type | Description |
|---|---|---|
| id | TEXT PK | Row ID per version |
| ehr_id | TEXT FK | Parent EHR |
| uid | TEXT | Object UUID |
| version_id | TEXT | Full version UID |
| template_id | TEXT | Clinical template ID |
| archetype_id | TEXT | Root archetype ID |
| lifecycle_state | TEXT | COMPLETE or DELETED |
| content | JSONB NOT NULL | **The clinical data** |
| time_committed | TIMESTAMPTZ | Used for time-travel queries |

#### `contribution` + `contribution_version`

Audit change-sets grouping versioned objects with mandatory auditor information.

#### `directory`

One per EHR (UNIQUE on ehr_id). Folder hierarchy stored as JSONB `items`.

#### `stored_query` + `template_definition`

Named AQL queries and ADL template storage.

### Clinical & finance tables

#### `icd10_code`

ICD-10 diagnosis codes with category, description, billable flag.

#### `procedure_code`

CPT procedure codes with Medicare rates, RVUs, facility/non-facility fees.

#### `icd10_procedure_map`

Links ICD-10 diagnoses to common CPT procedures.

#### `financial_record`

Claims and billing: billed/allowed amounts, patient responsibility, insurance payment, status, payer.

#### `medicare_eligibility`

Medicare Part A/B/C/D eligibility per patient EHR.

### Indexes

| Index | Table | Columns | Purpose |
|---|---|---|---|
| uq_ehr_subject | ehr | subject_id, subject_namespace | One EHR per patient |
| idx_ehr_status_time | ehr_status | ehr_id, time_committed DESC | Current version lookup |
| idx_composition_ehr | composition | ehr_id | All compositions for patient |
| idx_composition_uid | composition | uid | Version history by object ID |
| idx_composition_time | composition | ehr_id, time_committed DESC | Time-travel queries |
| idx_financial_ehr | financial_record | ehr_id | Patient billing lookup |
| idx_icd10_category | icd10_code | category | Chapter filtering |

---

## 14. Drizzle ORM

TypeScript-first SQL query builder — not a traditional ORM. No entity manager, no lazy loading, no reflection.

### Why Drizzle over Prisma?

| Dimension | Drizzle | Prisma | TypeORM |
|---|---|---|---|
| Bundle size | ~50KB | ~200MB (Rust engine) | ~5MB |
| Startup | Zero overhead | Rust sidecar | reflect-metadata scan |
| Bun compatibility | Native ESM ✓ | Rust engine issues | reflect-metadata issues |
| SQL visibility | Transparent | Hidden | Mixed |
| JSONB | Native `jsonb()` | Less precise Json type | Manual config |

### Schema as single source of truth

```typescript
export const composition = pgTable('composition', {
  id:      text('id').primaryKey(),
  content: jsonb('content').notNull(),
  timeCommitted: timestamp('time_committed', {
    withTimezone: true,
  }).notNull().defaultNow(),
})

export type CompositionRow = typeof composition.$inferSelect
```

### Type-safe queries

```typescript
const rows = await db
  .select()
  .from(composition)
  .where(and(eq(composition.ehrId, ehrId), eq(composition.uid, uid)))
  .orderBy(desc(composition.timeCommitted))
  .limit(1)
```

### Migration workflow

```bash
# 1. Modify schema.ts
# 2. Generate migration SQL
bun run db:generate
# 3. Apply migrations (also runs on startup)
bun run db:migrate
# 4. Optional: Drizzle Studio GUI
bun run db:studio
```

### Connection pool

| Setting | Value | Reason |
|---|---|---|
| Driver | postgres.js | Native ESM, Bun-compatible |
| max connections | 10 | Headroom for multiple instances |
| idle_timeout | 30s | Release connections during quiet periods |
| connect_timeout | 10s | Fail fast if DB unreachable |

### Full type-safety chain

```
PostgreSQL schema (schema.ts)
  → CompositionRow ($inferSelect)
  → CompositionAggregate (domain)
  → CompositionApplicationService
  → HTTP response (deepSnakeCase)
  → React component (PatientDetailPage)
```

Every step: type mismatch = compile-time error.

---

## 15. API Reference

**Swagger UI:** http://localhost:3000/docs  
**OpenAPI JSON:** http://localhost:3000/api-docs

### Common patterns

- **ETag + If-Match:** Updates require `If-Match: "current-version-uid"` from preceding GET
- **Prefer header:** `Prefer: return=representation` includes resource body on POST/PUT
- **Errors:** RFC 7807 Problem Details — `{ type, title, status, detail, instance, timestamp }`

### EHR

| Method | Path | Description |
|---|---|---|
| POST | `/v1/ehr` | Create EHR (auto UUID). 201, 409 |
| PUT | `/v1/ehr/{ehr_id}` | Create with specified UUID. 201, 409 |
| GET | `/v1/ehr/{ehr_id}` | Get EHR. ETag = current status version. 200, 404 |
| GET | `/v1/ehr?subject_id=X` | Find by patient ID. 200, 404 |

### EHR_STATUS

| Method | Path | Description |
|---|---|---|
| GET | `/v1/ehr/{ehr_id}/ehr_status` | Current status. 200, 404 |
| PUT | `/v1/ehr/{ehr_id}/ehr_status` | Update (If-Match required). 200, 412, 428 |
| GET | `/v1/ehr/{ehr_id}/ehr_status/{version_uid}` | Historical version. 200, 404 |
| GET | `/v1/ehr/{ehr_id}/versioned_ehr_status` | Full version history. 200, 404 |

### COMPOSITION

| Method | Path | Description |
|---|---|---|
| POST | `/v1/ehr/{ehr_id}/composition` | Create clinical document. 201, 404, 422 |
| GET | `/v1/ehr/{ehr_id}/composition/{uid}` | Get (optional `?version_at_time=`). 200, 404 |
| PUT | `/v1/ehr/{ehr_id}/composition/{uid}` | Update (INSERT new version). 200, 412, 428 |
| DELETE | `/v1/ehr/{ehr_id}/composition/{uid}` | Logical delete. 204, 404 |
| GET | `/v1/ehr/{ehr_id}/versioned_composition/{uid}` | Version history. 200, 404 |

### CONTRIBUTION

| Method | Path | Description |
|---|---|---|
| POST | `/v1/ehr/{ehr_id}/contribution` | Create audited change-set. 201, 422 |
| GET | `/v1/ehr/{ehr_id}/contribution/{uid}` | Get with audit. 200, 404 |

### DIRECTORY

| Method | Path | Description |
|---|---|---|
| POST | `/v1/ehr/{ehr_id}/directory` | Create (one per EHR). 201, 409 |
| GET | `/v1/ehr/{ehr_id}/directory` | Get current. 200, 404 |
| PUT | `/v1/ehr/{ehr_id}/directory` | Update (If-Match). 200, 412 |
| DELETE | `/v1/ehr/{ehr_id}/directory` | Delete (If-Match). 204, 412 |

### QUERY (AQL)

| Method | Path | Description |
|---|---|---|
| GET | `/v1/query/aql?q=...` | Execute AQL via query param. 200, 400 |
| POST | `/v1/query/aql` | Execute via body. 200, 400 |
| GET | `/v1/query/stored-queries` | List saved queries. 200 |
| PUT | `/v1/query/stored-queries/{name}/{version}` | Save query. 200 |
| GET | `/v1/query/aql/{qualified_query_name}` | Execute stored query. 200, 404 |

### DEFINITION

| Method | Path | Description |
|---|---|---|
| POST | `/v1/definition/template/adl1.4` | Upload ADL 1.4 OPT. 201, 409 |
| GET | `/v1/definition/template/adl1.4` | List templates. 200 |
| GET | `/v1/definition/template/adl1.4/{id}` | Get template. 200, 404 |
| POST | `/v1/definition/template/adl2` | Upload ADL 2. 201 |
| GET | `/v1/definition/template/adl2` | List ADL 2 templates. 200 |

### Patient BFF

| Method | Path | Description |
|---|---|---|
| POST | `/api/seed` | Seed 12 sample patient EHRs. 200 |
| GET | `/api/patients` | All patients with demographics + vitals. 200 |
| GET | `/api/patients/{id}` | Single patient. 200, 404 |
| GET | `/api/patients/{id}/vitals` | 24-hour vital trend. 200, 404 |
| GET | `/health` | Health check. 200 |

### WebSocket

| Protocol | Path | Description |
|---|---|---|
| WS | `/ws` | Real-time clinical event feed. 101 Switching Protocols |

---

## 16. WebSocket Architecture

Real-time clinical event broadcasting via Bun's native WebSocket — zero external dependencies.

### Why real-time matters

A 5-second polling delay is unacceptable when SpO₂ drops to 88%. WebSocket pushes critical events immediately.

### Event types

| Type | Severity | Clinical use |
|---|---|---|
| admission | info | Ward preparation for incoming patient |
| discharge | success | Bed release, pharmacy reconciliation |
| critical_alert | error | SpO₂ < 90%, STEMI, deteriorating GCS |
| lab_result | warning | Pathology review required |
| vitals_update | success | Treatment confirmation |
| medication | info | Dosing check, reconciliation |

### Message format

```json
{
  "id": "uuid",
  "type": "critical_alert",
  "patientId": "ehr-002",
  "patientName": "James Okafor",
  "ward": "Emergency",
  "message": "SpO₂ dropped to 88% — respiratory team paged",
  "severity": "error",
  "timestamp": "2026-06-10T14:32:00.000Z"
}
```

### Bun native vs socket.io

| Dimension | Bun native | socket.io |
|---|---|---|
| Dependencies | Zero | ~200KB + engine.io |
| Protocol | RFC 6455 | Custom (not interoperable) |
| Startup cost | Zero | ~180ms module load |

---

## 17. Docker Setup

Four-service Docker Compose stack.

### Services

| Service | Image | Host port | Purpose |
|---|---|---|---|
| postgres | postgres:16-alpine | 5433 | Primary data store |
| pgadmin | dpage/pgadmin4 | 5050 | Database admin UI |
| bun-ehr | meblock-ehr:latest | 3000 | API + WebSocket |
| frontend | meblock-ehr-frontend:latest | 5173 | Nginx static React build |

### Commands

```bash
docker compose up -d                    # start all
docker compose up -d --build bun-ehr   # rebuild API
docker compose logs -f bun-ehr         # tail logs
docker compose down -v                 # wipe data and stop
```

### Multi-stage Dockerfile

```dockerfile
FROM oven/bun:1.2-alpine AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.2-alpine AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/
COPY drizzle.config.ts ./
CMD ["bun", "run", "src/index.ts"]
```

No build step — Bun runs TypeScript natively. Final image ~120MB.

### Environment variables

| Variable | Default | Description |
|---|---|---|
| DATABASE_URL | postgres://ehr_user:ehr_pass@localhost:5433/ehrdb | PostgreSQL connection |
| PORT | 3000 | HTTP + WebSocket port |
| SYSTEM_ID | local.bunehr.com | Embedded in version UIDs |
| BUN_EHR_PORT | 3000 | Host port for API container |
| POSTGRES_HOST_PORT | 5433 | Host port for PostgreSQL |
| FRONTEND_PORT | 5173 | Host port for frontend |
| PGADMIN_EMAIL | admin@bunehr.com | pgAdmin login (valid TLD required) |

> **Bun auto-start warning:** Bun 1.2 auto-starts if `export default` has a `fetch` property. Do not also call `Bun.serve()` — you get EADDRINUSE. Use `export default { port, fetch, websocket }` only.

---

## 18. Clinical & Finance Module

Extended beyond core openEHR with US billing and coding support.

### Purpose

- **ICD-10** diagnosis code lookup with category filtering
- **CPT** procedure codes with Medicare rates and RVUs
- **Financial records** — claims, payments, balances per patient
- **Medicare eligibility** — Part A/B/C/D status per EHR

### API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/v1/icd10` | Search ICD-10 (`?q=`, `?category=`, `?billable=`) |
| GET | `/v1/icd10/categories` | List ICD-10 chapter categories |
| GET | `/v1/icd10/{code}` | Get code with linked procedures |
| GET | `/v1/procedures` | List CPT codes with costs |
| GET | `/v1/procedures/{code}` | Get procedure + Medicare rate |
| GET | `/v1/finance` | List financial records (filterable) |
| POST | `/v1/finance` | Create financial record |
| GET | `/v1/finance/summary` | Totals, outstanding balances |
| GET | `/v1/medicare/{ehr_id}` | Medicare eligibility for patient |
| PUT | `/v1/medicare/{ehr_id}` | Upsert Medicare eligibility |
| POST | `/api/seed-clinical` | Seed ICD-10, CPT, finance, Medicare data |

### Frontend integration

- **ClinicalRecordsPage** — browse/create compositions with ICD-10 linking
- **FinancePage** — financial summary, code lookup, Medicare status
- **Icd10Lookup** — global modal accessible from TopBar for quick diagnosis search

### Seed data

```bash
curl -X POST http://localhost:3000/api/seed           # patients + EHRs
curl -X POST http://localhost:3000/api/seed-clinical  # ICD-10, CPT, finance
```

Source: `src/clinicalData.ts` (backend), `frontend/src/api/clinicalDataFrontend.ts` (frontend demo).

---

## 19. Security Model

> **Development configuration:** Current setup is optimised for demo. Apply all hardening before real patient data.

### Currently implemented

| Control | Implementation |
|---|---|
| Input validation | Zod on all POST/PUT bodies |
| Optimistic locking | If-Match on all updates |
| Secure headers | Hono `secureHeaders()` |
| CORS | Configurable (default `*` in dev) |
| Logical deletes | lifecycle_state = DELETED |
| Append-only versions | No UPDATE on versioned tables |
| TIMESTAMPTZ | All timestamps timezone-aware |

### Production hardening checklist

1. **Authentication** — JWT/OIDC on all `/v1` and `/api` routes. RBAC: clinicians read/write, auditors read-only
2. **TLS** — Terminate at reverse proxy (nginx, Caddy, ALB). Never expose :3000 directly
3. **Secrets** — AWS Secrets Manager / Vault for DB credentials
4. **CORS** — Restrict to frontend domain only
5. **Rate limiting** — Prevent AQL flooding and credential stuffing
6. **Audit logging** — Who, what, when, IP → SIEM (Splunk, Elastic)
7. **Backup** — PostgreSQL WAL continuous backup, point-in-time recovery
8. **Container security** — Non-root user, Trivy/Grype image scanning

### Regulatory alignment

| Standard | Status | Notes |
|---|---|---|
| openEHR REST v1 | **Complete** | All endpoints, correct versioning |
| HIPAA (USA) | Partial | Needs auth, TLS, audit logging, BAA |
| GDPR (EU) | Partial | Append-only good; erasure needs anonymisation |
| NHS DSP Toolkit (UK) | Partial | Needs auth, SIEM, pen testing |
| HL7 FHIR R4 | Not implemented | Would need adapter layer |

---

## 20. Glossary

| Term | Definition |
|---|---|
| **ADL** | Archetype Definition Language — notation for openEHR archetypes |
| **AQL** | Archetype Query Language — SQL for clinical data |
| **Archetype** | Internationally agreed clinical concept template |
| **COMPOSITION** | Clinical document — basic unit of committed clinical data |
| **CONTRIBUTION** | Audited change-set grouping versioned objects |
| **CPT** | Current Procedural Terminology — US procedure coding |
| **DDD** | Domain-Driven Design — clinical rules isolated in domain layer |
| **DIRECTORY** | Folder hierarchy within an EHR (one per EHR) |
| **Drizzle ORM** | TypeScript-first SQL query builder |
| **EHR** | Electronic Health Record — one per patient, UUID ehrId |
| **EHR_STATUS** | EHR metadata — queryable/modifiable flags, subject reference |
| **GIN Index** | PostgreSQL inverted index for JSONB containment queries |
| **ICD-10** | International Classification of Diseases, 10th revision |
| **JSONB** | PostgreSQL binary JSON — parsed, indexed, queryable |
| **ObjectVersionId** | Versioned ID: `uuid::system_id::version_number` |
| **OPT** | Operational Template — ADL 1.4 XML clinical document definition |
| **Port** | Domain interface specifying required persistence operations |
| **RFC 7807** | Problem Details for HTTP APIs — standard error JSON format |
| **TIMESTAMPTZ** | Timezone-aware PostgreSQL timestamp |
| **Zod** | Runtime validation + TypeScript type inference |

---

## 21. About BunEHR & Daisy

![Frans Elstadt and Daisy](../frontend/public/franselstadt.png)

### Daisy

Miniature Schnauzer · South Africa · waiting to come home

I built BunEHR while starting over in the United States — new country, new rules, and the quiet weight of everything I left behind. South Africa is home to people I love and work I am proud of. It is also a place where many of us learned to live with a background hum of risk that left marks. Hypervigilance. Poor sleep. Clinicians call some of what I carried **PTSD**. I called it Tuesday for a long time.

> Daisy did not fix that by herself. No dog does. What she did was stay. Through nights when I replayed incidents I did not want to name. Through mornings when my hands would not stop shaking. She sat on my feet while I debugged. She greeted me like the day was worth starting. She was routine when routine was medicine.

When I made the decision to build a life in the United States, Daisy could not come on the first flight. She stayed with family in South Africa — **safe, loved, and not with me**. Every month apart is a line item on my heart.

Stable work means eventually the veterinary bills, travel, and import costs to **bring Daisy home**. That is not a small goal tucked into a footnote. It is one of the main reasons I take this work seriously.

> *She is not decoration. She is the reason stability is not abstract for me.*  
> *That is why the demo password is* `daisy`*.*

### About this project

Designed and built by **Frans Elstadt** as a demonstration that openEHR compliance and modern development (Bun, TypeScript, DDD, Drizzle) complement each other. A system can be clinically rigorous, interoperable with the global openEHR ecosystem, and built efficiently.

| | |
|---|---|
| **Repository** | [github.com/franselstadt/BunEHR](https://github.com/franselstadt/BunEHR) |
| **Standard** | openEHR REST API v1 |
| **License** | Apache 2.0 |
| **Version** | 1.0.0 · June 2026 |

---

*BunEHR · Architecture Reference · v1.0.0 · June 2026*  
*Demo by Frans Elstadt · Dedicated to Daisy 🐾*
