import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';

export function getModel() {
  const key = process.env.AI_MODEL || 'google:gemini-2.5-flash-lite';
  const colonIndex = key.indexOf(':');

  if (colonIndex === -1) {
    throw new Error(`AI_MODEL の形式が不正です: "${key}" (期待: "provider:model-id")`);
  }

  const provider = key.slice(0, colonIndex);
  const modelId = key.slice(colonIndex + 1);

  switch (provider) {
    case 'google':
      return google(modelId);
    case 'anthropic':
      return anthropic(modelId);
    default:
      throw new Error(`未対応のAIプロバイダ: "${provider}"`);
  }
}
