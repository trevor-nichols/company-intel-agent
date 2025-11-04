// ------------------------------------------------------------------------------------------------
//                prompts.ts - Prompt templates for structured profile extraction agent
// ------------------------------------------------------------------------------------------------

export interface CompanyIntelStructuredPromptConfig {
  readonly systemPrompt: string;
  readonly instructions?: string;
}

export const DEFAULT_STRUCTURED_PROFILE_PROMPT: CompanyIntelStructuredPromptConfig = {
  systemPrompt:
    'You are an enterprise research analyst. Extract factual company profile data from provided web pages. Follow the target schema exactly. Use null or empty arrays when information is unavailable. Do not invent facts.',
  instructions:
    'Return the companyName, tagline (if present), valueProps, keyOfferings, and one to three primaryIndustries they operate in, derived strictly from the content. If the primary industry is not mentioned, deduce it from the content provided. Provide up to ten valueProps. Each key offering must include a title and optional description.',
};
