"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { contacts, navLinks as defaultNavLinks } from "@/lib/data/site";
import Logo from "./Logo";
import { IconFacebook, IconMail, IconPhone } from "./Icons";

const contactIcons = {
  facebook: IconFacebook,
  phone: IconPhone,
  mail: IconMail,
};

type NavLink = { label: string; href: string };

/**
 * Sleek frosted navigation bar (Apple-inspired):
 * translucent blurred chrome, quiet small links with a hairline active
 * indicator, and a full-screen mobile sheet with large staggered links.
 *
 * Accepts filtered links from server (visibility toggles). Falls back to
 * defaultNavLinks when no prop is provided (e.g. during static build).
 */
export default function Nav({ links }: { links?: NavLink[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navLinks = links && links.length > 0 ? links : (defaultNavLinks as unknown as NavLink[]);

  // Close the sheet on navigation
  useEffect(() => setOpen(false), [pathname]);

  // Lock body scroll while the sheet is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Escape closes the sheet
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      {/* Frosted bar (blur lives here, NOT on the header, so the fixed
          mobile sheet below is positioned against the viewport) */}
      <div className="border-b border-line bg-night/70 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4 sm:h-14 sm:px-6">
        <Logo />

        {/* Desktop nav — quiet, evenly spaced, hairline active state */}
        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative py-2 text-[13px] font-medium tracking-wide transition-colors duration-300 ${
                      active ? "text-snow" : "text-mist hover:text-snow"
                    }`}
                  >
                    {link.label}
                    <span
                      aria-hidden
                      className={`absolute inset-x-0 -bottom-px h-px bg-vio-400 transition-opacity duration-300 ${
                        active ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Mobile trigger — animated two-bar icon, 44px hit area */}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex h-11 w-11 items-center justify-center text-snow transition-opacity duration-200 hover:opacity-80 active:opacity-60 lg:hidden press"
        >
          <span aria-hidden className="relative block h-3 w-[18px]">
            <span
              className={`absolute inset-x-0 h-px bg-current transition-all duration-300 ${
                open ? "top-1/2 rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute inset-x-0 h-px bg-current transition-all duration-300 ${
                open ? "top-1/2 -rotate-45" : "top-full"
              }`}
            />
          </span>
          </button>
        </div>
      </div>

      {/* Mobile sheet — full-screen, frosted, large staggered links */}
      <div
        id="mobile-nav"
        aria-hidden={!open}
        className={`fixed inset-x-0 bottom-0 top-12 z-40 bg-abyss/85 backdrop-blur-2xl backdrop-saturate-150 transition-opacity duration-300 sm:top-14 lg:hidden ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        {/* tap outside links to close */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="absolute inset-0 h-full w-full cursor-default"
        />
        <nav aria-label="Primary mobile" className="relative h-full overflow-y-auto">
          <ul className="mx-auto max-w-6xl px-6 pt-4">
            {navLinks.map((link, index) => {
              const active = pathname === link.href;
              return (
                <li
                  key={link.href}
                  style={{ transitionDelay: open ? `${60 + index * 45}ms` : "0ms" }}
                  className={`border-b border-line transition-all duration-300 ${
                    open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                  }`}
                >
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    tabIndex={open ? 0 : -1}
                    className="flex min-h-14 items-center justify-between py-4 font-display text-2xl font-bold tracking-tight transition-colors duration-200 active:text-vio-300"
                  >
                    <span className={active ? "text-vio-300" : "text-snow"}>
                      {link.label}
                    </span>
                    {active && (
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 rounded-full bg-vio-400"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* quiet contact row */}
          <div
            style={{ transitionDelay: open ? `${60 + navLinks.length * 45}ms` : "0ms" }}
            className={`mx-auto flex max-w-6xl items-center gap-5 px-6 py-6 transition-all duration-300 ${
              open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
            }`}
          >
            {contacts.map((contact) => {
              const Icon = contactIcons[contact.icon];
              const external = contact.href.startsWith("http");
              return (
                <a
                  key={contact.id}
                  href={contact.href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noreferrer" : undefined}
                  tabIndex={open ? 0 : -1}
                  aria-label={contact.label}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-panel text-mist transition-colors duration-200 hover:text-vio-300 active:text-vio-200"
                >
                  <Icon size={17} />
                </a>
              );
            })}
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-dim">
              CSSP LSC · BulSU
            </span>
          </div>
        </nav>
      </div>
    </header>
  );
}
