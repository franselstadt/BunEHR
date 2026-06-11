ALTER TABLE "imaging_demo_asset"
  ADD COLUMN "image_data" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "ziehl_neelsen_analysis"
  ADD COLUMN "analyzed_image_data" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "ct_scan_analysis"
  ADD COLUMN "analyzed_image_data" text NOT NULL DEFAULT '';
