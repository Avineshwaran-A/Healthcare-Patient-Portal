// Small shadcn/ui-style primitives built on native elements (no Radix) to keep
// the bundle light. Same API conventions as shadcn: variant/size props + cn().
import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "action" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "default" | "sm" | "icon";

const variants: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover active:bg-primary-hover",
  action: "bg-coral text-coral-foreground shadow-sm hover:bg-coral-hover active:bg-coral-hover",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
  outline: "border border-input bg-card text-foreground shadow-sm hover:border-primary/40 hover:bg-accent hover:text-accent-foreground",
  ghost: "text-foreground hover:bg-muted",
  destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
};
const sizes: Record<ButtonSize, string> = {
  default: "h-10 px-5 text-sm",
  sm: "h-8 px-3 text-xs",
  icon: "h-9 w-9",
};

export function buttonClass(variant: ButtonVariant = "default", size: ButtonSize = "default", className?: string) {
  return cn(
    "inline-flex cursor-pointer select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-[color,background-color,border-color,transform,box-shadow] duration-200 ease-out-expo hover:-translate-y-px hover:shadow-lift active:translate-y-px active:shadow-none disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean }
>(({ className, variant, size, loading, disabled, children, ...props }, ref) => (
  <button
    ref={ref}
    className={buttonClass(variant, size, className)}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    {...props}
  >
    {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />}
    {children}
  </button>
));
Button.displayName = "Button";

const field =
  "flex w-full rounded-lg border border-input bg-card px-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground hover:border-primary/40 focus-visible:border-primary disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(field, "h-10", className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(field, "min-h-[80px] py-2", className)} {...props} />,
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => <select ref={ref} className={cn(field, "h-10 cursor-pointer pr-8", className)} {...props} />,
);
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium", className)} {...props} />;
}

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border bg-card text-card-foreground shadow-card", className)} {...props} />;
}

export function CardHeader({
  title,
  action,
  description,
  icon,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  description?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b px-4 py-3.5 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        {icon && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">{icon}</span>}
        <div className="min-w-0">
          <h2>{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 sm:p-5", className)} {...props} />;
}

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "primary";
export type BadgeVariant = "soft" | "solid" | "outline";

const badgeVariants: Record<BadgeVariant, Record<Tone, string>> = {
  soft: {
    neutral: "bg-secondary text-secondary-foreground ring-border",
    info: "bg-info/10 text-info ring-info/20",
    success: "bg-success/10 text-success ring-success/20",
    warning: "bg-warning/10 text-warning ring-warning/25",
    danger: "bg-destructive/10 text-destructive ring-destructive/20",
    primary: "bg-accent text-accent-foreground ring-primary/20",
  },
  solid: {
    neutral: "bg-foreground text-background ring-transparent",
    info: "bg-info text-white ring-transparent",
    success: "bg-success text-white ring-transparent",
    warning: "bg-warning text-white ring-transparent",
    danger: "bg-destructive text-destructive-foreground ring-transparent",
    primary: "bg-primary text-primary-foreground ring-transparent",
  },
  outline: {
    neutral: "bg-transparent text-muted-foreground ring-input",
    info: "bg-transparent text-info ring-info/50",
    success: "bg-transparent text-success ring-success/50",
    warning: "bg-transparent text-warning ring-warning/55",
    danger: "bg-transparent text-destructive ring-destructive/50",
    primary: "bg-transparent text-primary ring-primary/50",
  },
};
const dots: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  primary: "bg-primary",
};

export function Badge({
  tone = "neutral",
  variant = "soft",
  dot = false,
  icon,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone; variant?: BadgeVariant; dot?: boolean; icon?: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider ring-1 ring-inset",
        badgeVariants[variant][tone],
        className,
      )}
      {...props}
    >
      {icon ? <span className="flex h-3 w-3 items-center justify-center [&>svg]:h-3 [&>svg]:w-3" aria-hidden>{icon}</span> : null}
      {dot && !icon && <span className={cn("h-1.5 w-1.5 rounded-full", variant === "solid" ? "bg-current" : dots[tone])} aria-hidden />}
      {children}
    </span>
  );
}

/** Domain status vocabulary: one source of truth for every status badge in the app. */
export const STATUS: Record<string, { tone: Tone; label: string }> = {
  // appointments
  scheduled: { tone: "info", label: "Scheduled" },
  confirmed: { tone: "primary", label: "Confirmed" },
  completed: { tone: "success", label: "Completed" },
  cancelled: { tone: "neutral", label: "Cancelled" },
  no_show: { tone: "warning", label: "Missed" },
  requested: { tone: "warning", label: "Pending" },
  // billing
  unpaid: { tone: "warning", label: "Unpaid" },
  paid: { tone: "success", label: "Paid" },
  overdue: { tone: "danger", label: "Overdue" },
  void: { tone: "neutral", label: "Void" },
  // lab results
  normal: { tone: "success", label: "Normal" },
  abnormal: { tone: "danger", label: "Abnormal" },
  pending: { tone: "warning", label: "Pending" },
};

export const ROLE_TONE: Record<string, Tone> = { patient: "info", doctor: "primary", admin: "neutral" };

export function StatusBadge({ status, variant }: { status: string; variant?: BadgeVariant }) {
  const s = STATUS[status] ?? { tone: "neutral" as Tone, label: status };
  return (
    <Badge tone={s.tone} variant={variant} dot>
      {s.label}
    </Badge>
  );
}

export function Alert({ tone = "danger", children }: { tone?: "danger" | "success" | "info"; children: React.ReactNode }) {
  const c = {
    danger: "border-destructive/25 bg-destructive/5 text-destructive",
    success: "border-success/25 bg-success/5 text-success",
    info: "border-info/25 bg-info/5 text-info",
  }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-lg border px-3.5 py-2.5 text-sm", c)}>
      {children}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon?: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      {icon && <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon}</div>}
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1>{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const tileTones: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  primary: "bg-accent text-primary",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
};

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = "primary",
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-3xl font-normal tracking-tight tabular-nums sm:text-[2.125rem]">{value}</p>
        </div>
        {icon && <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tileTones[tone])}>{icon}</span>}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="-mx-px overflow-x-auto">{children}</div>;
}

/** Classes for pill-style filter links. */
export function chipClass(active: boolean) {
  return cn(
    "inline-flex h-8 items-center rounded-full border px-3.5 text-sm font-medium transition-colors",
    active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
  );
}
