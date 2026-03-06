"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setLoading(false);
      setError(payload?.error ?? "Unable to create account.");
      return;
    }

    const authResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    setLoading(false);

    if (!authResult || authResult.error) {
      router.push("/signin");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={onSubmit}>
      <label className="block text-sm font-medium text-slate-700">
        Name
        <input
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Password
        <input
          type="password"
          minLength={8}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Creating account..." : "Create Account"}
      </button>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </form>
  );
}
