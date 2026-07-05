import postgres from "postgres";

const PRESET_KEY = "garou-ii-v1";

const PUSH_1_EXERCISES = [
  {
    name: "Barbell Overhead Front Raise",
    category: "strength",
    muscleGroup: "Shoulders",
    targetSets: 3,
    sourceReps: [7, 6, 5],
    timerSec: 60,
  },
  {
    name: "Barbell Bench Press",
    category: "strength",
    muscleGroup: "Chest",
    targetSets: 3,
    sourceReps: [5, 5, 5],
    timerSec: 60,
  },
  {
    name: "Dumbbell Deep Push-Up",
    category: "strength",
    muscleGroup: "Chest",
    targetSets: 3,
    sourceReps: [10, 10, 10],
    timerSec: 60,
  },
  {
    name: "Dumbbell Incline Fly",
    category: "strength",
    muscleGroup: "Chest",
    targetSets: 3,
    sourceReps: [12, 12, 12],
    timerSec: 60,
  },
  {
    name: "Dumbbell Front Raise",
    category: "strength",
    muscleGroup: "Shoulders",
    targetSets: 3,
    sourceReps: [15, 15, 15],
    timerSec: 60,
  },
  {
    name: "EZ Bar Decline Close Grip Skull Crusher",
    category: "strength",
    muscleGroup: "Triceps",
    targetSets: 3,
    sourceReps: [5, 7, 6],
    timerSec: 60,
  },
  {
    name: "Sit-Up",
    category: "strength",
    muscleGroup: "Abs",
    targetSets: 3,
    sourceReps: [15, 15, 15],
    timerSec: 60,
  },
];

const PULL_1_EXERCISES = [
  {
    name: "Pull-Up",
    category: "strength",
    muscleGroup: "Back",
    targetSets: 3,
    sourceReps: [5, 5, 5],
    timerSec: 60,
  },
  {
    name: "Barbell Bent-Over Row",
    category: "strength",
    muscleGroup: "Back",
    targetSets: 3,
    sourceReps: [8, 5, 5],
    timerSec: 60,
  },
  {
    name: "Dumbbell Lateral Raise",
    category: "strength",
    muscleGroup: "Shoulders",
    targetSets: 3,
    sourceReps: [8, 8, 8],
    timerSec: 60,
  },
  {
    name: "Inverted Barbell Row",
    category: "strength",
    muscleGroup: "Back",
    targetSets: 3,
    sourceReps: [8, 8, 8],
    timerSec: 60,
  },
  {
    name: "Dumbbell Posterior Fly on Stability Ball",
    category: "strength",
    muscleGroup: "Shoulders",
    targetSets: 3,
    sourceReps: [8, 8, 8],
    timerSec: 60,
  },
  {
    name: "Barbell Spider Curl",
    category: "strength",
    muscleGroup: "Biceps",
    targetSets: 3,
    sourceReps: [8, 8, 8],
    timerSec: 60,
  },
  {
    name: "Weight Plate Russian Twist",
    category: "strength",
    muscleGroup: "Abs",
    targetSets: 3,
    sourceReps: [8, 8, 8],
    timerSec: 60,
  },
];

const LOWER_EXERCISES = [
  {
    name: "Barbell Squat",
    category: "strength",
    muscleGroup: "Upper Legs",
    targetSets: 3,
    sourceReps: [10, 10, 10],
    timerSec: 60,
  },
  {
    name: "Barbell Romanian Deadlift",
    category: "strength",
    muscleGroup: "Upper Legs",
    targetSets: 3,
    sourceReps: [8, 8, 8],
    timerSec: 60,
  },
  {
    name: "Kettlebell Goblet Squat",
    category: "strength",
    muscleGroup: "Upper Legs",
    targetSets: 3,
    sourceReps: [10, 10, 10],
    timerSec: 60,
  },
  {
    name: "Barbell Stiff-Leg Deadlift",
    category: "strength",
    muscleGroup: "Back",
    targetSets: 3,
    sourceReps: [10, 10, 10],
    timerSec: 60,
  },
  {
    name: "Dumbbell Calf Raise",
    category: "strength",
    muscleGroup: "Lower Legs",
    targetSets: 3,
    sourceReps: [20, 20, 20],
    timerSec: 60,
  },
  {
    name: "Hanging Leg Raise",
    category: "strength",
    muscleGroup: "Abs",
    targetSets: 3,
    sourceReps: [8, 8, 8],
    timerSec: 60,
  },
];

const GAROU_DAY_EXERCISES = [
  {
    name: "Pull-Up",
    category: "strength",
    muscleGroup: "Back",
    targetSets: 3,
    sourceReps: [5, 5, 5],
    timerSec: 60,
  },
  {
    name: "Dumbbell Lateral Raise",
    category: "strength",
    muscleGroup: "Shoulders",
    targetSets: 3,
    sourceReps: [8, 8, 8],
    timerSec: 60,
  },
  {
    name: "Barbell Curl",
    category: "strength",
    muscleGroup: "Biceps",
    targetSets: 3,
    sourceReps: [8, 8, 8],
    timerSec: 60,
  },
  {
    name: "Inverted Barbell Row",
    category: "strength",
    muscleGroup: "Back",
    targetSets: 3,
    sourceReps: [8, 8, 8],
    timerSec: 60,
  },
  {
    name: "Dumbbell Posterior Fly on Stability Ball",
    category: "strength",
    muscleGroup: "Shoulders",
    targetSets: 3,
    sourceReps: [8, 8, 8],
    timerSec: 60,
  },
  {
    name: "Dumbbell Alternating Bicep Curl",
    category: "strength",
    muscleGroup: "Biceps",
    targetSets: 3,
    sourceReps: [12, 12, 12],
    timerSec: 60,
  },
  {
    name: "Hanging Leg Raise",
    category: "strength",
    muscleGroup: "Abs",
    targetSets: 3,
    sourceReps: [8, 8, 8],
    timerSec: 60,
  },
];

