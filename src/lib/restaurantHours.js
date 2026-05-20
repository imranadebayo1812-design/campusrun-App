/**
 * CampusRun — Ordering Hours (WAT = UTC+1)
 * Cutoff disabled until launch. Re-enable by restoring the time check below.
 */

export function isOrderingOpen() {
  return true; // TODO: restore cutoff before launch
}

export function orderingClosedMessage() {
  return 'Restaurants have stopped accepting new orders for tonight (cutoff 9:30 PM). Orders in progress can still be completed. We reopen tomorrow!';
}