import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { roomfinderEntries, roomfinderSettings } from "@/lib/server/schema";
import { ensureSchema } from "@/lib/server/migrate";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Public API for the Roomivility schedule.
 * - If DB has entries, returns them (live data from Sheet/XLSX upload)
 * - Otherwise returns 204 No Content so client falls back to static placeholder
 * - Keeps payload small and cache-friendly for Netlify free tier
 */
export async function GET() {
  await ensureSchema();

  try {
    const entries = await db
      .select()
      .from(roomfinderEntries)
      .orderBy(asc(roomfinderEntries.position));

    // Metadata is best-effort: a problem with the settings row must never
    // hide a schedule that was actually uploaded.
    let settings: { lastSyncedAt: Date | null; sheetId: string }[] = [];
    try {
      settings = await db
        .select({
          lastSyncedAt: roomfinderSettings.lastSyncedAt,
          sheetId: roomfinderSettings.sheetId,
        })
        .from(roomfinderSettings)
        .limit(1);
    } catch {
      settings = [];
    }

    if (entries.length === 0) {
      // No custom sheet yet — let client use placeholder JSON
      return new NextResponse(null, { status: 204 });
    }

    const meta = {
      updated: settings[0]?.lastSyncedAt ? settings[0].lastSyncedAt.toISOString().slice(0, 10) : undefined,
      source: settings[0]?.sheetId ? `Google Sheet ${settings[0].sheetId.slice(0, 8)}…` : "Admin upload",
      term: undefined as string | undefined,
      stale: false,
    };

    // Map to ScheduleDataset shape expected by client
    const payload = {
      meta,
      entries: entries.map((e) => ({
        day: e.day,
        start: e.start,
        end: e.end,
        room: e.room,
        course: e.course || undefined,
        section: e.section || undefined,
        instructor: e.instructor || undefined,
        building: e.building || undefined,
      })),
    };

    return NextResponse.json(payload, {
      headers: {
        // Cache for 5 minutes, stale-while-revalidate 1 hour — data-friendly
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    // On DB error, fall back to placeholder via 204
    console.error("roomfinder schedule API error:", error);
    return new NextResponse(null, { status: 204 });
  }
}
