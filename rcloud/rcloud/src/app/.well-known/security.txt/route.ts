import { SITE_URL } from "@/lib/security/siteUrl";
import { contacts } from "@/lib/data/site";

/**
 * `/.well-known/security.txt` — RFC 9116.
 *
 * A standard "how to report a security problem with this site" file. For a
 * student-council portal it is mostly about being reachable: if someone spots a
 * fake rCloud, a leaked document or a bug in the admin area, this tells them
 * exactly who to write to instead of posting it publicly.
 */
export const dynamic = "force-static";

export function GET(): Response {
  const email =
    contacts.find((contact) => contact.icon === "mail")?.value ??
    "cssplsc.bulsusg@gmail.com";

  const lines = [
    "# rCloud — CSSP Local Student Council, Bulacan State University",
    `# Canonical site: ${SITE_URL ?? "(set NEXT_PUBLIC_SITE_URL)"}`,
    "",
    `Contact: mailto:${email}`,
    contacts.find((c) => c.icon === "facebook")?.href
      ? `Contact: ${contacts.find((c) => c.icon === "facebook")?.href}`
      : null,
    `Expires: ${new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString()}`,
    "Preferred-Languages: en, fil",
    "Canonical: /.well-known/security.txt",
    "Policy: https://github.com/cssplscpsychbmangelo-afk/rCloud/blob/main/SECURITY.md",
    "",
    "# Please report: fake copies of rCloud, exposed credentials or documents,",
    "# and anything that lets someone change content without an admin account.",
  ].filter((line): line is string => line !== null);

  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
