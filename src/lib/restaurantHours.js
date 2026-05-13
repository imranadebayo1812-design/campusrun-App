/**
 * CampusRun — Ordering Hours (WAT = UTC+1)
 * New orders: midnight to 9:30 PM WAT
 * Restaurants close: 10:00 PM WAT
 */

function nowWAT() {
  const now = new Date();
  return new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 3600000);
}

export function isOrderingOpen() {
  const wat = nowWAT();
  const totalMins = wat.getHours() * 60 + wat.getMinutes();
  return totalMins < 21 * 60 + 30; // 21:30 WAT cutoff
}

export function orderingClosedMessage() {
  return 'Restaurants have stopped accepting new orders for tonight (cutoff 9:30 PM). Orders in progress can still be completed. We reopen tomorrow!';
}