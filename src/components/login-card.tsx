"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PawPrint } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { tryDemo } from "@/server/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "");
    setError(null);
    startTransition(async () => {
      const { error } =
        mode === "signup"
          ? await authClient.signUp.email({ email, password, name })
          : await authClient.signIn.email({ email, password });
      if (error) {
        setError(error.message ?? "That didn't work. Try again.");
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {mode === "signup" ? (
        <div className="space-y-1.5">
          <Label htmlFor={`${mode}-name`}>Name</Label>
          <Input id={`${mode}-name`} name="name" autoComplete="name" required />
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor={`${mode}-email`}>Email</Label>
        <Input id={`${mode}-email`} name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${mode}-password`}>Password</Label>
        <Input
          id={`${mode}-password`}
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
        />
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription className="break-words">{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {mode === "signup" ? "Sign up" : "Sign in"}
      </Button>
    </form>
  );
}

export function LoginCard() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDemo() {
    setError(null);
    startTransition(async () => {
      const result = await tryDemo();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/welcome");
    });
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <PawPrint className="size-6 text-amber-600" aria-hidden />
          PawPass
        </CardTitle>
        <CardDescription>Pass or Paws</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Button type="button" size="lg" className="h-11 w-full text-base" onClick={onDemo} disabled={pending}>
            Try the demo
          </Button>
          <p className="text-center text-sm text-slate-600">
            Your own demo skier with my settings. Gone after a day.
          </p>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription className="break-words">{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <Separator />
        <Tabs defaultValue="signin">
          <TabsList className="w-full">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="pt-2">
            <AuthForm mode="signin" />
          </TabsContent>
          <TabsContent value="signup" className="pt-2">
            <AuthForm mode="signup" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
