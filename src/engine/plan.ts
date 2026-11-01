import type { Call, HillId, IsoDate, Sample, UserPrefs } from "./types";

const EPS = 1e-9;

export interface PlanDay {
  date: IsoDate;
  samples: Sample[];
  open: Record<HillId, boolean>;
}

/** V[d][w][b]: expected points from weekend day d on with w Whistler and b Baker days left. V[D] is all zeros. */
export interface Plan {
  V: number[][][];
}

function zeros(maxW: number, maxB: number): number[][] {
  return Array.from({ length: maxW + 1 }, () => new Array<number>(maxB + 1).fill(0));
}

export function buildPlan(days: PlanDay[], maxW: number, maxB: number, prefs: UserPrefs): Plan {
  const D = days.length;
  const V: number[][][] = new Array(D + 1);
  V[D] = zeros(maxW, maxB);
  for (let d = D - 1; d >= 0; d--) {
    const next = V[d + 1];
    const cur = zeros(maxW, maxB);
    const { samples, open } = days[d];
    for (let w = 0; w <= maxW; w++) {
      for (let b = 0; b <= maxB; b++) {
        const dog = prefs.dogFloor + next[w][b];
        const canW = open.whistler && w > 0;
        const canB = open.baker && b > 0;
        if (samples.length === 0 || (!canW && !canB)) {
          cur[w][b] = dog;
          continue;
        }
        const afterW = canW ? next[w - 1][b] : 0;
        const afterB = canB ? next[w][b - 1] - prefs.bakerTravelPenalty : 0;
        let sum = 0;
        for (const s of samples) {
          let best = dog;
          if (canW) best = Math.max(best, s.w + afterW);
          if (canB) best = Math.max(best, s.b + afterB);
          sum += best;
        }
        cur[w][b] = sum / samples.length;
      }
    }
    V[d] = cur;
  }
  return { V };
}

/** Ties go to skiing over the dog, and to Whistler over Baker. */
export function choose(
  sW: number,
  sB: number,
  d: number,
  w: number,
  b: number,
  plan: Plan,
  prefs: UserPrefs,
  open: Record<HillId, boolean>,
): Call {
  const next = plan.V[d + 1];
  let call: Call = "dog";
  let value = prefs.dogFloor + next[w][b];
  if (open.whistler && w > 0) {
    const v = sW + next[w - 1][b];
    if (v >= value - EPS) {
      call = "whistler";
      value = v;
    }
  }
  if (open.baker && b > 0) {
    const v = sB - prefs.bakerTravelPenalty + next[w][b - 1];
    if (v > value + EPS || (call === "dog" && v >= value - EPS)) call = "baker";
  }
  return call;
}

/** The lowest whole score that justifies spending a day at each hill; Baker's includes its travel penalty. */
export function bars(
  d: number,
  w: number,
  b: number,
  plan: Plan,
  prefs: UserPrefs,
  open: Record<HillId, boolean>,
): Record<HillId, number | null> {
  const next = plan.V[d + 1];
  const keep = prefs.dogFloor + next[w][b];
  return {
    whistler: open.whistler && w > 0 ? Math.ceil(keep - next[w - 1][b] - EPS) : null,
    baker:
      open.baker && b > 0 ? Math.ceil(keep - next[w][b - 1] + prefs.bakerTravelPenalty - EPS) : null,
  };
}
