import postgres from "postgres";

const GAROU_II_PRESET_KEY = "garou-ii-v1";

const DAYS = [
  {
    dayKey: "2026-06-30",
    startedAt: "2026-06-30T16:00:00.000Z",
    endedAt: "2026-06-30T17:20:00.000Z",
    routineDayName: "PUSH 1",
    exercises: [
      {
        name: "Barbell Overhead Front Raise",
        category: "strength",
        muscleGroup: "Shoulders",
        sets: [
          { weight: 70, reps: 5 },
          { weight: 70, reps: 6 },
          { weight: 70, reps: 7 },
        ],
      },
      {
        name: "Barbell Bench Press",
        category: "strength",
        muscleGroup: "Chest",
        sets: [
          { weight: 100, reps: 5 },
          { weight: 100, reps: 5 },
          { weight: 100, reps: 5 },
        ],
      },
      {
        name: "Dumbbell Deep Push-Up",
        category: "strength",
        muscleGroup: "Chest",
        sets: [
          { weight: null, reps: 10 },
          { weight: null, reps: 10 },
          { weight: null, reps: 10 },
        ],
      },
      {
        name: "Dumbbell Incline Fly",
        category: "strength",
        muscleGroup: "Chest",
        sets: [
          { weight: 10, reps: 12 },
          { weight: 10, reps: 12 },
          { weight: 10, reps: 12 },
        ],
      },
      {
        name: "Dumbbell Front Raise",
        category: "strength",
        muscleGroup: "Shoulders",
        sets: [
          { weight: 10, reps: 15 },
          { weight: 10, reps: 15 },
          { weight: 10, reps: 15 },
        ],
      },
      {
        name: "EZ Bar Decline Close Grip Skull Crusher",
        category: "strength",
        muscleGroup: "Triceps",
        sets: [
          { weight: 45, reps: 6 },
          { weight: 45, reps: 7 },
          { weight: 45, reps: 5 },
        ],
      },
      {
        name: "Sit-Up",
        category: "strength",
        muscleGroup: "Abs",
        sets: [
          { weight: null, reps: 15 },
          { weight: null, reps: 15 },
          { weight: null, reps: 15 },
        ],
      },
    ],
  },
  {
    dayKey: "2026-07-02",
    startedAt: "2026-07-02T16:00:00.000Z",
    endedAt: "2026-07-02T17:35:00.000Z",
    routineDayName: "PULL 1",
    exercises: [
      {
        name: "Pull-Up",
        category: "strength",
        muscleGroup: "Back",
        sets: [
          { weight: null, reps: 5 },
          { weight: null, reps: 5 },
          { weight: null, reps: 5 },
        ],
      },
      {
        name: "Barbell Bent-Over Row",
        category: "strength",
        muscleGroup: "Back",
        sets: [
          { weight: 100, reps: 5 },
          { weight: 100, reps: 5 },
          { weight: 100, reps: 5 },
        ],
      },
      {
        name: "Dumbbell Lateral Raise",
        category: "strength",
        muscleGroup: "Shoulders",
        sets: [
          { weight: 10, reps: 15 },
          { weight: 10, reps: 15 },
          { weight: 10, reps: 15 },
        ],
      },
      {
        name: "Inverted Barbell Row",
        category: "strength",
        muscleGroup: "Back",
        sets: [
          { weight: 100, reps: 5 },
          { weight: 100, reps: 5 },
          { weight: 100, reps: 5 },
          { weight: 100, reps: 5 },
          { weight: 55, reps: 12 },
        ],
      },
      {
        name: "Dumbbell Posterior Fly on Stability Ball",
        category: "strength",
        muscleGroup: "Shoulders",
        sets: [
          { weight: 10, reps: 12 },
          { weight: 10, reps: 12 },
          { weight: 10, reps: 12 },
        ],
      },
      {
        name: "Barbell Spider Curl",
        category: "strength",
        muscleGroup: "Biceps",
        sets: [
          { weight: 60, reps: 3 },
          { weight: 60, reps: 2 },
          { weight: 55, reps: 3 },
          { weight: 55, reps: 5 },
          { weight: 55, reps: 5 },
        ],
      },
      {
        name: "Weight Plate Russian Twist",
        category: "strength",
        muscleGroup: "Abs",
        sets: [
          { weight: 10, reps: 10 },
          { weight: 10, reps: 15 },
          { weight: 10, reps: 20 },
        ],
      },
    ],
  },
];

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
  npm run db:seed:missing-progress-days -- --user <username|email|user-id>
  npm run db:seed:missing-progress-days -- --list-users

Environment alternative:
  SEED_USER=<username|email|user-id> npm run db:seed:missing-progress-days

This seed is non-destructive. It inserts completed workout sessions for
2026-06-30 and 2026-07-02 only when the user has no workout session on that
Eastern calendar day. It links to GAROU II / PUSH 1 and GAROU II / PULL 1 when
that routine exists; otherwise it still inserts the logged sets with no routine link.
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

