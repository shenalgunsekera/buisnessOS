'use client';

import * as React from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Receipt, CreditCard, FileSignature, ListTodo, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiGet } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { CalendarEvent } from '@/lib/types';

const KIND_META: Record<CalendarEvent['kind'], { label: string; icon: React.ComponentType<{ className?: string }>; tone: 'info' | 'warning' | 'success' | 'danger' | 'muted' }> = {
  payment: { label: 'Payment', icon: Receipt, tone: 'warning' },
  invoice: { label: 'Invoice', icon: FileSpreadsheet, tone: 'info' },
  subscription: { label: 'Subscription', icon: CreditCard, tone: 'muted' },
  contract: { label: 'Contract', icon: FileSignature, tone: 'danger' },
  task: { label: 'Task', icon: ListTodo, tone: 'success' },
};

function monthStart(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function monthEnd(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

export default function CalendarPage() {
  const [cursor, setCursor] = React.useState(new Date());
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    const from = monthStart(cursor).toISOString();
    const to = monthEnd(cursor).toISOString();
    apiGet<{ events: CalendarEvent[] }>(`/api/calendar?from=${from}&to=${to}`)
      .then((d) => setEvents(d.events))
      .catch((err) => toast.error((err as Error).message))
      .finally(() => setLoading(false));
  }, [cursor]);

  const first = monthStart(cursor);
  const last = monthEnd(cursor);
  const startDay = first.getDay();
  const totalDays = last.getDate();
  const cells: { date: Date | null }[] = [];
  for (let i = 0; i < startDay; i += 1) cells.push({ date: null });
  for (let i = 1; i <= totalDays; i += 1) cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), i) });
  while (cells.length % 7 !== 0) cells.push({ date: null });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">Everything coming up across payments, subscriptions, contracts, and tasks.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="min-w-[140px] text-center text-sm font-medium">{cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
          <Button size="icon" variant="outline" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={() => setCursor(new Date())}>Today</Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border shadow-card">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="bg-canvas px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{d}</div>
        ))}
        {cells.map((cell, idx) => {
          if (!cell.date) return <div key={idx} className="min-h-[110px] bg-muted/30" />;
          const dayEvents = events.filter((e) => sameDay(new Date(e.date), cell.date!));
          const isToday = sameDay(cell.date, new Date());
          return (
            <div key={idx} className="min-h-[110px] bg-canvas p-2">
              <div className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${isToday ? 'bg-foreground text-background font-semibold' : 'text-muted-foreground'}`}>
                {cell.date.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => {
                  const meta = KIND_META[e.kind];
                  const Icon = meta.icon;
                  return (
                    <div key={e.id} className="flex items-center gap-1 truncate rounded bg-secondary/60 px-1.5 py-0.5 text-[10px]" title={`${meta.label}: ${e.title}`}>
                      <Icon className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{e.title}</span>
                    </div>
                  );
                })}
                {dayEvents.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="mb-3 text-sm font-semibold">Upcoming this month</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : events.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarIcon className="h-4 w-4" /> Nothing scheduled.</p>
        ) : (
          <ul className="divide-y divide-border">
            {events.map((e) => {
              const meta = KIND_META[e.kind];
              const Icon = meta.icon;
              return (
                <li key={e.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{e.title}</span>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(e.date)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
