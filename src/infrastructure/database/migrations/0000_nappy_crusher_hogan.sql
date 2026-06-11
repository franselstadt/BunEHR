CREATE TABLE "composition" (
	"id" text PRIMARY KEY NOT NULL,
	"ehr_id" text NOT NULL,
	"uid" text NOT NULL,
	"version_id" text NOT NULL,
	"preceding_version_uid" text,
	"template_id" text NOT NULL,
	"archetype_id" text,
	"language_code" text DEFAULT 'en' NOT NULL,
	"territory_code" text DEFAULT 'US' NOT NULL,
	"category" text DEFAULT 'event' NOT NULL,
	"lifecycle_state" text DEFAULT 'COMPLETE' NOT NULL,
	"composer_name" text NOT NULL,
	"composer_id" text,
	"content" jsonb NOT NULL,
	"commit_audit" jsonb,
	"time_committed" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contribution" (
	"id" text PRIMARY KEY NOT NULL,
	"ehr_id" text NOT NULL,
	"uid" text NOT NULL,
	"audit_type" text DEFAULT 'CREATION' NOT NULL,
	"auditor_id" text,
	"auditor_name" text,
	"system_id" text DEFAULT 'local.bunehr.com' NOT NULL,
	"time_committed" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "contribution_version" (
	"id" text PRIMARY KEY NOT NULL,
	"contribution_id" text NOT NULL,
	"version_id" text NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "directory" (
	"id" text PRIMARY KEY NOT NULL,
	"ehr_id" text NOT NULL,
	"uid" text NOT NULL,
	"version_id" text NOT NULL,
	"preceding_version_uid" text,
	"name" text DEFAULT 'root' NOT NULL,
	"archetype_id" text,
	"items" jsonb,
	"time_created" timestamp with time zone DEFAULT now() NOT NULL,
	"time_committed" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "directory_ehr_id_unique" UNIQUE("ehr_id")
);
--> statement-breakpoint
CREATE TABLE "ehr" (
	"id" text PRIMARY KEY NOT NULL,
	"subject_id" text NOT NULL,
	"subject_namespace" text DEFAULT 'local' NOT NULL,
	"system_id" text DEFAULT 'local.bunehr.com' NOT NULL,
	"is_queryable" boolean DEFAULT true NOT NULL,
	"is_modifiable" boolean DEFAULT true NOT NULL,
	"time_created" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ehr_status" (
	"id" text PRIMARY KEY NOT NULL,
	"ehr_id" text NOT NULL,
	"uid" text NOT NULL,
	"version_id" text NOT NULL,
	"preceding_version_uid" text,
	"is_queryable" boolean DEFAULT true NOT NULL,
	"is_modifiable" boolean DEFAULT true NOT NULL,
	"subject_id" text NOT NULL,
	"subject_namespace" text DEFAULT 'local' NOT NULL,
	"other_details" jsonb,
	"lifecycle_state" text DEFAULT 'ACTIVE' NOT NULL,
	"commit_audit" jsonb,
	"time_committed" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stored_query" (
	"qualified_name" text PRIMARY KEY NOT NULL,
	"version" text NOT NULL,
	"aql_query" text NOT NULL,
	"type" text DEFAULT 'aql' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_definition" (
	"template_id" text PRIMARY KEY NOT NULL,
	"version" text,
	"adl_version" text DEFAULT '1.4' NOT NULL,
	"concept" text,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "composition" ADD CONSTRAINT "composition_ehr_id_ehr_id_fk" FOREIGN KEY ("ehr_id") REFERENCES "public"."ehr"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution" ADD CONSTRAINT "contribution_ehr_id_ehr_id_fk" FOREIGN KEY ("ehr_id") REFERENCES "public"."ehr"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_version" ADD CONSTRAINT "contribution_version_contribution_id_contribution_id_fk" FOREIGN KEY ("contribution_id") REFERENCES "public"."contribution"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "directory" ADD CONSTRAINT "directory_ehr_id_ehr_id_fk" FOREIGN KEY ("ehr_id") REFERENCES "public"."ehr"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ehr_status" ADD CONSTRAINT "ehr_status_ehr_id_ehr_id_fk" FOREIGN KEY ("ehr_id") REFERENCES "public"."ehr"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_composition_ehr" ON "composition" USING btree ("ehr_id");--> statement-breakpoint
CREATE INDEX "idx_composition_uid" ON "composition" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "idx_composition_template" ON "composition" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_composition_state" ON "composition" USING btree ("lifecycle_state");--> statement-breakpoint
CREATE INDEX "idx_composition_time" ON "composition" USING btree ("ehr_id","time_committed");--> statement-breakpoint
CREATE INDEX "idx_contribution_ehr" ON "contribution" USING btree ("ehr_id");--> statement-breakpoint
CREATE INDEX "idx_contribution_uid" ON "contribution" USING btree ("uid");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_ehr_subject" ON "ehr" USING btree ("subject_id","subject_namespace");--> statement-breakpoint
CREATE INDEX "idx_ehr_subject" ON "ehr" USING btree ("subject_id","subject_namespace");--> statement-breakpoint
CREATE INDEX "idx_ehr_status_ehr" ON "ehr_status" USING btree ("ehr_id");--> statement-breakpoint
CREATE INDEX "idx_ehr_status_time" ON "ehr_status" USING btree ("ehr_id","time_committed");