import BackHome from "./BackHome";
import Reveal from "./Reveal";

export default function HiddenPage({ title, eyebrow }: { title: string; eyebrow: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-8">
        <BackHome />
      </div>
      <Reveal>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-vio-300">{eyebrow}</p>
        <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-snow sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-mist sm:text-base">
          This page is currently hidden by the council. Please check back later or contact the CSSP Local Student Council for more information.
        </p>
      </Reveal>
    </div>
  );
}
