// Shared helpers for the analytics endpoints (server-side only).

export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;

// Per-tier link quotas. Mirrors User.canCreateLink() — keep in sync.
export const TIER_LIMITS: Record<string, number> = { free: 2, pro: 15 };

// How many days of history the dashboard trend charts show.
export const TREND_DAYS = 30;

// A $group stage that buckets documents by calendar day (UTC).
export function dailyGroupStage(dateField: string) {
  return {
    $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: `$${dateField}` } },
      count: { $sum: 1 },
    },
  };
}

// Turn sparse {_id: "YYYY-MM-DD", count} rows into a continuous daily series so
// charts don't silently skip days with no activity.
export function fillDailySeries(
  rows: { _id: string; count: number }[],
  days: number = TREND_DAYS,
): { date: string; count: number }[] {
  const counts = new Map(rows.map((r) => [r._id, r.count]));
  const series: { date: string; count: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(today.getTime() - i * DAY_MS)
      .toISOString()
      .slice(0, 10);
    series.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return series;
}
