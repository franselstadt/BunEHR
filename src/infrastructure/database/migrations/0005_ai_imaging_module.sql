CREATE TABLE "imaging_demo_asset" (
  "id" text PRIMARY KEY NOT NULL,
  "modality" text NOT NULL,
  "source_vendor" text NOT NULL,
  "source_model" text NOT NULL,
  "image_uri" text NOT NULL,
  "dye_map" jsonb,
  "bacteria_count" integer,
  "notes" text,
  "captured_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ziehl_neelsen_analysis" (
  "id" text PRIMARY KEY NOT NULL,
  "ehr_id" text NOT NULL,
  "demo_asset_id" text,
  "source_vendor" text NOT NULL,
  "source_model" text NOT NULL,
  "image_uri" text NOT NULL,
  "dye_map" jsonb NOT NULL,
  "bacteria_count" integer NOT NULL,
  "acid_fast_score" numeric(5, 2) NOT NULL,
  "bacillary_load_band" text NOT NULL,
  "ai_confidence" numeric(5, 2) NOT NULL,
  "interpretation" text NOT NULL,
  "analyzed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ct_scan_analysis" (
  "id" text PRIMARY KEY NOT NULL,
  "ehr_id" text NOT NULL,
  "study_uid" text NOT NULL,
  "image_uri" text NOT NULL,
  "source_vendor" text NOT NULL,
  "source_model" text NOT NULL,
  "lesion_map" jsonb NOT NULL,
  "cavity_present" boolean DEFAULT false NOT NULL,
  "pleural_effusion" boolean DEFAULT false NOT NULL,
  "nodule_count" integer NOT NULL,
  "consolidation_percent" numeric(5, 2) NOT NULL,
  "tb_suspicion_score" numeric(5, 2) NOT NULL,
  "ai_confidence" numeric(5, 2) NOT NULL,
  "impression" text NOT NULL,
  "analyzed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ziehl_neelsen_analysis"
  ADD CONSTRAINT "ziehl_neelsen_analysis_ehr_id_ehr_id_fk"
  FOREIGN KEY ("ehr_id") REFERENCES "public"."ehr"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ziehl_neelsen_analysis"
  ADD CONSTRAINT "ziehl_neelsen_analysis_demo_asset_id_imaging_demo_asset_id_fk"
  FOREIGN KEY ("demo_asset_id") REFERENCES "public"."imaging_demo_asset"("id")
  ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ct_scan_analysis"
  ADD CONSTRAINT "ct_scan_analysis_ehr_id_ehr_id_fk"
  FOREIGN KEY ("ehr_id") REFERENCES "public"."ehr"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_imaging_demo_asset_modality" ON "imaging_demo_asset" USING btree ("modality");
--> statement-breakpoint
CREATE INDEX "idx_zn_analysis_ehr" ON "ziehl_neelsen_analysis" USING btree ("ehr_id");
--> statement-breakpoint
CREATE INDEX "idx_zn_analysis_analyzed_at" ON "ziehl_neelsen_analysis" USING btree ("analyzed_at");
--> statement-breakpoint
CREATE INDEX "idx_ct_analysis_ehr" ON "ct_scan_analysis" USING btree ("ehr_id");
--> statement-breakpoint
CREATE INDEX "idx_ct_analysis_study_uid" ON "ct_scan_analysis" USING btree ("study_uid");
