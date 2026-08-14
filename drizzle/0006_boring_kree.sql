CREATE TABLE "ai_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"base_url" text DEFAULT 'https://generativelanguage.googleapis.com/v1beta/openai' NOT NULL,
	"api_key" text,
	"model" text DEFAULT 'gemini-flash-latest' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;