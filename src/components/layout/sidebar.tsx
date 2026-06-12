'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Receipt,
  CreditCard,
  FileText,
  FileSpreadsheet,
  Wallet,
  FileSignature,
  ListTodo,
  FolderOpen,
  Calendar,
  BarChart3,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Customers',
    items: [
      { href: '/companies', label: 'Companies', icon: Building2 },
      { href: '/payments', label: 'Payments', icon: Receipt },
    ],
  },
  {
    label: 'Sales',
    items: [
      { href: '/quotations', label: 'Quotations', icon: FileText },
      { href: '/invoices', label: 'Invoices', icon: FileSpreadsheet },
      { href: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/expenses', label: 'Expenses', icon: Wallet },
      { href: '/contracts', label: 'Contracts', icon: FileSignature },
      { href: '/tasks', label: 'Tasks', icon: ListTodo },
      { href: '/documents', label: 'Documents', icon: FolderOpen },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/calendar', label: 'Calendar', icon: Calendar },
      { href: '/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'System',
    items: [{ href: '/settings', label: 'Settings', icon: Settings }],
  },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-canvas">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background text-sm font-semibold">
          B
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">BusinessOS</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">workspace</div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-auto px-3 pb-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        'group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors',
                        active
                          ? 'bg-foreground/[0.04] text-foreground'
                          : 'text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          active ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground',
                        )}
                      />
                      <span className="font-medium">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Local mode · SQLite</span>
        </div>
      </div>
    </aside>
  );
}
