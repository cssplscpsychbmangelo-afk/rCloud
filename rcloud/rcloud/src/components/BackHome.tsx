import Link from "next/link";
import { IconArrowLeft } from "./Icons";

/** Sleek pill that returns to the main page from any subpage. */
export default function BackHome() {
  return (
    <Link
      href="/"
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-panel px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-mist transition-all duration-200 hover:border-vio-600/60 hover:text-snow active:border-vio-500 active:bg-vio-950 press max-sm:w-full max-sm:justify-center"
    >
      <IconArrowLeft size={14} />
      Back to Home
    </Link>
  );
}
