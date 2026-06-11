# BunEHR Documentation

**Repository:** [github.com/franselstadt/BunEHR](https://github.com/franselstadt/BunEHR)  
**Version:** 1.0.0 · June 2026 · Apache 2.0

---

## Quick links

| Resource | Location |
|---|---|
| **Full architecture reference (Markdown)** | [architecture.md](./architecture.md) |
| **HTML version (print / browser)** | [architecture.html](./architecture.html) |
| **API (Swagger UI)** | http://localhost:3000/docs |
| **OpenAPI JSON** | http://localhost:3000/api-docs |
| **Postman collection** | [../postman/BunEHR-OpenEHR.postman_collection.json](../postman/BunEHR-OpenEHR.postman_collection.json) |

---

## Table of contents

The complete reference lives in **[architecture.md](./architecture.md)**:

1. [Overview](./architecture.md#1-overview)
2. [Why Bun?](./architecture.md#2-why-bun)
3. [openEHR Standard](./architecture.md#3-the-openehr-standard)
4. [DDD Architecture](./architecture.md#4-domain-driven-design-architecture)
5. [System Diagram](./architecture.md#5-system-architecture-diagram)
6. [Domain Layer](./architecture.md#6-domain-layer)
7. [Application Layer](./architecture.md#7-application-layer)
8. [Infrastructure Layer](./architecture.md#8-infrastructure-layer)
9. [Interface Layer](./architecture.md#9-interface-layer)
10. [Backend File Registry](./architecture.md#10-complete-backend-file-registry)
11. [Frontend Architecture](./architecture.md#11-frontend-architecture)
12. [Frontend Files](./architecture.md#12-frontend-file-reference)
13. [Database Schema](./architecture.md#13-database-schema)
14. [Drizzle ORM](./architecture.md#14-drizzle-orm)
15. [API Reference](./architecture.md#15-api-reference)
16. [WebSocket](./architecture.md#16-websocket-architecture)
17. [Docker](./architecture.md#17-docker-setup)
18. [Clinical & Finance](./architecture.md#18-clinical--finance-module)
19. [Security](./architecture.md#19-security-model)
20. [Glossary](./architecture.md#20-glossary)
21. [About & Daisy](./architecture.md#21-about-bunehr--daisy)

---

## Start here

```bash
git clone https://github.com/franselstadt/BunEHR.git
cd BunEHR
docker compose up -d
curl -X POST http://localhost:3000/api/seed
curl -X POST http://localhost:3000/api/seed-clinical
```

| Service | URL |
|---|---|
| API + Swagger | http://localhost:3000 |
| Frontend (Docker) | http://localhost:5173 |
| Frontend (dev) | `cd frontend && bun run dev` → http://localhost:5173 |
| PostgreSQL | localhost:5433 |
| pgAdmin | http://localhost:5050 |

---

*Demo by Frans Elstadt · Dedicated to Daisy 🐾*
