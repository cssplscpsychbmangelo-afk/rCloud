import Link from "next/link";
import { contacts, navLinks, site } from "@/lib/data/site";
import { IconExternal, IconFacebook, IconMail, IconPhone } from "./Icons";

const contactIcons = {
  facebook: IconFacebook,
  phone: IconPhone,
  mail: IconMail,
};

export default function Footer() {
  return (
    <footer className="border-t border-line bg-abyss">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-lg font-black text-snow">
            r<span className="text-vio-300">C</span>loud
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-mist">
            The {site.org}&rsquo;s digital resource &amp; transparency portal —
            openness, accountability and access for every CSSP student.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-dim">
            Explore
          </h2>
          <ul className="mt-4 flex max-w-xs flex-wrap gap-x-6 gap-y-2.5">
            {navLinks.slice(1).map((link) => (
              <li key={link.href} className="leading-6">
                <Link
                  href={link.href}
                  className="text-sm text-mist transition-colors duration-200 hover:text-vio-300"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-dim">
            Reach the council
          </h2>
          <ul className="mt-4 space-y-2.5">
            {contacts.map((contact) => {
              const Icon = contactIcons[contact.icon];
              const external = contact.href.startsWith("http");
              return (
                <li key={contact.id}>
                  <a
                    href={contact.href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noreferrer" : undefined}
                    className="group inline-flex min-h-11 items-center gap-2.5 text-sm text-mist transition-colors duration-200 hover:text-vio-300"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel text-vio-300">
                      <Icon size={16} />
                    </span>
                    <span className="break-all">{contact.value}</span>
                    {external && (
                      <IconExternal
                        size={13}
                        className="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      />
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-dim sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>{site.footerMark}</p>
        </div>
      </div>
    </footer>
  );
}
