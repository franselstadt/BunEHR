-- ============================================================
-- BunEHR V2 Migration — Clinical Finance + ICD-10 + Medicare
-- ============================================================

-- ─── ICD-10 Code Registry ────────────────────────────────────
-- Stores the International Classification of Diseases 10th Revision
-- codes used for diagnosis documentation and medical billing.
-- Every composition and financial record links to an ICD-10 code.
CREATE TABLE icd10_code (
    code                 TEXT        NOT NULL PRIMARY KEY,
    description          TEXT        NOT NULL,
    category             TEXT        NOT NULL,        -- chapter code e.g. 'I', 'J', 'E'
    category_description TEXT        NOT NULL,        -- chapter name e.g. 'Diseases of the circulatory system'
    billable             BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_icd10_category   ON icd10_code(category);
CREATE INDEX idx_icd10_billable   ON icd10_code(billable) WHERE billable = TRUE;

-- Full-text search index on description for quick lookup
CREATE INDEX idx_icd10_desc_trgm  ON icd10_code USING GIN (description gin_trgm_ops);

-- ─── CPT Procedure Codes ─────────────────────────────────────
-- Current Procedural Terminology codes published by the AMA.
-- Each procedure has both Medicare reimbursement and typical
-- private-payer charge amounts.
CREATE TABLE procedure_code (
    code              TEXT           NOT NULL PRIMARY KEY,
    description       TEXT           NOT NULL,
    category          TEXT           NOT NULL,        -- e.g. 'Evaluation', 'Surgery', 'Radiology'
    medicare_rate     DECIMAL(10,2),                  -- CMS national average facility rate (USD)
    typical_charge    DECIMAL(10,2),                  -- Typical billed amount (USD)
    facility_fee      DECIMAL(10,2),                  -- Facility setting rate
    non_facility_fee  DECIMAL(10,2),                  -- Office setting rate
    rvu_work          DECIMAL(6,2),                   -- Relative Value Units - work component
    rvu_total         DECIMAL(6,2),                   -- Total RVUs
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_procedure_category ON procedure_code(category);
CREATE INDEX idx_procedure_desc_trgm ON procedure_code USING GIN (description gin_trgm_ops);

-- ─── ICD-10 → Procedure Code Mapping ─────────────────────────
-- Maps diagnoses to the procedures commonly performed for them.
-- Used by the Finance module to suggest appropriate billing codes.
CREATE TABLE icd10_procedure_map (
    id             TEXT NOT NULL PRIMARY KEY,
    icd10_code     TEXT NOT NULL REFERENCES icd10_code(code) ON DELETE CASCADE,
    procedure_code TEXT NOT NULL REFERENCES procedure_code(code) ON DELETE CASCADE,
    relationship   TEXT NOT NULL DEFAULT 'common',   -- 'primary', 'common', 'related'
    UNIQUE(icd10_code, procedure_code)
);

-- ─── Financial Records ────────────────────────────────────────
-- Patient billing records linking clinical encounters (compositions)
-- to diagnosis codes, procedure codes, and financial transactions.
CREATE TABLE financial_record (
    id                     TEXT           NOT NULL PRIMARY KEY,
    ehr_id                 TEXT           NOT NULL REFERENCES ehr(id) ON DELETE CASCADE,
    composition_id         TEXT,                                   -- links to composition.uid (soft ref)
    icd10_code             TEXT           REFERENCES icd10_code(code),
    procedure_code         TEXT           REFERENCES procedure_code(code),
    claim_number           TEXT,                                   -- insurance claim reference
    service_date           TIMESTAMPTZ    NOT NULL,
    billed_amount          DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    allowed_amount         DECIMAL(10,2),                          -- insurance allowed amount
    patient_responsibility DECIMAL(10,2)  DEFAULT 0.00,            -- copay + deductible
    insurance_payment      DECIMAL(10,2)  DEFAULT 0.00,
    patient_payment        DECIMAL(10,2)  DEFAULT 0.00,
    balance                DECIMAL(10,2)  DEFAULT 0.00,            -- outstanding balance
    status                 TEXT           NOT NULL DEFAULT 'PENDING',  -- PENDING, SUBMITTED, PAID, DENIED, APPEALED
    payer                  TEXT,                                   -- insurance company name
    payer_id               TEXT,                                   -- insurance member ID
    notes                  TEXT,
    created_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_financial_ehr        ON financial_record(ehr_id);
CREATE INDEX idx_financial_status     ON financial_record(status);
CREATE INDEX idx_financial_icd10      ON financial_record(icd10_code);
CREATE INDEX idx_financial_procedure  ON financial_record(procedure_code);
CREATE INDEX idx_financial_date       ON financial_record(service_date DESC);

-- ─── Medicare Eligibility ─────────────────────────────────────
-- Tracks Medicare enrollment status for patients.
-- Part A = hospital, Part B = medical, Part C = Advantage, Part D = drug.
CREATE TABLE medicare_eligibility (
    id               TEXT        NOT NULL PRIMARY KEY,
    ehr_id           TEXT        NOT NULL UNIQUE REFERENCES ehr(id) ON DELETE CASCADE,
    subject_id       TEXT        NOT NULL,
    medicare_id      TEXT,                        -- Medicare Beneficiary Identifier (MBI)
    part_a           BOOLEAN     DEFAULT FALSE,   -- Hospital insurance
    part_b           BOOLEAN     DEFAULT FALSE,   -- Medical insurance
    part_c           BOOLEAN     DEFAULT FALSE,   -- Medicare Advantage plan
    part_d           BOOLEAN     DEFAULT FALSE,   -- Prescription drug coverage
    effective_date   TIMESTAMPTZ,
    termination_date TIMESTAMPTZ,
    plan_name        TEXT,                        -- MA plan name if Part C
    group_number     TEXT,
    verified_at      TIMESTAMPTZ DEFAULT NOW(),
    status           TEXT        NOT NULL DEFAULT 'UNKNOWN'  -- ELIGIBLE, INELIGIBLE, UNKNOWN, PENDING
);

CREATE INDEX idx_medicare_status ON medicare_eligibility(status);
