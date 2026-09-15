/**
 * Capture a full-page PNG preview of every page of the live rCloud site.
 *
 * Usage (from the Next.js app directory):
 *   node scripts/screenshot-site.mjs --device=all --out=../../screenshots
 *
 * Options
 *   --device=desktop|mobile|all   which viewports to capture (default: all)
 *   --out=<dir>                   output directory (default: ./screenshots)
 *   --url=<base>                  site base URL (default: $SITE_URL or the
 *                                 production Netlify URL)
 *   --only=<a,b,c>                only capture these page ids
 *
 * Admin pages are captured too when ADMIN_EMAIL / ADMIN_PASSWORD are provided
 * (they are optional — the public site is always captured). Run with
 * `--no-admin` to skip the admin area entirely.
 *
 * The run writes <out>/<device>/<order>-<id>.png plus <out>/manifest.json.
 */

import { mkdir, writeFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

/* ------------------------------- arguments ------------------------------- */

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
const hasFlag = (name) => process.argv.includes(`--${name}`);

const BASE = (arg("url", process.env.SITE_URL) || "https://rcloudcssp.netlify.app").replace(/\/$/, "");
const OUT = path.resolve(arg("out", "screenshots"));
const ONLY = (arg("only", "") || "").split(",").map((s) => s.trim()).filter(Boolean);
const DEVICE_ARG = arg("device", "all");
const DO_ADMIN = !hasFlag("no-admin");
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

/* --------------------------------- pages --------------------------------- */

/** id, path, label, group. Order defines the file numbering. */
const PAGES = [
  { id: "home", path: "/", label: "Home", group: "Public site" },
  { id: "room-finder", path: "/room-finder", label: "Roomivility (Room Finder)", group: "Public site" },
  { id: "resources", path: "/resources", label: "Resources", group: "Public site" },
  { id: "transparency", path: "/transparency", label: "Transparency", group: "Public site" },
  { id: "projects", path: "/projects", label: "Projects", group: "Public site" },
  { id: "constituency", path: "/constituency", label: "Constituency", group: "Public site" },
  { id: "officers", path: "/officers", label: "Officers", group: "Public site" },
  { id: "about", path: "/about", label: "About", group: "Public site" },
];

const ADMIN_PAGES = [
  { id: "admin-login", path: "/admin/login", label: "Admin — Sign in", group: "Admin area", anonymous: true },
  { id: "admin-dashboard", path: "/admin", label: "Admin — Dashboard", group: "Admin area" },
  { id: "admin-resources", path: "/admin/resources", label: "Admin — Resources", group: "Admin area" },
  { id: "admin-officers", path: "/admin/officers", label: "Admin — Officers", group: "Admin area" },
  { id: "admin-projects", path: "/admin/projects", label: "Admin — Projects", group: "Admin area" },
  { id: "admin-announcements", path: "/admin/announcements", label: "Admin — Announcements", group: "Admin area" },
  { id: "admin-budget", path: "/admin/budget", label: "Admin — Budget", group: "Admin area" },
  { id: "admin-constituency", path: "/admin/constituency", label: "Admin — Constituency", group: "Admin area" },
  { id: "admin-roomfinder", path: "/admin/roomfinder", label: "Admin — Roomivility sync", group: "Admin area" },
  { id: "admin-site-visibility", path: "/admin/site-visibility", label: "Admin — Site visibility", group: "Admin area" },
  { id: "admin-account", path: "/admin/account", label: "Admin — Account", group: "Admin area" },
];

const VIEWPORTS = {
  desktop: { name: "desktop", width: 1440, height: 900, isMobile: false, deviceScaleFactor: 1 },
  mobile: {
    name: "mobile",
    width: 414,
    height: 896,
    isMobile: true,
    deviceScaleFactor: 1,
    hasTouch: true,
  },
};

/* -------------------------------- helpers -------------------------------- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log("[shots]", ...a);
const slug = (s) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();

/** Wait for every <img> to settle so nothing renders half-loaded. */
async function settleImages(page, timeout = 8000) {
  await page
    .evaluate(
      (ms) =>
        Promise.all(
          Array.from(document.images)
            .filter((img) => !img.complete)
            .map(
              (img) =>
                new Promise((resolve) => {
                  img.addEventListener("load", resolve, { once: true });
                  img.addEventListener("error", resolve, { once: true });
                  setTimeout(resolve, ms);
                }),
            ),
        ),
      timeout,
    )
    .catch(() => {});
}

/** Scroll the whole page so IntersectionObserver reveals fire, then return top. */
async function scrollThrough(page) {
  await page
    .evaluate(async () => {
      const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
      const max = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      for (let y = 0; y < max; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, max);
      await new Promise((r) => setTimeout(r, 120));
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 150));
    })
    .catch(() => {});
}

/** Full-page PNG of whatever is currently rendered. */
async function capture(page, file) {
  await page.screenshot({ path: file, fullPage: true, animations: "disabled", caret: "hide" });
}

async function pageMetrics(page) {
  return page.evaluate(() => ({
    title: document.title,
    height: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
    width: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
    h1: document.querySelector("h1")?.innerText?.trim().slice(0, 120) ?? "",
    text: document.body.innerText.replace(/\s+/g, " ").trim().slice(0, 400),
  }));
}

