"use client";

import { useRouter } from "next/navigation";
import type { IsoDate } from "@/engine/types";
import { weekendLabel } from "@/components/format";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PreviewSelect({ value, options }: { value: IsoDate; options: IsoDate[] }) {
  const router = useRouter();
  const items = options.map((o) => ({ value: o, label: weekendLabel(o) }));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label id="preview-weekend-label">Weekend</Label>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => {
          if (typeof next === "string" && next !== value) {
            router.push(`/weekend?preview=${encodeURIComponent(next)}`, { scroll: false });
          }
        }}
      >
        <SelectTrigger aria-labelledby="preview-weekend-label" className="min-w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
