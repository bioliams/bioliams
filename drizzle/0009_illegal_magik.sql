ALTER TABLE "biobank_request_items" ADD COLUMN "quantity" numeric;--> statement-breakpoint
ALTER TABLE "biobank_request_items" ADD COLUMN "taken_quantity" numeric;--> statement-breakpoint
ALTER TABLE "biobank_request_items" ADD COLUMN "taken_at" timestamp;