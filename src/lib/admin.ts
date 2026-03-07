import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";

export const ADMIN_EMAIL = "mzootfb@gmail.com";

export async function isAdminIdentity(params: {
  userId: string;
  sessionEmail?: string | null;
}) {
  const sessionEmail = params.sessionEmail?.toLowerCase();
  if (sessionEmail === ADMIN_EMAIL) {
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

  return (
    dbUser.email?.toLowerCase() === ADMIN_EMAIL ||
    dbUser.username.toLowerCase() === ADMIN_EMAIL
  );
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
