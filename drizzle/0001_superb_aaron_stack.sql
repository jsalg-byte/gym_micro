CREATE TABLE "routine_day_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"routine_day_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"target_sets" integer DEFAULT 3 NOT NULL,
	"target_reps" integer,
	"target_weight" numeric(8, 2)
);
--> statement-breakpoint
CREATE TABLE "routine_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"routine_id" uuid NOT NULL,
	"day_name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"active_routine_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "routines" ADD COLUMN "is_preset" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "routines" ADD COLUMN "preset_key" text;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "captured_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD COLUMN "routine_day_id" uuid;--> statement-breakpoint
ALTER TABLE "routine_day_exercises" ADD CONSTRAINT "routine_day_exercises_routine_day_id_routine_days_id_fk" FOREIGN KEY ("routine_day_id") REFERENCES "public"."routine_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_day_exercises" ADD CONSTRAINT "routine_day_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_days" ADD CONSTRAINT "routine_days_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_active_routine_id_routines_id_fk" FOREIGN KEY ("active_routine_id") REFERENCES "public"."routines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "routine_day_exercises_day_sort_idx" ON "routine_day_exercises" USING btree ("routine_day_id","sort_order");--> statement-breakpoint
CREATE INDEX "routine_days_routine_sort_idx" ON "routine_days" USING btree ("routine_id","sort_order");--> statement-breakpoint
CREATE INDEX "user_preferences_active_routine_idx" ON "user_preferences" USING btree ("active_routine_id");--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_routine_day_id_routine_days_id_fk" FOREIGN KEY ("routine_day_id") REFERENCES "public"."routine_days"("id") ON DELETE set null ON UPDATE no action;