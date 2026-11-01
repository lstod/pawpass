"use client";

import { useTransition } from "react";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import { undoDay } from "@/server/actions";
import { Button } from "@/components/ui/button";

export function UndoButton({ id, label }: { id: number; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await undoDay(id);
          if (!result.ok) toast.error(result.error);
        })
      }
    >
      <Undo2 aria-hidden />
      Undo
      <span className="sr-only"> {label}</span>
    </Button>
  );
}
