/**
 * Fixed "today" for the prototype so placeholder schedules stay deterministic.
 * TODO: remove with placeholderData; the real app uses the device date in IST (@app/shared dates).
 */
export const MOCK_TODAY = new Date(2026, 8, 19); // 19 Sep 2026
