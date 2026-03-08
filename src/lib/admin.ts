import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";

const DEFAULT_ADMIN_IDENTIFIERS = ["mzootfb@gmail.com", "mzootfb"];
const CONFIGURED_ADMIN_IDENTIFIERS = (process.env.ADMIN_IDENTIFIERS ?? "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
const ADMIN_IDENTIFIERS = new Set([...DEFAULT_ADMIN_IDENTIFIERS, ...CONFIGURED_ADMIN_IDENTIFIERS]);

function isAdminValue(value?: string | null) {
  if (!value) {
    return false;
  }
  return ADMIN_IDENTIFIERS.has(value.trim().toLowerCase());
}

export async function isAdminIdentity(params: {
  userId: string;
  sessionEmail?: string | null;
}) {
  if (isAdminValue(params.sessionEmail)) {
    return true;
  }

  const db = getDb();
  const [dbUser] = await db
    .select({
      email: users.email,
      username: users.username,
    })
    .from(users)
    .where(eq(users.id, params.userId))
    .limit(1);

  if (!dbUser) {
    return false;
  }

  return isAdminValue(dbUser.email) || isAdminValue(dbUser.username);
}

export async function requireAdminUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const email = session?.user?.email;

  if (!userId || !(await isAdminIdentity({ userId, sessionEmail: email }))) {
    redirect("/dashboard");
  }

  return userId;
}

export async function isAdminSession() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return false;
  }
  return isAdminIdentity({ userId, sessionEmail: session.user.email });
}
