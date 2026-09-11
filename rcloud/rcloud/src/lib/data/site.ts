import type { ContactLink } from "../types";

/** Identity and copy retained from the existing rCloud site (source of truth). */
export const site = {
  name: "rCloud",
  fullName: "Rajah Cloud",
  org: "CSSP Local Student Council",
  parent: "Bulacan State University",
  term: "2025–2026",
  tagline: "Digital Resource & Transparency Portal",
  footerMark: "BulSU CSSP LSC 2025-2026™",
  logo: "/brand/cssp-lsc-logo.png",
  intro: [
    "Rajah Cloud is dedicated to promoting openness, and active communication between the student council and the student body. A resource repository where you can find documents and files on council meetings, decisions, budgets, event planning, and other initiatives that affect our school community.",
    "Our goal is to ensure that every student has access to the information they need to stay informed, share feedback, and feel confident that their voices are being heard!",
  ],
} as const;

export const navLinks = [
  { label: "Home", href: "/" },
  { label: "Resources", href: "/resources" },
  { label: "Transparency", href: "/transparency" },
  { label: "Projects", href: "/projects" },
  { label: "Constituency", href: "/constituency" },
  { label: "Officers", href: "/officers" },
  { label: "About", href: "/about" },
] as const;

export const contacts: ContactLink[] = [
  {
    id: "facebook",
    label: "Facebook",
    value: "CSSP Local Student Council",
    href: "https://www.facebook.com/cssplsc.bulsusg",
    icon: "facebook",
  },
  {
    id: "phone",
    label: "Hotline",
    value: "0962 054 9577",
    href: "tel:09620549577",
    icon: "phone",
  },
  {
    id: "email",
    label: "Email",
    value: "cssplsc.bulsusg@gmail.com",
    href: "mailto:cssplsc.bulsusg@gmail.com",
    icon: "mail",
  },
];
