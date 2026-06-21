import Anthropic from "@anthropic-ai/sdk";
import type { LlmCompleteOptions, LlmProvider } from "./types.js";

export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";
  readonly model: string;
  private client: Anthropic;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async complete(options: LlmCompleteOptions): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.7,
      system: options.system,
      messages: options.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");
  }
}
