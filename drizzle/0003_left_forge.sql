CREATE TABLE "user_ip_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ip_address" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"hit_count" integer DEFAULT 1 NOT NULL,
	"last_user_agent" text
);
--> statement-breakpoint
ALTER TABLE "user_ip_addresses" ADD CONSTRAINT "user_ip_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_ip_addresses_user_ip_unique" ON "user_ip_addresses" USING btree ("user_id","ip_address");--> statement-breakpoint
CREATE INDEX "user_ip_addresses_user_last_seen_idx" ON "user_ip_addresses" USING btree ("user_id","last_seen_at");