#!/usr/bin/env node
import { Command } from "commander";
import { ConfigError } from "./config.js";
import { runDraft } from "./commands/draft.js";
import { runAnalyze } from "./commands/analyze.js";
import {
  runContextAdd,
  runContextList,
  runContextRemove,
  runContextShow,
} from "./commands/context.js";

const program = new Command();

program
  .name("opc")
  .description(
    "飞书 (Lark) vibe 助手 — 起草文档、分析妙记，基于 Lark CLI + 文档 + 上下文系统。",
  )
  .version("0.1.0");

program
  .command("draft")
  .description("根据提示词起草文档，可选推送到飞书云文档")
  .argument("<prompt>", "对文档的要求/提示词")
  .option("-t, --title <title>", "文档标题")
  .option("-p, --push", "创建为飞书 Docx 文档", false)
  .option("-o, --out <file>", "保存到本地文件")
  .action(async (prompt: string, opts) => {
    await runDraft(prompt, opts);
  });

program
  .command("analyze")
  .description("分析飞书妙记（会议转写）或本地转写文件")
  .argument("<source>", "妙记 token / 链接，或与 --file 搭配的标题")
  .option(
    "-m, --mode <mode>",
    "分析模式：summary | actions | decisions | custom",
    "summary",
  )
  .option("-i, --instruction <text>", "自定义指令（mode=custom 时使用）")
  .option("-f, --file <file>", "分析本地转写文件而非拉取妙记")
  .option("-o, --out <file>", "保存到本地文件")
  .action(async (source: string, opts) => {
    await runAnalyze(source, opts);
  });

const context = program
  .command("context")
  .description("管理上下文系统（背景资料、风格指南、术语表等）");

context
  .command("list")
  .description("列出所有上下文条目")
  .action(async () => {
    await runContextList();
  });

context
  .command("show")
  .description("查看某条上下文内容")
  .argument("<id>", "上下文 id")
  .action(async (id: string) => {
    await runContextShow(id);
  });

context
  .command("add")
  .description("新增/覆盖上下文（来自 --file、--content 或标准输入）")
  .argument("<id>", "上下文 id")
  .option("-f, --file <file>", "从文件读取内容")
  .option("-c, --content <text>", "直接提供内容")
  .action(async (id: string, opts) => {
    await runContextAdd(id, opts);
  });

context
  .command("remove")
  .alias("rm")
  .description("删除一条上下文")
  .argument("<id>", "上下文 id")
  .action(async (id: string) => {
    await runContextRemove(id);
  });

async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    if (err instanceof ConfigError) {
      process.stderr.write(`⚠️  ${err.message}\n`);
    } else {
      process.stderr.write(`❌ ${(err as Error).message}\n`);
    }
    process.exitCode = 1;
  }
}

main();
