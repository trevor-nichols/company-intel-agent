import React from 'react';

import type { CompanyIntelConsultedDocument } from '../../../../../../shared/chat';

interface ConsultedDocumentChipsProps {
  readonly documents: readonly CompanyIntelConsultedDocument[];
}

export function ConsultedDocumentChips({ documents }: ConsultedDocumentChipsProps): React.ReactElement | null {
  if (!documents || documents.length === 0) {
    return null;
  }

  return (
    <div className="mt-1.5 text-center">
      <div className="sr-only">Documents consulted</div>
      <div className="inline-flex flex-wrap justify-center gap-1">
        {documents.map(doc => (
          <span
            key={doc.fileId}
            className="inline-flex min-w-[2.75rem] items-center justify-center rounded-full bg-muted/60 px-1.5 py-0.25 text-[11px] font-semibold text-muted-foreground"
          >
            {typeof doc.score === 'number' ? doc.score.toFixed(2) : '—'}
          </span>
        ))}
      </div>
    </div>
  );
}
