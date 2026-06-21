export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LlmCompleteOptions {
  system?: string;
  messages: LlmMessage[];
  maxTokens?: number;
  temperature?: number;
}

/**
 * Provider-agnostic LLM interface. Implement this to add a new backend
 * (OpenAI, a local model, etc.) without touching command code.
 */
export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  complete(options: LlmCompleteOptions): Promise<string>;
}
