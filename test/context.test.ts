import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ContextStore, slugify } from "../src/context/store.js";

async function tmpStore(): Promise<{ store: ContextStore; dir: string }> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "opc-ctx-"));
  return { store: new ContextStore(dir), dir };
}

test("slugify normalizes ids", () => {
  assert.equal(slugify("My Style Guide"), "my-style-guide");
  assert.equal(slugify("  spaced  out  "), "spaced-out");
  assert.equal(slugify("项目-Brief 2026"), "项目-brief-2026");
});

test("save / get / list round-trips an entry", async () => {
  const { store } = await tmpStore();
  const id = await store.save("Style Guide", "# Style Guide\n\nBe concise.");
  assert.equal(id, "style-guide");

  const entry = await store.get("style-guide");
  assert.ok(entry);
  assert.equal(entry!.title, "Style Guide");
  assert.match(entry!.content, /Be concise/);

  const all = await store.list();
  assert.equal(all.length, 1);
});

test("title falls back to id when no heading", async () => {
  const { store } = await tmpStore();
  await store.save("glossary", "OPC = our internal project codename.");
  const entry = await store.get("glossary");
  assert.equal(entry!.title, "glossary");
});

test("remove deletes an entry and is idempotent", async () => {
  const { store } = await tmpStore();
  await store.save("temp", "throwaway");
  assert.equal(await store.remove("temp"), true);
  assert.equal(await store.remove("temp"), false);
  assert.equal(await store.get("temp"), null);
});

test("toPromptBlock renders all entries, empty when none", async () => {
  const { store } = await tmpStore();
  assert.equal(await store.toPromptBlock(), "");

  await store.save("a", "# Alpha\n\nfirst");
  await store.save("b", "# Beta\n\nsecond");
  const block = await store.toPromptBlock();
  assert.match(block, /## Context: Alpha/);
  assert.match(block, /## Context: Beta/);
  assert.match(block, /---/);
});

test("get returns null for missing entry", async () => {
  const { store } = await tmpStore();
  assert.equal(await store.get("nope"), null);
});
