import { NextRequest } from 'next/server';
import type { ResponseCreateParams } from 'openai/resources/responses/responses';

import { errorResponse, jsonResponse } from '@/server/handlers';
import { getCompanyIntelEnvironment } from '@/server/bootstrap';
import { extractResponseText } from '@/server/agents/shared/response';
import { resolveOpenAIClient } from '@/server/agents/shared/openai';
import { validateChatRequestBody } from '@/server/agents/chat/validation';
import { buildChatSystemPrompt } from '@/server/agents/chat/prompts';
import { extractChatCitations } from '@/server/agents/chat/citations';
import {
  COMPANY_INTEL_CHAT_MAX_MESSAGES,
  type CompanyIntelChatResult,
} from '@/shared/company-intel/chat';

const DEFAULT_VECTOR_RESULTS = 6;

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
    const openAIClient = resolveOpenAIClient(openAI);
    const snapshot = await persistence.getSnapshotById(snapshotId);
    if (!snapshot) {
      return errorResponse('Snapshot not found', 404);
    }

    if (!snapshot.vectorStoreId || snapshot.vectorStoreStatus !== 'ready') {
      return errorResponse('Snapshot knowledge base is not ready yet', 409);
    }

    const systemPrompt = buildChatSystemPrompt({ domain: snapshot.domain ?? undefined });
    const input = [
      { role: 'system', content: systemPrompt },
      ...normalizedMessages,
    ];

    const response = await openAIClient.responses.create({
      model: chatModel,
      input: input as ResponseCreateParams['input'],
      reasoning: { effort: 'medium' },
      tools: [
        {
          type: 'file_search',
          vector_store_ids: [snapshot.vectorStoreId],
          max_num_results: DEFAULT_VECTOR_RESULTS,
        },
      ],
      include: ['file_search_call.results'],
      metadata: {
        snapshot_id: String(snapshotId),
      },
    });

    const text = extractResponseText(response);
    const citations = extractChatCitations(response);

    const payload: CompanyIntelChatResult = {
      message: text,
      responseId: response.id,
      usage: response.usage ? (response.usage as unknown as Record<string, unknown>) : null,
      citations,
    };

    return jsonResponse({ data: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to complete chat request';
    return errorResponse(message, 500);
  }
}
