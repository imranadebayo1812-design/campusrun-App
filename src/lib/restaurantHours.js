/**
 * CampusRun — Ordering Hours (WAT = UTC+1)
 * New orders: 8:00 AM – 9:30 PM WAT
 */

export function isOrderingOpen() {
  // WAT = UTC+1
  const now = new Date();
  const watHour = (now.getUTCHours() + 1) % 24;
  const watMin  = now.getUTCMinutes();
  const afterOpen  = watHour >= 8;
  const beforeClose = watHour < 21 || (watHour === 21 && watMin < 30);
  return afterOpen && beforeClose;
}

export function orderingClosedMessage() {
  return 'Ordering is closed (9:30 PM – 8:00 AM). Opens again at 8 AM.';
}