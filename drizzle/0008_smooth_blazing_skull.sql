CREATE TABLE "biobank_request_items" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"entity_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biobank_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"details" text,
	"needed_by" timestamp,
	"status" text DEFAULT 'requested' NOT NULL,
	"response" text,
	"requested_by" text,
	"handled_by" text,
	"ready_at" timestamp,
	"collected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "biobank_request_items" ADD CONSTRAINT "biobank_request_items_request_id_biobank_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."biobank_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biobank_request_items" ADD CONSTRAINT "biobank_request_items_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biobank_requests" ADD CONSTRAINT "biobank_requests_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biobank_requests" ADD CONSTRAINT "biobank_requests_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biobank_requests" ADD CONSTRAINT "biobank_requests_handled_by_user_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "biobank_request_items_unique_idx" ON "biobank_request_items" USING btree ("request_id","entity_id");--> statement-breakpoint
CREATE INDEX "biobank_requests_org_status_idx" ON "biobank_requests" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "biobank_requests_requester_idx" ON "biobank_requests" USING btree ("requested_by");