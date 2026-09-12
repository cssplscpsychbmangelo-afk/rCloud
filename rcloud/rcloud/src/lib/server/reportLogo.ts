/**
 * Logo preparation for the Constituency Check PDF report.
 *
 * The report uses the official CSSP LSC logo that already ships with rCloud
 * (`public/brand/cssp-lsc-logo.png`) — it is never re-drawn or replaced.
 *
 * The logo is downscaled to the size the report actually needs. The source is
 * 512x512 but is drawn at 50 pt (~0.7 in), i.e. ~740 dpi — far more than a
 * PDF needs. At 256 px it still prints at ~370 dpi (above the 300 dpi print
 * standard) while cutting a report from ~213 KB to ~62 KB, which matters on
 * mobile data.
 *
 * The bytes are resolved in this order (see `loadReportLogo`): the `public/`
 * file on disk, then the app's own origin over HTTP, then an embedded,
 * pre-downscaled copy bundled into the server code. The embedded copy
 * guarantees the report can always be prepared even when the function cannot
 * reach its own origin (e.g. Netlify rewrites `request.url` to an internal
 * host, so a self-fetch fails).
 *
 * The result is cached for the lifetime of the process, so resolution and
 * resize happen once per cold start — not once per report.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import UPNGLoader from "@pdf-lib/upng";
import { REPORT_LOGO_BASE64 } from "./reportLogoBase64";

/**
 * Minimal typing for the decoder/encoder: upng accepts typed arrays at runtime
 * but ships `ArrayBuffer` typings.
 */
type Upng = {
  decode(buffer: Uint8Array): { width: number; height: number };
  toRGBA8(image: unknown): ArrayBufferLike[];
  encode(
    images: Uint8Array[],
    width: number,
    height: number,
    colors: number,
  ): ArrayBuffer;
};

const UPNG = ((UPNGLoader as unknown as { default?: Upng }).default ??
  UPNGLoader) as Upng;

/** Drawn size of the logo in the report: 50 pt ≈ 0.69 in → ~370 dpi. */
const LOGO_TARGET_PX = 256;

/** Relative path of the source logo inside `public/`. */
const LOGO_PUBLIC_PATH = "public/brand/cssp-lsc-logo.png";

let cache: Promise<Uint8Array | null> | null = null;

/**
 * Returns the report logo as PNG bytes, downscaled to the size the report
 * draws. Resolution order:
 *
 *  1. Read the `public/` file from disk — the single source of truth, and the
 *     fastest path in dev / `next start`.
 *  2. Fetch it from the app's own origin — kept for hosts where `public/` is
 *     served over HTTP rather than present on the function's filesystem.
 *  3. An embedded, pre-downscaled copy shipped in the server bundle. This
 *     guarantees the report can always be prepared, even when the function
 *     cannot reach its own origin (e.g. Netlify rewrites `request.url` to an
 *     internal host, which makes the self-fetch fail).
 */
export function loadReportLogo(origin: string): Promise<Uint8Array | null> {
  cache ??= resolveLogo(origin);
  return cache;
}

async function resolveLogo(origin: string): Promise<Uint8Array | null> {
  const fromDisk = readLogoFromDisk();
  if (fromDisk) return downscalePng(fromDisk, LOGO_TARGET_PX) ?? fromDisk;

  const fetched = await fetchLogoFromOrigin(origin);
  if (fetched) return downscalePng(fetched, LOGO_TARGET_PX) ?? fetched;

  return decodeEmbeddedLogo();
}

function readLogoFromDisk(): Uint8Array | null {
  try {
    const bytes = readFileSync(join(process.cwd(), LOGO_PUBLIC_PATH));
    return bytes.length > 0 ? new Uint8Array(bytes) : null;
  } catch {
    return null;
  }
}

async function fetchLogoFromOrigin(origin: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(
      new URL("/brand/cssp-lsc-logo.png", origin),
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    return new Uint8Array(await response.arrayBuffer());
  } catch {
    return null;
  }
}

function decodeEmbeddedLogo(): Uint8Array | null {
  try {
    const bytes = new Uint8Array(Buffer.from(REPORT_LOGO_BASE64, "base64"));
    return bytes.length > 0 ? bytes : null;
  } catch {
    return null;
  }
}

/**
 * Box-filter downscale of an RGBA PNG to `target`x`target` px.
 *
 * Colour is averaged with alpha weighting so transparent pixels do not darken
 * the seal; alpha is averaged separately. Returns null if the asset cannot be
 * decoded or is already small enough, so the caller can keep the original.
 */
function downscalePng(png: Uint8Array, target: number): Uint8Array | null {
  try {
    const source = UPNG.decode(png);
    const { width, height } = source;
    if (!width || !height || width <= target || height <= target) return null;

    const rgba = new Uint8Array(UPNG.toRGBA8(source)[0]);
    const out = new Uint8Array(target * target * 4);
    const stepX = width / target;
    const stepY = height / target;

    for (let y = 0; y < target; y += 1) {
      const y0 = Math.floor(y * stepY);
      const y1 = Math.max(y0 + 1, Math.floor((y + 1) * stepY));
      for (let x = 0; x < target; x += 1) {
        const x0 = Math.floor(x * stepX);
        const x1 = Math.max(x0 + 1, Math.floor((x + 1) * stepX));
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;
        let count = 0;
        for (let sy = y0; sy < y1; sy += 1) {
          for (let sx = x0; sx < x1; sx += 1) {
            const i = (sy * width + sx) * 4;
            const alpha = rgba[i + 3] / 255;
            r += rgba[i] * alpha;
            g += rgba[i + 1] * alpha;
            b += rgba[i + 2] * alpha;
            a += alpha;
            count += 1;
          }
        }
        const o = (y * target + x) * 4;
        if (a > 0) {
          out[o] = Math.round(r / a);
          out[o + 1] = Math.round(g / a);
          out[o + 2] = Math.round(b / a);
        }
        out[o + 3] = Math.round((a / count) * 255);
      }
    }

    return new Uint8Array(UPNG.encode([out], target, target, 0));
  } catch {
    return null;
  }
}
