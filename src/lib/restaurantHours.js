/**
 * CampusRun — Ordering Hours (WAT = UTC+1)
 * New orders: midnight to 9:30 PM WAT
 * Restaurants close: 10:00 PM WAT
 */

export function isOrderingOpen() {
  // WAT = UTC+1; cutoff is 21:30 WAT (20:30 UTC)
  const now = new Date();
  const watHour = (now.getUTCHours() + 1) % 24;
  const watMin  = now.getUTCMinutes();
  return !(watHour > 21 || (watHour === 21 && watMin >= 30));
}

export function orderingClosedMessage() {
  return 'Ordering closes at 9:30 PM. New orders can be placed from midnight.';
}