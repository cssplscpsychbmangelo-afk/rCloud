import type { SVGProps } from "react";

/**
 * Hand-drawn inline SVG icon set created for rCloud (stroke-based, 24px grid).
 * Used as the project's own placeholders for contact and category icons.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function IconCloud(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 18a4.5 4.5 0 0 1-.42-8.98 6 6 0 0 1 11.7 1.2A3.9 3.9 0 0 1 17.6 18H7Z" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.8-3.8" />
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5" />
    </svg>
  );
}

export function IconArrowLeft(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 12H5m0 0 5.5-5.5M5 12l5.5 5.5" />
    </svg>
  );
}

export function IconExternal(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M19 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

export function IconFacebook(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M14.5 8.5H17V5h-2.5A4.5 4.5 0 0 0 10 9.5V12H7.5v3.5H10V21h3.5v-5.5H16l.5-3.5h-3V9.5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

export function IconPhone(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 4h4l1.5 4.5-2.2 1.7a13 13 0 0 0 5.5 5.5l1.7-2.2L20 15v4a2 2 0 0 1-2.2 2A17 17 0 0 1 3 6.2 2 2 0 0 1 5 4Z" />
    </svg>
  );
}

export function IconMail(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="m4 7.5 8 6 8-6" />
    </svg>
  );
}

export function IconHeart(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 20s-7.5-4.6-9.3-9.3C1.5 7.6 3.6 4.5 6.9 4.5c2 0 3.6 1.1 5.1 3 1.5-1.9 3.1-3 5.1-3 3.3 0 5.4 3.1 4.2 6.2C19.5 15.4 12 20 12 20Z" />
    </svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <path d="M15.5 5.6a3.5 3.5 0 0 1 0 5.8M17.8 14.9c1.5.7 2.4 2.3 2.7 4.6" />
    </svg>
  );
}

export function IconFolder(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 7A2 2 0 0 1 5.5 5h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

export function IconScale(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4v16m-4 0h8" />
      <path d="M6 6.5h12" />
      <path d="M6 6.5 3.5 12a2.8 2.8 0 0 0 5 0L6 6.5ZM18 6.5 15.5 12a2.8 2.8 0 0 0 5 0L18 6.5Z" />
    </svg>
  );
}

export function IconCoins(props: IconProps) {
  return (
    <svg {...base(props)}>
      <ellipse cx="12" cy="6.5" rx="7" ry="3" />
      <path d="M5 6.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
      <path d="M5 11.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
    </svg>
  );
}

export function IconBook(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
      <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
      <path d="M9 7.5h7" />
    </svg>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      <path d="M8 13.5h3M8 17h6" />
    </svg>
  );
}

export function IconFile(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 3.5h8L19 8.5V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V5A1.5 1.5 0 0 1 6.5 3.5Z" />
      <path d="M14 3.5V9h5M9 13h6M9 17h6" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2.5" />
    </svg>
  );
}

export function IconShield(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3 5 5.8v5.4c0 4.4 2.9 7.6 7 9.8 4.1-2.2 7-5.4 7-9.8V5.8L12 3Z" />
      <path d="m9 11.8 2.2 2.2L15.4 9.6" />
    </svg>
  );
}

export function IconWifiOff(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 4l16 16" />
      <path d="M5 10a12 12 0 0 1 4.2-2.6M12.5 6.6A12 12 0 0 1 19 10" />
      <path d="M8 13.5a7.5 7.5 0 0 1 3-1.7M14.5 12.5c.6.3 1.1.6 1.5 1" />
      <circle cx="12" cy="17.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconWaves(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 9c2 0 2.5-1.5 4.5-1.5S10 9 12 9s2.5-1.5 4.5-1.5S19 9 21 9" />
      <path d="M3 13.5c2 0 2.5-1.5 4.5-1.5s2.5 1.5 4.5 1.5 2.5-1.5 4.5-1.5 2.5 1.5 4.5 1.5" />
      <path d="M3 18c2 0 2.5-1.5 4.5-1.5S10 18 12 18s2.5-1.5 4.5-1.5S19 18 21 18" />
    </svg>
  );
}

export function IconChart(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 4v15a1 1 0 0 0 1 1h15" />
      <path d="M8.5 15.5V10M13 15.5V6.5M17.5 15.5v-5" />
    </svg>
  );
}

export function IconSparkle(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4c.7 3.9 2.4 5.6 6.5 6.5-4.1.9-5.8 2.6-6.5 6.5-.7-3.9-2.4-5.6-6.5-6.5C9.6 9.6 11.3 7.9 12 4Z" />
      <path d="M18.5 15.5c.35 1.9 1.15 2.7 3 3-1.85.3-2.65 1.1-3 3-.35-1.9-1.15-2.7-3-3 1.85-.3 2.65-1.1 3-3Z" />
    </svg>
  );
}

const registry: Record<string, (props: IconProps) => React.JSX.Element> = {
  cloud: IconCloud,
  heart: IconHeart,
  users: IconUsers,
  folder: IconFolder,
  scale: IconScale,
  coins: IconCoins,
  book: IconBook,
  calendar: IconCalendar,
  file: IconFile,
  clock: IconClock,
  shield: IconShield,
  "wifi-off": IconWifiOff,
  waves: IconWaves,
  chart: IconChart,
  sparkle: IconSparkle,
};

export function ResourceIcon({
  name,
  ...props
}: IconProps & { name: string }) {
  const Component = registry[name] ?? IconFolder;
  return <Component {...props} />;
}
