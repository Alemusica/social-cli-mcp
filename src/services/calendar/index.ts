/**
 * Calendar Services Barrel
 *
 * Exports calendar engine + tour planner.
 * All functions require tenantId as first parameter.
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
} from "./engine.js";

export {
  tourPlanner,
  proposeTour,
  proposeSummerTours,
  proposeWinterTour,
  compareRegions,
  type TourWindow,
  type TourProposal,
  type RegionComparison,
} from "./tour-planner.js";
