import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/data/site";

/**
 * rCloud brand lockup: the official CSSP LSC logo (provided by the council)
 * plus the rCloud wordmark rendered as type.
 */
export default function Logo({ caption = false }: { caption?: boolean }) {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 rounded-lg press"
      aria-label="rCloud — home"
    >
      <Image
        src={site.logo}
        alt="CSSP Local Student Council logo"
        width={32}
        height={32}
        priority
        className="h-8 w-8"
      />
      <span className="leading-none">
        <span className="font-display text-lg font-black tracking-tight text-snow">
          r<span className="text-vio-300">C</span>loud
        </span>
        {caption && (
          <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-mist">
            CSSP LSC · BulSU
          </span>
        )}
      </span>
    </Link>
  );
}
