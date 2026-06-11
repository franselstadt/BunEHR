# BunEHR — Layer Guide

A quick map of folders, naming, and request flow for the backend.

## Solution layout

| Layer | Path | What lives here |
|---|---|---|
| Presentation | `src/Api/` | Controllers, middleware, DTOs, `Program.ts` |
| Application | `src/application/` | Services (`*Service`), contracts (`I*Service`) |
| Domain | `src/domain/` | Models + `I*Repository` ports (one type per file) |
| Infrastructure | `src/infrastructure/` | Drizzle repositories, DI, seed data |
| Host | `src/index.ts` + `src/Api/Program.ts` | Process entry + HTTP pipeline |

## Naming conventions

| Concept | Location |
|---|---|
| `IEhrRepository` | `domain/ehr/repositories/IEhrRepository.ts` |
| `EhrAggregate` | `domain/ehr/models/EhrAggregate.ts` |
| `EhrRepository` | `infrastructure/database/repositories/EhrRepository.ts` |
| `IEhrService` | `application/contracts/IEhrService.ts` |
| `EhrService` | `application/ehr/EhrService.ts` |
| `OpenEhrController` | `Api/Controllers/OpenEhrController.ts` |
| `PatientsController` | `Api/Controllers/PatientsController.ts` |
| Request DTOs | `Api/Dtos/RequestDtos.ts` (Zod schemas) |
| Service registration | `infrastructure/config/DependencyInjection.ts` |
| `ExceptionMiddleware` | `Api/Middleware/ExceptionMiddleware.ts` |
| Problem Details (RFC 7807) | `ExceptionMiddleware.ts` |

## Request flow

```
HTTP Request
  → Api/Program.ts          (middleware pipeline: CORS, logging, JSON naming)
  → Api/Controllers/*       (validate DTO → call service)
  → application/*Service    (use case orchestration)
  → domain I*Repository     (port / interface)
  → infrastructure *Repository (Drizzle + PostgreSQL)
  → JSON response (snake_case for openEHR)
```

## Dependency injection

Open `infrastructure/config/DependencyInjection.ts` — the composition root where repositories and services are wired:

```typescript
const ehrRepository = new EhrRepository(db)
const ehrService = new EhrService(ehrRepository)
// ...
export const services: AppServices = { ehr: ehrService, ... }
```

Controllers receive `services` from `Api/Program.ts` at construction time.

## Controllers

| Controller | Route prefix | Service |
|---|---|---|
| `OpenEhrController` | `/v1/*` | `AppServices.ehr`, `.composition`, etc. |
| `PatientsController` | `/api/patients` | `AppServices.patients` |
| `ClinicalFinanceController` | `/v1`, `/api` | Direct DB (future: `IClinicalFinanceService`) |

## Domain rules (non-negotiable)

- **Append-only versioning** — compositions are never `UPDATE`d, only new versions inserted
- **If-Match** — optimistic concurrency on updates
- **One EHR per patient** — enforced in `EhrService` + DB unique constraint
- **CONTRIBUTION audit** — every change-set has mandatory audit metadata

## Running locally

```bash
docker compose up -d          # PostgreSQL
bun install
bun run dev                   # hot reload
# Swagger: http://localhost:3000/docs
```

## Implementation notes

- Services are plain classes with methods — no command/query bus
- Drizzle ORM is SQL-first with strong types
- Clinical finance routes still query the DB directly; candidate for next refactor
- In-memory patient demographics are demo-only; production would use a Demographics service

## Quick file finder

| I want to… | Open |
|---|---|
| Add an openEHR endpoint | `Api/Controllers/OpenEhrController.ts` |
| Add business logic | `application/*/XService.ts` |
| Change DB schema | `infrastructure/database/schema.ts` → `bun run db:generate` |
| Add validation on POST body | `Api/Dtos/RequestDtos.ts` |
| Register a new service | `DependencyInjection.ts` |
| Fix error HTTP codes | `Api/Middleware/ExceptionMiddleware.ts` |

---

*Repository: [github.com/franselstadt/BunEHR](https://github.com/franselstadt/BunEHR)*
