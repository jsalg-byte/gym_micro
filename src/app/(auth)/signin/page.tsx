import Link from "next/link";
import { SignInForm } from "@/components/signin-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/dashboard";

  return (
    <div className="shell min-h-screen py-8">
      <main className="mx-auto w-full max-w-md space-y-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900">Sign in</h1>
          <p className="text-sm text-slate-600">Sign in with your username and password.</p>
        </div>
        <SignInForm callbackUrl={callbackUrl} />
        <p className="text-sm text-slate-600">
          Need an account?{" "}
          <Link href="/signup" className="font-semibold text-teal-700 hover:text-teal-800">
            Create one
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
