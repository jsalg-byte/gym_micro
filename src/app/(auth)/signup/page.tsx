import Link from "next/link";
import { SignUpForm } from "@/components/signup-form";

export default function SignUpPage() {
  return (
    <div className="shell min-h-screen py-8">
      <main className="mx-auto w-full max-w-md space-y-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900">Create account</h1>
          <p className="text-sm text-slate-600">Pick a unique username and password to get started.</p>
        </div>
        <SignUpForm />
        <p className="text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/signin" className="font-semibold text-teal-700 hover:text-teal-800">
            Sign in
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
