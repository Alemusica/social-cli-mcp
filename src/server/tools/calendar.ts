// src/server/tools/calendar.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { calendarEngine } from "../../services/calendar/engine.js";
import { tourPlanner } from "../../services/calendar/tour-planner.js";

export function registerCalendarTools(server: McpServer) {
  const tenantId = process.env.DEFAULT_TENANT || "flutur";

  // ── Calendar View ─────────────────────────────────────────

  server.tool(
    "get_calendar",
    {
      start_date: z.string().describe("YYYY-MM-DD"),
      end_date: z.string().describe("YYYY-MM-DD"),
    },
    async ({ start_date, end_date }) => {
      const slots = await calendarEngine.getAvailability(tenantId, start_date, end_date);
      const upcoming = await calendarEngine.getUpcomingCommitments(tenantId, 20);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ committed: slots, upcoming }, null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    "get_open_slots",
    {
      month: z.number().min(1).max(12).describe("Month number (1-12)"),
      year: z.number().optional().default(2026),
    },
    async ({ month, year }) => {
      const slots = await calendarEngine.getOpenSlots(tenantId, month, year);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(slots, null, 2) }],
      };
    },
  );

  // ── Gig Booking ───────────────────────────────────────────

  server.tool(
    "book_gig",
    {
      date: z.string().describe("YYYY-MM-DD"),
      venue: z.string(),
      market: z.string().describe("city/country slug, e.g. 'italy' or 'greece'"),
      fee: z.number().optional(),
      currency: z.string().optional().default("EUR"),
      notes: z.string().optional(),
      commitment_type: z
        .enum(["gig", "residency", "travel", "personal"])
        .optional()
        .default("gig"),
    },
    async ({ date, venue, market, fee, currency, notes, commitment_type }) => {
      const result = await calendarEngine.bookGig(tenantId, {
        date,
        venue,
        market,
        fee,
        currency,
        notes,
        commitmentType: commitment_type,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "hold_dates",
    {
      dates: z.array(z.string()).describe("Array of YYYY-MM-DD dates to hold"),
      market: z.string().describe("Market/country these dates are held for"),
      notes: z.string().optional(),
    },
    async ({ dates, market, notes }) => {
      const result = await calendarEngine.holdDates(tenantId, dates, market, notes);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // ── Tour Planning ─────────────────────────────────────────

  server.tool(
    "propose_tour",
    {
      country: z.string().describe("Target country (e.g. 'GR', 'PT', 'ES')"),
      month: z.number().min(1).max(12).optional().describe("Target month (1-12)"),
      year: z.number().optional().default(2026),
      days: z.number().optional().default(5).describe("Number of tour days needed"),
    },
    async ({ country, month, year, days }) => {
      const proposal = await tourPlanner.proposeTour(tenantId, country, month, year, days);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(proposal, null, 2) }],
      };
    },
  );

  server.tool(
    "summer_tour_plan",
    {
      year: z.number().optional().default(2026),
    },
    async ({ year }) => {
      const windows = await tourPlanner.proposeSummerTours(tenantId, year);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(windows, null, 2) }],
      };
    },
  );

  server.tool(
    "compare_regions",
    {
      month: z.number().min(1).max(12).optional().describe("Month to compare (1-12)"),
      year: z.number().optional().default(2026),
    },
    async ({ month, year }) => {
      const comparisons = await tourPlanner.compareRegions(tenantId, month, year);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(comparisons, null, 2) }],
      };
    },
  );
}
