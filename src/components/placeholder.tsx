import { Construction } from 'lucide-react';

export function Placeholder({ title, comingIn }: { title: string; comingIn: string }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">This module is not built yet.</p>
      </div>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center shadow-card">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <Construction className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Coming in {comingIn}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The foundation is in place — UI, data, and API for this module land in the next slice.
          </p>
        </div>
      </div>
    </div>
  );
}
