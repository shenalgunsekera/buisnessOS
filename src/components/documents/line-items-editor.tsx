'use client';

import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { LineItem } from '@/lib/types';

type Props = {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
};

export function LineItemsEditor({ items, onChange }: Props) {
  const update = (idx: number, patch: Partial<LineItem>) => {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const remove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };
  const add = () => {
    onChange([...items, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_80px_110px_110px_36px] gap-2 px-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <div>Description</div>
        <div className="text-right">Qty</div>
        <div className="text-right">Unit price</div>
        <div className="text-right">Amount</div>
        <div />
      </div>
      {items.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-background/40 p-6 text-center text-xs text-muted-foreground">
          No line items yet.
        </div>
      )}
      {items.map((it, idx) => {
        const amount = (it.quantity || 0) * (it.unitPrice || 0);
        return (
          <div
            key={idx}
            className="grid grid-cols-[1fr_80px_110px_110px_36px] items-center gap-2"
          >
            <Input
              value={it.description}
              onChange={(e) => update(idx, { description: e.target.value })}
              placeholder="Item or service"
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              value={it.quantity}
              onChange={(e) => update(idx, { quantity: Number(e.target.value) })}
              className="text-right"
            />
            <Input
              type="number"
              step="0.01"
              value={it.unitPrice}
              onChange={(e) => update(idx, { unitPrice: Number(e.target.value) })}
              className="text-right"
            />
            <div className="rounded-md border border-border bg-background/40 px-3 py-1 text-right text-sm tabular-nums">
              {amount.toFixed(2)}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove row"
              onClick={() => remove(idx)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-3.5 w-3.5" /> Add line
      </Button>
    </div>
  );
}
