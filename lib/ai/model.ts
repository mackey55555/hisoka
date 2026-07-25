import { anthropic } from '@ai-sdk/anthropic';

/**
 * AI_MODEL からモデルを解決する。
 * 2026-07 に Anthropic API 直結へ一本化（旧: Bedrock / Google は廃止）。
 * 形式は "anthropic:<model-id>" または "<model-id>" のどちらでも可。
 */
export function getModel() {
  const raw = process.env.AI_MODEL || 'anthropic:claude-sonnet-4-6';

  let modelId = raw;
  const colonIndex = raw.indexOf(':');
  if (colonIndex !== -1) {
    const provider = raw.slice(0, colonIndex);
    if (provider !== 'anthropic') {
      throw new Error(
        `未対応のAIプロバイダ: "${provider}"。現在は Anthropic 直結のみ対応です（例: "anthropic:claude-sonnet-4-6"）`
      );
    }
    modelId = raw.slice(colonIndex + 1);
  }

  if (!modelId) {
    throw new Error(`AI_MODEL の形式が不正です: "${raw}"`);
  }

  return anthropic(modelId);
}
