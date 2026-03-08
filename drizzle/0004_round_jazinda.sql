ALTER TABLE "foods" ADD COLUMN "serving_size_text" text;--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "servings_per_container" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "saturated_fat_g" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "trans_fat_g" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "cholesterol_mg" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "sodium_mg" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "fiber_g" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "sugars_g" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "added_sugars_g" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "micronutrients_json" jsonb;--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "nutrition_source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "nutrition_confidence" numeric(4, 3);--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "label_raw_text" text;