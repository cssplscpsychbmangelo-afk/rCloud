import type { ReactNode } from "react";

/* Shared admin UI primitives — dense, functional, same visual language. */

export const inputCls =
  "h-11 w-full rounded-xl border border-line bg-night/60 px-3.5 text-sm text-snow placeholder:text-dim focus:border-vio-500 focus:outline-none";

export const textareaCls =
  "w-full rounded-xl border border-line bg-night/60 px-3.5 py-2.5 text-sm text-snow placeholder:text-dim focus:border-vio-500 focus:outline-none";

export const btnAdmin =
  "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-vio-500 px-4 text-sm font-semibold text-snow transition-colors duration-200 hover:bg-vio-400 active:bg-vio-600 press disabled:cursor-not-allowed disabled:opacity-40";

export const btnGhostAdmin =
  "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-line bg-panel px-3 text-xs font-semibold text-mist transition-colors duration-200 hover:border-line-2 hover:text-snow active:bg-vio-950 press";

export const btnDanger =
  "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-bad/30 bg-bad/10 px-3 text-xs font-semibold text-bad transition-colors duration-200 hover:bg-bad/20 press";

export const btnOk =
  "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-ok/30 bg-ok/10 px-3 text-xs font-semibold text-ok transition-colors duration-200 hover:bg-ok/20 press";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-snow">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-mist">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[20px] border border-line bg-panel p-5 ${className}`}>
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Warn({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-warn/30 bg-warn/10 px-4 py-2.5 text-xs font-semibold text-warn">
      {children}
    </p>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-ok/30 bg-ok/10 px-4 py-2.5 text-xs font-semibold text-ok">
      {children}
    </p>
  );
}

export function Th({ children }: { children?: ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-dim">
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 text-sm text-mist ${className}`}>{children}</td>;
}

/** Tiny row-action form posting to a server action. */
export function RowAction({
  action,
  id,
  label,
  extra = {},
  disabled = false,
  tone = "ghost",
}: {
  action: (form: FormData) => Promise<void>;
  id: string;
  label: string;
  extra?: Record<string, string>;
  disabled?: boolean;
  tone?: "ghost" | "danger" | "ok";
}) {
  return (
    <form action={action} className="inline-flex align-middle">
      <input type="hidden" name="id" value={id} />
      {Object.entries(extra).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <button
        type="submit"
        disabled={disabled}
        className={`${
          tone === "danger" ? btnDanger : tone === "ok" ? btnOk : btnGhostAdmin
        } disabled:opacity-40`}
      >
        {label}
      </button>
    </form>
  );
}
