// ------------------------------------------------------------------------------------------------
//                reasoning.ts - Shared reasoning effort helpers
// ------------------------------------------------------------------------------------------------

export const REASONING_EFFORT_LEVELS = ['low', 'medium', 'high'] as const;

export type ReasoningEffortLevel = (typeof REASONING_EFFORT_LEVELS)[number];

export function isReasoningEffortLevel(candidate: unknown): candidate is ReasoningEffortLevel {
  return typeof candidate === 'string' && REASONING_EFFORT_LEVELS.includes(candidate as ReasoningEffortLevel);
}