/* ---------------------------------- run ---------------------------------- */

const deviceKeys =
  DEVICE_ARG === "all" ? Object.keys(VIEWPORTS) : DEVICE_ARG.split(",").map((s) => s.trim());

const manifest = {
  site: BASE,
  capturedAt: new Date().toISOString(),
  viewports: {},
  pages: [],
  skipped: [],
};

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    // Extra flags for constrained/local runs (e.g. sandboxes without a GPU):
    ...(process.env.CHROME_ARGS ? process.env.CHROME_ARGS.split(" ").filter(Boolean) : []),
  ],
});

/** One context per device so admin cookies do not leak between viewports. */
for (const deviceKey of deviceKeys) {
  const vp = VIEWPORTS[deviceKey];
  if (!vp) {
    log(`unknown device "${deviceKey}" — skipping`);
    continue;
  }

  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor,
    isMobile: vp.isMobile,
    hasTouch: vp.hasTouch ?? false,
    reducedMotion: "reduce", // reveal animations resolve instantly
    colorScheme: "dark",
    locale: "en-PH",
    timezoneId: "Asia/Manila",
  });
  context.setDefaultTimeout(45000);
  context.setDefaultNavigationTimeout(60000);

  const dir = path.join(OUT, deviceKey);
  await mkdir(dir, { recursive: true });

  const queue = [...PAGES];
  let anonymousFirst = DO_ADMIN;
  let index = 0;

  /* Walk the list; admin pages come after a sign-in attempt. */
  const adminQueue = DO_ADMIN ? [...ADMIN_PAGES] : [];

  const capturePage = async (entry, page) => {
    const file = path.join(dir, `${String(index).padStart(2, "0")}-${entry.id}.png`);
    const url = BASE + entry.path;
    const record = {
      id: entry.id,
      label: entry.label,
      group: entry.group,
      path: entry.path,
      url,
      device: deviceKey,
      viewport: `${vp.width}x${vp.height}`,
      file: path.relative(OUT, file),
      ok: false,
    };
    try {
      const response = await page.goto(url, { waitUntil: "load", timeout: 60000 });
      record.status = response?.status() ?? null;
      record.finalUrl = page.url();
      await page.evaluate(() => document.fonts?.ready?.then?.(() => {})).catch(() => {});
      await sleep(700);
      await settleImages(page);
      await scrollThrough(page);
      await sleep(450);
      Object.assign(record, await pageMetrics(page));
      await capture(page, file);
      const info = await stat(file);
      record.bytes = info.size;
      record.ok = info.size > 1000;
      log(`${deviceKey} · ${entry.id} → ${record.status} ${record.width}x${record.height} ${(info.size / 1024).toFixed(0)}KB`);
    } catch (error) {
      record.error = String(error?.message ?? error).slice(0, 300);
      log(`${deviceKey} · ${entry.id} FAILED: ${record.error}`);
      try {
        await capture(page, file);
        record.bytes = (await stat(file)).size;
      } catch {
        /* nothing captured */
      }
    }
    manifest.pages.push(record);
    index += 1;
  };

  const page = await context.newPage();
  for (const entry of queue) {
    if (ONLY.length && !ONLY.includes(entry.id)) continue;
    await capturePage(entry, page);
  }

  /* ------------------------------- admin area ------------------------------ */
  if (adminQueue.length && ONLY.length === 0) {
    let signedIn = false;
    if (ADMIN_EMAIL && ADMIN_PASSWORD) {
      try {
        await page.goto(`${BASE}/admin/login`, { waitUntil: "load", timeout: 60000 });
        await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
        await page.fill('input[type="password"], input[name="password"]', ADMIN_PASSWORD);
        await Promise.all([
          page.waitForNavigation({ waitUntil: "load", timeout: 45000 }).catch(() => {}),
          page.click('button[type="submit"], button:has-text("Sign in")').catch(() => {}),
        ]);
        await sleep(1200);
        signedIn = !page.url().includes("/admin/login");
        log(`${deviceKey} · admin sign-in: ${signedIn ? "OK" : "rejected"}`);
      } catch (error) {
        log(`${deviceKey} · admin sign-in error: ${String(error?.message ?? error).slice(0, 160)}`);
      }
    } else {
      log(`${deviceKey} · no admin credentials supplied — capturing sign-in page only`);
    }
    manifest.adminSignedIn = manifest.adminSignedIn ?? signedIn;

    for (const entry of adminQueue) {
      if (!entry.anonymous && !signedIn) {
        manifest.skipped.push({ id: entry.id, device: deviceKey, reason: "admin sign-in unavailable" });
        continue;
      }
      await capturePage(entry, page);
    }
    anonymousFirst = false;
  }

  await context.close();
  manifest.viewports[deviceKey] = { width: vp.width, height: vp.height, pages: index };
  void anonymousFirst;
}

await browser.close();

await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
log(`done — ${manifest.pages.length} captures → ${OUT}`);

const files = await readdir(OUT);
log(`output entries: ${files.join(", ")}`);
