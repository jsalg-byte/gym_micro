import { asc, desc, inArray } from "drizzle-orm";
import {
  adminCreateUserAction,
  adminDeleteUserAction,
  adminUpdateUserAction,
} from "@/server/admin-actions";
import { getDb } from "@/db/client";
import { userIpAddresses, users } from "@/db/schema";
import { requireAdminUserId } from "@/lib/admin";
import { formatEasternDateTime } from "@/lib/timezone";

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
    <main className="space-y-8 pb-12 transition-colors duration-300">
      {/* Page Header */}
      <section className="rounded-3xl border border-line bg-surface/50 p-6 backdrop-blur-sm">
        <h1 className="text-3xl font-black tracking-tight text-foreground">Admin Dashboard</h1>
        <p className="mt-1 text-sm font-medium text-muted">
          Manage users and review associated IP addresses seen for each account.
        </p>
      </section>

      {/* Create User Form */}
      <section className="rounded-3xl border border-line bg-surface p-6 shadow-xl transition-all">
        <h2 className="text-xl font-black text-foreground">Create User</h2>
        <form action={adminCreateUserAction} className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted ml-1">Username</label>
            <input
              name="username"
              required
              placeholder="e.g. jdoe"
              className="rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground outline-none ring-accent-cyan/20 transition-all focus:border-accent-cyan focus:ring-4"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted ml-1">Display Name</label>
            <input
              name="name"
              placeholder="e.g. John Doe"
              className="rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground outline-none ring-accent-cyan/20 transition-all focus:border-accent-cyan focus:ring-4"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted ml-1">Email (Optional)</label>
            <input
              name="email"
              type="email"
              placeholder="john@example.com"
              className="rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground outline-none ring-accent-cyan/20 transition-all focus:border-accent-cyan focus:ring-4"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted ml-1">Password</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              className="rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground outline-none ring-accent-cyan/20 transition-all focus:border-accent-cyan focus:ring-4"
            />
          </div>
          <button className="md:col-span-2 mt-2 rounded-2xl bg-accent-pink px-6 py-4 text-sm font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(255,92,92,0.2)] transition-all hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(255,92,92,0.3)] active:scale-[0.98]">
            Create User
          </button>
        </form>
      </section>

      {/* User List */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xl font-black text-foreground">All Users</h2>
          <span className="rounded-full bg-surface border border-line px-3 py-1 text-xs font-bold text-muted">
            {userRows.length} Total
          </span>
        </div>
        
        <div className="grid gap-6">
          {userRows.map((user) => {
            const ips = ipsByUser.get(user.id) ?? [];
            return (
              <article key={user.id} className="group rounded-3xl border border-line bg-surface p-6 transition-all hover:border-foreground/20">
                <form action={adminUpdateUserAction} className="grid gap-6 md:grid-cols-2">
                  <input type="hidden" name="id" value={user.id} />
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Username</label>
                    <input
                      name="username"
                      defaultValue={user.username}
                      required
                      className="rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground outline-none ring-accent-pink/20 transition-all focus:border-accent-pink focus:ring-4"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Display Name</label>
                    <input
                      name="name"
                      defaultValue={user.name ?? ""}
                      className="rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground outline-none ring-accent-pink/20 transition-all focus:border-accent-pink focus:ring-4"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Email</label>
                    <input
                      name="email"
                      type="email"
                      defaultValue={user.email ?? ""}
                      className="rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground outline-none ring-accent-pink/20 transition-all focus:border-accent-pink focus:ring-4"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Change Password</label>
                    <input
                      name="password"
                      type="password"
                      placeholder="Leave blank to keep current"
                      minLength={8}
                      className="rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground outline-none ring-accent-pink/20 transition-all focus:border-accent-pink focus:ring-4"
                    />
                  </div>

                  <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-4 mt-2">
                    <div className="flex items-center gap-3">
                      <button className="rounded-xl bg-accent-cyan px-5 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-[0_0_15px_rgba(112,224,224,0.1)] transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(112,224,224,0.2)] active:scale-95">
                        Save User
                      </button>
                      <div className="text-[10px] font-medium leading-relaxed text-muted">
                        Created <span className="text-foreground/70 font-bold">{formatEasternDateTime(user.createdAt)}</span><br />
                        Updated <span className="text-foreground/70 font-bold">{formatEasternDateTime(user.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </form>

                <div className="mt-6 rounded-2xl bg-background border border-line p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                      Associated IPs
                    </p>
                    <span className="text-[10px] font-bold text-muted bg-surface px-2 py-0.5 rounded-full border border-line">
                      {ips.length} Records
                    </span>
                  </div>
                  
                  {ips.length === 0 ? (
                    <p className="text-xs text-muted italic text-center py-2">No IP records found for this user.</p>
                  ) : (
                    <div className="grid gap-2">
                      {ips.map((ip) => (
                        <div key={ip.id} className="flex items-center justify-between text-[11px] border-b border-line pb-2 last:border-0 last:pb-0">
                          <code className="text-accent-cyan font-bold font-mono">{ip.ipAddress}</code>
                          <div className="text-right">
                            <p className="text-foreground/80 font-medium">Last seen {formatEasternDateTime(ip.lastSeenAt)}</p>
                            <p className="text-muted text-[10px]">Total Hits: {ip.hitCount}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form action={adminDeleteUserAction} className="mt-6 pt-6 border-t border-line flex justify-end">
                  <input type="hidden" name="id" value={user.id} />
                  <button className="rounded-xl border border-red-500/30 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-500 transition-all hover:bg-red-500/10 hover:border-red-500 active:scale-95">
                    Delete User
                  </button>
                </form>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
