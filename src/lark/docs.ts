import type { LarkClient } from "./client.js";
import { withUserToken } from "./client.js";
import type { LarkConfig } from "../config.js";

export interface CreatedDoc {
  documentId: string;
  title: string;
  url: string;
}

/**
 * Create a new Lark Docx document with a title, then append the given markdown
 * body as a single text block.
 *
 * We use the SDK's raw `request` escape hatch so this stays resilient across SDK
 * minor versions and keeps the dependency surface small. The relevant endpoints:
 *   - POST /open-apis/docx/v1/documents
 *   - POST /open-apis/docx/v1/documents/{id}/blocks/{id}/children
 */
export async function createDoc(
  client: LarkClient,
  config: LarkConfig,
  title: string,
  body: string,
): Promise<CreatedDoc> {
  const opts = withUserToken(config);

  const created = await client.request<{
    data: { document: { document_id: string } };
  }>(
    {
      method: "POST",
      url: "/open-apis/docx/v1/documents",
      data: { title },
    },
    opts,
  );

  const documentId = created?.data?.document?.document_id;
  if (!documentId) {
    throw new Error("Lark did not return a document_id when creating the doc.");
  }

  // Append the body as text blocks (one block per paragraph, blank lines split).
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length > 0) {
    await client.request(
      {
        method: "POST",
        url: `/open-apis/docx/v1/documents/${documentId}/blocks/${documentId}/children`,
        data: {
          children: paragraphs.map((text) => ({
            block_type: 2, // text block
            text: { elements: [{ text_run: { content: text } }] },
          })),
          index: 0,
        },
      },
      opts,
    );
  }

  const base = config.domain === "lark" ? "https://www.larksuite.com" : "https://www.feishu.cn";
  return {
    documentId,
    title,
    url: `${base}/docx/${documentId}`,
  };
}

/** Fetch the plain-text content of an existing Docx document. */
export async function getDocPlainText(
  client: LarkClient,
  config: LarkConfig,
  documentId: string,
): Promise<string> {
  const res = await client.request<{ data: { content: string } }>(
    {
      method: "GET",
      url: `/open-apis/docx/v1/documents/${documentId}/raw_content`,
    },
    withUserToken(config),
  );
  return res?.data?.content ?? "";
}
