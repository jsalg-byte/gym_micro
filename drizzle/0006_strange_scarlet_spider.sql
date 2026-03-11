CREATE TABLE "exercise_gif_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"gif_url" text NOT NULL,
	"source_exercise_id" text,
	"source_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exercise_gif_overrides" ADD CONSTRAINT "exercise_gif_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_gif_overrides" ADD CONSTRAINT "exercise_gif_overrides_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_gif_overrides_user_exercise_unique" ON "exercise_gif_overrides" USING btree ("user_id","exercise_id");--> statement-breakpoint
CREATE INDEX "exercise_gif_overrides_user_idx" ON "exercise_gif_overrides" USING btree ("user_id");