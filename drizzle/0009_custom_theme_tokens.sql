ALTER TABLE "user_preferences" ADD COLUMN "theme_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL;
