import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export const ADMIN_EMAIL = "mzootfb@gmail.com";

export async function requireAdminUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const email = session?.user?.email?.toLowerCase();

  if (!userId || email !== ADMIN_EMAIL) {
    redirect("/dashboard");
  }

  return userId;
}

export async function isAdminSession() {
  const session = await getServerSession(authOptions);
  return session?.user?.email?.toLowerCase() === ADMIN_EMAIL;
}
