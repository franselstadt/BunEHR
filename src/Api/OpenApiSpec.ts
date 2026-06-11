/**
 * OpenAPI 3.0 specification for the Meblock EHR API.
 *
 * Served at /api-docs (JSON spec) and /docs (Swagger UI).
 * Every endpoint includes clinical descriptions written for
 * both technical developers and clinical staff unfamiliar with openEHR.
 */
export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Meblock EHR — OpenEHR REST API v1",
    version: "1.0.0",
    description: `## Overview

**Meblock EHR** is a production-grade Electronic Health Record system implementing the
[openEHR REST API v1](https://specifications.openehr.org/releases/ITS-REST/Release-1.0.3/) specification.

Built with **Bun + Hono + Drizzle ORM + PostgreSQL 16**, it provides a standards-compliant,
interoperable EHR backend that works with any openEHR-compatible client.

## What is openEHR?

openEHR is an open international standard for electronic health records. Unlike HL7 FHIR
(which focuses on message exchange), openEHR focuses on **persistent, queryable clinical
knowledge representation** — how clinical data is structured, versioned, and queried.

Key concepts:
- **EHR** — One digital record per patient, identified by a UUID
- **COMPOSITION** — A clinical document (blood pressure, prescription, encounter note)
- **ARCHETYPE** — An internationally agreed template defining how clinical data is structured
- **AQL** — Archetype Query Language — SQL equivalent for clinical data
- **CONTRIBUTION** — A recorded change-set with a mandatory audit trail

## Authentication

This demo deployment has no authentication. Production deployments should add
JWT/OIDC middleware before all \`/v1\` routes.

## Versioning

All clinical objects use openEHR's **append-only versioning**:
- Version UIDs follow the format: \`uuid::system_id::version_number\`
- Example: \`abc-123::local.bunehr.com::3\`
- Updates INSERT new rows — nothing is ever overwritten
- \`If-Match\` headers enforce optimistic locking on updates

## Response Format

All responses use **openEHR canonical JSON** with snake_case keys.
Errors follow [RFC 7807 Problem Details](https://tools.ietf.org/html/rfc7807).`,
    contact: {
      name: "Meblock EHR",
      url: "https://medblocks.com",
    },
    license: {
      name: "Apache 2.0",
      url: "https://www.apache.org/licenses/LICENSE-2.0",
    },
  },
  servers: [
    { url: "http://localhost:3000", description: "Local development (Docker)" },
    { url: "http://localhost:3000", description: "Docker Compose stack" },
  ],
  tags: [
    { name: "Health",       description: "Service health and system information" },
    { name: "EHR",          description: "**Electronic Health Records** — one per patient. The root object linking all clinical data. Every patient has exactly one EHR identified by a globally unique UUID (ehrId)." },
    { name: "EHR_STATUS",   description: "**EHR Status** — metadata about an EHR: who it belongs to (subject reference), whether it's queryable, and whether it's modifiable. Every update creates a new immutable version row in PostgreSQL." },
    { name: "COMPOSITION",  description: "**Clinical Documents** — the core of openEHR. Every piece of clinical data (blood pressure, medications, encounter notes, discharge summaries) is a COMPOSITION stored as JSONB in PostgreSQL. All updates create new immutable versions — nothing is ever overwritten." },
    { name: "CONTRIBUTION", description: "**Change Sets** — groups multiple clinical updates into a single audited transaction. Every CONTRIBUTION records who made the change, when, and why. Required for HIPAA/GDPR compliance." },
    { name: "DIRECTORY",    description: "**Folder Structure** — organises compositions within an EHR into a hierarchical tree (e.g. Encounters/, Medications/, LabResults/). One directory per EHR, backed by a JSONB column." },
    { name: "QUERY",        description: "**AQL Queries** — Archetype Query Language is the openEHR equivalent of SQL. Query across all patients' clinical data using structured archetype paths. Also supports saving named, versioned queries." },
    { name: "DEFINITION",   description: "**Clinical Templates** — schema registry for composition structures. Upload Operational Templates (OPT) in ADL 1.4 or ADL 2 format. Templates define what fields a composition type can contain." },
    { name: "Patient API",  description: "**Frontend BFF Layer** — convenience API combining openEHR EHR data with demographic summaries. Returns enriched patient objects ready for the dashboard UI." },
  ],
  components: {
    schemas: {
      HierObjectId: {
        type: "object",
        description: "A globally unique identifier wrapped in an object. The value is a UUID string.",
        properties: { value: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" } },
        required: ["value"],
      },
      ObjectVersionId: {
        type: "object",
        description: "An openEHR version identifier in format `uuid::system_id::version_number`. Uniquely identifies a specific version of a versioned object.",
        properties: { value: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000::local.bunehr.com::1" } },
        required: ["value"],
      },
      TerminologyId: {
        type: "object",
        properties: { value: { type: "string", example: "ISO_639-1" } },
        required: ["value"],
      },
      CodePhrase: {
        type: "object",
        description: "A coded value from a terminology system (e.g. SNOMED CT, LOINC, ISO 639-1).",
        properties: {
          terminology_id: { $ref: "#/components/schemas/TerminologyId" },
          code_string: { type: "string", example: "en" },
        },
        required: ["terminology_id", "code_string"],
      },
      DvText: {
        type: "object",
        description: "A plain text value in the openEHR data value hierarchy.",
        properties: { value: { type: "string" } },
        required: ["value"],
      },
      DvCodedText: {
        type: "object",
        description: "A coded text value — a human-readable label paired with a machine-readable code from a terminology system.",
        properties: {
          value: { type: "string" },
          defining_code: { $ref: "#/components/schemas/CodePhrase" },
        },
        required: ["value", "defining_code"],
      },
      DvDateTime: {
        type: "object",
        description: "An ISO 8601 datetime string. Always timezone-aware (UTC recommended).",
        properties: { value: { type: "string", format: "date-time", example: "2026-06-10T14:00:00Z" } },
        required: ["value"],
      },
      PartyRef: {
        type: "object",
        description: "A reference to an external party (patient, clinician) in a demographics system.",
        properties: {
          id: { $ref: "#/components/schemas/HierObjectId" },
          namespace: { type: "string", example: "local" },
          type: { type: "string", example: "PERSON" },
        },
        required: ["id", "namespace", "type"],
      },
      PartySelf: {
        type: "object",
        description: "Represents the subject (patient) of an EHR. Contains an optional reference to the patient in an external demographics system.",
        properties: {
          external_ref: { $ref: "#/components/schemas/PartyRef" },
        },
      },
      PartyIdentified: {
        type: "object",
        description: "An identified party — a clinician, organisation, or other named entity.",
        properties: {
          name: { type: "string", example: "Dr. Jane Smith" },
          external_ref: { $ref: "#/components/schemas/PartyRef" },
        },
        required: ["name"],
      },
      EhrStatusResponse: {
        type: "object",
        description: "The status of an EHR — who it belongs to, and its queryability/modifiability flags. Every change creates a new immutable version.",
        properties: {
          uid: { $ref: "#/components/schemas/ObjectVersionId" },
          archetype_node_id: { type: "string", example: "openEHR-EHR-EHR_STATUS.generic.v1" },
          name: { $ref: "#/components/schemas/DvText" },
          subject: { $ref: "#/components/schemas/PartySelf" },
          is_queryable: { type: "boolean", description: "Whether this EHR can be included in AQL query results", example: true },
          is_modifiable: { type: "boolean", description: "Whether this EHR's compositions can be modified", example: true },
        },
        required: ["uid", "subject", "is_queryable", "is_modifiable"],
      },
      EhrResponse: {
        type: "object",
        description: "A complete Electronic Health Record object.",
        properties: {
          ehr_id: { $ref: "#/components/schemas/HierObjectId" },
          system_id: { $ref: "#/components/schemas/HierObjectId" },
          ehr_status: { $ref: "#/components/schemas/EhrStatusResponse" },
          time_created: { $ref: "#/components/schemas/DvDateTime" },
        },
        required: ["ehr_id", "system_id", "ehr_status", "time_created"],
      },
      CreateEhrRequest: {
        type: "object",
        description: "Request body for creating an EHR. All fields are optional — an EHR can be created with default values.",
        properties: {
          ehr_id: { $ref: "#/components/schemas/HierObjectId" },
          ehr_status: {
            type: "object",
            properties: {
              subject: { $ref: "#/components/schemas/PartySelf" },
              is_queryable: { type: "boolean", default: true },
              is_modifiable: { type: "boolean", default: true },
            },
          },
        },
      },
      ArchetypeDetails: {
        type: "object",
        description: "References the archetype and template that define this composition's structure.",
        properties: {
          archetype_id: { $ref: "#/components/schemas/HierObjectId" },
          template_id: { $ref: "#/components/schemas/HierObjectId" },
          rm_version: { type: "string", example: "1.1.0" },
        },
        required: ["archetype_id", "template_id"],
      },
      CompositionResponse: {
        type: "object",
        description: "A clinical document conforming to a specific openEHR archetype. The content field contains the full structured clinical data as JSONB.",
        properties: {
          uid: { $ref: "#/components/schemas/ObjectVersionId" },
          archetype_node_id: { type: "string", example: "openEHR-EHR-COMPOSITION.encounter.v1" },
          name: { $ref: "#/components/schemas/DvText" },
          archetype_details: { $ref: "#/components/schemas/ArchetypeDetails" },
          language: { $ref: "#/components/schemas/CodePhrase" },
          territory: { $ref: "#/components/schemas/CodePhrase" },
          category: { $ref: "#/components/schemas/DvCodedText" },
          composer: { $ref: "#/components/schemas/PartyIdentified" },
        },
      },
      AqlQueryRequest: {
        type: "object",
        description: "An AQL query request. AQL (Archetype Query Language) is the openEHR equivalent of SQL — queries traverse the clinical model using archetype paths.",
        properties: {
          q: {
            type: "string",
            description: "The AQL query string. Must start with SELECT. Example paths: e/ehr_id/value, c/uid/value, c/name/value",
            example: "SELECT e/ehr_id/value, c/uid/value FROM EHR e CONTAINS COMPOSITION c",
          },
          offset: { type: "integer", minimum: 0, description: "Number of rows to skip (pagination)", example: 0 },
          fetch: { type: "integer", minimum: 1, description: "Maximum number of rows to return", example: 20 },
          query_parameters: {
            type: "object",
            description: "Named parameters referenced in the AQL query with $paramName syntax",
            additionalProperties: true,
          },
        },
        required: ["q"],
      },
      AqlQueryResponse: {
        type: "object",
        description: "AQL query result set. Rows are arrays aligned by index with the columns array.",
        properties: {
          q: { type: "string", description: "The executed AQL query" },
          columns: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                path: { type: "string" },
              },
            },
          },
          rows: {
            type: "array",
            items: { type: "array", items: {} },
            description: "Result rows — each row is an array of values aligned with the columns array",
          },
          meta: {
            type: "object",
            properties: {
              generator: { type: "string" },
              executed_aql: { type: "string" },
              created: { type: "string" },
            },
          },
        },
      },
      ProblemDetail: {
        type: "object",
        description: "RFC 7807 Problem Details — standard error response format.",
        properties: {
          type: { type: "string", example: "https://specifications.openehr.org/releases/ITS-REST/latest" },
          title: { type: "string", example: "Not Found" },
          status: { type: "integer", example: 404 },
          detail: { type: "string", example: "EHR not found: 550e8400-..." },
          instance: { type: "string", example: "/v1/ehr/550e8400-..." },
          timestamp: { type: "string", format: "date-time" },
        },
      },
    },
    parameters: {
      EhrId: {
        name: "ehr_id",
        in: "path",
        required: true,
        description: "The EHR's unique identifier (UUID)",
        schema: { type: "string", format: "uuid", example: "550e8400-e29b-41d4-a716-446655440000" },
      },
      VersionedObjectUid: {
        name: "versioned_object_uid",
        in: "path",
        required: true,
        description: "Full version uid (`uuid::system_id::version`) or just the object uuid for the latest version",
        schema: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000::local.bunehr.com::1" },
      },
      IfMatch: {
        name: "If-Match",
        in: "header",
        required: true,
        description: "Current version uid (quoted) — prevents lost updates. Get this from the ETag header of the last GET response.",
        schema: { type: "string", example: '"550e8400-e29b-41d4-a716-446655440000::local.bunehr.com::1"' },
      },
      Prefer: {
        name: "Prefer",
        in: "header",
        required: false,
        description: "Set to `return=representation` to include the created/updated object in the response body (default: only headers returned on 201).",
        schema: { type: "string", enum: ["return=representation", "return=minimal"] },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        description: "Returns the service status, version, and current timestamp. Use to verify the container is running and ready.",
        operationId: "getHealth",
        responses: {
          "200": {
            description: "Service is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", enum: ["UP"], example: "UP" },
                    service: { type: "string", example: "BunEHR" },
                    version: { type: "string", example: "1.0.0" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/seed": {
      post: {
        tags: ["Patient API"],
        summary: "Seed sample patient data",
        description: "Creates 12 sample patient EHRs in PostgreSQL representing realistic clinical scenarios across all hospital wards (Emergency, ICU, Cardiology, etc.). Also broadcasts a WebSocket event for each patient. **Run once per fresh database.**",
        operationId: "seedData",
        responses: {
          "200": { description: "Seed complete", content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, count: { type: "integer" } } } } } },
          "500": { description: "Seed error", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
        },
      },
    },
    "/api/patients": {
      get: {
        tags: ["Patient API"],
        summary: "List all patients",
        description: "Returns all 12 sample patients with enriched demographics, ward assignments, current vital signs, status (CRITICAL/ADMITTED/STABLE etc.), and GPS coordinates for the hospital map. Merges sample data with actual EHR IDs from PostgreSQL.",
        operationId: "listPatients",
        responses: {
          "200": { description: "Patient list", content: { "application/json": { schema: { type: "array", items: { type: "object" } } } } },
        },
      },
    },
    "/api/patients/{patient_id}": {
      get: {
        tags: ["Patient API"],
        summary: "Get patient by ID",
        description: "Returns a single patient's full record. Use `ehr-001` through `ehr-012` after running the seed endpoint.",
        operationId: "getPatient",
        parameters: [{ name: "patient_id", in: "path", required: true, schema: { type: "string", example: "ehr-001" } }],
        responses: {
          "200": { description: "Patient found" },
          "404": { description: "Patient not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
        },
      },
    },
    "/api/patients/{patient_id}/vitals": {
      get: {
        tags: ["Patient API"],
        summary: "Get 24-hour vital sign trend",
        description: "Returns 24 hourly vital sign readings: systolic BP, diastolic BP, heart rate, SpO₂, and temperature. Simulated with realistic clinical jitter — used by the frontend vital trend chart.",
        operationId: "getPatientVitals",
        parameters: [{ name: "patient_id", in: "path", required: true, schema: { type: "string", example: "ehr-001" } }],
        responses: {
          "200": { description: "24 hourly readings", content: { "application/json": { schema: { type: "array", minItems: 24, maxItems: 24 } } } },
          "404": { description: "Patient not found" },
        },
      },
    },
    "/v1/ehr": {
      post: {
        tags: ["EHR"],
        summary: "Create EHR (auto-generated ID)",
        description: "Creates a new Electronic Health Record with a server-generated UUID. Returns `201 Created` with a `Location` header pointing to the new EHR.\n\nUse `Prefer: return=representation` to include the full EHR in the response body.\n\n**Conflict:** Returns `409` if an EHR already exists for the given subject_id + subject_namespace combination.",
        operationId: "createEhr",
        parameters: [{ $ref: "#/components/parameters/Prefer" }],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateEhrRequest" } } },
        },
        responses: {
          "201": {
            description: "EHR created. Location header contains the URL of the new EHR.",
            headers: {
              Location: { schema: { type: "string" }, description: "URL of the created EHR: /v1/ehr/{ehr_id}" },
              ETag: { schema: { type: "string" }, description: "Current EHR_STATUS version uid (quoted)" },
            },
            content: { "application/json": { schema: { $ref: "#/components/schemas/EhrResponse" } } },
          },
          "409": { description: "EHR already exists for this subject", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
        },
      },
      get: {
        tags: ["EHR"],
        summary: "Get EHR by subject ID",
        description: "Finds an EHR using the patient's external subject identifier. Useful when you only have the patient ID from your demographics system, not the openEHR EHR UUID.",
        operationId: "getEhrBySubject",
        parameters: [
          { name: "subject_id", in: "query", required: true, schema: { type: "string" }, example: "patient-001", description: "Patient ID in the external demographics system" },
          { name: "subject_namespace", in: "query", required: false, schema: { type: "string", default: "local" }, description: "Namespace of the demographics system" },
        ],
        responses: {
          "200": { description: "EHR found", content: { "application/json": { schema: { $ref: "#/components/schemas/EhrResponse" } } } },
          "404": { description: "No EHR found for this subject", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
        },
      },
    },
    "/v1/ehr/{ehr_id}": {
      put: {
        tags: ["EHR"],
        summary: "Create EHR with specific ID",
        description: "Creates a new EHR with a **client-specified UUID**. Useful when migrating existing patient records that already have assigned identifiers from another system.",
        operationId: "createEhrWithId",
        parameters: [{ $ref: "#/components/parameters/EhrId" }, { $ref: "#/components/parameters/Prefer" }],
        requestBody: { required: false, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateEhrRequest" } } } },
        responses: {
          "201": { description: "EHR created", content: { "application/json": { schema: { $ref: "#/components/schemas/EhrResponse" } } } },
          "409": { description: "EHR with this ID already exists", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
        },
      },
      get: {
        tags: ["EHR"],
        summary: "Get EHR by ID",
        description: "Retrieves the full EHR including the current EHR_STATUS. The `ETag` response header contains the current EHR_STATUS version uid — save it for subsequent update requests.",
        operationId: "getEhr",
        parameters: [{ $ref: "#/components/parameters/EhrId" }],
        responses: {
          "200": {
            description: "EHR found",
            headers: { ETag: { schema: { type: "string" }, description: "Current EHR_STATUS version uid" } },
            content: { "application/json": { schema: { $ref: "#/components/schemas/EhrResponse" } } },
          },
          "404": { description: "EHR not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
        },
      },
    },
    "/v1/ehr/{ehr_id}/ehr_status": {
      get: {
        tags: ["EHR_STATUS"],
        summary: "Get current EHR_STATUS",
        description: "Returns the current EHR_STATUS — who the EHR belongs to and its queryability/modifiability settings. The `ETag` header contains the version uid required for updates.",
        operationId: "getEhrStatus",
        parameters: [{ $ref: "#/components/parameters/EhrId" }],
        responses: {
          "200": {
            description: "Current EHR_STATUS",
            headers: { ETag: { schema: { type: "string" }, description: "Current version uid — use in If-Match for updates" } },
            content: { "application/json": { schema: { $ref: "#/components/schemas/EhrStatusResponse" } } },
          },
          "404": { description: "EHR not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
        },
      },
      put: {
        tags: ["EHR_STATUS"],
        summary: "Update EHR_STATUS",
        description: "Updates EHR_STATUS. The `If-Match` header with the current version uid is **required** — this is openEHR's optimistic locking mechanism to prevent concurrent update conflicts.\n\nInternally, this **INSERTs a new row** in the `ehr_status` PostgreSQL table — the old version is preserved permanently for audit purposes.\n\n**Returns `412 Precondition Failed`** if the version has changed since you last read it.\n**Returns `428 Precondition Required`** if the `If-Match` header is missing.",
        operationId: "updateEhrStatus",
        parameters: [{ $ref: "#/components/parameters/EhrId" }, { $ref: "#/components/parameters/IfMatch" }, { $ref: "#/components/parameters/Prefer" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  subject: { $ref: "#/components/schemas/PartySelf" },
                  is_queryable: { type: "boolean" },
                  is_modifiable: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "EHR_STATUS updated", content: { "application/json": { schema: { $ref: "#/components/schemas/EhrStatusResponse" } } } },
          "404": { description: "EHR not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
          "412": { description: "Version mismatch — someone else updated this EHR_STATUS since you last read it", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
          "428": { description: "If-Match header is required but missing", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
        },
      },
    },
    "/v1/ehr/{ehr_id}/ehr_status/{version_uid}": {
      get: {
        tags: ["EHR_STATUS"],
        summary: "Get EHR_STATUS at version",
        description: "Time-travel query — retrieves a specific historical version of EHR_STATUS. Every past state of the EHR_STATUS is preserved in the append-only `ehr_status` table.",
        operationId: "getEhrStatusAtVersion",
        parameters: [{ $ref: "#/components/parameters/EhrId" }, { $ref: "#/components/parameters/VersionedObjectUid" }],
        responses: {
          "200": { description: "Historical EHR_STATUS version", content: { "application/json": { schema: { $ref: "#/components/schemas/EhrStatusResponse" } } } },
          "404": { description: "EHR or version not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
        },
      },
    },
    "/v1/ehr/{ehr_id}/versioned_ehr_status": {
      get: {
        tags: ["EHR_STATUS"],
        summary: "Get versioned EHR_STATUS (full history)",
        description: "Returns the complete revision history of this EHR's status — every change ever made with timestamps and audit details. Backed by PostgreSQL's append-only `ehr_status` table with TIMESTAMPTZ columns.",
        operationId: "getVersionedEhrStatus",
        parameters: [{ $ref: "#/components/parameters/EhrId" }],
        responses: {
          "200": { description: "Full EHR_STATUS revision history" },
          "404": { description: "EHR not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
        },
      },
    },
    "/v1/ehr/{ehr_id}/composition": {
      post: {
        tags: ["COMPOSITION"],
        summary: "Create COMPOSITION",
        description: "Creates a new clinical document (COMPOSITION) stored as **JSONB** in PostgreSQL with a GIN index for fast JSON path queries.\n\nVersion uid format: `uuid::local.bunehr.com::1`\n\nThe `content` field can contain any valid openEHR structure — blood pressure observations, medication orders, encounter notes, etc. The `archetype_details.template_id` determines which template validates the content.",
        operationId: "createComposition",
        parameters: [{ $ref: "#/components/parameters/EhrId" }, { $ref: "#/components/parameters/Prefer" }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CompositionResponse" } } },
        },
        responses: {
          "201": {
            description: "COMPOSITION created",
            headers: {
              Location: { schema: { type: "string" }, description: "/v1/ehr/{ehr_id}/composition/{version_uid}" },
              ETag: { schema: { type: "string" }, description: "Version uid of the created composition" },
            },
            content: { "application/json": { schema: { $ref: "#/components/schemas/CompositionResponse" } } },
          },
          "404": { description: "EHR not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
          "422": { description: "Validation error — invalid composition structure", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
        },
      },
    },
    "/v1/ehr/{ehr_id}/composition/{versioned_object_uid}": {
      get: {
        tags: ["COMPOSITION"],
        summary: "Get COMPOSITION",
        description: "Retrieves a COMPOSITION by its full versioned uid OR by just the object UUID (returns the latest version). Add `?version_at_time=ISO8601` to get the version active at a specific point in time.",
        operationId: "getComposition",
        parameters: [
          { $ref: "#/components/parameters/EhrId" },
          { $ref: "#/components/parameters/VersionedObjectUid" },
          { name: "version_at_time", in: "query", required: false, schema: { type: "string", format: "date-time" }, description: "Return the composition version active at this point in time" },
        ],
        responses: {
          "200": {
            description: "COMPOSITION retrieved",
            headers: { ETag: { schema: { type: "string" }, description: "Current version uid" } },
            content: { "application/json": { schema: { $ref: "#/components/schemas/CompositionResponse" } } },
          },
          "404": { description: "COMPOSITION not found or deleted", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
        },
      },
      put: {
        tags: ["COMPOSITION"],
        summary: "Update COMPOSITION",
        description: "Updates a COMPOSITION by **INSERTing a new version row** (`version::2`) in PostgreSQL. The original version is preserved forever — this is openEHR's append-only versioning model required for clinical audit trails.\n\nRequires `If-Match` with the current version uid.",
        operationId: "updateComposition",
        parameters: [{ $ref: "#/components/parameters/EhrId" }, { $ref: "#/components/parameters/VersionedObjectUid" }, { $ref: "#/components/parameters/IfMatch" }, { $ref: "#/components/parameters/Prefer" }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CompositionResponse" } } } },
        responses: {
          "200": { description: "COMPOSITION updated — new version created", content: { "application/json": { schema: { $ref: "#/components/schemas/CompositionResponse" } } } },
          "412": { description: "Version conflict — composition was modified by someone else", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
        },
      },
      delete: {
        tags: ["COMPOSITION"],
        summary: "Delete COMPOSITION (logical)",
        description: "Performs a **logical delete** — creates a new version with `lifecycle_state = 'DELETED'`. The original data is NEVER removed from PostgreSQL. This is required by healthcare regulations (HIPAA, GDPR Article 17 exemptions for medical data) — clinical records must be preserved.",
        operationId: "deleteComposition",
        parameters: [{ $ref: "#/components/parameters/EhrId" }, { $ref: "#/components/parameters/VersionedObjectUid" }],
        responses: {
          "204": { description: "COMPOSITION logically deleted — new DELETED version created" },
          "404": { description: "COMPOSITION not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
        },
      },
    },
    "/v1/ehr/{ehr_id}/versioned_composition/{versioned_object_uid}": {
      get: {
        tags: ["COMPOSITION"],
        summary: "Get versioned COMPOSITION (full history)",
        description: "Returns the complete revision history of a COMPOSITION — every version with timestamps, composers, and audit details.",
        operationId: "getVersionedComposition",
        parameters: [{ $ref: "#/components/parameters/EhrId" }, { $ref: "#/components/parameters/VersionedObjectUid" }],
        responses: {
          "200": { description: "Full COMPOSITION revision history" },
          "404": { description: "COMPOSITION not found" },
        },
      },
    },
    "/v1/ehr/{ehr_id}/contribution": {
      post: {
        tags: ["CONTRIBUTION"],
        summary: "Create CONTRIBUTION",
        description: "Creates a CONTRIBUTION — a recorded change-set grouping one or more versioned objects committed together with a mandatory audit entry.\n\nEvery CONTRIBUTION records: who made the change (`committer`), when (`time_committed`), and why (`change_type` + optional `description`).\n\nThis is essential for HIPAA/GDPR compliance — all changes to patient records must have a documented audit trail.",
        operationId: "createContribution",
        parameters: [{ $ref: "#/components/parameters/EhrId" }, { $ref: "#/components/parameters/Prefer" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  versions: { type: "array", items: { type: "object" }, description: "Versioned objects being committed" },
                  audit: {
                    type: "object",
                    properties: {
                      committer: { $ref: "#/components/schemas/PartyIdentified" },
                      change_type: { $ref: "#/components/schemas/DvCodedText" },
                      description: { $ref: "#/components/schemas/DvText" },
                    },
                    required: ["committer", "change_type"],
                  },
                },
                required: ["versions", "audit"],
              },
            },
          },
        },
        responses: {
          "201": { description: "CONTRIBUTION created", headers: { Location: { schema: { type: "string" } } } },
          "404": { description: "EHR not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
        },
      },
    },
    "/v1/ehr/{ehr_id}/contribution/{contribution_uid}": {
      get: {
        tags: ["CONTRIBUTION"],
        summary: "Get CONTRIBUTION",
        description: "Retrieves a CONTRIBUTION with its complete audit details and list of versioned objects included in the change-set.",
        operationId: "getContribution",
        parameters: [{ $ref: "#/components/parameters/EhrId" }, { name: "contribution_uid", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "CONTRIBUTION retrieved" },
          "404": { description: "CONTRIBUTION not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
        },
      },
    },
    "/v1/ehr/{ehr_id}/directory": {
      post: {
        tags: ["DIRECTORY"],
        summary: "Create DIRECTORY",
        description: "Creates a folder hierarchy for this EHR. One directory per EHR — enforced by a `UNIQUE` constraint on `ehr_id` in PostgreSQL. Folders are stored as a JSONB array of `ObjectRef` items.",
        operationId: "createDirectory",
        parameters: [{ $ref: "#/components/parameters/EhrId" }, { $ref: "#/components/parameters/Prefer" }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { $ref: "#/components/schemas/DvText" }, folders: { type: "array", items: { type: "object" } } } } } } },
        responses: {
          "201": { description: "DIRECTORY created", headers: { ETag: { schema: { type: "string" } } } },
          "409": { description: "DIRECTORY already exists for this EHR", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
        },
      },
      get: {
        tags: ["DIRECTORY"],
        summary: "Get current DIRECTORY",
        description: "Returns the current folder structure for this EHR. The `ETag` header contains the version uid needed for updates.",
        operationId: "getDirectory",
        parameters: [{ $ref: "#/components/parameters/EhrId" }, { name: "version_at_time", in: "query", required: false, schema: { type: "string" }, description: "Return directory as it was at this time" }],
        responses: {
          "200": { description: "DIRECTORY found", headers: { ETag: { schema: { type: "string" } } } },
          "404": { description: "No DIRECTORY for this EHR", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
        },
      },
      put: {
        tags: ["DIRECTORY"],
        summary: "Update DIRECTORY",
        description: "Updates the folder structure. Requires `If-Match` with current version uid. Internally performs a delete-then-insert with an incremented version id.",
        operationId: "updateDirectory",
        parameters: [{ $ref: "#/components/parameters/EhrId" }, { $ref: "#/components/parameters/IfMatch" }, { $ref: "#/components/parameters/Prefer" }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: {
          "200": { description: "DIRECTORY updated" },
          "412": { description: "Version conflict", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
        },
      },
      delete: {
        tags: ["DIRECTORY"],
        summary: "Delete DIRECTORY",
        description: "Permanently deletes the directory and all folder metadata. Requires `If-Match`.",
        operationId: "deleteDirectory",
        parameters: [{ $ref: "#/components/parameters/EhrId" }, { $ref: "#/components/parameters/IfMatch" }],
        responses: {
          "204": { description: "DIRECTORY deleted" },
          "412": { description: "Version conflict", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
        },
      },
    },
    "/v1/query/aql": {
      get: {
        tags: ["QUERY"],
        summary: "Execute AQL (GET)",
        description: "Execute an AQL query passed as the `q` query parameter. AQL is the openEHR equivalent of SQL — queries traverse the clinical model using archetype paths rather than database tables.",
        operationId: "executeAqlGet",
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string" }, description: "The AQL query string", example: "SELECT e/ehr_id/value FROM EHR e" },
          { name: "fetch", in: "query", required: false, schema: { type: "integer", default: 20 }, description: "Max rows to return" },
          { name: "offset", in: "query", required: false, schema: { type: "integer", default: 0 }, description: "Rows to skip (pagination)" },
        ],
        responses: {
          "200": { description: "Query results", content: { "application/json": { schema: { $ref: "#/components/schemas/AqlQueryResponse" } } } },
          "400": { description: "Invalid AQL query", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
        },
      },
      post: {
        tags: ["QUERY"],
        summary: "Execute AQL (POST)",
        description: "Execute an AQL query in the request body. Preferred over the GET variant for complex queries with parameters.\n\nAQL example:\n```\nSELECT e/ehr_id/value, c/uid/value, c/name/value\nFROM EHR e CONTAINS COMPOSITION c\nWHERE e/ehr_id/value = $ehrId\n```",
        operationId: "executeAqlPost",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AqlQueryRequest" } } } },
        responses: {
          "200": { description: "Query results", content: { "application/json": { schema: { $ref: "#/components/schemas/AqlQueryResponse" } } } },
          "400": { description: "Invalid AQL", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
        },
      },
    },
    "/v1/query/stored-queries": {
      get: {
        tags: ["QUERY"],
        summary: "List stored queries",
        description: "Lists all named, versioned AQL queries saved in the `stored_query` PostgreSQL table.",
        operationId: "listStoredQueries",
        parameters: [{ name: "qualified_query_name", in: "query", required: false, schema: { type: "string" }, description: "Filter by query name prefix" }],
        responses: { "200": { description: "List of stored queries" } },
      },
    },
    "/v1/query/stored-queries/{qualified_query_name}/{version}": {
      put: {
        tags: ["QUERY"],
        summary: "Save stored query",
        description: "Saves a named, versioned AQL query. Qualified name format: `organisation::query-name`. Version follows semantic versioning. Upserts on conflict.",
        operationId: "saveStoredQuery",
        parameters: [
          { name: "qualified_query_name", in: "path", required: true, schema: { type: "string" }, example: "org.bunehr::all-compositions" },
          { name: "version", in: "path", required: true, schema: { type: "string" }, example: "1.0.0" },
        ],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { q: { type: "string" }, type: { type: "string", default: "aql" } }, required: ["q"] } } } },
        responses: { "200": { description: "Stored query saved" } },
      },
    },
    "/v1/definition/template/adl1.4": {
      post: {
        tags: ["DEFINITION"],
        summary: "Upload ADL 1.4 template",
        description: "Uploads an Operational Template (OPT) in ADL 1.4 XML format. The template_id is extracted from the XML `<template_id>` element. Templates define what fields a composition type can contain.",
        operationId: "uploadAdl14Template",
        parameters: [{ $ref: "#/components/parameters/Prefer" }],
        requestBody: { required: true, content: { "application/xml": { schema: { type: "string" } } } },
        responses: {
          "201": { description: "Template uploaded", headers: { Location: { schema: { type: "string" } } } },
          "409": { description: "Template with this ID already exists" },
        },
      },
      get: {
        tags: ["DEFINITION"],
        summary: "List ADL 1.4 templates",
        description: "Lists all ADL 1.4 templates in the `template_definition` table.",
        operationId: "listAdl14Templates",
        responses: { "200": { description: "Template list" } },
      },
    },
    "/v1/definition/template/adl1.4/{template_id}": {
      get: {
        tags: ["DEFINITION"],
        summary: "Get ADL 1.4 template",
        description: "Retrieves a specific template including its full ADL/XML content.",
        operationId: "getAdl14Template",
        parameters: [{ name: "template_id", in: "path", required: true, schema: { type: "string" }, example: "KotlinEHR-Encounter.v1" }],
        responses: {
          "200": { description: "Template found" },
          "404": { description: "Template not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemDetail" } } } },
        },
      },
    },
    "/v1/definition/template/adl1.4/{template_id}/example": {
      get: {
        tags: ["DEFINITION"],
        summary: "Get example COMPOSITION",
        description: "Returns a skeleton COMPOSITION conforming to this template — useful as a starting point for building composition POST/PUT request bodies.",
        operationId: "getExampleComposition",
        parameters: [{ name: "template_id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Example composition" },
          "404": { description: "Template not found" },
        },
      },
    },
  },
} as const
