ALTER TABLE "mail_accounts" ADD COLUMN "color" text DEFAULT '#3b82f6' NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_emails_thread_id" ON "emails" USING btree ("thread_id");