function validateSeedData() {
  for (const day of DAYS) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.dayKey)) {
      throw new Error(`Invalid day key: ${day.dayKey}`);
    }

    if (day.exercises.length === 0) {
      throw new Error(`${day.dayKey} must include at least one exercise.`);
    }

    for (const exercise of day.exercises) {
      if (!exercise.name || !exercise.category || !exercise.muscleGroup) {
        throw new Error(`${day.dayKey} has an exercise with missing metadata.`);
      }

      if (exercise.sets.length === 0) {
        throw new Error(`${day.dayKey} / ${exercise.name} must include at least one set.`);
      }

      for (const set of exercise.sets) {
        if (!Number.isInteger(set.reps) || set.reps < 1) {
          throw new Error(`${day.dayKey} / ${exercise.name} has invalid reps.`);
        }

        if (set.weight !== null && (!Number.isFinite(set.weight) || set.weight < 0)) {
          throw new Error(`${day.dayKey} / ${exercise.name} has invalid weight.`);
        }
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

  const users = await listUsers(sql);
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

  for (const day of DAYS) {
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

async function findGarouIiRoutineDay(tx, userId, dayName) {
  const [row] = await tx`
    select routines.id as routine_id, routine_days.id as routine_day_id
    from routines
    inner join routine_days on routine_days.routine_id = routines.id
    where routines.user_id = ${userId}
      and routines.preset_key = ${GAROU_II_PRESET_KEY}
      and routine_days.day_name = ${dayName}
    order by routines.created_at asc, routine_days.sort_order asc
    limit 1
  `;

  return row ?? null;
}

function easternDayRange(dayKey) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, 4, 0, 0));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function minutesAfter(isoDate, minutes) {
  const date = new Date(isoDate);
  date.setUTCMinutes(date.getUTCMinutes() + minutes);
  return date;
}

async function hasSessionOnEasternDay(tx, userId, dayKey) {
  const { start, end } = easternDayRange(dayKey);
  const [row] = await tx`
    select id
    from workout_sessions
    where user_id = ${userId}
      and started_at >= ${start}
      and started_at < ${end}
    limit 1
  `;

  return row ?? null;
}

async function seedMissingDays(sql, user) {
  return sql.begin(async (tx) => {
    const exerciseIdsByName = await ensureExercises(tx);
    const results = [];

    for (const day of DAYS) {
      const existingSession = await hasSessionOnEasternDay(tx, user.id, day.dayKey);
      if (existingSession) {
        results.push({
          dayKey: day.dayKey,
          inserted: false,
          sessionId: existingSession.id,
          message: `Workout session already exists on ${day.dayKey}; no changes made.`,
        });
        continue;
      }

      const routineLink = await findGarouIiRoutineDay(tx, user.id, day.routineDayName);
      const [session] = await tx`
        insert into workout_sessions (
          user_id,
          routine_id,
          routine_day_id,
          started_at,
          ended_at,
          status
        )
        values (
          ${user.id},
          ${routineLink?.routine_id ?? null},
          ${routineLink?.routine_day_id ?? null},
          ${new Date(day.startedAt)},
          ${new Date(day.endedAt)},
          'completed'
        )
        returning id
      `;

      let setOrder = 1;
      for (const exercise of day.exercises) {
        const exerciseId = exerciseIdsByName.get(exercise.name);
        if (!exerciseId) {
          throw new Error(`Missing exercise id for "${exercise.name}".`);
        }

        for (const set of exercise.sets) {
          await tx`
            insert into workout_sets (
              session_id,
              exercise_id,
              set_order,
              reps,
              weight,
              is_warmup,
              created_at
            )
            values (
              ${session.id},
              ${exerciseId},
              ${setOrder},
              ${set.reps},
              ${set.weight === null ? null : set.weight.toFixed(2)},
              false,
              ${minutesAfter(day.startedAt, setOrder)}
            )
          `;
          setOrder += 1;
        }
      }

      results.push({
        dayKey: day.dayKey,
        inserted: true,
        sessionId: session.id,
        setCount: setOrder - 1,
        routineLinked: Boolean(routineLink),
        message: `Inserted completed workout session for ${day.dayKey}.`,
      });
    }

    return results;
  });
}

async function main() {
  validateSeedData();

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
    const results = await seedMissingDays(sql, user);

    for (const result of results) {
      console.log(result.message);
      console.log(`Session id: ${result.sessionId}`);
      if (result.inserted) {
        console.log(`Added ${result.setCount} sets.`);
        if (!result.routineLinked) {
          console.log(`GAROU II / ${DAYS.find((day) => day.dayKey === result.dayKey)?.routineDayName} was not found; session inserted without a routine link.`);
        }
      }
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("Failed to seed missing progress days:", error.message);
  process.exit(1);
});
