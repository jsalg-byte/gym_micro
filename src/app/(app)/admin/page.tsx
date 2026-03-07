import { asc, desc, inArray } from "drizzle-orm";
import {
  adminCreateUserAction,
  adminDeleteUserAction,
  adminUpdateUserAction,
} from "@/server/admin-actions";
import { getDb } from "@/db/client";
import { userIpAddresses, users } from "@/db/schema";
import { requireAdminUserId } from "@/lib/admin";

export default async function AdminPage() {
  await requireAdminUserId();
  const db = getDb();

  const userRows = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .orderBy(asc(users.username));

  const userIds = userRows.map((user) => user.id);
  const ipRows =
    userIds.length > 0
      ? await db
          .select()
          .from(userIpAddresses)
          .where(inArray(userIpAddresses.userId, userIds))
          .orderBy(desc(userIpAddresses.lastSeenAt))
      : [];

  const ipsByUser = new Map<string, typeof ipRows>();
  for (const row of ipRows) {
    const list = ipsByUser.get(row.userId) ?? [];
    list.push(row);
    ipsByUser.set(row.userId, list);
  }

  return (
    <main className="space-y-4">
      <section className="panel p-4">
        <h1 className="text-2xl font-black text-slate-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage users and review associated IP addresses seen for each account.
        </p>
      </section>

      <section className="panel p-4">
        <h2 className="text-lg font-black text-slate-900">Create User</h2>
        <form action={adminCreateUserAction} className="mt-3 grid gap-2 sm:grid-cols-4">
          <input
            name="username"
            required
            placeholder="Username"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <input
            name="name"
            placeholder="Display name"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <input
            name="email"
            type="email"
            placeholder="Email (optional)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Password"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <button className="sm:col-span-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            Create User
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-black text-slate-900">All Users ({userRows.length})</h2>
        {userRows.map((user) => {
          const ips = ipsByUser.get(user.id) ?? [];
          return (
            <article key={user.id} className="panel p-4">
              <form action={adminUpdateUserAction} className="grid gap-2 sm:grid-cols-4">
                <input type="hidden" name="id" value={user.id} />
                <input
                  name="username"
                  defaultValue={user.username}
                  required
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
                <input
                  name="name"
                  defaultValue={user.name ?? ""}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
                <input
                  name="email"
                  type="email"
                  defaultValue={user.email ?? ""}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
                <input
                  name="password"
                  type="password"
                  placeholder="New password (optional)"
                  minLength={8}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
                <div className="sm:col-span-4 flex flex-wrap items-center gap-2">
                  <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
                    Save User
                  </button>
                  <p className="text-xs text-slate-500">
                    Created {new Date(user.createdAt).toLocaleDateString()} · Updated{" "}
                    {new Date(user.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </form>
              <form action={adminDeleteUserAction} className="mt-2">
                <input type="hidden" name="id" value={user.id} />
                <button className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                  Delete User
                </button>
              </form>

              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Associated IPs ({ips.length})
                </p>
                {ips.length === 0 ? (
                  <p className="mt-1 text-sm text-slate-500">No IP records yet.</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {ips.map((ip) => (
                      <li key={ip.id} className="text-xs text-slate-700">
                        {ip.ipAddress} · last seen {new Date(ip.lastSeenAt).toLocaleString()} · hits {ip.hitCount}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
