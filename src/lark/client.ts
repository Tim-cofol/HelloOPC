import * as lark from "@larksuiteoapi/node-sdk";
import type { LarkConfig } from "../config.js";

export type LarkClient = lark.Client;

/** Per-request options (e.g. a user access token) accepted by the SDK. */
export type LarkRequestOptions = Parameters<LarkClient["request"]>[1];

/**
 * Build an authenticated Lark/Feishu SDK client.
 *
 * The SDK manages tenant_access_token acquisition and refresh internally using
 * the app id/secret, so callers only need to pass a user access token when an
 * API must act on behalf of a specific user (e.g. Minutes, personal docs).
 */
export function createLarkClient(config: LarkConfig): LarkClient {
  return new lark.Client({
    appId: config.appId,
    appSecret: config.appSecret,
    domain: config.domain === "lark" ? lark.Domain.Lark : lark.Domain.Feishu,
    loggerLevel: lark.LoggerLevel.warn,
  });
}

/**
 * Request option helper that attaches a user access token to a call when one is
 * configured. Returns `undefined` when no token is set so the SDK falls back to
 * the tenant access token.
 */
export function withUserToken(config: LarkConfig): LarkRequestOptions {
  if (!config.userAccessToken) return undefined;
  return lark.withUserAccessToken(config.userAccessToken) as LarkRequestOptions;
}
