ALTER TABLE "entities" ADD COLUMN "checked_out_by" text;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "checked_out_at" timestamp;--> statement-breakpoint
ALTER TABLE "inventory_events" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_checked_out_by_user_id_fk" FOREIGN KEY ("checked_out_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;