import { AlertTriangle, Check, Clock } from "lucide-react";
import type { Metadata } from "next";

import { Logo } from "@/components/logo";
import { Alert, Badge, type BadgeVariant, Button, Card, CardBody, CardHeader, Input, ROLE_TONE, STATUS, StatusBadge, type Tone } from "@/components/ui";

export const metadata: Metadata = { title: "Design system" };

const COLORS: { group: string; items: { name: string; token: string; hex: string; note: string }[] }[] = [
  {
    group: "Surface",
    items: [
      { name: "Paper", token: "background", hex: "#F6F2E9", note: "Page ground" },
      { name: "Card", token: "card", hex: "#FBF9F4", note: "Raised surface" },
      { name: "Ink", token: "foreground / sidebar", hex: "#0D1B17", note: "Text, dark sections" },
      { name: "Border", token: "border", hex: "#D9D4C5", note: "Hairlines" },
    ],
  },
  {
    group: "Brand",
    items: [
      { name: "Pine", token: "primary", hex: "#0B4A3F", note: "Primary actions, links" },
      { name: "Coral", token: "coral", hex: "#FF6A4D", note: "The one action accent. Ink text only." },
      { name: "Mint", token: "mint / sidebar-active", hex: "#9BE8C2", note: "Highlight on ink" },
    ],
  },
  {
    group: "Status (meaning only)",
    items: [
      { name: "Info", token: "info", hex: "#18598C", note: "Scheduled" },
      { name: "Success", token: "success", hex: "#1B6642", note: "Completed, paid, normal" },
      { name: "Warning", token: "warning", hex: "#92500B", note: "Pending, unpaid" },
      { name: "Danger", token: "destructive", hex: "#B92033", note: "Overdue, abnormal, errors" },
    ],
  },
];

const TYPE = [
  { name: "Display XL", cls: "display-xl", sample: "Care, booked", spec: "Inter SemiBold · clamp 2.5–4.5rem" },
  { name: "Display LG", cls: "display-lg", sample: "For doctors", spec: "Inter SemiBold · clamp 2–3.25rem" },
  { name: "Display MD", cls: "display-md", sample: "Three steps to booked", spec: "Inter SemiBold · clamp 1.5–2rem" },
];

const VARIANTS: BadgeVariant[] = ["soft", "solid", "outline"];
const TONES: Tone[] = ["neutral", "primary", "info", "success", "warning", "danger"];

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="border-t py-12">
      <div className="mb-8 max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {note && <p className="mt-2 text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}

