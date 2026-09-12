/**
 * Constituency Check — fixed PDF report template.
 *
 * ONE template, drawn programmatically with pdf-lib so that every report is
 * pixel-identical in layout, typography, spacing, colour, logo placement and
 * section order. Only these ever change between reports:
 *
 *   - the selected date / date-range (Google Sheet tab)
 *   - the received constituency figures
 *   - the automatically calculated objective analysis
 *   - the optional student name and section
 *   - the data-retrieval and report-generation timestamps
 *
 * Nothing else is variable: no narrative text, no opinions, no
 * recommendations, no generated commentary. Every caption, note and statement
 * below is a fixed string that appears verbatim in every report.
 *
 * Colour values are converted from the rCloud design tokens in
 * `src/app/globals.css` (oklch → sRGB) so the PDF carries the same visual
 * identity as the site: near-black, dark purple, violet accents, off-white.
 */

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type PDFImage,
} from "pdf-lib";
import { site } from "@/lib/data/site";
import { formatNumber } from "@/lib/format";
import {
  analyseConstituency,
  formatPercent,
  joinCategories,
  TOTAL_FORMULA,
  TOTAL_LABEL,
} from "./constituencyAnalysis";

/* --------------------------------- canvas -------------------------------- */

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 46;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
/** Lowest y the flowing content may reach before a continuation page starts. */
const BOTTOM_LIMIT = 60;
const BAND_HEIGHT = 94;

/* ------------------------------ colour tokens ----------------------------- */

function hex(value: string) {
  const v = value.replace("#", "");
  return rgb(
    parseInt(v.slice(0, 2), 16) / 255,
    parseInt(v.slice(2, 4), 16) / 255,
    parseInt(v.slice(4, 6), 16) / 255,
  );
}

const COLOR = {
  ink: hex("#0a0912"), // night — headings and figures (near-black)
  body: hex("#383642"), // body copy
  muted: hex("#696777"), // secondary copy
  dim: hex("#898797"), // dim — labels, footer
  vio300: hex("#c5b4fb"), // violet accent on dark
  vio600: hex("#7d43dd"), // primary violet accent
  vio700: hex("#6034ac"), // dark purple rules
  snow: hex("#f7f6fc"), // off-white text on dark
  mist: hex("#b7b5c3"), // secondary text on dark
  rowBg: hex("#f3f3f9"), // zebra row fill
  tint: hex("#f1eefb"), // violet-tinted student panel
  hair: hex("#dbd9e4"), // hairlines
  white: rgb(1, 1, 1),
};

/* --------------------------- fixed report copy ---------------------------- */

const ORG_LINE = "CSSP LOCAL STUDENT COUNCIL";
const TITLE_LINE = "CONSTITUENCY CHECK REPORT";
const SUBTITLE_LINE = "Combined Data from CSSP Classes";
const FOOTER_LEFT = `${ORG_LINE} · ${site.parent.toUpperCase()}`;

const DATA_SOURCE_STATEMENT =
  "This report presents consolidated constituency data collected through the CSSP Local Student Council and CSSP classes for the selected reporting period.";
const DATA_SOURCE_PRIVACY =
  "Consolidated totals only — no individual responses, names, student numbers or contact details.";
const DATA_SOURCE_USE =
  "It does not by itself establish that any named student was personally affected; it may be attached as supporting constituency information alongside the student's own explanation.";

const COMBINED_NOTE =
  "Sum of the two reported figures only. The source data does not establish whether the categories overlap, so this is not a count of unique students.";

const CALCULATION_NOTES = [
  "Share of total = (reported value / Total Reported Responses) x 100, rounded to one decimal place.",
  "Categories are reported independently; overlap is not established by the source data and is not estimated.",
  "No value is estimated or inferred. Figures cover the selected reporting period only.",
];

/* ---------------------------------- input -------------------------------- */

