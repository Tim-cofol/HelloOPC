import type { LarkClient } from "./client.js";
import { withUserToken } from "./client.js";
import type { LarkConfig } from "../config.js";

export interface MinuteInfo {
  token: string;
  title: string;
  /** Full transcript text, if available. */
  transcript: string;
  /** Source URL on Lark/Feishu, when derivable. */
  url?: string;
}

/**
 * Extract a Minutes (妙记) token from either a bare token or a share URL such as
 * https://xxx.feishu.cn/minutes/obcnxxxxxxxxxxxxxx
 */
export function parseMinuteToken(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/minutes\/([A-Za-z0-9]+)/);
  if (match) return match[1];
  return trimmed;
}

/**
 * Fetch a Minutes (妙记) recording's metadata and transcript.
 *
 * Minutes APIs act on behalf of a user, so a user access token
 * (LARK_USER_ACCESS_TOKEN) is required. Endpoints:
 *   - GET /open-apis/minutes/v1/minutes/{token}
 *   - GET /open-apis/minutes/v1/minutes/{token}/transcript
 */
export async function getMinute(
  client: LarkClient,
  config: LarkConfig,
  tokenOrUrl: string,
): Promise<MinuteInfo> {
  if (!config.userAccessToken) {
    throw new Error(
      "Reading Minutes (妙记) requires a user access token. Set LARK_USER_ACCESS_TOKEN in your .env.",
    );
  }

  const token = parseMinuteToken(tokenOrUrl);
  const opts = withUserToken(config);

  const meta = await client.request<{
    data: { minute?: { title?: string; url?: string } };
  }>(
    {
      method: "GET",
      url: `/open-apis/minutes/v1/minutes/${token}`,
    },
    opts,
  );

  const transcriptRes = await client.request<{
    data: { transcript?: string; content?: string };
  }>(
    {
      method: "GET",
      url: `/open-apis/minutes/v1/minutes/${token}/transcript`,
    },
    opts,
  );

  const transcript =
    transcriptRes?.data?.transcript ?? transcriptRes?.data?.content ?? "";

  return {
    token,
    title: meta?.data?.minute?.title ?? `Minute ${token}`,
    transcript,
    url: meta?.data?.minute?.url,
  };
}
