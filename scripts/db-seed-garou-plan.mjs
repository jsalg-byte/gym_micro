import postgres from "postgres";

const PRESET_KEY = "garou-bench-weekly-v1";

const PLAN = {
  name: "Updated Weekly Plan With Bench",
  description:
    "7-day bench-equipped pull/push/legs/full-body plan focused on back width, chest, shoulders, athletic conditioning, abs, and recovery. Imported by the Garou weekly plan seed.",
  days: [
    {
      name: "Day 1 - Pull / Back Width + Abs",
      exercises: [
        ["Pull-Up", "strength", "back", 4, null],
        ["Barbell Row", "strength", "back", 4, 10],
        ["One-Arm Dumbbell Bench Row", "strength", "back", 3, 12],
        ["Barbell Curl", "strength", "biceps", 3, 12],
        ["Rear Delt Raise on Bench", "strength", "rear delts", 3, 15],
        ["Hanging Knee Raise", "strength", "core", 3, 12],
        ["Bench Leg Raise", "strength", "core", 3, 12],
        ["Plank", "strength", "core", 3, null],
      ],
    },
    {
      name: "Day 2 - Push / Chest + Shoulders",
      exercises: [
        ["Barbell Bench Press", "strength", "chest", 4, 8],
        ["Standing Overhead Press", "strength", "shoulders", 4, 8],
        ["Incline or Feet-Elevated Push-Up", "strength", "chest", 3, 15],
        ["Single Dumbbell Lateral Raise", "strength", "shoulders", 4, 15],
        ["Close-Grip Bench Press", "strength", "triceps", 3, 10],
        ["Push-Up Burnout", "strength", "chest", 2, null],
      ],
    },
    {
      name: "Day 3 - Legs + Conditioning",
      exercises: [
        ["Barbell Back Squat", "strength", "legs", 4, 8],
        ["Romanian Deadlift", "strength", "hamstrings", 4, 10],
        ["Bulgarian Split Squat Using Bench", "strength", "legs", 3, 10],
        ["Step-Up Onto Bench", "strength", "legs", 3, 10],
        ["Calf Raise", "strength", "calves", 4, 20],
        ["Treadmill 1:1 Run/Walk Intervals", "cardio", "full body", 10, null],
      ],
    },
    {
      name: "Day 4 - Pull / Back Thickness + Bag",
      exercises: [
        ["Chin-Up", "strength", "back", 4, null],
        ["Deadlift", "strength", "back", 4, 5],
        ["Chest-Supported Dumbbell Row on Bench", "strength", "back", 3, 12],
        ["Barbell Row", "strength", "back", 3, 9],
        ["Dumbbell or Barbell Shrug", "strength", "traps", 4, 15],
        ["Hammer Curl", "strength", "biceps", 3, 12],
        ["Punching Bag 3-Minute Rounds", "cardio", "full body", 5, null],
      ],
    },
    {
      name: "Day 5 - Push / Upper Chest + Shoulders",
      exercises: [
        ["Incline Barbell Bench Press", "strength", "upper chest", 4, 8],
        ["Standing Overhead Press", "strength", "shoulders", 3, 8],
        ["Close-Grip Bench Press", "strength", "triceps", 3, 10],
        ["Single Dumbbell Lateral Raise", "strength", "shoulders", 5, 15],
        ["Bench Dip", "strength", "triceps", 3, 15],
        ["Pike Push-Up", "strength", "shoulders", 3, 12],
      ],
    },
    {
      name: "Day 6 - Full Body + Abs",
      exercises: [
        ["Pull-Up", "strength", "back", 3, null],
        ["Barbell Bench Press", "strength", "chest", 3, 8],
        ["Barbell Back Squat", "strength", "legs", 3, 8],
        ["Barbell Row", "strength", "back", 3, 10],
        ["Standing Overhead Press", "strength", "shoulders", 3, 8],
        ["Romanian Deadlift", "strength", "hamstrings", 3, 10],
        ["Bench Leg Raise", "strength", "core", 3, 12],
        ["Hanging Knee Raise", "strength", "core", 3, 10],
        ["Bicycle Crunch", "strength", "core", 3, 30],
        ["Plank", "strength", "core", 3, null],
      ],
    },
    {
      name: "Day 7 - Recovery / Conditioning",
      exercises: [
        ["Incline Treadmill Walk", "cardio", "full body", 1, null],
        ["Light Bag Work", "cardio", "full body", 1, null],
        ["Stretching", "mobility", "full body", 1, null],
        ["Optional Abs", "strength", "core", 1, null],
      ],
    },
  ],
};

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function parseArgs(argv) {
  const options = {
    user: process.env.SEED_USER ?? null,
    setActive: process.env.SEED_SET_ACTIVE === "1",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--user") {
      options.user = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg.startsWith("--user=")) {
      options.user = arg.slice("--user=".length);
      continue;
    }

    if (arg === "--set-active") {
      options.setActive = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`
Usage:
  npm run db:seed:garou -- --user <username|email|user-id> [--set-active]

Environment alternatives:
  SEED_USER=<username|email|user-id> npm run db:seed:garou
  SEED_SET_ACTIVE=1 SEED_USER=<username|email|user-id> npm run db:seed:garou

This seed is non-destructive. It inserts the Garou weekly plan only when a
routine with preset_key "${PRESET_KEY}" does not already exist for the user.
`);
}

