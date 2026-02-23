/**
 * Calendar Module — Barrel Export
 *
 * Relationships:
 *   src/core/index.ts IMPORTS from here
 *   src/mcp-server.ts IMPORTS via core barrel
 */

export {
  calendarEngine,
  seedVillaPortaFridays,
  getAvailability,
  getOpenSlots,
  bookGig,
  holdDates,
  releaseDates,
  checkConflicts,
  getUpcomingCommitments,
  type AvailabilityStatus,
  type CommitmentType,
  type AvailabilityRecord,
  type DateSlot,
  type BookGigInput,
  type ConflictResult,
} from './calendar-engine.js';

export {
  tourPlanner,
  proposeTour,
  proposeSummerTours,
  proposeWinterTour,
  compareRegions,
  type TourProposal,
  type TourWindow,
  type RegionComparison,
} from './tour-planner.js';