export type ConstituencyReportInput = {
  /** Raw Google Sheet tab name (e.g. "JULY 6-12"). */
  periodLabel: string;
  /** Display period shown in the report (e.g. "JULY 6–12, 2026"). */
  reportPeriod: string;
  figures: { safe: number; baha: number; internet: number };
  /** Optional — empty string means the field is hidden entirely. */
  studentName: string;
  /** Optional — empty string means the field is hidden entirely. */
  studentSection: string;
  /** When the constituency data was last retrieved from the Google Sheet. */
  dataUpdatedAt: Date;
  /** When this PDF was produced. */
  generatedAt: Date;
  /** The official CSSP LSC logo (public/brand/cssp-lsc-logo.png). */
  logoPng: Uint8Array | null;
};

/* ------------------------------- text helpers ----------------------------- */

/**
 * pdf-lib's standard fonts are WinAnsi-encoded. Student-entered text may
 * contain characters outside that range, so every dynamic string is folded
 * onto WinAnsi-safe characters before it is drawn (nothing is invented —
 * unsupported characters are simply dropped).
 */
export function toWinAnsiSafe(value: string): string {
  return value
    .replace(/[\u2018\u2019\u201B\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201F\u201E]/g, '"')
    .replace(/[\u2012\u2013\u2014\u2015\u2043\u2212\uFF0D]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u00A0\u2007\u2009\u202F]/g, " ")
    .replace(/\r?\n/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(
      /[^\t\u0020-\u007E\u00A0-\u00FF\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178]/g,
      "",
    );
}

type Fonts = { regular: PDFFont; bold: PDFFont; oblique: PDFFont };

type Ctx = {
  doc: PDFDocument;
  fonts: Fonts;
  pages: PDFPage[];
  page: PDFPage;
  /** y of the top edge of the next block (flows downward). */
  y: number;
  reportPeriod: string;
};

function widthOf(
  text: string,
  font: PDFFont,
  size: number,
  tracking = 0,
): number {
  const base = font.widthOfTextAtSize(text, size);
  return base + tracking * Math.max(0, text.length - 1);
}

