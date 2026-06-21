import "dotenv/config";

export interface LarkConfig {
  appId: string;
  appSecret: string;
  domain: "feishu" | "lark";
  userAccessToken?: string;
}

export interface LlmConfig {
  provider: "anthropic";
  model: string;
  anthropicApiKey?: string;
}

export interface AppConfig {
  lark: LarkConfig;
  llm: LlmConfig;
  contextDir: string;
}

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

/**
 * Load configuration from the environment (.env is loaded automatically).
 *
 * Reading config never throws on missing credentials — commands validate only
 * the pieces they actually need via {@link requireLark} / {@link requireLlm}, so
 * `opc --help` and offline commands keep working without any secrets set.
 */
export function loadConfig(): AppConfig {
  const domain = (env("LARK_DOMAIN") ?? "feishu").toLowerCase();
  return {
    lark: {
      appId: env("LARK_APP_ID") ?? "",
      appSecret: env("LARK_APP_SECRET") ?? "",
      domain: domain === "lark" ? "lark" : "feishu",
      userAccessToken: env("LARK_USER_ACCESS_TOKEN"),
    },
    llm: {
      provider: "anthropic",
      model: env("LLM_MODEL") ?? "claude-opus-4-8",
      anthropicApiKey: env("ANTHROPIC_API_KEY"),
    },
    contextDir: env("OPC_CONTEXT_DIR") ?? ".opc",
  };
}

/** Throw a helpful error unless Lark app credentials are present. */
export function requireLark(config: AppConfig): LarkConfig {
  const { appId, appSecret } = config.lark;
  if (!appId || !appSecret) {
    throw new ConfigError(
      "Missing Lark credentials. Set LARK_APP_ID and LARK_APP_SECRET in your .env (see .env.example).",
    );
  }
  return config.lark;
}

/** Throw a helpful error unless an LLM API key is present. */
export function requireLlm(config: AppConfig): LlmConfig {
  if (!config.llm.anthropicApiKey) {
    throw new ConfigError(
      "Missing ANTHROPIC_API_KEY. Set it in your .env (see .env.example) to use drafting/analysis.",
    );
  }
  return config.llm;
}

/** Error type the CLI prints cleanly (no stack trace) — for expected misconfig. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}
