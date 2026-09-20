import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { roleLabels, type Role } from "@/lib/server/permissions";
import { visibleAdminNav } from "@/lib/adminNav";
import { logoutAction } from "@/lib/server/actions";

export const dynamic = "force-dynamic";

/** The panel is reachable by URL only — keep it out of every search index. */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Admin shell — no public-site navigation or footer here. The only links in
 * this chrome are admin pages (see src/lib/adminNav.ts), filtered by role, so
 * neither account ever sees a link it cannot open.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const visible = visibleAdminNav(session.role);

  return (
    <div className="min-h-screen bg-night text-snow">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-line bg-night/70 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/admin"
            className="flex items-center gap-2.5 rounded-lg press"
            aria-label="rCloud admin — dashboard"
          >
            <span className="font-display text-lg font-black tracking-tight">
              r<span className="text-vio-300">C</span>loud
            </span>
            <span className="rounded-full border border-vio-500/40 bg-vio-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-vio-300">
              Admin
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-mist sm:block">
              {session.name}
              <span className="ml-2 rounded-full border border-line bg-panel px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-dim">
                {roleLabels[session.role as Role] ?? session.role}
              </span>
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex min-h-9 items-center rounded-lg border border-line bg-panel px-3 text-xs font-semibold text-mist transition-colors duration-200 hover:border-line-2 hover:text-snow active:bg-vio-950 press"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[210px_1fr]">
        {/* Side nav (desktop) / chips (mobile) */}
        <nav aria-label="Admin">
          <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {visible.map((item) => (
              <li key={item.href} className="shrink-0 lg:shrink">
                <Link
                  href={item.href}
                  className="flex min-h-10 items-center rounded-xl border border-transparent px-3.5 py-2 text-[13px] font-semibold text-mist transition-colors duration-200 hover:bg-panel hover:text-snow"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
