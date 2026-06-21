import { promises as fs } from "node:fs";
import { loadConfig, requireLark, requireLlm } from "../config.js";
import { createLarkClient } from "../lark/client.js";
import { createDoc } from "../lark/docs.js";
import { createLlmProvider } from "../llm/index.js";
import { ContextStore } from "../context/store.js";

export interface DraftOptions {
  /** Title for the generated document. */
  title?: string;
  /** Push the draft to Lark as a new Docx document. */
  push?: boolean;
  /** Write the draft to a local file instead of stdout. */
  out?: string;
}

const DRAFT_SYSTEM = `你是飞书 vibe 助手，一个擅长起草中文与英文文档的助手。
根据用户的要求和提供的上下文，撰写结构清晰、可直接使用的文档。
默认输出 Markdown：以一级标题开头，合理使用小标题、列表和段落。
忠于用户提供的上下文与风格；信息不足时做出合理且明确的假设，不要编造事实。`;

/**
 * Draft a document from a prompt, grounded in the local context store, and
 * optionally push it to Lark as a new Docx document.
 */
export async function runDraft(prompt: string, options: DraftOptions): Promise<void> {
  const config = loadConfig();
  const llmConfig = requireLlm(config);
  const llm = createLlmProvider(llmConfig);

  const store = new ContextStore(config.contextDir);
  const contextBlock = await store.toPromptBlock();
  const system = contextBlock
    ? `${DRAFT_SYSTEM}\n\n以下是相关背景上下文，请在撰写时参考：\n\n${contextBlock}`
    : DRAFT_SYSTEM;

  const userMessage = options.title
    ? `请起草一篇标题为《${options.title}》的文档。要求：\n${prompt}`
    : `请起草一篇文档。要求：\n${prompt}`;

  process.stderr.write(`✏️  起草中（模型：${llm.model}）…\n`);
  const draft = await llm.complete({
    system,
    messages: [{ role: "user", content: userMessage }],
    maxTokens: 4096,
  });

  if (options.out) {
    await fs.writeFile(options.out, draft.endsWith("\n") ? draft : draft + "\n", "utf8");
    process.stderr.write(`📄 已保存到 ${options.out}\n`);
  }

  if (options.push) {
    const lark = createLarkClient(requireLark(config));
    const title = options.title ?? deriveTitle(draft);
    const doc = await createDoc(lark, config.lark, title, draft);
    process.stderr.write(`🚀 已创建飞书文档：${doc.url}\n`);
  }

  if (!options.out && !options.push) {
    process.stdout.write(draft + "\n");
  }
}

function deriveTitle(markdown: string): string {
  const heading = markdown.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].trim();
  const firstLine = markdown.split("\n").find((l) => l.trim());
  return (firstLine ?? "未命名文档").slice(0, 60).trim();
}