export default function DesignSystem() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <header className="flex items-center justify-between">
        <Logo />
        <span className="eyebrow text-muted-foreground">Design system · v1</span>
      </header>
      <div className="py-16">
        <h1 className="display-lg">
          One typeface, <span className="text-primary">used consistently.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Paper, ink and pine carry the interface. Coral marks the single action on a screen. Status colours carry meaning and nothing else.
        </p>
      </div>

      <Section title="Colour" note="All text and background pairs meet WCAG AA. Coral takes ink text, never white. No violet.">
        <div className="space-y-8">
          {COLORS.map((g) => (
            <div key={g.group}>
              <p className="eyebrow mb-3 text-muted-foreground">{g.group}</p>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {g.items.map((c) => (
                  <li key={c.name} className="overflow-hidden rounded-xl border bg-card">
                    <div className="h-20" style={{ background: c.hex }} />
                    <div className="p-3">
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="tabular text-xs text-muted-foreground">
                        {c.hex} · {c.token}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{c.note}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography" note="Inter throughout. Weight sets the hierarchy: 600 headings, 500 labels, buttons and navigation, 400 body and data. Numbers use tabular figures.">
        <div className="space-y-8">
          {TYPE.map((t) => (
            <div key={t.name} className="grid gap-2 border-b pb-8 md:grid-cols-[12rem_1fr]">
              <div>
                <p className="text-sm font-medium">{t.name}</p>
                <p className="tabular text-xs text-muted-foreground">{t.spec}</p>
              </div>
              <p className={t.cls}>{t.sample}</p>
            </div>
          ))}
          <div className="grid gap-2 border-b pb-8 md:grid-cols-[12rem_1fr]">
            <div>
              <p className="text-sm font-medium">Colour emphasis</p>
              <p className="tabular text-xs text-muted-foreground">text-primary on one phrase</p>
            </div>
            <p className="display-md">
              Appointments, <span className="text-primary">simply</span> connected.
            </p>
          </div>
          <div className="grid gap-2 border-b pb-8 md:grid-cols-[12rem_1fr]">
            <div>
              <p className="text-sm font-medium">Body</p>
              <p className="tabular text-xs text-muted-foreground">Inter Regular · 16px</p>
            </div>
            <p className="max-w-prose text-base leading-relaxed">
              Prescriptions, consultation notes and lab reports sit in one timeline. Lines stay between 65 and 75 characters so long records remain readable.
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-[12rem_1fr]">
            <div>
              <p className="text-sm font-medium">Label / data</p>
              <p className="tabular text-xs text-muted-foreground">.eyebrow · Inter Medium 12px · tabular numerals</p>
            </div>
            <p className="eyebrow">Lab report · 29 SEP · 10:30</p>
          </div>
        </div>
      </Section>

      <Section title="Badges" note="Three treatments. Soft is the default in tables, solid for the one thing that needs attention, outline for quiet metadata.">
        <div className="space-y-6">
          {VARIANTS.map((v) => (
            <div key={v} className="grid items-center gap-3 md:grid-cols-[8rem_1fr]">
              <p className="eyebrow text-muted-foreground">{v}</p>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <Badge key={t} tone={t} variant={v} dot>
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
          <div className="grid items-center gap-3 md:grid-cols-[8rem_1fr]">
            <p className="eyebrow text-muted-foreground">Status</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(STATUS).map((k) => (
                <StatusBadge key={k} status={k} />
              ))}
            </div>
          </div>
          <div className="grid items-center gap-3 md:grid-cols-[8rem_1fr]">
            <p className="eyebrow text-muted-foreground">Role</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ROLE_TONE).map(([r, t]) => (
                <Badge key={r} tone={t} variant="outline">
                  {r}
                </Badge>
              ))}
            </div>
          </div>
          <div className="grid items-center gap-3 md:grid-cols-[8rem_1fr]">
            <p className="eyebrow text-muted-foreground">With icon</p>
            <div className="flex flex-wrap gap-2">
              <Badge tone="success" icon={<Check />}>Verified</Badge>
              <Badge tone="warning" icon={<Clock />}>Awaiting</Badge>
              <Badge tone="danger" variant="solid" icon={<AlertTriangle />}>Abnormal</Badge>
              <Badge tone="primary" variant="solid">New</Badge>
              <Badge tone="neutral" variant="outline">3</Badge>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Actions and fields" note="Pill buttons. Pine for primary, coral for the one action, outline for the rest.">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="action">Book appointment</Button>
            <Button>Save changes</Button>
            <Button variant="outline">Cancel</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Delete</Button>
            <Button loading>Saving</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="grid max-w-xl gap-3 sm:grid-cols-2">
            <Input placeholder="Email" aria-label="Email example" />
            <Input placeholder="Disabled" disabled aria-label="Disabled example" />
          </div>
          <div className="grid max-w-xl gap-3">
            <Alert tone="success">Your appointment is booked.</Alert>
            <Alert tone="danger">That slot was just taken. Pick another time.</Alert>
          </div>
          <Card className="max-w-md">
            <CardHeader title="Card" description="Header, body, hairline dividers" />
            <CardBody className="text-sm text-muted-foreground">Cards hold one idea. They never nest.</CardBody>
          </Card>
        </div>
      </Section>

      <Section title="Motion" note="One rhythm, shared by CSS and GSAP. Everything rests under prefers-reduced-motion.">
        <dl className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Text mask", "Lines rise out of an overflow mask. 1.1s, expo.out, 0.1s stagger."],
            ["Section wipe", "Next section slides over the last with a rounded clip-path. Scrubbed to scroll."],
            ["Curtain", "Pine panel wipes between landing and auth. 0.7s in, 0.9s out."],
            ["Loader", "ECG line draws, counter runs, panels split. Once per session, landing only, ≤1.7s."],
          ].map(([k, v]) => (
            <div key={k} className="bg-card p-5">
              <dt className="eyebrow text-primary">{k}</dt>
              <dd className="mt-2 text-sm text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </div>
  );
}
