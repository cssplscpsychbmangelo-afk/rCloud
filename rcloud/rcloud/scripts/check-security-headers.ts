/**
 * Keeps the security-header copies honest.
 *
 * The same headers have to be declared in three places:
 *   1. `next.config.ts`     — generated from `src/lib/security/policy.ts`,
 *                             authoritative for the Next.js runtime (HTML,
 *                             `/api/*`, server actions)
 *   2. `netlify.toml`       — for everything Netlify's edge serves
 *   3. `public/_headers`    — the plain-text copy (and what other static hosts
 *                             read)
 *
 * Three copies drift the moment one of them is edited alone — usually after a
 * "small" CSP tweak that then only half applies. This script re-derives the
 * expected values from the policy module, parses each copy per path and fails
 * if a rule is missing or carries a different value.
 *
 * Run with `npm run check:headers` (from the project root, where the paths
 * below are resolved from).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  adminHeaders,
  privateApiHeaders,
  securityHeaders,
} from "../src/lib/security/policy";

const root = process.cwd();

/** Every rule that must exist in each copy, per path. */
const expectedRules: { path: string; label: string; headers: Record<string, string> }[] = [
  {
    path: "/*",
    label: "public site (all paths)",
    headers: securityHeaders({ dev: false, deployContext: "production" }),
  },
  { path: "/admin/*", label: "admin pages", headers: adminHeaders() },
  {
    path: "/api/constituency/*",
    label: "constituency report API",
    headers: privateApiHeaders(),
  },
];

type ParsedCopy = Map<string, Record<string, string>>;

/** `netlify.toml` → `[[headers]] for = "..."` sections with `Key = "value"`. */
function parseNetlifyToml(text: string): ParsedCopy {
  const result: ParsedCopy = new Map();
  const sections = text.split(/^\[\[headers\]\][ \t]*$/m).slice(1);

  for (const section of sections) {
    const forMatch = /^\s*for\s*=\s*"([^"]+)"/m.exec(section);
    if (!forMatch) continue;

    const values: Record<string, string> = {};
    for (const line of section.split("\n")) {
      const header = /^\s*([A-Za-z0-9-]+)\s*=\s*"([^"]*)"\s*$/.exec(line);
      if (!header) continue;
      const [, key, value] = header;
      if (key === "for" || key === "values") continue;
      values[key] = value;
    }
    result.set(forMatch[1], { ...(result.get(forMatch[1]) ?? {}), ...values });
  }

  return result;
}

/** `_headers` → path lines with the indented `Key: value` lines beneath them. */
function parseHeadersFile(text: string): ParsedCopy {
  const result: ParsedCopy = new Map();

  for (const line of text.split("\n")) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;

    // A line starting at column 0 is a path; indented lines are its headers.
    if (!/^\s/.test(line)) {
      if (!result.has(line.trim())) result.set(line.trim(), {});
      continue;
    }

    const header = /^\s+([A-Za-z0-9-]+)\s*:\s*(.+?)\s*$/.exec(line);
    if (!header) continue;
    const [, key, value] = header;
    const paths = [...result.keys()];
    const current = paths[paths.length - 1];
    if (current) result.get(current)![key] = value;
  }

  return result;
}

const copies = [
  {
    label: "netlify.toml (base = rcloud/rcloud)",
    path: join(root, "netlify.toml"),
    parse: parseNetlifyToml,
  },
  {
    label: "netlify.toml (repository root)",
    path: join(root, "..", "..", "netlify.toml"),
    parse: parseNetlifyToml,
  },
  {
    label: "public/_headers",
    path: join(root, "public", "_headers"),
    parse: parseHeadersFile,
  },
];

const problems: string[] = [];

for (const copy of copies) {
  let parsed: ParsedCopy;
  try {
    parsed = copy.parse(readFileSync(copy.path, "utf8"));
  } catch {
    problems.push(`${copy.label}: file not found or unreadable (${copy.path})`);
    continue;
  }

  for (const rule of expectedRules) {
    const found = parsed.get(rule.path);
    if (!found) {
      problems.push(`${copy.label}: no header block for "${rule.path}" (${rule.label}).`);
      continue;
    }

    for (const [key, value] of Object.entries(rule.headers)) {
      if (found[key] === undefined) {
        problems.push(
          `${copy.label} → ${rule.path}: missing "${key}" (${rule.label}). Add it with the value from src/lib/security/policy.ts.`,
        );
      } else if (found[key] !== value) {
        problems.push(
          `${copy.label} → ${rule.path}: "${key}" differs from the policy module.\n     expected: ${value}\n     found:    ${found[key]}`,
        );
      }
    }
  }
}

// `next.config.ts` must keep importing the policy rather than spelling values
// out: the Netlify edge rules alone do not cover runtime responses.
const nextConfig = readFileSync(join(root, "next.config.ts"), "utf8");
if (!/from\s+["']\.\/src\/lib\/security\/policy["']/.test(nextConfig)) {
  problems.push(
    "next.config.ts: no longer imports ./src/lib/security/policy — HTML pages and /api/* would lose their headers.",
  );
}
if (/["']Content-Security-Policy["']/.test(nextConfig)) {
  problems.push(
    "next.config.ts: hard-codes a Content-Security-Policy value instead of using the policy module.",
  );
}

if (problems.length > 0) {
  console.error("✗ Security headers are out of sync:\n");
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(
    "\nFix: update the copies so they match src/lib/security/policy.ts, then run `npm run check:headers` again.",
  );
  process.exit(1);
}

console.log(
  "✓ Security headers are in sync across next.config.ts, both netlify.toml files and public/_headers.",
);
