"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/server/actions";

const LINKS = [
  { href: "/weekend", label: "This weekend" },
  { href: "/season", label: "Season" },
  { href: "/days", label: "Days" },
  { href: "/last-season", label: "Last season" },
  { href: "/scorecard", label: "Scorecard" },
  { href: "/settings", label: "Settings" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="min-w-0 flex-1">
      <ul className="flex flex-wrap items-center gap-1">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex rounded-md px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                  active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
        <li className="ml-auto">
          <form action={signOutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-slate-600 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
