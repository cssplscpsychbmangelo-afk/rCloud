"use client";

import { useEffect, useRef, useState } from "react";
import { percentOf } from "@/lib/format";

interface ProgressBarProps {
  value: number;
  max: number;
  tone?: "violet" | "ok" | "warn" | "bad";
  label?: string;
}

const toneClass = {
  violet: "bg-vio-500",
  ok: "bg-ok",
  warn: "bg-warn",
  bad: "bg-bad",
};

/** Budget/utilization bar that animates to its width when scrolled into view. */
export default function ProgressBar({
  value,
  max,
  tone = "violet",
  label,
}: ProgressBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const pct = percentOf(value, max);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label ?? `${pct}%`}
      className="h-2 w-full overflow-hidden rounded-full bg-panel-2"
    >
      <div
        className={`bar-fill h-full rounded-full ${toneClass[tone]}`}
        style={{ width: shown ? `${pct}%` : "0%" }}
      />
    </div>
  );
}
