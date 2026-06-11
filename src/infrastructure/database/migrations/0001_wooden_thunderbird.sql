CREATE TABLE "financial_record" (
	"id" text PRIMARY KEY NOT NULL,
	"ehr_id" text NOT NULL,
	"composition_id" text,
	"icd10_code" text,
	"procedure_code" text,
	"claim_number" text,
	"service_date" timestamp with time zone NOT NULL,
	"billed_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"allowed_amount" numeric(10, 2),
	"patient_responsibility" numeric(10, 2) DEFAULT '0',
	"insurance_payment" numeric(10, 2) DEFAULT '0',
	"patient_payment" numeric(10, 2) DEFAULT '0',
	"balance" numeric(10, 2) DEFAULT '0',
	"status" text DEFAULT 'PENDING' NOT NULL,
	"payer" text,
	"payer_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "icd10_code" (
	"code" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"category_description" text NOT NULL,
	"billable" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "icd10_procedure_map" (
	"id" text PRIMARY KEY NOT NULL,
	"icd10_code" text NOT NULL,
	"procedure_code" text NOT NULL,
	"relationship" text DEFAULT 'common' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medicare_eligibility" (
	"id" text PRIMARY KEY NOT NULL,
	"ehr_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"medicare_id" text,
	"part_a" boolean DEFAULT false,
	"part_b" boolean DEFAULT false,
	"part_c" boolean DEFAULT false,
	"part_d" boolean DEFAULT false,
	"effective_date" timestamp with time zone,
	"termination_date" timestamp with time zone,
	"plan_name" text,
	"group_number" text,
	"verified_at" timestamp with time zone DEFAULT now(),
	"status" text DEFAULT 'UNKNOWN' NOT NULL,
	CONSTRAINT "medicare_eligibility_ehr_id_unique" UNIQUE("ehr_id")
);
--> statement-breakpoint
CREATE TABLE "procedure_code" (
	"code" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"medicare_rate" numeric(10, 2),
	"typical_charge" numeric(10, 2),
	"facility_fee" numeric(10, 2),
	"non_facility_fee" numeric(10, 2),
	"rvu_work" numeric(6, 2),
	"rvu_total" numeric(6, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "financial_record" ADD CONSTRAINT "financial_record_ehr_id_ehr_id_fk" FOREIGN KEY ("ehr_id") REFERENCES "public"."ehr"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_record" ADD CONSTRAINT "financial_record_icd10_code_icd10_code_code_fk" FOREIGN KEY ("icd10_code") REFERENCES "public"."icd10_code"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_record" ADD CONSTRAINT "financial_record_procedure_code_procedure_code_code_fk" FOREIGN KEY ("procedure_code") REFERENCES "public"."procedure_code"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "icd10_procedure_map" ADD CONSTRAINT "icd10_procedure_map_icd10_code_icd10_code_code_fk" FOREIGN KEY ("icd10_code") REFERENCES "public"."icd10_code"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "icd10_procedure_map" ADD CONSTRAINT "icd10_procedure_map_procedure_code_procedure_code_code_fk" FOREIGN KEY ("procedure_code") REFERENCES "public"."procedure_code"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicare_eligibility" ADD CONSTRAINT "medicare_eligibility_ehr_id_ehr_id_fk" FOREIGN KEY ("ehr_id") REFERENCES "public"."ehr"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_financial_ehr" ON "financial_record" USING btree ("ehr_id");--> statement-breakpoint
CREATE INDEX "idx_financial_status" ON "financial_record" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_financial_date" ON "financial_record" USING btree ("service_date");--> statement-breakpoint
CREATE INDEX "idx_icd10_category" ON "icd10_code" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_procedure_category" ON "procedure_code" USING btree ("category");