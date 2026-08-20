interface StatusStyle {
  bg: string;
  fg: string;
  dot: string;
}

// Status is encoded in both color and a leading dot, not color alone —
// RESTRICTED needs to read at a glance even for someone unable to
// distinguish the accent green from the pending gold.
const STYLES: Record<string, StatusStyle> = {
  ACTIVE: { bg: "bg-verified-bg", fg: "text-verified", dot: "bg-verified" },
  RELEASED: { bg: "bg-verified-bg", fg: "text-verified", dot: "bg-verified" },
  RESTRICTED: { bg: "bg-restricted-bg", fg: "text-restricted", dot: "bg-restricted" },
  PENDING: { bg: "bg-pending-bg", fg: "text-pending", dot: "bg-pending" },
  FUNDED: { bg: "bg-pending-bg", fg: "text-pending", dot: "bg-pending" },
  REFUNDED: { bg: "bg-surface-elevated", fg: "text-text-muted", dot: "bg-text-muted" },
};

const FALLBACK: StatusStyle = { bg: "bg-surface-elevated", fg: "text-text-muted", dot: "bg-text-muted" };

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? FALLBACK;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.bg} ${style.fg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {status}
    </span>
  );
}