async function findTargetUser(sql, userIdentifier) {
  if (userIdentifier) {
    const users = await sql`
      select id, username, email
      from users
      where id::text = ${userIdentifier}
        or lower(username) = lower(${userIdentifier})
        or lower(coalesce(email, '')) = lower(${userIdentifier})
      order by created_at asc
      limit 2
    `;

    if (users.length === 0) {
      throw new Error(`No user found for "${userIdentifier}".`);
    }

    if (users.length > 1) {
      throw new Error(`More than one user matched "${userIdentifier}". Use the user id instead.`);
    }

    return users[0];
  }

  const users = await sql`
    select id, username, email
    from users
    order by created_at asc
    limit 2
  `;

  if (users.length === 0) {
    throw new Error("No users exist yet. Create a user before running this seed.");
  }

  if (users.length > 1) {
    throw new Error("More than one user exists. Pass --user <username|email|user-id>.");
  }

  return users[0];
}

function getExerciseSeeds() {
  const byName = new Map();

  for (const day of PLAN.days) {
    for (const [name, category, muscleGroup] of day.exercises) {
      if (!byName.has(name)) {
        byName.set(name, { name, category, muscleGroup });
      }
    }
  }

  return Array.from(byName.values());
}

async function ensureExercises(sql) {
  const exerciseSeeds = getExerciseSeeds();
  const names = exerciseSeeds.map((exercise) => exercise.name);
  const existingRows = await sql`
    select id, name
    from exercises
    where name = any(${names})
    order by created_at asc
  `;

  const exerciseIdsByName = new Map();
  for (const row of existingRows) {
    if (!exerciseIdsByName.has(row.name)) {
      exerciseIdsByName.set(row.name, row.id);
    }
  }

  for (const exercise of exerciseSeeds) {
    if (exerciseIdsByName.has(exercise.name)) {
      continue;
    }

    const [inserted] = await sql`
      insert into exercises (name, category, muscle_group, created_by_user_id)
      values (${exercise.name}, ${exercise.category}, ${exercise.muscleGroup}, null)
      returning id, name
    `;
    exerciseIdsByName.set(inserted.name, inserted.id);
  }

  return exerciseIdsByName;
}

async function seedPlan(sql, user, options) {
  return sql.begin(async (tx) => {
    const [existingRoutine] = await tx`
      select id, name
      from routines
      where user_id = ${user.id}
        and preset_key = ${PRESET_KEY}
      limit 1
    `;

    if (existingRoutine) {
      return {
        inserted: false,
        routineId: existingRoutine.id,
        message: `Routine already exists for ${user.username}: ${existingRoutine.name}`,
      };
    }

    const exerciseIdsByName = await ensureExercises(tx);

    const [routine] = await tx`
      insert into routines (user_id, name, description, is_preset, preset_key)
      values (${user.id}, ${PLAN.name}, ${PLAN.description}, true, ${PRESET_KEY})
      returning id
    `;

    let exerciseCount = 0;
    for (const [dayIndex, day] of PLAN.days.entries()) {
      const [routineDay] = await tx`
        insert into routine_days (routine_id, day_name, sort_order)
        values (${routine.id}, ${day.name}, ${dayIndex})
        returning id
      `;

      for (const [exerciseIndex, [exerciseName, , , targetSets, targetReps]] of day.exercises.entries()) {
        const exerciseId = exerciseIdsByName.get(exerciseName);
        if (!exerciseId) {
          throw new Error(`Missing exercise id for "${exerciseName}".`);
        }

        await tx`
          insert into routine_day_exercises (
            routine_day_id,
            exercise_id,
            sort_order,
            target_sets,
            target_reps,
            target_weight
          )
          values (
            ${routineDay.id},
            ${exerciseId},
            ${exerciseIndex},
            ${targetSets},
            ${targetReps},
            null
          )
        `;
        exerciseCount += 1;
      }
    }

    if (options.setActive) {
      await tx`
        insert into user_preferences (user_id, active_routine_id)
        values (${user.id}, ${routine.id})
        on conflict (user_id) do update
        set active_routine_id = excluded.active_routine_id,
            updated_at = now()
      `;
    }

    return {
      inserted: true,
      routineId: routine.id,
      dayCount: PLAN.days.length,
      exerciseCount,
      message: `Inserted "${PLAN.name}" for ${user.username}`,
    };
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const sql = postgres(requireEnv("DATABASE_URL"), {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
  });

  try {
    const user = await findTargetUser(sql, options.user);
    const result = await seedPlan(sql, user, options);
    console.log(result.message);
    console.log(`Routine id: ${result.routineId}`);

    if (result.inserted) {
      console.log(`Added ${result.dayCount} days and ${result.exerciseCount} planned exercise entries.`);
      if (options.setActive) {
        console.log("Set as the user's active routine.");
      }
    } else {
      console.log("No changes made.");
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("Failed to seed Garou weekly plan:", error.message);
  process.exit(1);
});
