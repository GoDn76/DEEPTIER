export function formatInr(value: number | null | undefined, maximumFractionDigits = 0): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits,
  }).format(Number(value));
}

export function formatNumber(value: number | null | undefined, maximumFractionDigits = 2): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits }).format(Number(value));
}

export function formatPercent(value: number | null | undefined, fraction = false): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const pct = fraction ? Number(value) * 100 : Number(value);
  return `${pct.toFixed(1)}%`;
}

export function formatTimestamp(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncateHash(hash?: string | null, head = 10, tail = 8): string {
  if (!hash) return '—';
  if (hash.length <= head + tail + 3) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}
