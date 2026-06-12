'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Search } from 'lucide-react';

const PAGE_LABELS: Record<string, string> = {
  '': 'Dashboard',
  companies: 'Companies',
  payments: 'Payments',
  subscriptions: 'Subscriptions',
  quotations: 'Quotations',
  invoices: 'Invoices',
  expenses: 'Expenses',
  contracts: 'Contracts',
  tasks: 'Tasks',
  documents: 'Documents',
  calendar: 'Calendar',
  reports: 'Reports',
  settings: 'Settings',
  new: 'New',
  edit: 'Edit',
};

function labelFor(segment: string): string {
  return PAGE_LABELS[segment] ?? segment;
}

export function Topbar() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-canvas px-8">
      <nav className="flex items-center gap-1.5 text-sm">
        {segments.length === 0 ? (
          <span className="font-medium text-foreground">Dashboard</span>
        ) : (
          segments.map((seg, i) => {
            const isLast = i === segments.length - 1;
            return (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-muted-foreground/60">/</span>}
                <span className={isLast ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                  {labelFor(seg)}
                </span>
              </React.Fragment>
            );
          })
        )}
      </nav>

      <div className="flex items-center gap-3">
        <div className="flex h-9 w-72 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          <input
            placeholder="Search…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded border border-border bg-canvas px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground md:inline-block">
            ⌘K
          </kbd>
        </div>
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
          ME
        </div>
      </div>
    </header>
  );
}
