import type { Metadata } from "next";
import { Star } from "lucide-react";
import { requireViewer } from "@/server/session";
import { seasonPage } from "@/server/views";
import { monthHeading } from "@/components/format";
import { SeasonTile } from "@/components/season/season-tile";

export const metadata: Metadata = { title: "Season · PawPass" };

const GRID = "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3";

export default async function SeasonPage() {
  const viewer = await requireViewer();
  const data = await seasonPage(viewer);
  const penalty = viewer.prefs.bakerTravelPenalty;

  const pinned = data.weekends.filter((w) => w.starred.length > 0);
  const months: { heading: string; weekends: typeof data.weekends }[] = [];
  for (const weekend of data.weekends) {
    if (weekend.starred.length > 0) continue;
    const heading = monthHeading(weekend.saturday);
    const last = months.at(-1);
    if (last && last.heading === heading) last.weekends.push(weekend);
    else months.push({ heading, weekends: [weekend] });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Season</h1>
        <p className="text-sm text-slate-600">
          {data.daysLeft.whistler} of {data.allowance.whistler} Whistler days and{" "}
          {data.daysLeft.baker} of {data.allowance.baker} Baker days left. Tap a weekend for the
          details.
        </p>
      </div>

      {data.weekends.length === 0 ? (
        <p className="text-slate-700">No weekends left before your last ski day.</p>
      ) : null}

      {pinned.length > 0 ? (
        <section className="space-y-3" aria-labelledby="starred-heading">
          <h2 id="starred-heading" className="flex items-center gap-1.5 text-lg font-semibold">
            <Star className="size-4 fill-amber-400 text-amber-500" aria-hidden />
            Starred
          </h2>
          <div className={GRID}>
            {pinned.map((w) => (
              <SeasonTile key={w.saturday} weekend={w} today={data.today} bakerTravelPenalty={penalty} />
            ))}
          </div>
        </section>
      ) : null}

      {months.map((month) => (
        <section key={month.heading} className="space-y-3">
          <h2 className="text-lg font-semibold">{month.heading}</h2>
          <div className={GRID}>
            {month.weekends.map((w) => (
              <SeasonTile key={w.saturday} weekend={w} today={data.today} bakerTravelPenalty={penalty} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
