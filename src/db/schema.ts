import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: text("username").notNull(),
    email: text("email"),
    name: text("name"),
    passwordHash: text("password_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("users_username_unique").on(table.username),
    uniqueIndex("users_email_unique").on(table.email),
  ],
);

export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull().default("strength"),
    muscleGroup: text("muscle_group"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("exercises_created_by_user_idx").on(table.createdByUserId)],
);

export const routines = pgTable(
  "routines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    isPreset: boolean("is_preset").notNull().default(false),
    presetKey: text("preset_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("routines_user_created_idx").on(table.userId, table.createdAt)],
);

export const userPreferences = pgTable(
  "user_preferences",
  {
    userId: uuid("user_id")
      .notNull()
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    activeRoutineId: uuid("active_routine_id").references(() => routines.id, {
      onDelete: "set null",
    }),
    weightUnit: text("weight_unit").notNull().default("lbs"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("user_preferences_active_routine_idx").on(table.activeRoutineId)],
);

export const routineDays = pgTable(
  "routine_days",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    routineId: uuid("routine_id")
      .notNull()
      .references(() => routines.id, { onDelete: "cascade" }),
    dayName: text("day_name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("routine_days_routine_sort_idx").on(table.routineId, table.sortOrder)],
);

export const routineDayExercises = pgTable(
  "routine_day_exercises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    routineDayId: uuid("routine_day_id")
      .notNull()
      .references(() => routineDays.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    targetSets: integer("target_sets").notNull().default(3),
    targetReps: integer("target_reps"),
    targetWeight: numeric("target_weight", { precision: 8, scale: 2 }),
  },
  (table) => [
    index("routine_day_exercises_day_sort_idx").on(table.routineDayId, table.sortOrder),
  ],
);

export const routineExercises = pgTable(
  "routine_exercises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    routineId: uuid("routine_id")
      .notNull()
      .references(() => routines.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    targetSets: integer("target_sets").notNull().default(3),
    targetReps: integer("target_reps"),
    targetWeight: numeric("target_weight", { precision: 8, scale: 2 }),
  },
  (table) => [
    index("routine_exercises_routine_sort_idx").on(table.routineId, table.sortOrder),
  ],
);

export const workoutSessions = pgTable(
  "workout_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    routineId: uuid("routine_id").references(() => routines.id, {
      onDelete: "set null",
    }),
    routineDayId: uuid("routine_day_id").references(() => routineDays.id, {
      onDelete: "set null",
    }),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    status: text("status").notNull().default("active"),
  },
  (table) => [index("workout_sessions_user_started_idx").on(table.userId, table.startedAt)],
);

export const workoutSets = pgTable(
  "workout_sets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    setOrder: integer("set_order").notNull().default(1),
    reps: integer("reps").notNull(),
    weight: numeric("weight", { precision: 8, scale: 2 }),
    isWarmup: boolean("is_warmup").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("workout_sets_session_order_idx").on(table.sessionId, table.setOrder)],
);

export const foods = pgTable(
  "foods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    barcodeUpc: text("barcode_upc"),
    caloriesKcal: integer("calories_kcal").notNull(),
    proteinG: numeric("protein_g", { precision: 8, scale: 2 }).notNull().default("0"),
    carbsG: numeric("carbs_g", { precision: 8, scale: 2 }).notNull().default("0"),
    fatG: numeric("fat_g", { precision: 8, scale: 2 }).notNull().default("0"),
    servingSizeG: numeric("serving_size_g", { precision: 8, scale: 2 }),
    servingSizeText: text("serving_size_text"),
    servingsPerContainer: numeric("servings_per_container", { precision: 8, scale: 2 }),
    saturatedFatG: numeric("saturated_fat_g", { precision: 8, scale: 2 }),
    transFatG: numeric("trans_fat_g", { precision: 8, scale: 2 }),
    cholesterolMg: numeric("cholesterol_mg", { precision: 8, scale: 2 }),
    sodiumMg: numeric("sodium_mg", { precision: 8, scale: 2 }),
    fiberG: numeric("fiber_g", { precision: 8, scale: 2 }),
    sugarsG: numeric("sugars_g", { precision: 8, scale: 2 }),
    addedSugarsG: numeric("added_sugars_g", { precision: 8, scale: 2 }),
    micronutrientsJson: jsonb("micronutrients_json").$type<
      Array<{
        name: string;
        value: number;
        unit: string;
        confidence?: number;
      }>
    >(),
    nutritionSource: text("nutrition_source").notNull().default("manual"),
    nutritionConfidence: numeric("nutrition_confidence", { precision: 4, scale: 3 }),
    labelRawText: text("label_raw_text"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("foods_barcode_upc_unique").on(table.barcodeUpc),
    index("foods_name_idx").on(table.name),
  ],
);

export const mealLogs = pgTable(
  "meal_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    foodId: uuid("food_id")
      .notNull()
      .references(() => foods.id, { onDelete: "restrict" }),
    quantity: numeric("quantity", { precision: 8, scale: 2 }).notNull().default("1"),
    mealType: text("meal_type").notNull().default("snack"),
    consumedAt: timestamp("consumed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    notes: text("notes"),
  },
  (table) => [index("meal_logs_user_consumed_idx").on(table.userId, table.consumedAt)],
);

export const fastingLogs = pgTable(
  "fasting_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("fasting_logs_user_ended_idx").on(table.userId, table.endedAt)],
);

export const activeFasts = pgTable(
  "active_fasts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("active_fasts_user_unique").on(table.userId),
    index("active_fasts_started_idx").on(table.startedAt),
  ],
);

export const uploads = pgTable(
  "uploads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    objectKey: text("object_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    note: text("note"),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("uploads_entity_idx").on(table.entityType, table.entityId),
    index("uploads_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const userIpAddresses = pgTable(
  "user_ip_addresses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ipAddress: text("ip_address").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    hitCount: integer("hit_count").notNull().default(1),
    lastUserAgent: text("last_user_agent"),
  },
  (table) => [
    uniqueIndex("user_ip_addresses_user_ip_unique").on(table.userId, table.ipAddress),
    index("user_ip_addresses_user_last_seen_idx").on(table.userId, table.lastSeenAt),
  ],
);

export const friendRequests = pgTable(
  "friend_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addresseeId: uuid("addressee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("friend_requests_addressee_status_idx").on(table.addresseeId, table.status),
    index("friend_requests_requester_status_idx").on(table.requesterId, table.status),
    uniqueIndex("friend_requests_pair_unique").on(table.requesterId, table.addresseeId),
  ],
);

export const exerciseGifOverrides = pgTable(
  "exercise_gif_overrides",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    gifUrl: text("gif_url").notNull(),
    sourceExerciseId: text("source_exercise_id"),
    sourceName: text("source_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("exercise_gif_overrides_user_exercise_unique").on(table.userId, table.exerciseId),
    index("exercise_gif_overrides_user_idx").on(table.userId),
  ],
);

export type User = typeof users.$inferSelect;