const PLAN = {
  name: "GAROU II",
  description:
    "6-day push/pull/lower/Garou workout plan transcribed from screenshots. Per-set reps are collapsed to one target_reps value because routine_day_exercises supports only a single target_reps field; timerSec is not stored by the current schema.",
  days: [
    { name: "PUSH 1", exercises: PUSH_1_EXERCISES },
    { name: "PULL 1", exercises: PULL_1_EXERCISES },
    { name: "LOWER", exercises: LOWER_EXERCISES },
    { name: "PUSH 2", exercises: PUSH_1_EXERCISES },
    { name: "PULL 2", exercises: PULL_1_EXERCISES },
    { name: "GAROU DAY", exercises: GAROU_DAY_EXERCISES },
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
    listUsers: false,
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

    if (arg === "--list-users") {
      options.listUsers = true;
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
  npm run db:seed:garou-ii -- --user <username|email|user-id> [--set-active]
  npm run db:seed:garou-ii -- --list-users

Environment alternatives:
  SEED_USER=<username|email|user-id> npm run db:seed:garou-ii
  SEED_SET_ACTIVE=1 SEED_USER=<username|email|user-id> npm run db:seed:garou-ii

This seed is non-destructive. It inserts the GAROU II plan only when a
routine with preset_key "${PRESET_KEY}" does not already exist for the user.

Per-set source reps are mapped to target_reps with max(sourceReps); timerSec is
kept in this script for auditability but is not stored by the current schema.
`);
}

function printUsers(users) {
  if (users.length === 0) {
    console.log("No users found.");
    return;
  }

  console.table(
    users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email ?? "",
      created_at: user.created_at,
    })),
  );
}

function getTargetReps(sourceReps) {
  if (!Array.isArray(sourceReps) || sourceReps.length === 0) {
    return null;
  }

  return Math.max(...sourceReps);
}

function validatePlan() {
  if (PLAN.days.length === 0) {
    throw new Error("Plan must include at least one day.");
  }

  for (const [dayIndex, day] of PLAN.days.entries()) {
    if (!day.name || day.exercises.length === 0) {
      throw new Error(`Day ${dayIndex + 1} must include a name and at least one exercise.`);
    }

    for (const [exerciseIndex, exercise] of day.exercises.entries()) {
      const label = `Day ${dayIndex + 1}, exercise ${exerciseIndex + 1}`;
      if (!exercise.name || !exercise.category || !exercise.muscleGroup) {
        throw new Error(`${label} is missing required exercise metadata.`);
      }

      if (!Number.isInteger(exercise.targetSets) || exercise.targetSets < 1) {
        throw new Error(`${label} has invalid targetSets.`);
      }

      const targetReps = getTargetReps(exercise.sourceReps);
      if (targetReps !== null && (!Number.isInteger(targetReps) || targetReps < 1)) {
        throw new Error(`${label} has invalid sourceReps.`);
      }
    }
  }
}

async function listUsers(sql) {
  return sql`
    select id, username, email, created_at
    from users
    order by created_at asc
  `;
}

async function findTargetUser(sql, userIdentifier) {
  if (userIdentifier) {
    const users = await sql`
      select id, username, email, created_at
      from users
      where id::text = ${userIdentifier}
        or lower(username) = lower(${userIdentifier})
        or lower(coalesce(email, '')) = lower(${userIdentifier})
      order by created_at asc
    `;

    if (users.length === 0) {
      throw new Error(`No user found for "${userIdentifier}".`);
    }

    if (users.length > 1) {
      console.error(`More than one user matched "${userIdentifier}". Pick one of these ids:`);
      printUsers(users);
      throw new Error("Run the seed again with --user <id>.");
    }

    return users[0];
  }

  const users = await sql`
    select id, username, email, created_at
    from users
    order by created_at asc
  `;

  if (users.length === 0) {
    throw new Error("No users exist yet. Create a user before running this seed.");
  }

  if (users.length > 1) {
    console.error("More than one user exists. Pick one of these ids:");
    printUsers(users);
    throw new Error("Run the seed again with --user <id>.");
  }

  return users[0];
}

function getExerciseSeeds() {
  const byName = new Map();

  for (const day of PLAN.days) {
    for (const exercise of day.exercises) {
      if (!byName.has(exercise.name)) {
        byName.set(exercise.name, {
          name: exercise.name,
          category: exercise.category,
          muscleGroup: exercise.muscleGroup,
        });
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

      for (const [exerciseIndex, exercise] of day.exercises.entries()) {
        const exerciseId = exerciseIdsByName.get(exercise.name);
        if (!exerciseId) {
          throw new Error(`Missing exercise id for "${exercise.name}".`);
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
            ${exercise.targetSets},
            ${getTargetReps(exercise.sourceReps)},
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
  validatePlan();

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
    if (options.listUsers) {
      printUsers(await listUsers(sql));
      return;
    }

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
  console.error("Failed to seed GAROU II plan:", error.message);
  process.exit(1);
});
