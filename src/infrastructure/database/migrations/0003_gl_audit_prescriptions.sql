CREATE TABLE "gl_account" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"parent_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gl_account_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "gl_journal_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_number" text NOT NULL,
	"entry_date" timestamp with time zone NOT NULL,
	"description" text NOT NULL,
	"source_type" text,
	"source_id" text,
	"posted_by" text DEFAULT 'system' NOT NULL,
	"status" text DEFAULT 'POSTED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gl_journal_entry_entry_number_unique" UNIQUE("entry_number")
);
--> statement-breakpoint
CREATE TABLE "gl_journal_line" (
	"id" text PRIMARY KEY NOT NULL,
	"journal_entry_id" text NOT NULL,
	"account_id" text NOT NULL,
	"line_number" integer NOT NULL,
	"description" text,
	"debit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"credit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_event" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"action" text NOT NULL,
	"actor" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prescription" (
	"id" text PRIMARY KEY NOT NULL,
	"ehr_id" text NOT NULL,
	"composition_id" text,
	"rx_number" text NOT NULL,
	"medication_code" text,
	"medication_name" text NOT NULL,
	"dose" text NOT NULL,
	"route" text NOT NULL,
	"frequency" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"refills" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"prescriber_name" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prescription_rx_number_unique" UNIQUE("rx_number")
);
--> statement-breakpoint
CREATE TABLE "prescription_fill" (
	"id" text PRIMARY KEY NOT NULL,
	"prescription_id" text NOT NULL,
	"filled_at" timestamp with time zone NOT NULL,
	"quantity_dispensed" numeric(10, 2) NOT NULL,
	"pharmacy_name" text NOT NULL,
	"dispensed_by" text,
	"status" text DEFAULT 'FILLED' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gl_journal_line" ADD CONSTRAINT "gl_journal_line_journal_entry_id_gl_journal_entry_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."gl_journal_entry"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gl_journal_line" ADD CONSTRAINT "gl_journal_line_account_id_gl_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."gl_account"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "prescription" ADD CONSTRAINT "prescription_ehr_id_ehr_id_fk" FOREIGN KEY ("ehr_id") REFERENCES "public"."ehr"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "prescription_fill" ADD CONSTRAINT "prescription_fill_prescription_id_prescription_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescription"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_gl_account_type" ON "gl_account" USING btree ("type");
--> statement-breakpoint
CREATE INDEX "idx_gl_journal_entry_date" ON "gl_journal_entry" USING btree ("entry_date");
--> statement-breakpoint
CREATE INDEX "idx_gl_journal_line_journal" ON "gl_journal_line" USING btree ("journal_entry_id");
--> statement-breakpoint
CREATE INDEX "idx_gl_journal_line_account" ON "gl_journal_line" USING btree ("account_id");
--> statement-breakpoint
CREATE INDEX "idx_audit_event_aggregate" ON "audit_event" USING btree ("aggregate_type","aggregate_id");
--> statement-breakpoint
CREATE INDEX "idx_audit_event_created" ON "audit_event" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "idx_prescription_ehr" ON "prescription" USING btree ("ehr_id");
--> statement-breakpoint
CREATE INDEX "idx_prescription_status" ON "prescription" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "idx_prescription_fill_rx" ON "prescription_fill" USING btree ("prescription_id");
--> statement-breakpoint
CREATE INDEX "idx_prescription_fill_date" ON "prescription_fill" USING btree ("filled_at");
