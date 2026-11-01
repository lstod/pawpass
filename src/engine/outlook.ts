import type { Outlook } from "./types";

/** Linear interpolation between closest ranks, on sorted values. */
function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function outlook(samples: number[], bar: number | null): Outlook | null {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    median: Math.round(quantile(sorted, 0.5)),
    p25: Math.round(quantile(sorted, 0.25)),
    p75: Math.round(quantile(sorted, 0.75)),
    chanceAboveBar: bar === null ? 0 : samples.filter((s) => s >= bar).length / samples.length,
  };
}
