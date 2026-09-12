/** CSSP student organizations, socio-cultural groups and publication.
 *  Minimal directory — name + tagline + external Facebook page (no images). */

export interface OrgEntry {
  name: string;
  tag: string;
  href: string;
}

export const organizations: OrgEntry[] = [
  {
    name: "SAYK",
    tag: "BulSU Psychology Org",
    href: "https://www.facebook.com/share/1FJay9rsFs/",
  },
  {
    name: "ALAB",
    tag: "BulSU Social Work Org",
    href: "https://www.facebook.com/share/1Azr6HbQxQ/",
  },
  {
    name: "ALPAS",
    tag: "BulSU Public Administration Org",
    href: "https://www.facebook.com/share/18RkXc8HXn/",
  },
  {
    name: "USWAG",
    tag: "BulSU Development Studies Org",
    href: "https://www.facebook.com/share/1EYUmpsLgC/",
  },
  {
    name: "CPW-KALASAG",
    tag: "Center for Psychological Wellness",
    href: "https://www.facebook.com/share/1B1xhEM35J/",
  },
];

export const socioCulturalGroups: OrgEntry[] = [
  {
    name: "CSSP Band",
    tag: "CSSP Official Band Group",
    href: "https://www.facebook.com/share/19EtqqNfuh/",
  },
  {
    name: "RDC",
    tag: "CSSP Official Dance Group",
    href: "https://www.facebook.com/share/1BGveBjsbP/",
  },
];

export const publications: OrgEntry[] = [
  {
    name: "Taytayan",
    tag: "CSSP Official Publication",
    href: "https://www.facebook.com/share/1SYVZWXUTT/",
  },
];
