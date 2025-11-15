import '@/app/api/company-intel/config';
import { toNextResponse } from '@company-intel/feature/adapters/next/http';
import { error as httpError } from '@company-intel/feature/api/http';

export async function POST() {
  return toNextResponse(
    httpError('Chat is streaming-only. Use /api/company-intel/snapshots/:id/chat/stream with Accept: text/event-stream.', 426),
  );
}
