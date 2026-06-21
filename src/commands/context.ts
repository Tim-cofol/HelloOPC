import { promises as fs } from "node:fs";
import { loadConfig } from "../config.js";
import { ContextStore } from "../context/store.js";

function store(): ContextStore {
  return new ContextStore(loadConfig().contextDir);
}

/** List all context entries. */
export async function runContextList(): Promise<void> {
  const entries = await store().list();
  if (entries.length === 0) {
    process.stdout.write("（上下文为空。用 `opc context add <id>` 添加。）\n");
    return;
  }
  for (const e of entries) {
    process.stdout.write(`• ${e.id}\t${e.title}\n`);
  }
}

/** Show one context entry's content. */
export async function runContextShow(id: string): Promise<void> {
  const entry = await store().get(id);
  if (!entry) {
    throw new Error(`未找到上下文：${id}`);
  }
  process.stdout.write(entry.content + "\n");
}

export interface ContextAddOptions {
  /** Read content from a file. */
  file?: string;
  /** Inline content. */
  content?: string;
}

/** Add or overwrite a context entry from a file, inline content, or stdin. */
export async function runContextAdd(id: string, options: ContextAddOptions): Promise<void> {
  let content: string;
  if (options.file) {
    content = await fs.readFile(options.file, "utf8");
  } else if (options.content !== undefined) {
    content = options.content;
  } else {
    content = await readStdin();
  }

  if (!content.trim()) {
    throw new Error("内容为空，未保存。通过 --file、--content 或标准输入提供内容。");
  }

  const savedId = await store().save(id, content);
  process.stdout.write(`✅ 已保存上下文：${savedId}\n`);
}

/** Remove a context entry. */
export async function runContextRemove(id: string): Promise<void> {
  const removed = await store().remove(id);
  process.stdout.write(removed ? `🗑️  已删除：${id}\n` : `（未找到：${id}）\n`);
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}
