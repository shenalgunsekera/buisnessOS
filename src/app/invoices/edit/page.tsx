'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DocumentEditor } from '@/components/documents/document-editor';

function EditInvoice() {
  const id = useSearchParams().get('id') ?? undefined;
  if (!id) return <p className="py-16 text-center text-sm text-muted-foreground">Missing invoice id.</p>;
  return <DocumentEditor kind="invoice" mode="edit" id={id} />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>}>
      <EditInvoice />
    </Suspense>
  );
}
