ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username" text;--> statement-breakpoint
WITH base AS (
  SELECT
    id,
    lower(
      regexp_replace(
        coalesce(nullif(name, ''), split_part(coalesce(email, ''), '@', 1), 'user'),
        '[^a-zA-Z0-9_]+',
        '_',
        'g'
      )
    ) AS seed
  FROM "users"
),
normalized AS (
  SELECT
    id,
    CASE
      WHEN seed IS NULL OR seed = '' THEN 'user'
      ELSE seed
    END AS base
  FROM base
),
ranked AS (
  SELECT
    id,
    base,
    row_number() OVER (PARTITION BY base ORDER BY id) AS rn
  FROM normalized
)
UPDATE "users" u
SET "username" = CASE
  WHEN r.rn = 1 THEN r.base
  ELSE r.base || '_' || r.rn
END
FROM ranked r
WHERE u.id = r.id;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_unique" ON "users" USING btree ("username");
