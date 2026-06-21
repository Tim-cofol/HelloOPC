import { promises as fs } from "node:fs";
import { loadConfig, requireLark, requireLlm } from "../config.js";
import { createLarkClient } from "../lark/client.js";
import { getMinute } from "../lark/minutes.js";
import { createLlmProvider } from "../llm/index.js";
import { ContextStore } from "../context/store.js";

export interface AnalyzeOptions {
  /** What kind of analysis to run. */
  mode?: "summary" | "actions" | "decisions" | "custom";
  /** Custom instruction used when mode is "custom". */
  instruction?: string;
  /** Write the analysis to a local file instead of stdout. */
  out?: string;
  /** Analyze a local transcript file instead of fetching from Lark. */
  file?: string;
}

const ANALYZE_SYSTEM = `你是飞书 vibe 助手，擅长分析飞书妙记（会议记录）转写文本。
请基于提供的转写内容进行分析，输出 Markdown。
保持客观、准确，引用要点时忠于原文，不要编造未提及的内容。`;

const MODE_INSTRUCTIONS: Record<string, string> = {
  summary: "请输出会议纪要：包含会议主题、核心讨论点、关键结论。控制在要点清单内。",
  actions:
    "请提取所有行动项（Action Items）。每条包含：负责人（若提及）、任务描述、截止时间（若提及）。用清单呈现。",
  decisions: "请提取会议中达成的关键决策，以及每个决策的背景与影响。",
};

/**
 * Analyze a Lark Minutes (妙记) transcript — or a local transcript file — using
 * the configured LLM, grounded in the local context store.
 */
export async function runAnalyze(source: string, options: AnalyzeOptions): Promise<void> {
  const config = loadConfig();
  const llm = createLlmProvider(requireLlm(config));

  let title: string;
  let transcript: string;

  if (options.file) {
    title = source || options.file;
    transcript = await fs.readFile(options.file, "utf8");
  } else {
    const lark = createLarkClient(requireLark(config));
    process.stderr.write("📥 拉取妙记转写中…\n");
    const minute = await getMinute(lark, config.lark, source);
    title = minute.title;
    transcript = minute.transcript;
  }

  if (!transcript.trim()) {
    throw new Error("转写内容为空，无法分析。请确认妙记 token / 文件内容是否正确。");
  }

  const store = new ContextStore(config.contextDir);
  const contextBlock = await store.toPromptBlock();
  const system = contextBlock
    ? `${ANALYZE_SYSTEM}\n\n以下是相关背景上下文：\n\n${contextBlock}`
    : ANALYZE_SYSTEM;

  const mode = options.mode ?? "summary";
  const instruction =
    mode === "custom"
      ? options.instruction ?? "请总结这段会议转写。"
      : MODE_INSTRUCTIONS[mode] ?? MODE_INSTRUCTIONS.summary;

  process.stderr.write(`🔎 分析中（模型：${llm.model}，模式：${mode}）…\n`);
  const analysis = await llm.complete({
    system,
    messages: [
      {
        role: "user",
        content: `会议：《${title}》\n\n分析要求：${instruction}\n\n转写内容：\n"""\n${transcript}\n"""`,
      },
    ],
    maxTokens: 4096,
  });

  if (options.out) {
    await fs.writeFile(options.out, analysis.endsWith("\n") ? analysis : analysis + "\n", "utf8");
    process.stderr.write(`📄 已保存到 ${options.out}\n`);
  } else {
    process.stdout.write(analysis + "\n");
  }
}
