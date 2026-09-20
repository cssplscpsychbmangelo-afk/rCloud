import type { Metadata } from "next";
import { loginAction } from "@/lib/server/actions";
import { Field, inputCls, btnAdmin } from "@/components/admin/Ui";
import { site } from "@/lib/data/site";

export const metadata: Metadata = {
  title: "Admin sign in",
  description: "Restricted — rCloud administrative access.",
  // Search engines have no business listing the way into the admin area.
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  // One generic message for every failed sign-in (never "that email exists but
  // the password is wrong"), plus a distinct one for the rate limiter.
  const errorMessage =
    params?.error === "throttled"
      ? "Too many sign-in attempts. Please wait a few minutes and try again."
      : params?.error
        ? "Incorrect email or password, or the account is deactivated."
        : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-night px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-2xl font-black tracking-tight text-snow">
            r<span className="text-vio-300">C</span>loud
          </p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-dim">
            {site.org} · Administration
          </p>
        </div>

        <form
          action={loginAction}
          className="rounded-[20px] border border-line bg-panel p-6"
        >
          {errorMessage && (
            <p
              role="alert"
              className="mb-4 rounded-xl border border-bad/30 bg-bad/10 px-4 py-2.5 text-xs font-semibold text-bad"
            >
              {errorMessage}
            </p>
          )}
          <Field label="Email" className="mb-4">
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              className={inputCls}
            />
          </Field>
          <Field label="Password" className="mb-6">
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputCls}
            />
          </Field>
          <button type="submit" className={`${btnAdmin} w-full`}>
            Sign in
          </button>
        </form>

        {/* Sign-in hints (account names, emails or passwords) are deliberately
            not shown here — this page is publicly reachable. */}
        <p className="mt-6 rounded-xl border border-line bg-panel/60 px-4 py-3 text-center text-[11px] leading-relaxed text-dim">
          Restricted to authorised council officers. Credentials are issued by
          the Head Admin and are never displayed here.
        </p>
      </div>
    </main>
  );
}
