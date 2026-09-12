import { IconArrowRight, IconBell } from "@/components/Icons";
import type { Announcement } from "@/lib/types";

/** Maximum number of announcements shown on the home feed. */
export const ANNOUNCEMENT_LIMIT = 3;

/**
 * Home-feed announcement board.
 * - Renders only the latest active announcements (capped at ANNOUNCEMENT_LIMIT).
 * - No month selectors or archives — the feed always shows what is current.
 * - "Open link" renders only when an optional external URL was supplied in Admin.
 * - Images are intentionally omitted to keep the bulletin data-friendly.
 */
export default function AnnouncementsBoard({
  announcements,
}: {
  announcements: Announcement[];
}) {
  const items = announcements.slice(0, ANNOUNCEMENT_LIMIT);

  return (
    <div className="mt-8 overflow-hidden rounded-[24px] border border-vio-700/40 bg-panel shadow-[0_20px_60px_oklch(0.1_0.03_292/0.3)]">
      <div className="border-b border-vio-700/30 bg-vio-950/40 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-vio-500/40 bg-vio-500/15 text-vio-300">
            <IconBell size={19} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-vio-300">
              Official notice board
            </p>
            <p className="mt-1 text-sm leading-relaxed text-mist">
              The {ANNOUNCEMENT_LIMIT} latest council advisories, reminders and
              opportunities.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {items.length === 0 ? (
          <p className="text-sm text-mist">No announcements right now.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="relative flex h-full flex-col gap-3 overflow-hidden rounded-[18px] border border-vio-700/30 bg-night/60 p-5 transition-colors duration-200 before:absolute before:inset-y-0 before:start-0 before:w-1 before:bg-vio-500/70 hover:border-vio-500/50"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-vio-500/40 bg-vio-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-vio-300">
                    {item.category}
                  </span>
                  <time dateTime={item.date} className="tnum text-xs text-dim">
                    {new Date(item.date).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                </div>
                <h3 className="font-display text-base font-bold text-snow">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-mist">
                  {item.content}
                </p>
                {item.externalUrl && (
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-auto inline-flex min-h-11 items-center gap-2 self-start pt-2 text-sm font-semibold text-vio-300 transition-colors hover:text-snow"
                  >
                    Open link
                    <IconArrowRight size={14} />
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
