import { requirePermission } from "@/lib/server/auth";
import { updateAdminCredentials } from "@/lib/server/actions";
import {
  btnAdmin,
  Card,
  Field,
  inputCls,
  Notice,
  PageHeader,
  Warn,
} from "@/components/admin/Ui";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  missing: "That admin account no longer exists. Sign in again.",
  password: "The current password is incorrect. Nothing was changed.",
  empty: "Enter a new email or a new password first.",
  email: "That email is already used by another admin account.",
  short: "The new password must be at least 8 characters.",
  mismatch: "The new password and the confirmation do not match.",
};

/**
 * Account credentials — Head Admin (Governor & Vice Governor) only.
 *
 * Nothing here is prefilled or displayed: the current email and password are
 * never shown on screen (the panel is reached from a shared workspace), and
 * every change must be confirmed with the current password.
 */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requirePermission("account");
  const params = await searchParams;
  const error = params?.error ? ERRORS[params.error] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account"
        description="Change the sign-in email and password used to enter this admin panel. Available to the Head Admin only — Board Members keep content access and cannot change credentials."
      />

      {params?.saved && <Notice>Credentials updated. Use them next time you sign in.</Notice>}
      {error && <Warn>{error}</Warn>}

      <Card>
        <h2 className="font-display text-base font-bold text-snow">
          Change sign-in email
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-mist">
          For privacy, the current email is not shown here. Enter the new email
          and confirm with your current password.
        </p>
        <form action={updateAdminCredentials} className="mt-4 grid gap-4 sm:max-w-md">
          <Field label="New email">
            <input
              name="newEmail"
              type="email"
              autoComplete="username"
              placeholder="new-admin@rcloud.cssp"
              className={inputCls}
            />
          </Field>
          <Field label="Current password">
            <input
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputCls}
            />
          </Field>
          <div>
            <button type="submit" className={btnAdmin}>
              Save email
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="font-display text-base font-bold text-snow">
          Change password
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-mist">
          Passwords are stored hashed and are never displayed. Use at least 8
          characters.
        </p>
        <form action={updateAdminCredentials} className="mt-4 grid gap-4 sm:max-w-md">
          <Field label="Current password">
            <input
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputCls}
            />
          </Field>
          <Field label="New password">
            <input
              name="newPassword"
              type="password"
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className={inputCls}
            />
          </Field>
          <Field label="Confirm new password">
            <input
              name="confirmPassword"
              type="password"
              minLength={8}
              autoComplete="new-password"
              placeholder="Repeat the new password"
              className={inputCls}
            />
          </Field>
          <div>
            <button type="submit" className={btnAdmin}>
              Save password
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
