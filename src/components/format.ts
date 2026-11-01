import { addDays, formatDay } from "@/engine/time";
import type { IsoDate } from "@/engine/types";

export function weekendLabel(saturday: IsoDate): string {
  return `${formatDay(saturday)} – ${formatDay(addDays(saturday, 1))}`;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthHeading(date: IsoDate): string {
  const [year, month] = date.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

export function roundTenth(n: number): number {
  return Math.round(n * 10) / 10;
}
