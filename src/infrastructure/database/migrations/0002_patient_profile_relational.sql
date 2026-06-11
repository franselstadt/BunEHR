CREATE TABLE "patient_profile" (
	"ehr_id" text PRIMARY KEY NOT NULL,
	"subject_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"date_of_birth" text NOT NULL,
	"gender" text NOT NULL,
	"blood_type" text NOT NULL,
	"ward" text NOT NULL,
	"room" text NOT NULL,
	"admitted_date" text NOT NULL,
	"status" text NOT NULL,
	"primary_diagnosis" text NOT NULL,
	"primary_clinician" text NOT NULL,
	"allergies" text[] DEFAULT '{}' NOT NULL,
	"location_lat" numeric(9, 6) NOT NULL,
	"location_lng" numeric(9, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_vital" (
	"id" text PRIMARY KEY NOT NULL,
	"ehr_id" text NOT NULL,
	"bp_systolic" integer NOT NULL,
	"bp_diastolic" integer NOT NULL,
	"heart_rate" integer NOT NULL,
	"temperature" numeric(4, 1) NOT NULL,
	"oxygen_sat" integer NOT NULL,
	"respiratory_rate" integer NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patient_profile" ADD CONSTRAINT "patient_profile_ehr_id_ehr_id_fk" FOREIGN KEY ("ehr_id") REFERENCES "public"."ehr"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "patient_vital" ADD CONSTRAINT "patient_vital_ehr_id_patient_profile_ehr_id_fk" FOREIGN KEY ("ehr_id") REFERENCES "public"."patient_profile"("ehr_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_patient_profile_subject" ON "patient_profile" USING btree ("subject_id");
--> statement-breakpoint
CREATE INDEX "idx_patient_profile_ward" ON "patient_profile" USING btree ("ward");
--> statement-breakpoint
CREATE INDEX "idx_patient_profile_status" ON "patient_profile" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "idx_patient_vital_ehr_time" ON "patient_vital" USING btree ("ehr_id","recorded_at");
