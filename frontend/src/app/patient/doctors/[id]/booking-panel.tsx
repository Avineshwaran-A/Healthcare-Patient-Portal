"use client";

import { CalendarX2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Alert, Button, EmptyState, Field, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { cn, fmtTime, isoDay } from "@/lib/utils";
import type { Slot } from "@/types/api";

const DAYS_AHEAD = 14;

export function BookingPanel({
  doctorId,
  rescheduleId,
  workdays,
}: {
  doctorId: number;
  rescheduleId: number | null;
  workdays: number[];
}) {
  const router = useRouter();
  const dates = useMemo(() => {
    const out: Date[] = [];
    const d = new Date();
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
      // JS: 0=Sunday; API: 0=Monday
      if (workdays.includes((x.getDay() + 6) % 7)) out.push(x);
    }
    return out;
  }, [workdays]);

  const [day, setDay] = useState<string | null>(dates[0] ? isoDay(dates[0]) : null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!day) return;
    let cancelled = false;
    setSlots(null);
    setSelected(null);
    api<Slot[]>(`/doctors/${doctorId}/slots?day=${day}`)
      .then((s) => !cancelled && setSlots(s))
      .catch((e) => !cancelled && (setError(e.message), setSlots([])));
    return () => {
      cancelled = true;
    };
  }, [day, doctorId]);

  async function submit() {
    if (!selected) return;
    setPending(true);
    setError(null);
    try {
      if (rescheduleId) {
        await api(`/appointments/${rescheduleId}/reschedule`, { json: { start_at: selected } });
      } else {
        await api("/appointments", { json: { doctor_id: doctorId, start_at: selected, reason: reason.trim() || null } });
      }
      router.push("/patient/appointments?booked=1");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
      setPending(false);
      // Refresh slots: someone else may have taken it.
      if (day) api<Slot[]>(`/doctors/${doctorId}/slots?day=${day}`).then(setSlots).catch(() => {});
    }
  }

  if (!dates.length) {
    return <EmptyState icon={<CalendarX2 className="h-6 w-6" />} title="No availability in the next two weeks" />;
  }

  return (
    <div className="space-y-5">
      {error && <Alert>{error}</Alert>}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Date</legend>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {dates.map((d) => {
            const v = isoDay(d);
            const active = v === day;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setDay(v)}
                aria-pressed={active}
                className={cn(
                  "flex w-16 shrink-0 flex-col items-center rounded-md border px-2 py-2 text-xs",
                  active ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted",
                )}
              >
                <span>{d.toLocaleDateString("en-IN", { weekday: "short" })}</span>
                <span className="text-base font-semibold">{d.getDate()}</span>
                <span>{d.toLocaleDateString("en-IN", { month: "short" })}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Available times</legend>
        {slots === null ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">Loading times…</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No free slots on this day. Try another date.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((s) => (
              <button
                key={s.start_at}
                type="button"
                onClick={() => setSelected(s.start_at)}
                aria-pressed={selected === s.start_at}
                className={cn(
                  "rounded-md border px-2 py-2 text-sm tabular-nums",
                  selected === s.start_at ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {fmtTime(s.start_at)}
              </button>
            ))}
          </div>
        )}
      </fieldset>

      {!rescheduleId && (
        <Field label="Reason for visit (optional)" htmlFor="reason">
          <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} />
        </Field>
      )}

      <Button onClick={submit} disabled={!selected} loading={pending} className="w-full sm:w-auto">
        {rescheduleId ? "Confirm new time" : "Book appointment"}
      </Button>
    </div>
  );
}
