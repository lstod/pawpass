import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/session";
import { LoginCard } from "@/components/login-card";

export const metadata: Metadata = { title: "Sign in · PawPass" };

export default async function LoginPage() {
  if (await getViewer()) redirect("/");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 bg-slate-50 p-4">
      <LoginCard />
      <Link
        href="/privacy"
        className="text-xs text-slate-600 underline-offset-4 hover:underline"
      >
        Privacy
      </Link>
    </main>
  );
}