/** Letter-spaced drawing (pdf-lib has no tracking option of its own). */
function drawTracked(
  ctx: Ctx,
  text: string,
  options: {
    x: number;
    y: number;
    size: number;
    font: PDFFont;
    color: typeof COLOR.ink;
    tracking?: number;
  },
) {
  const tracking = options.tracking ?? 0;
  if (tracking === 0) {
    ctx.page.drawText(text, {
      x: options.x,
      y: options.y,
      size: options.size,
      font: options.font,
      color: options.color,
    });
    return;
  }
  let x = options.x;
  for (const char of text) {
    ctx.page.drawText(char, {
      x,
      y: options.y,
      size: options.size,
      font: options.font,
      color: options.color,
    });
    x += widthOf(char, options.font, options.size, tracking);
  }
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  tracking = 0,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || widthOf(candidate, font, size, tracking) <= maxWidth) {
      current = candidate;
      continue;
    }
    lines.push(current);
    // Hard-break words that cannot ever fit on one line.
    if (widthOf(word, font, size, tracking) > maxWidth) {
      let chunk = "";
      for (const char of word) {
        if (widthOf(chunk + char, font, size, tracking) > maxWidth && chunk) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk += char;
        }
      }
      current = chunk;
    } else {
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/* ------------------------------ flow primitives --------------------------- */

function newPage(ctx: Ctx) {
  const page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.pages.push(page);
  ctx.page = page;
  ctx.y = PAGE_HEIGHT - MARGIN;
  drawContinuationHeader(ctx);
}

function ensure(ctx: Ctx, height: number) {
  if (ctx.y - height < BOTTOM_LIMIT) newPage(ctx);
}

/** Reserves a vertical block and returns its top y. */
function reserve(ctx: Ctx, height: number): number {
  ensure(ctx, height);
  const top = ctx.y;
  ctx.y = top - height;
  return top;
}

type WriteOptions = {
  size?: number;
  font?: PDFFont;
  color?: typeof COLOR.ink;
  x?: number;
  width?: number;
  align?: "left" | "right";
  tracking?: number;
  lineHeight?: number;
};

/** Writes wrapped text into the flow and advances the cursor. */
function write(ctx: Ctx, text: string, options: WriteOptions = {}) {
  const {
    size = 9.3,
    font = ctx.fonts.regular,
    color = COLOR.body,
    x = MARGIN,
    width = CONTENT_WIDTH - (x - MARGIN),
    align = "left",
    tracking = 0,
  } = options;
  const lineHeight = options.lineHeight ?? size * 1.45;
  const lines = wrapText(text, font, size, width, tracking);
  for (const line of lines) {
    ensure(ctx, lineHeight);
    const baseline = ctx.y - size;
    const lineWidth = widthOf(line, font, size, tracking);
    const startX = align === "right" ? x + width - lineWidth : x;
    drawTracked(ctx, line, {
      x: startX,
      y: baseline,
      size,
      font,
      color,
      tracking,
    });
    ctx.y -= lineHeight;
  }
}

/** Section eyebrow: tracked uppercase label + full-width accent rule. */
function sectionHeading(ctx: Ctx, label: string) {
  ensure(ctx, 24);
  ctx.y -= 3;
  const top = reserve(ctx, 15);
  drawTracked(ctx, label.toUpperCase(), {
    x: MARGIN,
    y: top - 7,
    size: 7.6,
    font: ctx.fonts.bold,
    color: COLOR.vio600,
    tracking: 1.5,
  });
  ctx.page.drawLine({
    start: { x: MARGIN, y: top - 12.5 },
    end: { x: PAGE_WIDTH - MARGIN, y: top - 12.5 },
    thickness: 0.75,
    color: COLOR.hair,
  });
  ctx.y -= 4;
}

function subHeading(ctx: Ctx, label: string) {
  ensure(ctx, 18);
  ctx.y -= 3;
  write(ctx, label, {
    size: 9.3,
    font: ctx.fonts.bold,
    color: COLOR.ink,
    lineHeight: 12,
  });
  ctx.y -= 1;
}

type Row = { label: string; value: string };

const ROW_HEIGHT = 17;

/** Fixed-height zebra rows with a right-aligned figure column. */
function figureRows(ctx: Ctx, rows: Row[], options: { zebra?: boolean } = {}) {
  const zebra = options.zebra ?? true;
  const padX = 8;
  let topOfBlock = 0;
  let topPage = ctx.page;
  rows.forEach((row, index) => {
    ensure(ctx, ROW_HEIGHT);
    const top = ctx.y;
    if (index === 0) {
      topOfBlock = top;
      topPage = ctx.page;
    }
    ctx.y = top - ROW_HEIGHT;
    if (zebra && index % 2 === 1) {
      ctx.page.drawRectangle({
        x: MARGIN,
        y: top - ROW_HEIGHT,
        width: CONTENT_WIDTH,
        height: ROW_HEIGHT,
        color: COLOR.rowBg,
      });
    }
    ctx.page.drawLine({
      start: { x: MARGIN, y: top - ROW_HEIGHT },
      end: { x: PAGE_WIDTH - MARGIN, y: top - ROW_HEIGHT },
      thickness: 0.6,
      color: COLOR.hair,
    });
    const baseline = top - ROW_HEIGHT / 2 - 3.4;
    drawTracked(ctx, row.label, {
      x: MARGIN + padX,
      y: baseline,
      size: 9.3,
      font: ctx.fonts.regular,
      color: COLOR.body,
    });
    drawTracked(ctx, row.value, {
      x: PAGE_WIDTH - MARGIN - padX - widthOf(row.value, ctx.fonts.bold, 10.3),
      y: baseline,
      size: 10.3,
      font: ctx.fonts.bold,
      color: COLOR.ink,
    });
  });
  // Closing rule on top of the block (drawn on the page the block started on).
  topPage.drawLine({
    start: { x: MARGIN, y: topOfBlock },
    end: { x: PAGE_WIDTH - MARGIN, y: topOfBlock },
    thickness: 0.6,
    color: COLOR.hair,
  });
}

type AnalysisRow = {
  label: string;
  value: string;
  percent: string;
  emphasis?: boolean;
};

/** Three-column analysis table: category | reported value | share of total. */
function analysisTable(ctx: Ctx, rows: AnalysisRow[]) {
  const padX = 8;
  const valueRight = PAGE_WIDTH - MARGIN - 58;
  const percentRight = PAGE_WIDTH - MARGIN - padX;
  let topOfBlock = 0;
  let topPage = ctx.page;

  // Column header.
  ensure(ctx, 15);
  topOfBlock = ctx.y;
  topPage = ctx.page;
  ctx.y = topOfBlock - 15;
  const headerBaseline = topOfBlock - 15 + 4.6;
  drawTracked(ctx, "CATEGORY", {
    x: MARGIN + padX,
    y: headerBaseline,
    size: 7,
    font: ctx.fonts.bold,
    color: COLOR.dim,
    tracking: 1,
  });
  drawTracked(ctx, "REPORTED", {
    x: valueRight - widthOf("REPORTED", ctx.fonts.bold, 7, 1),
    y: headerBaseline,
    size: 7,
    font: ctx.fonts.bold,
    color: COLOR.dim,
    tracking: 1,
  });
  drawTracked(ctx, "SHARE", {
    x: percentRight - widthOf("SHARE", ctx.fonts.bold, 7, 1),
    y: headerBaseline,
    size: 7,
    font: ctx.fonts.bold,
    color: COLOR.dim,
    tracking: 1,
  });

  rows.forEach((row, index) => {
    ensure(ctx, ROW_HEIGHT);
    const top = ctx.y;
    ctx.y = top - ROW_HEIGHT;
    if (index % 2 === 1 && !row.emphasis) {
      ctx.page.drawRectangle({
        x: MARGIN,
        y: top - ROW_HEIGHT,
        width: CONTENT_WIDTH,
        height: ROW_HEIGHT,
        color: COLOR.rowBg,
      });
    }
    if (row.emphasis) {
      ctx.page.drawRectangle({
        x: MARGIN,
        y: top - ROW_HEIGHT,
        width: CONTENT_WIDTH,
        height: ROW_HEIGHT,
        color: COLOR.tint,
      });
    }
    ctx.page.drawLine({
      start: { x: MARGIN, y: top - ROW_HEIGHT },
      end: { x: PAGE_WIDTH - MARGIN, y: top - ROW_HEIGHT },
      thickness: 0.6,
      color: COLOR.hair,
    });
    const baseline = top - ROW_HEIGHT / 2 - 3.4;
    drawTracked(ctx, row.label, {
      x: MARGIN + padX,
      y: baseline,
      size: 9.3,
      font: row.emphasis ? ctx.fonts.bold : ctx.fonts.regular,
      color: COLOR.body,
    });
    drawTracked(ctx, row.value, {
      x: valueRight - widthOf(row.value, ctx.fonts.bold, 10.3),
      y: baseline,
      size: 10.3,
      font: ctx.fonts.bold,
      color: COLOR.ink,
    });
    drawTracked(ctx, row.percent, {
      x: percentRight - widthOf(row.percent, ctx.fonts.bold, 9.3),
      y: baseline,
      size: 9.3,
      font: ctx.fonts.bold,
      color: COLOR.ink,
    });
  });

  topPage.drawLine({
    start: { x: MARGIN, y: topOfBlock },
    end: { x: PAGE_WIDTH - MARGIN, y: topOfBlock },
    thickness: 0.6,
    color: COLOR.hair,
  });
}

/** Label / value definition rows (fixed label column width). */
function definitionRows(
  ctx: Ctx,
  rows: Row[],
  options: { labelWidth?: number; boldValue?: boolean; size?: number } = {},
) {
  const labelWidth = options.labelWidth ?? 132;
  const size = options.size ?? 9.3;
  for (const row of rows) {
    const lineHeight = size * 1.45;
    ensure(ctx, lineHeight);
    const baseline = ctx.y - size;
    drawTracked(ctx, row.label, {
      x: MARGIN,
      y: baseline,
      size,
      font: ctx.fonts.bold,
      color: COLOR.muted,
    });
    write(ctx, row.value, {
      x: MARGIN + labelWidth,
      width: CONTENT_WIDTH - labelWidth,
      size,
      font: options.boldValue ? ctx.fonts.bold : ctx.fonts.regular,
      color: COLOR.ink,
      lineHeight,
    });
  }
}

/** Bulleted fixed notes (bullet drawn as a small violet square). */
function notes(ctx: Ctx, items: string[]) {
  const bulletX = MARGIN + 2;
  const textX = MARGIN + 13;
  const size = 8.4;
  const lineHeight = 11.6;
  for (const item of items) {
    const lines = wrapText(item, ctx.fonts.regular, size, CONTENT_WIDTH - 13);
    lines.forEach((line, index) => {
      ensure(ctx, lineHeight);
      if (index === 0) {
        ctx.page.drawRectangle({
          x: bulletX,
          y: ctx.y - size + 2.2,
          width: 2.6,
          height: 2.6,
          color: COLOR.vio600,
        });
      }
      ctx.page.drawText(line, {
        x: textX,
        y: ctx.y - size,
        size,
        font: ctx.fonts.regular,
        color: COLOR.muted,
      });
      ctx.y -= lineHeight;
    });
  }
}

/* --------------------------------- header --------------------------------- */

function drawHeaderBand(ctx: Ctx, logo: PDFImage | null) {
  const bandBottom = PAGE_HEIGHT - BAND_HEIGHT;

  ctx.page.drawRectangle({
    x: 0,
    y: bandBottom,
    width: PAGE_WIDTH,
    height: BAND_HEIGHT,
    color: COLOR.ink,
  });
  // Violet accent bar beneath the band.
  ctx.page.drawRectangle({
    x: 0,
    y: bandBottom - 3,
    width: PAGE_WIDTH,
    height: 3,
    color: COLOR.vio600,
  });

  // Logo on a white plate — keeps the seal legible on the dark band, the same
  // treatment the site uses (logo inside a light plate).
  const plateSize = 62;
  const plateX = MARGIN + 2;
  const plateY = bandBottom + (BAND_HEIGHT - plateSize) / 2;
  // NOTE: pdf-lib's `size` is the radius for circles, not the diameter.
  ctx.page.drawCircle({
    x: plateX + plateSize / 2,
    y: plateY + plateSize / 2,
    size: plateSize / 2,
    color: COLOR.white,
  });
  if (logo) {
    const logoSize = 50;
    ctx.page.drawImage(logo, {
      x: plateX + (plateSize - logoSize) / 2,
      y: plateY + (plateSize - logoSize) / 2,
      width: logoSize,
      height: logoSize,
    });
  }

  const textX = plateX + plateSize + 18;
  drawTracked(ctx, ORG_LINE, {
    x: textX,
    y: bandBottom + 66,
    size: 8.4,
    font: ctx.fonts.bold,
    color: COLOR.vio300,
    tracking: 1.8,
  });
  drawTracked(ctx, TITLE_LINE, {
    x: textX,
    y: bandBottom + 43,
    size: 18,
    font: ctx.fonts.bold,
    color: COLOR.snow,
    tracking: 0.4,
  });
  drawTracked(ctx, SUBTITLE_LINE, {
    x: textX,
    y: bandBottom + 25,
    size: 9.2,
    font: ctx.fonts.regular,
    color: COLOR.mist,
  });

  ctx.y = bandBottom - 3 - 17;
}

function drawContinuationHeader(ctx: Ctx) {
  const bandBottom = PAGE_HEIGHT - 30;
  ctx.page.drawRectangle({
    x: 0,
    y: bandBottom,
    width: PAGE_WIDTH,
    height: 30,
    color: COLOR.ink,
  });
  ctx.page.drawRectangle({
    x: 0,
    y: bandBottom - 2,
    width: PAGE_WIDTH,
    height: 2,
    color: COLOR.vio600,
  });
  drawTracked(ctx, `${ORG_LINE} · ${TITLE_LINE}`, {
    x: MARGIN,
    y: bandBottom + 10,
    size: 7.2,
    font: ctx.fonts.bold,
    color: COLOR.vio300,
    tracking: 1.4,
  });
  drawTracked(ctx, ctx.reportPeriod, {
    x:
      PAGE_WIDTH -
      MARGIN -
      widthOf(ctx.reportPeriod, ctx.fonts.regular, 7.2),
    y: bandBottom + 10,
    size: 7.2,
    font: ctx.fonts.regular,
    color: COLOR.mist,
  });
  ctx.y = bandBottom - 24;
}

function drawFooters(ctx: Ctx) {
  const total = ctx.pages.length;
  ctx.pages.forEach((page, index) => {
    page.drawLine({
      start: { x: MARGIN, y: 52 },
      end: { x: PAGE_WIDTH - MARGIN, y: 52 },
      thickness: 0.6,
      color: COLOR.hair,
    });
    drawTracked(
      { ...ctx, page },
      FOOTER_LEFT,
      {
        x: MARGIN,
        y: 38,
        size: 7,
        font: ctx.fonts.regular,
        color: COLOR.dim,
        tracking: 0.7,
      },
    );
    const pageLabel = `Report period: ${ctx.reportPeriod}   ·   Page ${index + 1} of ${total}`;
    drawTracked(
      { ...ctx, page },
      pageLabel,
      {
        x:
          PAGE_WIDTH -
          MARGIN -
          widthOf(pageLabel, ctx.fonts.regular, 7, 0.7),
        y: 38,
        size: 7,
        font: ctx.fonts.regular,
        color: COLOR.dim,
        tracking: 0.7,
      },
    );
  });
}

/* ------------------------------ panel drawing ----------------------------- */

/** Tinted panel with a violet left rail (optional student details). */
function studentPanel(
  ctx: Ctx,
  rows: Row[],
): void {
  const padX = 14;
  const padY = 8;
  const labelWidth = 84;
  const rowHeight = 16;
  const height = rows.length * rowHeight + padY * 2;
  const top = reserve(ctx, height);
  ctx.page.drawRectangle({
    x: MARGIN,
    y: top - height,
    width: CONTENT_WIDTH,
    height,
    color: COLOR.tint,
  });
  ctx.page.drawRectangle({
    x: MARGIN,
    y: top - height,
    width: 3,
    height,
    color: COLOR.vio600,
  });
  let y = top - padY;
  for (const row of rows) {
    ctx.page.drawText(row.label, {
      x: MARGIN + padX,
      y: y - 9.3,
      size: 9.3,
      font: ctx.fonts.bold,
      color: COLOR.muted,
    });
    ctx.page.drawText(row.value, {
      x: MARGIN + padX + labelWidth,
      y: y - 9.3,
      size: 10.3,
      font: ctx.fonts.bold,
      color: COLOR.ink,
    });
    y -= rowHeight;
  }
}

/** Off-white panel with a violet left rail (fixed statements). */
function statementPanel(ctx: Ctx, paragraphs: string[]) {
  const padX = 14;
  const padY = 10;
  const size = 8.8;
  const lineHeight = 12.2;
  const wrapped = paragraphs.map((paragraph) =>
    wrapText(paragraph, ctx.fonts.regular, size, CONTENT_WIDTH - padX * 2 - 4),
  );
  const linesCount = wrapped.reduce((sum, lines) => sum + lines.length, 0);
  const height =
    linesCount * lineHeight + (paragraphs.length - 1) * 3.5 + padY * 2;
  const top = reserve(ctx, height);
  ctx.page.drawRectangle({
    x: MARGIN,
    y: top - height,
    width: CONTENT_WIDTH,
    height,
    color: COLOR.rowBg,
  });
  ctx.page.drawRectangle({
    x: MARGIN,
    y: top - height,
    width: 3,
    height,
    color: COLOR.vio700,
  });

  let y = top - padY;
  wrapped.forEach((lines, index) => {
    if (index > 0) y -= 3.5;
    for (const line of lines) {
      ctx.page.drawText(line, {
        x: MARGIN + padX,
        y: y - size,
        size,
        font: ctx.fonts.regular,
        color: COLOR.body,
      });
      y -= lineHeight;
    }
  });
}

/* -------------------------------- rendering ------------------------------- */

function formatTimestamp(date: Date): string {
  return `${new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "long",
    timeStyle: "short",
  }).format(date)} (Asia/Manila)`;
}

export async function renderConstituencyReport(
  input: ConstituencyReportInput,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const [regular, bold, oblique] = await Promise.all([
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.HelveticaBold),
    doc.embedFont(StandardFonts.HelveticaOblique),
  ]);

  const reportPeriod = toWinAnsiSafe(input.reportPeriod);
  const firstPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const ctx: Ctx = {
    doc,
    fonts: { regular, bold, oblique },
    pages: [firstPage],
    page: firstPage,
    y: PAGE_HEIGHT,
    reportPeriod,
  };

  const logo = input.logoPng ? await doc.embedPng(input.logoPng) : null;
  drawHeaderBand(ctx, logo);

  /* ------------------------- 1. REPORT PERIOD ------------------------- */
  sectionHeading(ctx, "Report Period");
  write(ctx, reportPeriod, {
    size: 14.5,
    font: ctx.fonts.bold,
    color: COLOR.ink,
    lineHeight: 18,
  });
  ctx.y -= 5;

  /* ------------------- 2. OPTIONAL STUDENT INFORMATION ---------------- */
  const studentName = toWinAnsiSafe(input.studentName);
  const studentSection = toWinAnsiSafe(input.studentSection);
  if (studentName || studentSection) {
    sectionHeading(ctx, "Student Information — Optional");
    const rows: Row[] = [];
    if (studentName) rows.push({ label: "Prepared for:", value: studentName });
    if (studentSection) rows.push({ label: "Section:", value: studentSection });
    studentPanel(ctx, rows);
    ctx.y -= 5;
  }

  /* ------------------------- 3. CONSTITUENCY DATA --------------------- */
  const analysis = analyseConstituency(input.figures);
  sectionHeading(ctx, "Constituency Data");
  figureRows(
    ctx,
    analysis.categories.map((category) => ({
      label: category.label,
      value: formatNumber(category.value),
    })),
  );
  ctx.y -= 6;

  /* --------------------- 4. OBJECTIVE DATA ANALYSIS ------------------- */
  sectionHeading(ctx, "Objective Data Analysis");
  let step = 0;

  step += 1;
  subHeading(
    ctx,
    `${step}. Reported Constituency Data and Share of Total Reported Responses`,
  );
  analysisTable(ctx, [
    ...analysis.categories.map((category) => ({
      label: category.label,
      value: formatNumber(category.value),
      percent: formatPercent(category.percent),
    })),
    {
      label: TOTAL_LABEL,
      value: formatNumber(analysis.total),
      percent: analysis.percentagesAvailable ? "100.0%" : "—",
      emphasis: true,
    },
  ]);
  write(ctx, `Formula: ${TOTAL_LABEL} = ${TOTAL_FORMULA}`, {
    size: 8.4,
    color: COLOR.muted,
    lineHeight: 11.4,
  });
  ctx.y -= 5;

  if (analysis.percentagesAvailable) {
    step += 1;
    subHeading(ctx, `${step}. Highest and Lowest Reported Categories`);
    // Fixed tie rule: a tie is named, never broken. When every category holds
    // the same value the row says so instead of listing them all.
    const describe = (list: typeof analysis.categories) =>
      list.length === analysis.categories.length
        ? "All categories (tied)"
        : joinCategories(list);
    const comparisonRows: Row[] = [];
    if (analysis.highest) {
      comparisonRows.push({
        label: "Highest reported category",
        value: `${describe(analysis.highest)} — ${formatNumber(analysis.highest[0].value)} (${formatPercent(analysis.highest[0].percent)})`,
      });
    }
    if (analysis.lowest) {
      comparisonRows.push({
        label: "Lowest reported category",
        value: `${describe(analysis.lowest)} — ${formatNumber(analysis.lowest[0].value)} (${formatPercent(analysis.lowest[0].percent)})`,
      });
    }
    definitionRows(ctx, comparisonRows, {
      labelWidth: 132,
      boldValue: true,
      size: 9.2,
    });
    ctx.y -= 5;
  }

  step += 1;
  subHeading(ctx, `${step}. Combined Reported Responses`);
  figureRows(
    ctx,
    [
      {
        label:
          "Apektado ng Baha + Walang Internet / Mabagal ang Internet Connection",
        value: formatNumber(analysis.combinedBahaInternet),
      },
    ],
    { zebra: false },
  );
  write(ctx, COMBINED_NOTE, {
    size: 8.4,
    color: COLOR.muted,
    lineHeight: 11.4,
  });
  ctx.y -= 5;

  step += 1;
  subHeading(ctx, `${step}. Calculation Notes`);
  notes(ctx, CALCULATION_NOTES);
  ctx.y -= 3;

  /* ------------------- 5. DATA SOURCE STATEMENT ----------------------- */
  sectionHeading(ctx, "Data Source Statement");
  statementPanel(ctx, [
    DATA_SOURCE_STATEMENT,
    DATA_SOURCE_PRIVACY,
    DATA_SOURCE_USE,
  ]);
  ctx.y -= 6;

  /* -------------------------- 6. LAST UPDATED ------------------------- */
  sectionHeading(ctx, "Last Updated");
  definitionRows(
    ctx,
    [
      {
        label: "Data last updated:",
        value: formatTimestamp(input.dataUpdatedAt),
      },
      { label: "Report generated:", value: formatTimestamp(input.generatedAt) },
    ],
    { labelWidth: 120, size: 9.3 },
  );

  drawFooters(ctx);

  doc.setTitle(`${ORG_LINE} — ${TITLE_LINE} — ${reportPeriod}`);
  doc.setAuthor(ORG_LINE);
  doc.setSubject(TITLE_LINE);
  doc.setCreator(site.name);
  doc.setProducer(`${site.name} — ${ORG_LINE}`);
  doc.setKeywords(["Constituency Check", "CSSP", "Local Student Council"]);
  doc.setCreationDate(input.generatedAt);
  doc.setModificationDate(input.generatedAt);

  return doc.save();
}

