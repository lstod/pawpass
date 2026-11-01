import Link from "next/link";
import { PawPrint } from "lucide-react";
import { requireViewer } from "@/server/session";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireViewer();
  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link
            href="/weekend"
            className="inline-flex items-center gap-1.5 rounded-md font-semibold outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <PawPrint className="size-5 text-amber-600" aria-hidden />
            PawPass
          </Link>
          <AppNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl min-w-0 flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
