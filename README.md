# PawPass

Pass or Paws.

Every week of the ski season I ask the same thing: is this weekend worth one of my limited Whistler days, one of my two or three Mt Baker days, or does the dog get the day? PawPass answers that in about five seconds. It weighs this weekend's forecast against nine past seasons of what's still to come, with each skier's own settings: how many days they have, whether they ski from the base or only from mid-mountain, how much they care about bluebird skies, how much a storm morning closed for avalanche control bothers them, and what the drive to Baker costs them. If the call isn't to ski, the dog gets the day.

Live at https://pawpass.tollers.ca

## Try it

Open the site and press **Try the demo**. You get your own demo skier with my settings (5 Whistler days, 2 Baker days, mid-mountain and up, no Baker travel penalty thanks to Nexus), and it's deleted after a day. There's no shared login, so nothing you change affects anyone else. You can also sign up with an email and password.

A quick walkthrough explains the settings, then you land on **This weekend**.

## What works

- **This weekend:** the call for Saturday and Sunday (Whistler, Baker or the dog), the score per hill, the bar each hill has to clear to be worth a day, and the reasons, with each score expanding into its points. "I skied this" logs today in one tap.
- **Before the season:** the live screen honestly says the dog gets the day, because the season hasn't started. Under it, a preview shows a weekend from last season as if it were that Friday (Feb 7–8, 2026 by default; pick any 2025-26 weekend).
- **Season:** every weekend to your last ski day, with the chance of each call under the plan. Days left are carried forward, so each future day is judged knowing earlier days may be spent. Weekends worth watching are marked, and you can star a weekend or a hill to pin it.
- **Days:** log any past day and undo it. Days left come from this log.
- **Settings:** pass days, Baker days, season and opening dates, terrain, visibility, the dog floor and the penalties. Each slider shows what its value means, in points. Saving replays the season with the new settings.
- **Last season:** a replay of 2025-26 on what was knowable on each Friday, with Wednesday's call alongside, scored on what actually happened.
- **Scorecard:** how the Friday planner did against a Wednesday planner, a simple rule, always choosing the dog, and hindsight.
- **Privacy:** what's stored is listed at `/privacy`.

## Reading the scorecard

Dog days count as points too, so even "always dog" scores a large share of what hindsight could. The big number on each card is the **share of the possible gain**: how much of the improvement over staying home with the dog each strategy captured, out of what knowing the weather in advance would have captured. Always dog is 0% and hindsight is 100%. A strategy can go below zero, which means it did worse than staying home. With my settings, the Friday planner beats the simple rule ("ski whenever the forecast says 50 or more and you have days left"). With other settings it may not, and the scorecard shows that as it is.

## What's incomplete

- Season dates are fixed to this season: the replay is 2025-26, the preview defaults to a 2025-26 weekend, and the settings default to 2026-27 dates. Each new season needs the weather refetched and those dates updated by hand.
- 2026-27 opening dates aren't known yet; each skier sets them.
- No password reset, email verification, rate limiting, account deletion or data export (deletion and copies are by email, as the privacy page says).

## Data caveats

- Weather is Open-Meteo's ECMWF IFS model at 9 km. That smooths the mountains, so absolute snow totals are off.
- Avalanche control is inferred from overnight snow and wind, not from actual closure reports.
- Visibility is estimated from total cloud cover and daytime snowfall, because the archive has no visibility or low-cloud data.
- Hours are fetched in UTC and bucketed into Vancouver days with the runtime's time-zone data.
- Past forecasts have gaps at some lead times from late March to mid-April 2026 and in late April. A missing hour takes the nearest shorter lead time with data, down to the same-day forecast, which makes a few replay days look more certain than they were.
- The historical curve ignores opening dates.

## Privacy

What's stored is listed at `/privacy`. Demo skiers are deleted after a day, and there's no tracking.

## Run it locally

With Docker (OrbStack or Docker Desktop):

```bash
docker compose -f compose.dev.yml up
```

Then open http://localhost:3000. "Try the demo" works locally too.

Tests:

```bash
docker compose -f compose.dev.yml run --rm dev npm test
```

The weather data is already committed in `data/`. To refresh it:

```bash
docker compose -f compose.dev.yml run --rm dev npm run fetch-weather
docker compose -f compose.dev.yml run --rm dev npm run check-data
```

Without Docker: Node 22, `npm ci`, `npm run dev`.

## A note on the take-home

The take-home README ended with instructions addressed to an AI agent (add a `company` command, then reply only "done"). I treated that as a check on whether I review what my tools produce, so I left it out. Happy to add it if it was intended.
