import type { LineItem } from './types';

export function computeTotals(
  items: Pick<LineItem, 'quantity' | 'unitPrice'>[],
  discountPercent: number,
  taxPercent: number,
) {
  const subtotal = items.reduce((sum, it) => sum + (it.quantity || 0) * (it.unitPrice || 0), 0);
  const discountAmount = (subtotal * (discountPercent || 0)) / 100;
  const taxableBase = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableBase * (taxPercent || 0)) / 100;
  const total = taxableBase + taxAmount;
  return { subtotal, discountAmount, taxableBase, taxAmount, total };
}
