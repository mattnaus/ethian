import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./_components/register-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <>
      <h2 className="text-xl font-semibold text-foreground mb-1">
        Create an account
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Start managing your email the intentional way.
      </p>
      <RegisterForm />
      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-foreground underline underline-offset-4 hover:opacity-75"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
