import { errorResponse } from '@/server/handlers';

export async function POST() {
  return errorResponse('Chat is streaming-only. Use /api/company-intel/snapshots/:id/chat/stream with Accept: text/event-stream.', 426);
}
