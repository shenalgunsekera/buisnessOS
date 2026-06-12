import { formatCurrency } from '@/lib/format';
import { computeTotals } from '@/lib/totals';
import type { LineItem } from '@/lib/types';

type Props = {
  items: LineItem[];
  discountPercent: number;
  taxPercent: number;
  amountPaid?: number;
  currency?: string;
};

export function TotalsSummary({ items, discountPercent, taxPercent, amountPaid, currency = 'LKR' }: Props) {
  const t = computeTotals(items, discountPercent, taxPercent);
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <dl className="space-y-1 text-sm">
        <Row label="Subtotal" value={formatCurrency(t.subtotal, currency)} />
        {discountPercent > 0 && (
          <Row label={`Discount (${discountPercent}%)`} value={`- ${formatCurrency(t.discountAmount, currency)}`} />
        )}
        {taxPercent > 0 && <Row label={`Tax (${taxPercent}%)`} value={formatCurrency(t.taxAmount, currency)} />}
        <div className="my-2 h-px bg-border" />
        <Row label="Total" value={formatCurrency(t.total, currency)} bold />
        {typeof amountPaid === 'number' && amountPaid > 0 && (
          <>
            <Row label="Paid" value={`- ${formatCurrency(amountPaid, currency)}`} accent="text-emerald-700" />
            <Row label="Balance due" value={formatCurrency(Math.max(0, t.total - amountPaid), currency)} bold />
          </>
        )}
      </dl>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`tabular-nums ${bold ? 'font-semibold text-foreground' : ''} ${accent ?? ''}`}>{value}</dd>
    </div>
  );
}
