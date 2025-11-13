import { NextRequest } from 'next/server';

import { errorResponse, jsonResponse } from '@/server/handlers';
import { getCompanyIntelEnvironment } from '@/server/bootstrap';
import { validateChatRequestBody } from '@/server/agents/chat/validation';
import { buildChatSystemPrompt } from '@/server/agents/chat/prompts';
import { runChatAgent } from '@/server/agents/chat/client';
import {
  COMPANY_INTEL_CHAT_MAX_MESSAGES,
  type CompanyIntelChatResult,
} from '@/shared/company-intel/chat';

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const snapshotId = Number.parseInt(context.params.id, 10);
  if (!Number.isFinite(snapshotId)) {
    return errorResponse('Invalid snapshot id', 400);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return errorResponse('Invalid JSON payload', 400);
  }

  const validation = validateChatRequestBody(body, COMPANY_INTEL_CHAT_MAX_MESSAGES);
  if (!validation.ok) {
    return errorResponse(validation.message, validation.status);
  }
  const normalizedMessages = validation.messages;

  try {
    const { persistence, openAI, chatModel } = getCompanyIntelEnvironment();
    const snapshot = await persistence.getSnapshotById(snapshotId);
    if (!snapshot) {
      return errorResponse('Snapshot not found', 404);
    }

    if (!snapshot.vectorStoreId || snapshot.vectorStoreStatus !== 'ready') {
      return errorResponse('Snapshot knowledge base is not ready yet', 409);
    }

    const systemPrompt = buildChatSystemPrompt({ domain: snapshot.domain ?? undefined });

    const chatExecution = await runChatAgent(
      {
        vectorStoreId: snapshot.vectorStoreId,
        systemPrompt,
        messages: normalizedMessages,
        metadata: { snapshot_id: String(snapshotId) },
        mode: 'blocking',
      },
      {
        openAIClient: openAI,
        model: chatModel,
      },
    );

    if (chatExecution.mode !== 'blocking') {
      throw new Error('Chat agent returned unexpected stream mode.');
    }

    const payload: CompanyIntelChatResult = chatExecution.result;

    return jsonResponse({ data: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to complete chat request';
    return errorResponse(message, 500);
  }
}
