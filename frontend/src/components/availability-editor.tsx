"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Alert, Button, Input, Select } from "@/components/ui";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import { WEEKDAYS } from "@/lib/utils";
import type { AvailabilityWindow } from "@/types/api";

const hhmm = (t: string) => t.slice(0, 5);

/** Weekly working-hours editor. Used by doctors (own) and admins (any doctor). */
export function AvailabilityEditor({ initial, endpoint }: { initial: AvailabilityWindow[]; endpoint: string }) {
  const [rows, setRows] = useState<AvailabilityWindow[]>(
    initial.map((w) => ({ ...w, start_time: hhmm(w.start_time), end_time: hhmm(w.end_time) })),
  );
  const [saved, setSaved] = useState(false);
  const { run, pending, error } = useAction();

  const update = (i: number, patch: Partial<AvailabilityWindow>) => {
    setSaved(false);
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };

  async function save() {
    const ok = await run(() =>
      api(endpoint, {
        method: "PUT",
        json: {
          windows: rows.map(({ weekday, start_time, end_time, slot_minutes }) => ({
            weekday: Number(weekday),
            start_time,
            end_time,
            slot_minutes: Number(slot_minutes),
          })),
        },
      }),
      { success: "Availability saved", toastError: false },
    );
    if (ok) setSaved(true);
  }

  const sorted = rows.map((r, i) => ({ r, i })).sort((a, b) => a.r.weekday - b.r.weekday || a.r.start_time.localeCompare(b.r.start_time));

  return (
    <div className="space-y-4">
      {error && <Alert>{error}</Alert>}
      {saved && <Alert tone="success">Availability saved. New slots are bookable immediately.</Alert>}
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No working hours set — patients cannot book.</p>}
      <ul className="space-y-2">
        {sorted.map(({ r, i }) => (
          <li key={i} className="grid grid-cols-2 items-end gap-2 rounded-md border p-2 sm:grid-cols-[1fr_8rem_8rem_8rem_auto]">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs text-muted-foreground" htmlFor={`d${i}`}>Day</label>
              <Select id={`d${i}`} value={r.weekday} onChange={(e) => update(i, { weekday: Number(e.target.value) })}>
                {WEEKDAYS.map((d, n) => <option key={d} value={n}>{d}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground" htmlFor={`s${i}`}>From</label>
              <Input id={`s${i}`} type="time" step={300} value={r.start_time} onChange={(e) => update(i, { start_time: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground" htmlFor={`e${i}`}>To</label>
              <Input id={`e${i}`} type="time" step={300} value={r.end_time} onChange={(e) => update(i, { end_time: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground" htmlFor={`m${i}`}>Slot</label>
              <Select id={`m${i}`} value={r.slot_minutes} onChange={(e) => update(i, { slot_minutes: Number(e.target.value) })}>
                {[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
              </Select>
            </div>
            <Button variant="ghost" size="icon" aria-label="Remove window" onClick={() => { setSaved(false); setRows((rs) => rs.filter((_, j) => j !== i)); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setRows((rs) => [...rs, { weekday: 0, start_time: "09:00", end_time: "13:00", slot_minutes: 30 }])} disabled={rows.length >= 21}>
          <Plus className="h-4 w-4" /> Add window
        </Button>
        <Button onClick={save} loading={pending}>Save availability</Button>
      </div>
      <p className="text-xs text-muted-foreground">Existing appointments are not affected by changes.</p>
    </div>
  );
}
