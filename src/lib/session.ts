import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export async function requireUserId() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/signin");
  }

  return session.user.id;
}

export async function getCurrentUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}
