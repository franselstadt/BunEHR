ALTER TABLE "patient_profile"
  ALTER COLUMN "date_of_birth" TYPE date USING "date_of_birth"::date,
  ALTER COLUMN "admitted_date" TYPE date USING "admitted_date"::date;
--> statement-breakpoint
ALTER TABLE "gl_account"
  ADD CONSTRAINT "gl_account_parent_id_gl_account_id_fk"
  FOREIGN KEY ("parent_id") REFERENCES "public"."gl_account"("id")
  ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gl_journal_line"
  ADD CONSTRAINT "gl_journal_line_debit_non_negative" CHECK ("debit" >= 0),
  ADD CONSTRAINT "gl_journal_line_credit_non_negative" CHECK ("credit" >= 0),
  ADD CONSTRAINT "gl_journal_line_not_both_sides" CHECK (NOT ("debit" > 0 AND "credit" > 0)),
  ADD CONSTRAINT "gl_journal_line_one_side_required" CHECK ("debit" > 0 OR "credit" > 0);
