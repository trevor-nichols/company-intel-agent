// ------------------------------------------------------------------------------------------------
//                useExportCompanyIntelSnapshot - Download PDF exports for snapshots
// ------------------------------------------------------------------------------------------------

import { useMutation } from '@tanstack/react-query';

import { useCompanyIntelClient } from '../context';
import { toHttpError } from '../utils/errors';

interface ExportSnapshotVariables {
  readonly snapshotId: number;
}

interface ExportSnapshotResult {
  readonly filename: string;
  readonly blob: Blob;
}

function extractFilename(disposition: string | null, fallback: string): string {
  if (!disposition) {
    return fallback;
  }

  const filenameMatch = disposition.match(/filename\*?=([^;]+)/i);
  if (!filenameMatch) {
    return fallback;
  }

  const value = filenameMatch[1].trim();

  if (value.startsWith("UTF-8''")) {
    const encoded = value.slice("UTF-8''".length);
    try {
      return decodeURIComponent(encoded);
    } catch {
      return fallback;
    }
  }

  const unquoted = value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
  return unquoted || fallback;
}

function triggerDownload({ blob, filename }: ExportSnapshotResult) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function useExportCompanyIntelSnapshot() {
  const { request } = useCompanyIntelClient();

  return useMutation<ExportSnapshotResult, Error, ExportSnapshotVariables>({
    mutationFn: async ({ snapshotId }) => {
      const response = await request(`/snapshots/${snapshotId}/export`);
      if (!response.ok) {
        throw await toHttpError(response, 'Unable to export snapshot');
      }

      const blob = await response.blob();
      const filename = extractFilename(response.headers.get('content-disposition'), `company-intel-${snapshotId}.pdf`);

      return { blob, filename } satisfies ExportSnapshotResult;
    },
    onSuccess: (result) => {
      triggerDownload(result);
    },
  });
}
