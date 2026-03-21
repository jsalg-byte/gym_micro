import { and, count, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { friendRequests, routineDays, routines, users, workoutSessions, workoutSets } from "@/db/schema";
import { requireUserId } from "@/lib/session";
import { formatEasternDateTime } from "@/lib/timezone";
import {
  acceptFriendRequestAction,
  rejectFriendRequestAction,
  removeFriendAction,
  sendFriendRequestAction,
} from "@/server/actions";

type FriendItem = {
  userId: string;
  username: string;
  name: string | null;
};

export default async function FriendsPage() {
  const userId = await requireUserId();
  const db = getDb();

  const [me] = await db
    .select({
      username: users.username,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const [incomingRequests, outgoingRequests, acceptedOutgoing, acceptedIncoming] = await Promise.all([
    db
      .select({
        requestId: friendRequests.id,
        userId: users.id,
        username: users.username,
        name: users.name,
        createdAt: friendRequests.createdAt,
      })
      .from(friendRequests)
      .innerJoin(users, eq(friendRequests.requesterId, users.id))
      .where(and(eq(friendRequests.addresseeId, userId), eq(friendRequests.status, "pending")))
      .orderBy(desc(friendRequests.createdAt)),
    db
      .select({
        requestId: friendRequests.id,
        userId: users.id,
        username: users.username,
        name: users.name,
        createdAt: friendRequests.createdAt,
      })
      .from(friendRequests)
      .innerJoin(users, eq(friendRequests.addresseeId, users.id))
      .where(and(eq(friendRequests.requesterId, userId), eq(friendRequests.status, "pending")))
      .orderBy(desc(friendRequests.createdAt)),
    db
      .select({
        userId: users.id,
        username: users.username,
        name: users.name,
      })
      .from(friendRequests)
      .innerJoin(users, eq(friendRequests.addresseeId, users.id))
      .where(and(eq(friendRequests.requesterId, userId), eq(friendRequests.status, "accepted"))),
    db
      .select({
        userId: users.id,
        username: users.username,
        name: users.name,
      })
      .from(friendRequests)
      .innerJoin(users, eq(friendRequests.requesterId, users.id))
      .where(and(eq(friendRequests.addresseeId, userId), eq(friendRequests.status, "accepted"))),
  ]);

  const friendMap = new Map<string, FriendItem>();
  for (const entry of [...acceptedOutgoing, ...acceptedIncoming]) {
    friendMap.set(entry.userId, entry);
  }
  const friends = Array.from(friendMap.values()).sort((a, b) => a.username.localeCompare(b.username));
  const friendIds = friends.map((friend) => friend.userId);

  const activityRows =
    friendIds.length > 0
      ? await db
          .select({
            id: workoutSessions.id,
            friendUserId: users.id,
            friendUsername: users.username,
            friendName: users.name,
            startedAt: workoutSessions.startedAt,
            status: workoutSessions.status,
            routineName: routines.name,
            dayName: routineDays.dayName,
          })
          .from(workoutSessions)
          .innerJoin(users, eq(workoutSessions.userId, users.id))
          .leftJoin(routines, eq(workoutSessions.routineId, routines.id))
          .leftJoin(routineDays, eq(workoutSessions.routineDayId, routineDays.id))
          .where(inArray(workoutSessions.userId, friendIds))
          .orderBy(desc(workoutSessions.startedAt))
          .limit(50)
      : [];

  const activitySessionIds = activityRows.map((row) => row.id);
  const activitySetCounts =
    activitySessionIds.length > 0
      ? await db
          .select({
            sessionId: workoutSets.sessionId,
            setCount: count(),
          })
          .from(workoutSets)
          .where(inArray(workoutSets.sessionId, activitySessionIds))
          .groupBy(workoutSets.sessionId)
      : [];

  const setCountBySessionId = new Map(activitySetCounts.map((row) => [row.sessionId, row.setCount]));

  return (
    <main className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <section className="space-y-4">
        <article className="panel p-4">
          <h1 className="text-xl font-black text-slate-900">Friends</h1>
          <p className="mt-1 text-sm text-slate-600">
            Send friend requests by username. Accepted friends can see each other&apos;s workout sessions only.
          </p>
        </article>

        <article className="panel p-4">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Add Friend</h2>
          <p className="mt-1 text-xs text-slate-500">Your username: {me?.username ?? "unknown"}</p>
          <form action={sendFriendRequestAction} className="mt-3 flex gap-2">
            <input
              name="username"
              required
              minLength={3}
              placeholder="friend username"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
            <button className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">
              Send
            </button>
          </form>
        </article>

        <article className="panel p-4">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">
            Incoming Requests ({incomingRequests.length})
          </h2>
          <ul className="mt-2 space-y-2">
            {incomingRequests.map((request) => (
              <li key={request.requestId} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <p className="text-sm font-semibold text-slate-900">{request.username}</p>
                <p className="text-xs text-slate-600">{request.name ?? "No display name"}</p>
                <div className="mt-2 flex gap-2">
                  <form action={acceptFriendRequestAction}>
                    <input type="hidden" name="requestId" value={request.requestId} />
                    <button className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100">
                      Accept
                    </button>
                  </form>
                  <form action={rejectFriendRequestAction}>
                    <input type="hidden" name="requestId" value={request.requestId} />
                    <button className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100">
                      Decline
                    </button>
                  </form>
                </div>
              </li>
            ))}
            {incomingRequests.length === 0 ? (
              <li className="text-sm text-slate-500">No pending incoming requests.</li>
            ) : null}
          </ul>
        </article>

        <article className="panel p-4">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">
            Sent Requests ({outgoingRequests.length})
          </h2>
          <ul className="mt-2 space-y-1">
            {outgoingRequests.map((request) => (
              <li key={request.requestId} className="text-sm text-slate-700">
                {request.username} · pending
              </li>
            ))}
            {outgoingRequests.length === 0 ? <li className="text-sm text-slate-500">No pending sent requests.</li> : null}
          </ul>
        </article>
      </section>

      <section className="space-y-4">
        <article className="panel p-4">
          <h2 className="text-xl font-black text-slate-900">Friends ({friends.length})</h2>
          <ul className="mt-2 space-y-2">
            {friends.map((friend) => (
              <li
                key={friend.userId}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{friend.username}</p>
                  <p className="text-xs text-slate-600">{friend.name ?? "No display name"}</p>
                </div>
                <form action={removeFriendAction}>
                  <input type="hidden" name="friendUserId" value={friend.userId} />
                  <button className="rounded-md border border-rose-300 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50">
                    Remove
                  </button>
                </form>
              </li>
            ))}
            {friends.length === 0 ? <li className="text-sm text-slate-500">No friends yet.</li> : null}
          </ul>
        </article>

        <article className="panel p-4">
          <h2 className="text-xl font-black text-slate-900">Friends Workout Activity</h2>
          <p className="mt-1 text-xs text-slate-600">Workout sessions only. Progress photos are never shared.</p>
          <ul className="mt-3 space-y-2">
            {activityRows.map((row) => (
              <li key={row.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-semibold text-slate-900">{row.friendName ?? row.friendUsername}</p>
                <p className="text-xs text-slate-600">
                  @{row.friendUsername} · {formatEasternDateTime(row.startedAt)}
                </p>
                <p className="mt-1 text-slate-700">
                  {row.routineName ?? "Workout Plan"} / {row.dayName ?? "Day"} · {row.status} ·{" "}
                  {setCountBySessionId.get(row.id) ?? 0} set{(setCountBySessionId.get(row.id) ?? 0) === 1 ? "" : "s"}
                </p>
              </li>
            ))}
            {activityRows.length === 0 ? (
              <li className="text-sm text-slate-500">No friend session activity yet.</li>
            ) : null}
          </ul>
        </article>
      </section>
    </main>
  );
}
