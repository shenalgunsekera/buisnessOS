'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DocumentEditor } from '@/components/documents/document-editor';

function Inner() {
  const isTemplate = useSearchParams().get('template') === '1';
  return <DocumentEditor kind="quotation" mode="create" asTemplate={isTemplate} />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>}>
      <Inner />
    </Suspense>
  );
}
