/**
 * Logo preparation for the Constituency Check PDF report.
 *
 * The report uses the official CSSP LSC logo that already ships with rCloud
 * (`public/brand/cssp-lsc-logo.png`) — it is never re-drawn or replaced.
 *
 * Two things happen here, both in-memory only:
 *
 * 1. The asset is fetched from the app's own origin, because `public/` is
 *    served over HTTP on every host (on serverless platforms it is not part of
 *    the server bundle, so it cannot simply be read from disk).
 * 2. It is downscaled to the size the report actually needs. The source is
 *    512x512 but is drawn at 50 pt (~0.7 in), i.e. ~740 dpi — far more than a
 *    PDF needs. At 256 px it still prints at ~370 dpi (above the 300 dpi print
 *    standard) while cutting a report from ~213 KB to ~62 KB, which matters on
 *    mobile data.
 *
 * The result is cached for the lifetime of the process, so the fetch and the
 * resize happen once per cold start — not once per report.
 */

import UPNGLoader from "@pdf-lib/upng";

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

let cache: Promise<Uint8Array | null> | null = null;

export function loadReportLogo(origin: string): Promise<Uint8Array | null> {
  cache ??= (async () => {
    try {
      const response = await fetch(
        new URL("/brand/cssp-lsc-logo.png", origin),
        { cache: "no-store" },
      );
      if (!response.ok) return null;
      const bytes = new Uint8Array(await response.arrayBuffer());
      return downscalePng(bytes, LOGO_TARGET_PX) ?? bytes;
    } catch {
      return null;
    }
  })();
  return cache;
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
