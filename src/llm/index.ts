import type { LlmConfig } from "../config.js";
import { AnthropicProvider } from "./anthropic.js";
import type { LlmProvider } from "./types.js";

export type { LlmProvider, LlmMessage, LlmCompleteOptions } from "./types.js";

/**
 * Construct the configured LLM provider. New providers are added here; command
 * code only ever sees the {@link LlmProvider} interface.
 */
export function createLlmProvider(config: LlmConfig): LlmProvider {
  switch (config.provider) {
    case "anthropic":
      return new AnthropicProvider(config.anthropicApiKey ?? "", config.model);
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}
