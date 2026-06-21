import { promises as fs } from "node:fs";
import path from "node:path";

export interface ContextEntry {
  /** Stable id derived from the slug/filename (without extension). */
  id: string;
  /** Human title — first markdown heading, or the id. */
  title: string;
  /** Raw markdown body. */
  content: string;
  /** Absolute path on disk. */
  filePath: string;
}

/**
 * A simple file-based context system: each piece of background knowledge is a
 * markdown file under the context directory. The assistant loads these and
 * injects them into prompts so drafting/analysis is grounded in the user's own
 * material (style guides, project briefs, prior docs, glossaries, …).
 */
export class ContextStore {
  constructor(private readonly dir: string) {}

  /** Ensure the context directory exists. */
  async init(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
  }

  private fileFor(id: string): string {
    const slug = slugify(id);
    if (!slug) throw new Error(`Invalid context id: "${id}"`);
    return path.join(this.dir, `${slug}.md`);
  }

  /** Save (create or overwrite) a context entry. Returns its id. */
  async save(id: string, content: string): Promise<string> {
    await this.init();
    const filePath = this.fileFor(id);
    await fs.writeFile(filePath, content.endsWith("\n") ? content : content + "\n", "utf8");
    return path.basename(filePath, ".md");
  }

  /** Remove a context entry. Returns true if something was deleted. */
  async remove(id: string): Promise<boolean> {
    try {
      await fs.unlink(this.fileFor(id));
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw err;
    }
  }

  /** Load a single entry by id, or null if missing. */
  async get(id: string): Promise<ContextEntry | null> {
    const filePath = this.fileFor(id);
    try {
      const content = await fs.readFile(filePath, "utf8");
      return toEntry(filePath, content);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  /** Load every context entry in the store, sorted by id. */
  async list(): Promise<ContextEntry[]> {
    let files: string[];
    try {
      files = await fs.readdir(this.dir);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }

    const entries = await Promise.all(
      files
        .filter((f) => f.endsWith(".md"))
        .map(async (f) => {
          const filePath = path.join(this.dir, f);
          const content = await fs.readFile(filePath, "utf8");
          return toEntry(filePath, content);
        }),
    );

    return entries.sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Render all context entries as a single block suitable for an LLM system
   * prompt. Returns an empty string when the store is empty.
   */
  async toPromptBlock(): Promise<string> {
    const entries = await this.list();
    if (entries.length === 0) return "";
    return entries
      .map((e) => `## Context: ${e.title}\n\n${e.content.trim()}`)
      .join("\n\n---\n\n");
  }
}

function toEntry(filePath: string, content: string): ContextEntry {
  const id = path.basename(filePath, ".md");
  const headingMatch = content.match(/^#\s+(.+)$/m);
  const title = headingMatch ? headingMatch[1].trim() : id;
  return { id, title, content, filePath };
}

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}