/* ------------------------------ report period ----------------------------- */

const YEAR_PATTERN = /\b(19|20)\d{2}\b/;

/**
 * Turns the Google Sheet tab name into the report period shown in the PDF.
 *
 * The tab name is displayed verbatim (it is the council's own date label).
 * When the tab does not already contain a year, the year of the data-retrieval
 * timestamp is appended — that year comes from the data itself, it is never
 * hard-coded and never guessed.
 */
export function formatReportPeriod(label: string, referenceDate: Date): string {
  const cleaned = toWinAnsiSafe(label)
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(\d)\s*-\s*(\d)/g, "$1–$2");
  if (!cleaned) return "";
  if (YEAR_PATTERN.test(cleaned)) return cleaned;
  const year = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
  }).format(referenceDate);
  return `${cleaned}, ${year}`;
}

/* -------------------------------- filename -------------------------------- */

/** Consistent filename, e.g. CSSP_LSC_Constituency_Check_July_6-12_2026.pdf */
export function buildReportFilename(reportPeriod: string): string {
  const slug = toWinAnsiSafe(reportPeriod)
    .replace(/,/g, " ")
    .replace(/\s*-\s*/g, "-")
    .replace(/[^A-Za-z0-9-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[-_]+|[-_]+$/g, "")
    .split("_")
    .map((part) =>
      /^[A-Za-z]+$/.test(part)
        ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        : part,
    )
    .join("_");
  const suffix = slug ? `_${slug}` : "";
  return `CSSP_LSC_Constituency_Check${suffix}.pdf`;
}
