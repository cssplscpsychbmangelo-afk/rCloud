"use client";

import { useEffect, useRef, useState } from "react";
import type { ConstituencyPeriod } from "@/lib/types";
import { StatCard } from "@/components/Cards";
import { formatNumber } from "@/lib/format";
import { btnGhost, btnPrimary } from "@/components/Primitives";
import { IconDownload, IconFile } from "@/components/Icons";

/**
 * Constituency Check browser — one Google Sheet tab is one date/date-range.
 * Only the three approved totals are ever sent to the client.
 *
 * The report block below generates the fixed-template CSSP LSC Constituency
 * Check PDF for the selected period. Name and section are optional: whatever
 * the student types is passed through as entered, and both are omitted from the
 * PDF when left blank. Nothing is auto-filled and nothing is invented.
 */

const FIELDS: Array<{
  key: "safe" | "baha" | "internet";
  label: string;
}> = [
  { key: "baha", label: "Apektado ng Baha" },
  { key: "safe", label: "Safe" },
  { key: "internet", label: "Walang Internet / Mabagal ang Internet Connection" },
];

const inputCls =
  "h-11 w-full rounded-xl border border-line bg-panel px-3.5 text-sm font-semibold text-snow placeholder:font-normal placeholder:text-dim focus:border-vio-500 focus:outline-none";

/**
 * Fills the freshly opened preview tab with a "preparing" note. The tab is
 * same-origin `about:blank`, so this replaces an empty page with something the
 * student can read while the PDF is generated — the report URL then replaces
 * this document.
 */
