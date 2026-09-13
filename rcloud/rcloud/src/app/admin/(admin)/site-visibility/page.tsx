import { db } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth";
import { siteSettings } from "@/lib/server/schema";
import { saveSiteVisibility } from "@/lib/server/actions";
import {
  btnAdmin,
  Card,
  Notice,
  PageHeader,
} from "@/components/admin/Ui";
import { ensureSchema } from "@/lib/server/migrate";

export const dynamic = "force-dynamic";

export default async function SiteVisibilityPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requirePermission("site_visibility");
  await ensureSchema();
  const params = await searchParams;

  const [settings] = await db.select().from(siteSettings).limit(1);

  const defaults = {
    showRoomfinder: settings?.showRoomfinder ?? true,
    showAnnouncements: settings?.showAnnouncements ?? true,
    showResources: settings?.showResources ?? true,
    showTransparency: settings?.showTransparency ?? true,
    showProjects: settings?.showProjects ?? true,
    showConstituency: settings?.showConstituency ?? true,
    showOfficers: settings?.showOfficers ?? true,
    showAbout: settings?.showAbout ?? true,
  };

  const items: Array<{
    key: keyof typeof defaults;
    label: string;
    description: string;
    pagePath: string;
    homeSection: string;
  }> = [
    {
      key: "showAnnouncements",
      label: "Announcements",
      description: "Homepage 'Latest from the council' section. Hiding it also hides announcements from the homepage (no dedicated page).",
      pagePath: "/ (homepage section)",
      homeSection: "Announcements board",
    },
    {
      key: "showRoomfinder",
      label: "Roomivility / Room Finder",
      description: "Both the /room-finder page and the homepage Roomivility teaser. When off, nav link and homepage strip disappear.",
      pagePath: "/room-finder",
      homeSection: "Roomivility teaser",
    },
    {
      key: "showResources",
      label: "Resources",
      description: "Resources library page and homepage 'Quick access' featured resources section.",
      pagePath: "/resources",
      homeSection: "Quick access",
    },
    {
      key: "showTransparency",
      label: "Transparency",
      description: "Transparency page and homepage 'Transparency snapshot' budget overview.",
      pagePath: "/transparency",
      homeSection: "Transparency snapshot",
    },
    {
      key: "showProjects",
      label: "Projects",
      description: "Projects board page and homepage 'Current projects' section.",
      pagePath: "/projects",
      homeSection: "Current projects",
    },
    {
      key: "showConstituency",
      label: "Constituency",
      description: "Constituency dashboard and homepage 'Constituency check' pulse section.",
      pagePath: "/constituency",
      homeSection: "Constituency check",
    },
    {
      key: "showOfficers",
      label: "Officers",
      description: "Officers page and homepage 'The cabinet' section.",
      pagePath: "/officers",
      homeSection: "Officers",
    },
    {
      key: "showAbout",
      label: "About",
      description: "About page. No homepage section, but hides from nav.",
      pagePath: "/about",
      homeSection: "About page only",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Site Visibility"
        description="Toggle which pages and homepage sections are visible to students. When a page is hidden, its nav link disappears and its homepage section is also hidden. Main admin only — changes apply immediately (revalidates layout)."
      />

      {params?.saved && <Notice>Visibility settings saved — public site updated.</Notice>}

      <Card>
        <h2 className="font-display text-base font-bold text-snow">Visibility toggles</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-mist">
          Uncheck to hide a page from students. The change affects both the top navigation and the corresponding section on the main page. At least one page can be hidden at a time — Home always stays visible.
        </p>

        <form action={saveSiteVisibility} className="mt-6 space-y-4">
          {items.map((item) => {
            const checked = defaults[item.key];
            return (
              <label
                key={item.key}
                className={`flex cursor-pointer items-start justify-between gap-4 rounded-xl border p-4 transition-colors duration-200 ${checked ? "border-line bg-panel" : "border-bad/30 bg-bad/5"}`}
              >
                <div className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-display text-sm font-bold text-snow">{item.label}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${checked ? "border-ok/30 bg-ok/10 text-ok" : "border-bad/30 bg-bad/10 text-bad"}`}>
                      {checked ? "Visible" : "Hidden"}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-mist">{item.description}</span>
                  <span className="mt-1 block text-[11px] text-dim">
                    Page: <span className="font-mono">{item.pagePath}</span> · Homepage: {item.homeSection}
                  </span>
                </div>
                <input
                  type="checkbox"
                  name={item.key}
                  defaultChecked={checked}
                  className="mt-1 h-5 w-5 shrink-0 rounded border-line bg-night accent-vio-500"
                />
              </label>
            );
          })}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button type="submit" className={btnAdmin}>
              Save visibility
            </button>
            <span className="text-[11px] text-dim">
              Changes revalidate the public layout immediately — no deploy needed.
            </span>
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-dim">How it works (data-friendly)</h3>
        <ul className="mt-2 list-disc space-y-1 ps-4 text-xs leading-relaxed text-mist">
          <li>Visibility is one row in <span className="font-mono">site_settings</span> — 1 DB read per request, cached via Next.js fetch memoization.</li>
          <li>No extra client JS — filtering happens server-side before HTML is sent.</li>
          <li>Hiding a section removes its DB queries from the homepage (e.g. hiding Projects skips <span className="font-mono">getProjects()</span>).</li>
          <li>Nav links are filtered server-side, so hidden pages never appear in HTML.</li>
        </ul>
      </Card>
    </div>
  );
}
