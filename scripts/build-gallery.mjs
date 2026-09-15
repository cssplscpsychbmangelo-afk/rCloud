/**
 * Builds a self-contained download gallery for the captured site previews.
 *
 * Reads  screenshots/manifest.json  (written by rcloud/rcloud/scripts/screenshot-site.mjs)
 * Writes screenshots/index.html     (preview every page, download any PNG)
 *        screenshots/README.md      (index of files + counts)
 *
 * Run from the repository root:  node scripts/build-gallery.mjs
 */

import { readFile, writeFile, stat, access } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SHOTS = path.join(ROOT, "screenshots");
const manifest = JSON.parse(await readFile(path.join(SHOTS, "manifest.json"), "utf8"));

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const kb = (bytes) => (bytes ? `${Math.round(bytes / 1024)} KB` : "—");
/** Real captured pixel size, plus a hint when the page is wider than the viewport. */
const sizeNote = (p) => {
  const vpWidth = Number(String(p.viewport ?? "0x0").split("x")[0]) || 0;
  const wider = p.width && vpWidth && p.width > vpWidth + 8;
  const base = `${p.width ?? "?"}×${p.height ?? "?"} px`;
  return wider ? `${base} — page is ${p.width}px wide (admin area has a fixed layout)` : base;
};

const devices = Object.keys(manifest.viewports ?? {});
const deviceLabel = { desktop: "Desktop", mobile: "Mobile" }[devices[0]] ?? devices[0] ?? "Preview";
const order = manifest.viewports?.[devices[0]] ? null : null;

const pages = manifest.pages ?? [];
const groups = [...new Set(pages.map((p) => p.group))];

const cards = (list) =>
  list
    .filter((p) => p.file)
    .map((p) => {
      const dev = p.device ?? "desktop";
      return `      <figure class="card">
        <a class="thumb" href="${esc(p.file)}" target="_blank" rel="noopener">
          <img src="${esc(p.file)}" alt="${esc(p.label)} (${esc(dev)})" loading="lazy">
        </a>
        <figcaption>
          <b>${esc(p.label)}</b>
          <span class="meta">${esc(p.path)} · ${esc(dev)} ${esc(p.viewport ?? "")} · ${esc(sizeNote(p))} · HTTP ${p.status ?? "–"} · ${kb(p.bytes)}</span>
          <span class="actions">
            <a href="${esc(p.file)}" download>Download PNG</a>
            <a href="${esc(p.url)}" target="_blank" rel="noopener">Open page</a>
          </span>
        </figcaption>
      </figure>`;
    })
    .join("\n");

const sections = groups
  .map((group) => {
    const rows = pages.filter((p) => p.group === group);
    return `    <h2>${esc(group)} <span class="count">${rows.length} PNG</span></h2>\n    <div class="grid">\n${cards(rows)}\n    </div>`;
  })
  .join("\n");

const skipped = (manifest.skipped ?? []).length
  ? `\n    <h2>Not captured <span class="count">${manifest.skipped.length}</span></h2>\n    <ul class="skipped">\n${manifest.skipped
      .map((s) => `      <li>${esc(s.id)} (${esc(s.device)}): ${esc(s.reason)}</li>`)
      .join("\n")}\n    </ul>`
  : "";

const zipName = "rcloud-previews.zip";
const hasZip = await access(path.join(SHOTS, zipName)).then(
  () => true,
  () => false,
);
const zipLink = hasZip
  ? `<a class="zip" href="${zipName}" download>⬇ Download all ${pages.length} PNGs (${kb((await stat(path.join(SHOTS, zipName))).size)})</a>`
  : "";

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>rCloud — site preview (${pages.length} screenshots)</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px clamp(16px, 4vw, 56px) 72px; background: #0b0b14; color: #eceaf6;
         font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  header h1 { margin: 0 0 6px; font-size: 26px; letter-spacing: -0.02em; }
  header p { margin: 0 0 4px; color: #a5a1bd; font-size: 13.5px; }
  header a { color: #b9a7ff; }
  h2 { margin: 44px 0 14px; font-size: 18px; letter-spacing: -0.01em; }
  .count { font-size: 12px; font-weight: 600; color: #8d89a8; margin-left: 8px; }
  .grid { display: grid; gap: 18px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
  .card { margin: 0; border: 1px solid #24243a; border-radius: 14px; background: #14141f; overflow: hidden; }
  .thumb { display: block; background: #0f0f18; }
  .thumb img { display: block; width: 100%; height: 230px; object-fit: cover; object-position: top center; }
  figcaption { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 6px; }
  figcaption b { font-size: 14px; }
  .meta { color: #8d89a8; font-size: 12px; }
  .actions { display: flex; gap: 14px; margin-top: 2px; font-size: 12.5px; }
  .actions a { color: #b9a7ff; text-decoration: none; }
  .actions a:hover { text-decoration: underline; }
  .skipped { color: #a5a1bd; font-size: 13px; }
  .zip { display: inline-block; margin: 14px 0 2px; padding: 10px 16px; border-radius: 10px;
         background: #6d4bff; color: #fff; font-weight: 600; font-size: 13.5px; text-decoration: none; }
  .zip:hover { background: #7d5fff; }
  footer { margin-top: 56px; color: #6f6b8a; font-size: 12px; }
</style>
</head>
<body>
  <header>
    <h1>rCloud — page preview</h1>
    <p>${pages.length} full-page PNG captures of <a href="${esc(manifest.site)}" target="_blank" rel="noopener">${esc(manifest.site)}</a> · captured ${esc((manifest.capturedAt ?? "").replace("T", " ").slice(0, 16))} UTC</p>
    ${zipLink}
    <p>Every image below is a real full-page PNG — click “Download PNG” to save it, or <a href="https://github.com/${process.env.GITHUB_REPOSITORY ?? "cssplscpsychbmangelo-afk/rCloud"}/actions/workflows/screenshots.yml" target="_blank" rel="noopener">re-run the capture</a> for fresh ones.</p>
  </header>
${sections}${skipped}
  <footer>Generated by scripts/build-gallery.mjs · viewports: ${esc(JSON.stringify(manifest.viewports ?? {}))}</footer>
</body>
</html>
`;

await writeFile(path.join(SHOTS, "index.html"), html);

/* ------------------------------- README index ------------------------------ */

const rows = pages
  .map(
    (p) =>
      `| ${p.label} | \`${p.path}\` | ${p.device} | ${p.width ?? "?"}×${p.height ?? "?"} | ${p.status ?? "–"} | ${kb(p.bytes)} | [PNG](${p.file}) |`,
  )
  .join("\n");

const readme = `# rCloud — site preview screenshots

Full-page PNG captures of **${manifest.site}** (${pages.length} images), taken
${manifest.capturedAt}. Regenerate any time from **Actions → site-screenshots →
Run workflow**.

| Page | Route | Device | Viewport | HTTP | Size | File |
| --- | --- | --- | --- | --- | --- | --- |
${rows}

${
  (manifest.skipped ?? []).length
    ? `Not captured: ${(manifest.skipped ?? []).map((s) => `\`${s.id}\` (${s.reason})`).join(", ")}.\n`
    : ""
}
Open [\`index.html\`](index.html) for a visual gallery with one-click downloads,
or grab the whole set from the workflow run's **rcloud-screenshots** artifact.
`;

await writeFile(path.join(SHOTS, "README.md"), readme);

const total = (await Promise.all(pages.filter((p) => p.file).map((p) => stat(path.join(SHOTS, p.file)).catch(() => null)))).filter(Boolean);
console.log(`gallery written: ${pages.length} captures, ${total.length} PNG on disk → screenshots/index.html`);
