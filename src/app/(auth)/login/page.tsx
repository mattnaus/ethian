import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./_components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h2 className="text-xl font-semibold text-foreground mb-1">Sign in</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Enter your email and password to continue.
      </p>
      <LoginForm />
      <p className="text-center text-sm text-muted-foreground mt-6">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-foreground underline underline-offset-4 hover:opacity-75"
        >
          Create one
        </Link>
      </p>
    </>
  );
}
