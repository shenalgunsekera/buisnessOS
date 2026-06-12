export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled';

export function effectiveStatus(p: { status: string; amount: number; amountPaid: number; dueDate: string | Date }): PaymentStatus {
  if (p.status === 'cancelled') return 'cancelled';
  if (p.status === 'paid' || p.amountPaid >= p.amount) return 'paid';
  if (p.amountPaid > 0) return 'partial';
  const due = typeof p.dueDate === 'string' ? new Date(p.dueDate) : p.dueDate;
  if (due.getTime() < Date.now()) return 'overdue';
  return 'pending';
}

export function paymentStatusTone(s: PaymentStatus): 'success' | 'warning' | 'danger' | 'info' | 'muted' {
  switch (s) {
    case 'paid':
      return 'success';
    case 'pending':
      return 'warning';
    case 'overdue':
      return 'danger';
    case 'partial':
      return 'info';
    case 'cancelled':
    default:
      return 'muted';
  }
}