function writePreviewPlaceholder(preview: Window | null) {
  if (!preview) return;
  try {
    preview.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>Preparing your report…</title></head>
       <body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0a10;color:#c9c5d6;font:600 14px/1.6 system-ui,sans-serif">
         <div style="text-align:center;max-width:26rem;padding:1.5rem">
           <p style="margin:0 0 .5rem;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#a78bfa">Constituency Check</p>
           <p style="margin:0;color:#f2f0f7">Preparing your PDF report…</p>
           <p style="margin:.5rem 0 0;font-weight:400;font-size:12px">This usually takes a few seconds. Please keep this tab open.</p>
         </div>
       </body></html>`,
    );
    preview.document.close();
  } catch {
    // Cross-origin or blocked — the PDF simply replaces it as before.
  }
}

const FALLBACK_FILENAME = "CSSP_LSC_Constituency_Check.pdf";

type BuiltReport = { url: string; key: string; filename: string };
type Status = "idle" | "busy" | "ready" | "error";

export default function ConstituencyBrowser({
  periods,
  lastSyncedAt,
}: {
  periods: ConstituencyPeriod[];
  lastSyncedAt: string | null;
}) {
  // Default to the most recent period (last tab in the Sheet).
  const [index, setIndex] = useState(periods.length - 1);
  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const builtRef = useRef<BuiltReport | null>(null);
  const [built, setBuilt] = useState<BuiltReport | null>(null);

  useEffect(
    () => () => {
      if (builtRef.current) URL.revokeObjectURL(builtRef.current.url);
    },
    [],
  );

  const period = periods[index] ?? periods[periods.length - 1];

  function storeBuilt(next: BuiltReport | null) {
    if (builtRef.current && builtRef.current.url !== next?.url) {
      URL.revokeObjectURL(builtRef.current.url);
    }
    builtRef.current = next;
    setBuilt(next);
  }

  /** Identifies the report for the current period + entered details. */
  const reportKey = JSON.stringify([
    period?.label ?? "",
    name.trim(),
    section.trim(),
  ]);

  async function buildReport(): Promise<BuiltReport | null> {
    if (!period) return null;
    const key = reportKey;
    if (builtRef.current?.key === key && status !== "busy") {
      return builtRef.current;
    }

    setStatus("busy");
    setMessage("Preparing your report… this usually takes a few seconds.");
    try {
      const response = await fetch("/api/constituency/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: period.label,
          name: name.trim(),
          section: section.trim(),
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          data?.error ?? "The PDF report could not be generated. Please try again.",
        );
      }
      const blob = await response.blob();
      const filename =
        response.headers.get("X-Report-Filename") ?? FALLBACK_FILENAME;
      const next: BuiltReport = {
        url: URL.createObjectURL(blob),
        key,
        filename,
      };
      storeBuilt(next);
      setStatus("ready");
      setMessage(`Report ready — ${filename}`);
      return next;
    } catch (error) {
      setStatus("error");
      setMessage((error as Error).message);
      return null;
    }
  }

  async function handleGenerate() {
    // Open the tab inside the click gesture, then point it at the PDF once it
    // exists — avoids popup blockers and never leaves a blank tab behind.
    // The tab is filled with a short "preparing" note first, so the student
    // sees progress instead of a blank page while the server renders.
    const preview = window.open("", "_blank");
    writePreviewPlaceholder(preview);
    const report = await buildReport();
    if (!report) {
      preview?.close();
      return;
    }
    if (preview) {
      preview.location.replace(report.url);
    } else {
      setMessage(
        `Report ready — ${report.filename}. Use “Open preview” or “Download PDF Report”.`,
      );
    }
  }

  async function handleDownload() {
    const report = await buildReport();
    if (!report) return;
    const link = document.createElement("a");
    link.href = report.url;
    link.download = report.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setMessage(`Downloaded — ${report.filename}`);
  }

  if (!period) return null;

  const busy = status === "busy";
  const stale = Boolean(built) && built?.key !== reportKey;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor="constituency-period"
          className="text-xs font-bold uppercase tracking-[0.16em] text-dim"
        >
          Select report period
        </label>
        <select
          id="constituency-period"
          value={index}
          onChange={(event) => setIndex(Number(event.target.value))}
          className="h-11 rounded-xl border border-line bg-panel px-3.5 text-sm font-semibold text-snow focus:border-vio-500 focus:outline-none"
        >
          {periods.map((entry, entryIndex) => (
            <option key={entry.id} value={entryIndex}>
              {entry.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {FIELDS.map((field) => (
          <StatCard
            key={field.key}
            label={field.label}
            value={formatNumber(period[field.key])}
            hint={period.label}
          />
        ))}
      </div>

      {lastSyncedAt && (
        <p className="mt-6 text-xs text-dim">Last updated: {lastSyncedAt}</p>
      )}

      {/* ------------------------- PDF report builder ------------------------ */}
      <section
        id="student-report"
        className="mt-10 scroll-mt-24 rounded-[20px] border border-line bg-panel p-5 sm:p-6"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-vio-300">
          PDF report
        </p>
        <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight text-snow sm:text-2xl">
          Constituency Check report
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mist">
          Generate the official CSSP LSC Constituency Check report for{" "}
          <span className="font-semibold text-snow">{period.label}</span>. It
          contains the consolidated totals above plus a fixed objective
          numerical analysis — the same layout every time.
        </p>

        <div className="mt-6 rounded-2xl border border-line bg-panel-2/60 p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-dim">
            For student use — optional
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="report-name"
                className="mb-1.5 block text-xs font-semibold text-mist"
              >
                Name:
              </label>
              <input
                id="report-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                placeholder="Leave blank to omit"
                className={inputCls}
              />
            </div>
            <div>
              <label
                htmlFor="report-section"
                className="mb-1.5 block text-xs font-semibold text-mist"
              >
                Section:
              </label>
              <input
                id="report-section"
                type="text"
                value={section}
                onChange={(event) => setSection(event.target.value)}
                placeholder="Leave blank to omit"
                className={inputCls}
              />
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-dim">
            Both fields are optional. Only what you type here appears in the
            report — nothing is filled in for you.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={busy}
            className={`${btnPrimary} disabled:opacity-60`}
          >
            <IconFile size={16} />
            {busy ? "Generating…" : "Generate PDF Report"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={busy}
            className={`${btnGhost} disabled:opacity-60`}
          >
            <IconDownload size={16} />
            {busy ? "Generating…" : "Download PDF Report"}
          </button>
        </div>

        {built && !stale && (
          <p className="mt-4 text-xs text-dim">
            <a
              href={built.url}
              target="_blank"
              rel="noopener"
              className="font-semibold text-vio-300 underline decoration-vio-500/50 underline-offset-2 transition-colors hover:text-vio-200"
            >
              Open preview
            </a>
            <span className="ml-2 break-all">{built.filename}</span>
          </p>
        )}

        <p
          aria-live="polite"
          className={`mt-4 text-xs leading-relaxed ${
            status === "error" ? "text-bad" : "text-mist"
          }`}
        >
          {message ??
            (stale
              ? "Details changed — generate the report again to update it."
              : "The report shows consolidated totals only. No individual responses, names or contact details are included.")}
        </p>
      </section>
    </div>
  );
}
