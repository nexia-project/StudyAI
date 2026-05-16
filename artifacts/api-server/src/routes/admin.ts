import { Router, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { roleRequestsTable } from "@workspace/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { isAdminUserAsync, getAdminDebugInfo } from "../lib/adminCheck";
import { cacheStats } from "../lib/semanticCache";
import { getFullMemoryContext } from "../lib/generativeMemory";

/** Runs a DB query and returns its rows; on failure returns [] and logs the error */
async function safeQuery<T = any>(label: string, query: () => Promise<{ rows: T[] }>): Promise<T[]> {
  try {
    const result = await query();
    return result.rows as T[];
  } catch (err) {
    console.error(`[admin/stats] query '${label}' failed:`, err);
    return [];
  }
}
/** Runs a DB query and returns the first row; on failure returns null */
async function safeQueryOne<T = any>(label: string, query: () => Promise<{ rows: T[] }>): Promise<T | null> {
  const rows = await safeQuery<T>(label, query);
  return rows[0] ?? null;
}

const ADMIN_TIME_ZONE = "America/Sao_Paulo";
const USD_TO_BRL = 5.85;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

type CostBasis = "logged_usage" | "provider_invoice" | "mixed";

type ProviderDiagnostic = {
  id: string;
  name?: string;
  ok: boolean;
  runtimeStatus?: IntegrationStatus;
  statusLabel?: string;
  requiredEnv?: string[];
  configuredEnv?: string[];
  billingIntegrated: boolean;
  billingStatus?: ProviderBillingStatus;
  loggedVia: string[];
  notes?: string;
};

type ProviderBillingStatus = "connected" | "missing_config" | "unsupported" | "error" | "not_implemented";
type IntegrationStatus = "configured" | "connected" | "missing_config" | "unsupported" | "not_implemented" | "routed" | "local" | "disabled" | "error";

type AdminIntegration = {
  id: string;
  name: string;
  category: "ai-runtime" | "ai-billing" | "media" | "data" | "platform" | "content";
  status: IntegrationStatus;
  ok: boolean;
  requiredEnv: string[];
  configuredEnv: string[];
  runtimeStatus?: IntegrationStatus;
  billingStatus?: ProviderBillingStatus;
  detail: string;
  action?: string;
};

type ProviderBilling = {
  provider: string;
  status: ProviderBillingStatus;
  billingIntegrated: boolean;
  lastCheckedAt: string;
  period?: { from: string; to: string };
  balanceUsd?: number | null;
  totalCreditsUsd?: number | null;
  usedCreditsUsd?: number | null;
  costUsd?: number | null;
  currency?: string;
  usage?: Record<string, unknown>;
  error?: string;
  action: string;
};

function dateInAdminTimeZone(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ADMIN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? "01";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function isValidDateOnly(value: string): boolean {
  if (!DATE_ONLY_RE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function addDays(dateOnly: string, days: number): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysInclusive(from: string, to: string): number {
  return Math.floor((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86400000) + 1;
}

function normalizeDateRange(qFrom: unknown, qTo: unknown) {
  const today = dateInAdminTimeZone();
  let from = typeof qFrom === "string" && isValidDateOnly(qFrom) ? qFrom : addDays(today, -29);
  let to = typeof qTo === "string" && isValidDateOnly(qTo) ? qTo : today;

  if (from > to) [from, to] = [to, from];

  const days = daysInclusive(from, to);
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(days - 1));

  return { from, to, prevFrom, prevTo, days, timeZone: ADMIN_TIME_ZONE };
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function sumUsd(rows: any[]): number {
  return roundMoney(rows.reduce((sum, row) => sum + Number(row.cost_usd ?? row.costUsd ?? 0), 0));
}

function isConfigured(...names: string[]): boolean {
  return names.some(name => {
    const value = process.env[name];
    return Boolean(value && value !== "dummy" && value.length > 0);
  });
}

function allConfigured(...names: string[]): boolean {
  return names.every(name => {
    const value = process.env[name];
    return Boolean(value && value !== "dummy" && value.length > 0);
  });
}

function configuredEnvNames(...names: string[]): string[] {
  return names.filter(name => {
    const value = process.env[name];
    return Boolean(value && value !== "dummy" && value.length > 0);
  });
}

function getConfiguredEnv(...names: string[]): { name: string; value: string } | null {
  for (const name of names) {
    const value = process.env[name];
    if (value && value !== "dummy" && value.length > 0) return { name, value };
  }
  return null;
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function unixSeconds(dateOnly: string): number {
  return Math.floor(Date.parse(`${dateOnly}T00:00:00.000Z`) / 1000);
}

function isoDateStart(dateOnly: string): string {
  return `${dateOnly}T00:00:00Z`;
}

function providerBillingBase(provider: string, status: ProviderBillingStatus, action: string, extra: Partial<ProviderBilling> = {}): ProviderBilling {
  return {
    provider,
    status,
    billingIntegrated: status === "connected",
    lastCheckedAt: new Date().toISOString(),
    action,
    ...extra,
  };
}

async function fetchJsonWithTimeout(url: string, init: RequestInit, timeoutMs = 4500): Promise<{ status: number; ok: boolean; body: any; text: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let body: any = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
    }
    return { status: response.status, ok: response.ok, body, text };
  } finally {
    clearTimeout(timeout);
  }
}

function providerErrorMessage(provider: string, status: number, body: any, fallbackText: string): string {
  const message =
    body?.error?.message ??
    body?.error ??
    body?.message ??
    fallbackText.slice(0, 200) ??
    `HTTP ${status}`;
  return `${provider}: HTTP ${status} - ${String(message).slice(0, 240)}`;
}

async function getOpenRouterBilling(): Promise<ProviderBilling> {
  const key = getConfiguredEnv("OPENROUTER_MANAGEMENT_API_KEY", "AI_INTEGRATIONS_OPENROUTER_API_KEY", "OPENROUTER_API_KEY");
  if (!key) {
    return providerBillingBase(
      "openrouter",
      "missing_config",
      "Configure OPENROUTER_MANAGEMENT_API_KEY (preferencial) ou uma chave OpenRouter com permissão de credits.",
    );
  }

  try {
    const result = await fetchJsonWithTimeout("https://openrouter.ai/api/v1/credits", {
      headers: {
        Authorization: `Bearer ${key.value}`,
        Accept: "application/json",
      },
    });
    if (!result.ok) {
      const needsManagementKey = result.status === 401 || result.status === 403;
      return providerBillingBase(
        "openrouter",
        "error",
        needsManagementKey
          ? "A API de credits do OpenRouter exige management key/permissão de créditos. Configure OPENROUTER_MANAGEMENT_API_KEY."
          : "Verifique a chave OpenRouter e tente novamente.",
        { error: providerErrorMessage("OpenRouter credits", result.status, result.body, result.text) },
      );
    }

    const data = result.body?.data ?? {};
    const totalCreditsUsd = numberOrNull(data.total_credits);
    const usedCreditsUsd = numberOrNull(data.total_usage);
    const balanceUsd = totalCreditsUsd != null && usedCreditsUsd != null ? roundMoney(totalCreditsUsd - usedCreditsUsd) : null;
    return providerBillingBase(
      "openrouter",
      "connected",
      `Saldo lido de /api/v1/credits usando ${key.name}.`,
      {
        totalCreditsUsd,
        usedCreditsUsd,
        balanceUsd,
        currency: "USD",
      },
    );
  } catch (err) {
    return providerBillingBase("openrouter", "error", "Falha ao consultar OpenRouter credits; verifique rede/chave.", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function getOpenAiBilling(rangeFrom: string, rangeTo: string): Promise<ProviderBilling> {
  const key = getConfiguredEnv("OPENAI_ADMIN_API_KEY");
  if (!key) {
    return providerBillingBase(
      "openai",
      "missing_config",
      isConfigured("OPENAI_API_KEY", "AI_INTEGRATIONS_OPENAI_API_KEY")
        ? "Runtime OpenAI está configurado, mas custo real exige OPENAI_ADMIN_API_KEY com permissão de Usage/Costs."
        : "Configure OPENAI_ADMIN_API_KEY (org owner/admin com permissão de Usage/Costs). Chave runtime comum não consulta custos.",
      { period: { from: rangeFrom, to: rangeTo } },
    );
  }

  const params = new URLSearchParams({
    start_time: String(unixSeconds(rangeFrom)),
    end_time: String(unixSeconds(addDays(rangeTo, 1))),
    bucket_width: "1d",
    limit: "180",
  });
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key.value}`,
    Accept: "application/json",
  };
  if (process.env.OPENAI_ORG_ID) headers["OpenAI-Organization"] = process.env.OPENAI_ORG_ID;
  if (process.env.OPENAI_PROJECT_ID) headers["OpenAI-Project"] = process.env.OPENAI_PROJECT_ID;

  try {
    const result = await fetchJsonWithTimeout(`https://api.openai.com/v1/organization/costs?${params}`, { headers });
    if (!result.ok) {
      return providerBillingBase(
        "openai",
        "error",
        "A Costs API da OpenAI exige chave com permissão de Usage/Costs da organização/projeto. Configure OPENAI_ADMIN_API_KEY e, se necessário, OPENAI_ORG_ID/OPENAI_PROJECT_ID.",
        {
          period: { from: rangeFrom, to: rangeTo },
          error: providerErrorMessage("OpenAI Costs API", result.status, result.body, result.text),
        },
      );
    }

    const buckets = Array.isArray(result.body?.data) ? result.body.data : [];
    const costUsd = roundMoney(buckets.reduce((sum: number, bucket: any) => {
      const results = Array.isArray(bucket?.results) ? bucket.results : [];
      return sum + results.reduce((inner: number, item: any) => inner + Number(item?.amount?.value ?? 0), 0);
    }, 0));
    const currency = buckets
      .flatMap((bucket: any) => Array.isArray(bucket?.results) ? bucket.results : [])
      .map((item: any) => item?.amount?.currency)
      .find(Boolean) ?? "usd";

    return providerBillingBase(
      "openai",
      "connected",
      `Custo real lido de /v1/organization/costs usando ${key.name}.`,
      {
        period: { from: rangeFrom, to: rangeTo },
        costUsd,
        currency: String(currency).toUpperCase(),
      },
    );
  } catch (err) {
    return providerBillingBase("openai", "error", "Falha ao consultar OpenAI Costs API; verifique rede/chave/permissões.", {
      period: { from: rangeFrom, to: rangeTo },
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function getAnthropicBilling(rangeFrom: string, rangeTo: string): Promise<ProviderBilling> {
  const key = getConfiguredEnv("ANTHROPIC_ADMIN_API_KEY", "ANTHROPIC_ADMIN_KEY");
  if (!key) {
    const hasMessageKey = isConfigured("ANTHROPIC_API_KEY");
    return providerBillingBase(
      "anthropic",
      "missing_config",
      hasMessageKey
        ? "ANTHROPIC_API_KEY é chave de mensagens; para custos reais configure ANTHROPIC_ADMIN_API_KEY (sk-ant-admin...) com acesso Admin API."
        : "Configure ANTHROPIC_ADMIN_API_KEY (sk-ant-admin...) para consultar o Cost Report da Anthropic.",
      { period: { from: rangeFrom, to: rangeTo } },
    );
  }

  const params = new URLSearchParams({
    starting_at: isoDateStart(rangeFrom),
    ending_at: isoDateStart(addDays(rangeTo, 1)),
    bucket_width: "1d",
  });

  try {
    const result = await fetchJsonWithTimeout(`https://api.anthropic.com/v1/organizations/cost_report?${params}`, {
      headers: {
        "x-api-key": key.value,
        "anthropic-version": "2023-06-01",
        Accept: "application/json",
      },
    });
    if (!result.ok) {
      return providerBillingBase(
        "anthropic",
        "error",
        "O Cost Report da Anthropic exige Admin API key (sk-ant-admin...) e organização com API Admin habilitada.",
        {
          period: { from: rangeFrom, to: rangeTo },
          error: providerErrorMessage("Anthropic Cost Report", result.status, result.body, result.text),
        },
      );
    }

    const buckets = Array.isArray(result.body?.data) ? result.body.data : [];
    const costUsd = roundMoney(buckets.reduce((sum: number, bucket: any) => {
      const results = Array.isArray(bucket?.results) ? bucket.results : [];
      const bucketTotal = numberOrNull(bucket?.cost_usd ?? bucket?.total_cost_usd);
      if (bucketTotal != null) return sum + bucketTotal;
      return sum + results.reduce((inner: number, item: any) => {
        const amount = item?.amount ?? item?.cost ?? item?.cost_usd ?? item?.total_cost_usd;
        if (typeof amount === "object" && amount !== null) return inner + Number(amount.value ?? 0);
        return inner + Number(amount ?? 0);
      }, 0);
    }, 0));

    return providerBillingBase(
      "anthropic",
      "connected",
      `Custo real lido do Cost Report Admin API usando ${key.name}.`,
      {
        period: { from: rangeFrom, to: rangeTo },
        costUsd,
        currency: "USD",
      },
    );
  } catch (err) {
    return providerBillingBase("anthropic", "error", "Falha ao consultar Anthropic Cost Report; verifique rede/chave/permissões.", {
      period: { from: rangeFrom, to: rangeTo },
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function getElevenLabsBilling(): Promise<ProviderBilling> {
  const key = getConfiguredEnv("ELEVENLABS_API_KEY");
  if (!key) {
    return providerBillingBase("elevenlabs", "missing_config", "Configure ELEVENLABS_API_KEY para consultar assinatura/uso de caracteres.");
  }

  try {
    const result = await fetchJsonWithTimeout("https://api.elevenlabs.io/v1/user/subscription", {
      headers: {
        "xi-api-key": key.value,
        Accept: "application/json",
      },
    });
    if (!result.ok) {
      return providerBillingBase("elevenlabs", "error", "Verifique ELEVENLABS_API_KEY para consultar /v1/user/subscription.", {
        error: providerErrorMessage("ElevenLabs subscription", result.status, result.body, result.text),
      });
    }

    const characterCount = numberOrNull(result.body?.character_count);
    const characterLimit = numberOrNull(result.body?.character_limit);
    const nextResetUnix = numberOrNull(result.body?.next_character_count_reset_unix);
    return providerBillingBase(
      "elevenlabs",
      "connected",
      "Uso real de caracteres lido de /v1/user/subscription. A API não retorna valor de fatura em USD neste endpoint.",
      {
        usage: {
          characterCount,
          characterLimit,
          nextResetAt: nextResetUnix ? new Date(nextResetUnix * 1000).toISOString() : null,
          tier: result.body?.tier ?? null,
        },
      },
    );
  } catch (err) {
    return providerBillingBase("elevenlabs", "error", "Falha ao consultar ElevenLabs subscription; verifique rede/chave.", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function buildProviderBilling(rangeFrom: string, rangeTo: string): Promise<ProviderBilling[]> {
  const [openrouter, openai, anthropic, elevenlabs] = await Promise.all([
    getOpenRouterBilling(),
    getOpenAiBilling(rangeFrom, rangeTo),
    getAnthropicBilling(rangeFrom, rangeTo),
    getElevenLabsBilling(),
  ]);

  return [
    openrouter,
    openai,
    anthropic,
    providerBillingBase(
      "gemini",
      "unsupported",
      "Gemini/Google AI não tem endpoint de fatura via GEMINI_API_KEY; custos reais exigem Google Cloud Billing Export/API.",
      { period: { from: rangeFrom, to: rangeTo } },
    ),
    providerBillingBase(
      "google-cloud-billing",
      "not_implemented",
      "Google Cloud Billing Export/API ainda não está implementado nesta API admin.",
      { period: { from: rangeFrom, to: rangeTo } },
    ),
    providerBillingBase(
      "deepseek",
      "not_implemented",
      "DeepSeek direto não está implementado; os modelos deepseek/* rodam via OpenRouter neste deploy.",
      { period: { from: rangeFrom, to: rangeTo } },
    ),
    providerBillingBase(
      "together",
      "not_implemented",
      "Together/FLUX pode gerar imagens com TOGETHER_API_KEY, mas billing real da Together ainda não é consultado.",
      { period: { from: rangeFrom, to: rangeTo } },
    ),
    elevenlabs,
  ];
}

async function tableExists(tableName: string): Promise<boolean> {
  const row = await safeQueryOne<{ exists: boolean }>(`tableExists:${tableName}`, () => db.execute(sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
    ) AS exists
  `));
  return Boolean((row as any)?.exists);
}

function integrationOk(status: IntegrationStatus): boolean {
  return status === "configured" || status === "connected" || status === "routed" || status === "local";
}

function integrationStatusLabel(status: IntegrationStatus): string {
  const labels: Record<IntegrationStatus, string> = {
    configured: "Config env presente",
    connected: "Validado",
    missing_config: "Config ausente",
    unsupported: "Sem API suportada",
    not_implemented: "Não implementado",
    routed: "Roteado",
    local: "Local/gratuito",
    disabled: "Desligado por env",
    error: "Erro",
  };
  return labels[status];
}

function makeIntegration(input: Omit<AdminIntegration, "ok" | "configuredEnv"> & { configuredEnv?: string[] }): AdminIntegration {
  return {
    ...input,
    ok: integrationOk(input.status),
    configuredEnv: input.configuredEnv ?? configuredEnvNames(...input.requiredEnv),
  };
}

function billingStatusToIntegrationStatus(status?: ProviderBillingStatus): IntegrationStatus {
  if (status === "connected") return "connected";
  if (status === "error") return "error";
  if (status === "unsupported") return "unsupported";
  if (status === "not_implemented") return "not_implemented";
  return "missing_config";
}

function buildIntegrationInventory(providerBilling: ProviderBilling[], missingTables: string[]): AdminIntegration[] {
  const billingByProvider = new Map(providerBilling.map(item => [item.provider, item]));
  const billingIntegration = (provider: string) => billingStatusToIntegrationStatus(billingByProvider.get(provider)?.status);
  const billingStatus = (provider: string) => billingByProvider.get(provider)?.status;
  const openrouterConfigured = isConfigured("AI_INTEGRATIONS_OPENROUTER_API_KEY", "OPENROUTER_API_KEY");
  const openaiRuntimeConfigured = isConfigured("OPENAI_API_KEY", "AI_INTEGRATIONS_OPENAI_API_KEY");
  const visualsDisabled = String(process.env.VISUALS_ENABLED ?? "").toLowerCase() === "false";
  const visualsConfigured = !visualsDisabled && isConfigured("TOGETHER_API_KEY", "OPENAI_API_KEY");

  return [
    makeIntegration({
      id: "openrouter",
      name: "OpenRouter runtime",
      category: "ai-runtime",
      status: openrouterConfigured ? "configured" : "missing_config",
      runtimeStatus: openrouterConfigured ? "configured" : "missing_config",
      billingStatus: billingStatus("openrouter"),
      requiredEnv: ["AI_INTEGRATIONS_OPENROUTER_API_KEY", "OPENROUTER_API_KEY"],
      detail: "Cliente central de chat/completions para GPT, Claude e DeepSeek via OpenRouter.",
      action: "Configure AI_INTEGRATIONS_OPENROUTER_API_KEY ou OPENROUTER_API_KEY.",
    }),
    makeIntegration({
      id: "openrouter-billing",
      name: "OpenRouter billing/credits",
      category: "ai-billing",
      status: billingIntegration("openrouter"),
      billingStatus: billingStatus("openrouter"),
      requiredEnv: ["OPENROUTER_MANAGEMENT_API_KEY"],
      detail: "Saldo real consultado em /api/v1/credits quando a management key responde.",
      action: billingByProvider.get("openrouter")?.action,
    }),
    makeIntegration({
      id: "openai-runtime",
      name: "OpenAI runtime direto",
      category: "ai-runtime",
      status: openaiRuntimeConfigured ? "configured" : "missing_config",
      runtimeStatus: openaiRuntimeConfigured ? "configured" : "missing_config",
      billingStatus: billingStatus("openai"),
      requiredEnv: ["OPENAI_API_KEY", "AI_INTEGRATIONS_OPENAI_API_KEY"],
      detail: "Usado diretamente para TTS, Whisper/STT, embeddings do cache semântico e DALL-E premium.",
      action: "Configure OPENAI_API_KEY para APIs diretas; AI_INTEGRATIONS_OPENAI_API_KEY pode cobrir parte do runtime.",
    }),
    makeIntegration({
      id: "openai-billing",
      name: "OpenAI Admin billing",
      category: "ai-billing",
      status: billingIntegration("openai"),
      billingStatus: billingStatus("openai"),
      requiredEnv: ["OPENAI_ADMIN_API_KEY"],
      configuredEnv: configuredEnvNames("OPENAI_ADMIN_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID"),
      detail: "Custo real vem de /v1/organization/costs; OPENAI_ORG_ID/OPENAI_PROJECT_ID são opcionais quando a conta exige escopo.",
      action: billingByProvider.get("openai")?.action,
    }),
    makeIntegration({
      id: "anthropic-messages",
      name: "Anthropic Messages API",
      category: "ai-runtime",
      status: isConfigured("ANTHROPIC_API_KEY") ? "configured" : openrouterConfigured ? "routed" : "missing_config",
      runtimeStatus: isConfigured("ANTHROPIC_API_KEY") ? "configured" : openrouterConfigured ? "routed" : "missing_config",
      billingStatus: billingStatus("anthropic"),
      requiredEnv: ["ANTHROPIC_API_KEY"],
      detail: openrouterConfigured
        ? "Claude em produção está roteado via modelos anthropic/* no OpenRouter; cliente Anthropic direto não é usado no código atual."
        : "Sem OpenRouter ou ANTHROPIC_API_KEY, Claude não tem rota operacional.",
      action: "Para Anthropic direto, implemente cliente Messages API e configure ANTHROPIC_API_KEY; hoje o caminho suportado é OpenRouter.",
    }),
    makeIntegration({
      id: "anthropic-admin-billing",
      name: "Anthropic Admin billing",
      category: "ai-billing",
      status: billingIntegration("anthropic"),
      billingStatus: billingStatus("anthropic"),
      requiredEnv: ["ANTHROPIC_ADMIN_API_KEY", "ANTHROPIC_ADMIN_KEY"],
      detail: "Custo real consultado pelo Cost Report da Admin API, separado de ANTHROPIC_API_KEY de mensagens.",
      action: billingByProvider.get("anthropic")?.action,
    }),
    makeIntegration({
      id: "deepseek-via-openrouter",
      name: "DeepSeek via OpenRouter",
      category: "ai-runtime",
      status: openrouterConfigured ? "routed" : "missing_config",
      runtimeStatus: openrouterConfigured ? "routed" : "missing_config",
      billingStatus: billingStatus("openrouter"),
      requiredEnv: ["AI_INTEGRATIONS_OPENROUTER_API_KEY", "OPENROUTER_API_KEY"],
      detail: "Modelo deepseek/deepseek-r1-0528 é selecionado pelo router, mas executa via OpenRouter.",
      action: "Para medir fatura real, use OpenRouter billing/credits.",
    }),
    makeIntegration({
      id: "deepseek-direct",
      name: "DeepSeek direto",
      category: "ai-runtime",
      status: "not_implemented",
      runtimeStatus: "not_implemented",
      billingStatus: billingStatus("deepseek"),
      requiredEnv: ["DEEPSEEK_API_KEY"],
      detail: "Não há cliente DeepSeek direto no código atual; DEEPSEEK_API_KEY não torna a rota operacional.",
      action: "Manter via OpenRouter ou implementar cliente direto antes de marcar como configurado.",
    }),
    makeIntegration({
      id: "gemini-google-ai",
      name: "Gemini / Google AI",
      category: "ai-runtime",
      status: "not_implemented",
      runtimeStatus: "not_implemented",
      billingStatus: billingStatus("gemini"),
      requiredEnv: ["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
      detail: "A função legada generateWithGemini usa Claude via OpenRouter; não existe cliente Gemini ativo nesta API.",
      action: "Implementar cliente Gemini antes de considerar GEMINI_API_KEY como runtime OK.",
    }),
    makeIntegration({
      id: "google-cloud-billing",
      name: "Google Cloud Billing",
      category: "ai-billing",
      status: billingIntegration("google-cloud-billing"),
      billingStatus: billingStatus("google-cloud-billing"),
      requiredEnv: ["GOOGLE_CLOUD_PROJECT", "GOOGLE_APPLICATION_CREDENTIALS"],
      detail: "Separado de GEMINI_API_KEY; exigiria Billing Export/API do projeto Google Cloud.",
      action: billingByProvider.get("google-cloud-billing")?.action,
    }),
    makeIntegration({
      id: "openai-tts-stt",
      name: "OpenAI TTS / Whisper",
      category: "media",
      status: openaiRuntimeConfigured ? "configured" : "missing_config",
      runtimeStatus: openaiRuntimeConfigured ? "configured" : "missing_config",
      billingStatus: billingStatus("openai"),
      requiredEnv: ["OPENAI_API_KEY", "AI_INTEGRATIONS_OPENAI_API_KEY", "AI_INTEGRATIONS_OPENAI_BASE_URL"],
      configuredEnv: configuredEnvNames("OPENAI_API_KEY", "AI_INTEGRATIONS_OPENAI_API_KEY", "AI_INTEGRATIONS_OPENAI_BASE_URL"),
      detail: "Rotas /voice-tts e /transcribe usam OpenAI direto/proxy, com fallback de voz no navegador quando TTS falha.",
      action: "Configure OPENAI_API_KEY para TTS/STT direto e OPENAI_ADMIN_API_KEY para custos reais.",
    }),
    makeIntegration({
      id: "ocr-vision",
      name: "OCR/visão",
      category: "media",
      status: openrouterConfigured ? "routed" : "missing_config",
      runtimeStatus: openrouterConfigured ? "routed" : "missing_config",
      billingStatus: billingStatus("openrouter"),
      requiredEnv: ["AI_INTEGRATIONS_OPENROUTER_API_KEY", "OPENROUTER_API_KEY"],
      detail: "Upload de imagem usa OR.vision (openai/gpt-4o por padrão) via OpenRouter.",
      action: "Configure OpenRouter; custos reais ficam no OpenRouter credits ou no ai_cost_log quando logado.",
    }),
    makeIntegration({
      id: "image-generation",
      name: "Geração de imagens",
      category: "media",
      status: visualsDisabled ? "disabled" : visualsConfigured ? "configured" : "missing_config",
      runtimeStatus: visualsDisabled ? "disabled" : visualsConfigured ? "configured" : "missing_config",
      billingStatus: isConfigured("TOGETHER_API_KEY") ? billingStatus("together") : billingStatus("openai"),
      requiredEnv: ["TOGETHER_API_KEY", "OPENAI_API_KEY", "VISUALS_ENABLED"],
      detail: "Imagens usam Together/FLUX no tier padrão e DALL-E 3/OpenAI no premium; Wikimedia continua gratuita.",
      action: visualsDisabled ? "VISUALS_ENABLED=false desliga geração por IA." : "Configure TOGETHER_API_KEY ou OPENAI_API_KEY para fallback pago.",
    }),
    makeIntegration({
      id: "elevenlabs",
      name: "ElevenLabs",
      category: "media",
      status: isConfigured("ELEVENLABS_API_KEY") ? "not_implemented" : "missing_config",
      runtimeStatus: isConfigured("ELEVENLABS_API_KEY") ? "not_implemented" : "missing_config",
      billingStatus: billingStatus("elevenlabs"),
      requiredEnv: ["ELEVENLABS_API_KEY"],
      detail: "A API admin consulta assinatura/uso de caracteres, mas o runtime TTS atual usa OpenAI, não ElevenLabs.",
      action: billingByProvider.get("elevenlabs")?.action ?? "Implemente runtime ElevenLabs antes de marcar TTS ElevenLabs como operacional.",
    }),
    makeIntegration({
      id: "postgres",
      name: "Postgres / DATABASE_URL",
      category: "data",
      status: isConfigured("DATABASE_URL") ? "connected" : "missing_config",
      requiredEnv: ["DATABASE_URL"],
      detail: "A própria rota admin consultou o banco para montar este painel.",
      action: "Configure DATABASE_URL no ambiente de deploy.",
    }),
    ...["ai_cost_log", "ai_response_cache", "activity_events"].map(table => makeIntegration({
      id: `table-${table}`,
      name: `Tabela ${table}`,
      category: "data" as const,
      status: missingTables.includes(table) ? "missing_config" : "connected",
      requiredEnv: [],
      detail: missingTables.includes(table)
        ? "Tabela opcional ausente; seções de custos, cache ou eventos ficam incompletas."
        : "Tabela opcional encontrada e disponível para as seções admin.",
      action: missingTables.includes(table) ? "Rodar migrations/ensureSchema do ambiente." : undefined,
    })),
    makeIntegration({
      id: "stripe",
      name: "Stripe",
      category: "platform",
      status: allConfigured("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PREMIUM_PRICE_ID") ? "configured" : "missing_config",
      requiredEnv: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PREMIUM_PRICE_ID"],
      detail: "Pagamentos/assinaturas só devem aparecer como configurados quando as envs principais existem.",
      action: "Configure STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET e STRIPE_PREMIUM_PRICE_ID.",
    }),
    makeIntegration({
      id: "clerk",
      name: "Clerk Auth",
      category: "platform",
      status: isConfigured("CLERK_SECRET_KEY") && isConfigured("CLERK_PUBLISHABLE_KEY", "VITE_CLERK_PUBLISHABLE_KEY") ? "configured" : "missing_config",
      requiredEnv: ["CLERK_SECRET_KEY", "CLERK_PUBLISHABLE_KEY", "VITE_CLERK_PUBLISHABLE_KEY"],
      configuredEnv: configuredEnvNames("CLERK_SECRET_KEY", "CLERK_PUBLISHABLE_KEY", "VITE_CLERK_PUBLISHABLE_KEY"),
      detail: "Autenticação precisa de secret no backend e publishable key no frontend/proxy.",
      action: "Configure CLERK_SECRET_KEY e CLERK_PUBLISHABLE_KEY ou VITE_CLERK_PUBLISHABLE_KEY.",
    }),
    makeIntegration({
      id: "resend",
      name: "Resend Email",
      category: "platform",
      status: isConfigured("RESEND_API_KEY") ? "configured" : "missing_config",
      requiredEnv: ["RESEND_API_KEY"],
      detail: "Emails transacionais via Resend.",
      action: "Configure RESEND_API_KEY se emails transacionais forem usados.",
    }),
    makeIntegration({
      id: "inep-bncc",
      name: "INEP / BNCC local",
      category: "content",
      status: "local",
      requiredEnv: [],
      detail: "Fontes locais/gratuitas; não exigem API key para aparecerem como disponíveis.",
    }),
    makeIntegration({
      id: "wikipedia",
      name: "Wikipedia API",
      category: "content",
      status: "local",
      requiredEnv: [],
      detail: "API pública usada sem chave; disponibilidade depende de rede externa.",
    }),
    makeIntegration({
      id: "youtube",
      name: "YouTube Data API",
      category: "content",
      status: isConfigured("YOUTUBE_API_KEY") ? "configured" : "missing_config",
      requiredEnv: ["YOUTUBE_API_KEY"],
      detail: "Opcional; sem chave o app usa base curada/fallback.",
      action: "Configure YOUTUBE_API_KEY para buscas dinâmicas.",
    }),
    makeIntegration({
      id: "wolfram",
      name: "Wolfram Alpha",
      category: "content",
      status: isConfigured("WOLFRAM_APP_ID") ? "configured" : "missing_config",
      requiredEnv: ["WOLFRAM_APP_ID"],
      detail: "Opcional para exatas; sem chave cai para mathjs + algebrite.",
      action: "Configure WOLFRAM_APP_ID se quiser solver pago.",
    }),
    makeIntegration({
      id: "google-books",
      name: "Google Books",
      category: "content",
      status: "not_implemented",
      requiredEnv: ["GOOGLE_BOOKS_API_KEY"],
      detail: "O endpoint RAG lista Google Books como TODO; ainda não há implementação.",
      action: "Implementar provedor antes de exigir GOOGLE_BOOKS_API_KEY.",
    }),
  ];
}

function buildProviderDiagnostics(aiCostByModel: any[], providerBilling: ProviderBilling[]): ProviderDiagnostic[] {
  const loggedModels = aiCostByModel.map((row: any) => String(row.provider ?? "").toLowerCase());
  const hasLoggedProvider = (provider: string) => loggedModels.includes(provider);
  const billingByProvider = new Map(providerBilling.map(item => [item.provider, item]));
  const bill = (provider: string) => billingByProvider.get(provider);
  const openrouterConfigured = isConfigured("AI_INTEGRATIONS_OPENROUTER_API_KEY", "OPENROUTER_API_KEY");
  const provider = (input: Omit<ProviderDiagnostic, "statusLabel">): ProviderDiagnostic => ({
    ...input,
    statusLabel: integrationStatusLabel(input.runtimeStatus ?? (input.ok ? "configured" : "missing_config")),
  });

  return [
    provider({
      id: "openrouter",
      name: "OpenRouter",
      ok: isConfigured("AI_INTEGRATIONS_OPENROUTER_API_KEY", "OPENROUTER_API_KEY"),
      runtimeStatus: openrouterConfigured ? "configured" : "missing_config",
      requiredEnv: ["AI_INTEGRATIONS_OPENROUTER_API_KEY", "OPENROUTER_API_KEY"],
      configuredEnv: configuredEnvNames("AI_INTEGRATIONS_OPENROUTER_API_KEY", "OPENROUTER_API_KEY"),
      billingIntegrated: bill("openrouter")?.status === "connected",
      billingStatus: bill("openrouter")?.status,
      loggedVia: ["openrouterFallback", "hermes_qa_sintetico"],
      notes: bill("openrouter")?.status === "connected"
        ? "Saldo real consultável via OpenRouter credits."
        : "Para saldo real, configure OPENROUTER_MANAGEMENT_API_KEY; chaves normais podem retornar 403.",
    }),
    provider({
      id: "openai",
      name: "OpenAI direto",
      ok: isConfigured("AI_INTEGRATIONS_OPENAI_API_KEY", "OPENAI_API_KEY"),
      runtimeStatus: isConfigured("AI_INTEGRATIONS_OPENAI_API_KEY", "OPENAI_API_KEY") ? "configured" : "missing_config",
      requiredEnv: ["OPENAI_API_KEY", "AI_INTEGRATIONS_OPENAI_API_KEY"],
      configuredEnv: configuredEnvNames("OPENAI_API_KEY", "AI_INTEGRATIONS_OPENAI_API_KEY"),
      billingIntegrated: bill("openai")?.status === "connected",
      billingStatus: bill("openai")?.status,
      loggedVia: ["openai-direct fallback", "semantic_cache_embedding", "voice-tts", "transcribe"],
      notes: bill("openai")?.status === "connected"
        ? "Costs API será consultada com chave admin."
        : hasLoggedProvider("openai") || hasLoggedProvider("openai-direct")
          ? "Para custo real, use OPENAI_ADMIN_API_KEY com permissão de Usage/Costs."
          : "Pode haver TTS/STT/imagem sem logger específico; custo real exige OPENAI_ADMIN_API_KEY.",
    }),
    provider({
      id: "anthropic",
      name: "Anthropic Claude",
      ok: isConfigured("ANTHROPIC_API_KEY") || openrouterConfigured || hasLoggedProvider("anthropic"),
      runtimeStatus: isConfigured("ANTHROPIC_API_KEY") ? "configured" : openrouterConfigured ? "routed" : "missing_config",
      requiredEnv: ["ANTHROPIC_API_KEY"],
      configuredEnv: configuredEnvNames("ANTHROPIC_API_KEY"),
      billingIntegrated: bill("anthropic")?.status === "connected",
      billingStatus: bill("anthropic")?.status,
      loggedVia: ["via OpenRouter quando o modelo é anthropic/*"],
      notes: bill("anthropic")?.status === "connected"
        ? "Cost Report da Anthropic será consultado com Admin API key."
        : "Claude runtime está via OpenRouter; custos reais Anthropic exigem ANTHROPIC_ADMIN_API_KEY.",
    }),
    provider({
      id: "deepseek",
      name: "DeepSeek",
      ok: openrouterConfigured || hasLoggedProvider("deepseek"),
      runtimeStatus: openrouterConfigured ? "routed" : "missing_config",
      requiredEnv: ["AI_INTEGRATIONS_OPENROUTER_API_KEY", "OPENROUTER_API_KEY"],
      configuredEnv: configuredEnvNames("AI_INTEGRATIONS_OPENROUTER_API_KEY", "OPENROUTER_API_KEY"),
      billingIntegrated: false,
      billingStatus: bill("deepseek")?.status,
      loggedVia: ["via OpenRouter quando o modelo é deepseek/*"],
      notes: "DeepSeek direto não está implementado; o runtime suportado é via OpenRouter.",
    }),
    provider({
      id: "gemini",
      name: "Gemini / Google AI",
      ok: false,
      runtimeStatus: "not_implemented",
      requiredEnv: ["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
      configuredEnv: configuredEnvNames("GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"),
      billingIntegrated: false,
      billingStatus: bill("gemini")?.status,
      loggedVia: [],
      notes: "Não há cliente Gemini ativo; generateWithGemini é legado e usa Claude via OpenRouter.",
    }),
    provider({
      id: "elevenlabs",
      name: "ElevenLabs",
      ok: false,
      runtimeStatus: isConfigured("ELEVENLABS_API_KEY") ? "not_implemented" : "missing_config",
      requiredEnv: ["ELEVENLABS_API_KEY"],
      configuredEnv: configuredEnvNames("ELEVENLABS_API_KEY"),
      billingIntegrated: bill("elevenlabs")?.status === "connected",
      billingStatus: bill("elevenlabs")?.status,
      loggedVia: [],
      notes: "Billing/uso pode ser consultado, mas o runtime TTS atual usa OpenAI.",
    }),
  ];
}

const router = Router();

// Debug endpoint — returns full auth & admin status info
router.get("/admin/whoami", async (req: Request, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  const debug = await getAdminDebugInfo(req.userId);
  const isAdmin = await isAdminUserAsync(req.userId);
  // Não expõe debug info para não-admins
  if (!isAdmin) {
    res.json({ userId: req.userId, authenticated: true, isAdmin: false });
    return;
  }
  res.json({ userId: req.userId, authenticated: true, isAdmin, ...debug });
});

router.get("/admin/users", async (req: Request, res: Response) => {
  req.log.info({ userId: req.userId }, "admin/users check");
  if (!await isAdminUserAsync(req.userId)) return void res.status(403).json({ error: "Acesso negado", userId: req.userId ?? null });
  try {
    const users = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        stripeSubscriptionStatus: usersTable.stripeSubscriptionStatus,
        stripeCustomerId: usersTable.stripeCustomerId,
        stripeSubscriptionId: usersTable.stripeSubscriptionId,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt));
    res.json({ users });
  } catch (err) {
    req.log.error({ err }, "Error fetching admin users");
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
});

router.patch("/admin/users/:id/status", async (req: Request, res: Response) => {
  if (!await isAdminUserAsync(req.userId)) return void res.status(403).json({ error: "Acesso negado" });
  const id = String(String(req.params.id));
  const { status } = req.body as { status: string };
  const allowed = ["free", "active", "trialing", "canceled", "past_due"];
  if (!allowed.includes(status)) {
    return void res.status(400).json({ error: "Status inválido", allowed });
  }
  try {
    await db
      .update(usersTable)
      .set({ stripeSubscriptionStatus: status, updatedAt: new Date() })
      .where(eq(usersTable.id, id));
    res.json({ ok: true, id, status });
  } catch (err) {
    req.log.error({ err }, "Error updating user status");
    res.status(500).json({ error: "Erro ao atualizar usuário" });
  }
});

// ─── Role requests: list ──────────────────────────────────────────────────────
router.get("/admin/role-requests", async (req: Request, res: Response) => {
  if (!await isAdminUserAsync(req.userId)) return void res.status(403).json({ error: "Acesso negado" });
  try {
    const requests = await db
      .select({
        id: roleRequestsTable.id,
        userId: roleRequestsTable.userId,
        requestedRole: roleRequestsTable.requestedRole,
        status: roleRequestsTable.status,
        school: roleRequestsTable.school,
        subject: roleRequestsTable.subject,
        organ: roleRequestsTable.organ,
        position: roleRequestsTable.position,
        cpf: roleRequestsTable.cpf,
        message: roleRequestsTable.message,
        createdAt: roleRequestsTable.createdAt,
        reviewedAt: roleRequestsTable.reviewedAt,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
      })
      .from(roleRequestsTable)
      .leftJoin(usersTable, eq(roleRequestsTable.userId, usersTable.id))
      .orderBy(desc(roleRequestsTable.createdAt));
    res.json({ requests });
  } catch (err) {
    req.log.error({ err }, "Error fetching role requests");
    res.status(500).json({ error: "Erro ao buscar solicitações" });
  }
});

// ─── Role requests: approve or reject ────────────────────────────────────────
router.post("/admin/role-requests/:id/review", async (req: Request, res: Response) => {
  if (!await isAdminUserAsync(req.userId)) return void res.status(403).json({ error: "Acesso negado" });
  const id = String(String(req.params.id));
  const { action } = req.body as { action: "approve" | "reject" };
  if (!["approve", "reject"].includes(action)) {
    return void res.status(400).json({ error: "Ação inválida" });
  }

  try {
    const [request] = await db
      .select()
      .from(roleRequestsTable)
      .where(and(eq(roleRequestsTable.id, id), eq(roleRequestsTable.status, "pending")))
      .limit(1);

    if (!request) {
      return void res.status(404).json({ error: "Solicitação não encontrada ou já processada" });
    }

    if (action === "approve") {
      await db.update(usersTable).set({ role: request.requestedRole }).where(eq(usersTable.id, request.userId));
    }

    await db.update(roleRequestsTable).set({
      status: action === "approve" ? "approved" : "rejected",
      reviewedBy: req.userId!,
      reviewedAt: new Date(),
    }).where(eq(roleRequestsTable.id, id));

    res.json({ ok: true, action, role: request.requestedRole });
  } catch (err) {
    req.log.error({ err }, "Error reviewing role request");
    res.status(500).json({ error: "Erro ao processar solicitação" });
  }
});

// ─── Admin Stats Dashboard (fault-tolerant — individual query isolation) ────
router.get("/admin/stats", async (req: Request, res: Response) => {
  if (!await isAdminUserAsync(req.userId)) return void res.status(403).json({ error: "Acesso negado" });

  // ── Date range from query params (default: last 30 days) ─────────────────
  const normalizedRange = normalizeDateRange(req.query.from, req.query.to);
  const rangeFrom = normalizedRange.from;
  const rangeTo = normalizedRange.to;
  const prevFrom = normalizedRange.prevFrom;
  const prevTo = normalizedRange.prevTo;
  const rangeDays = normalizedRange.days;
  const today = dateInAdminTimeZone();


  // Ensure schema (idempotent)
  await safeQuery("ensure-schema", () => db.execute(sql`
    CREATE TABLE IF NOT EXISTS login_events (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      event_date DATE NOT NULL DEFAULT CURRENT_DATE,
      event_hour SMALLINT NOT NULL DEFAULT EXTRACT(HOUR FROM NOW())::smallint,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, event_date)
    )
  `));
  await safeQuery("ensure-last-seen", () => db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ`));

  const [hasAiCostLog, hasActivityEvents, hasAiResponseCache] = await Promise.all([
    tableExists("ai_cost_log"),
    tableExists("activity_events"),
    tableExists("ai_response_cache"),
  ]);
  const missingTables = [
    !hasAiCostLog ? "ai_cost_log" : null,
    !hasActivityEvents ? "activity_events" : null,
    !hasAiResponseCache ? "ai_response_cache" : null,
  ].filter((value): value is string => Boolean(value));

  // ── User counts ─────────────────────────────────────────────────────────────
  const [
    totalUsersRow, todayNewRow, premiumRow, teacherRow, govRow, todayActiveRow,
    pendingRow, studyingNowRow,
    newUsersInRange, prevNewUsersRow, activeInRange, prevActiveRow,
  ] = await Promise.all([
    safeQueryOne("totalUsers",     () => db.execute(sql`SELECT COUNT(*)::int AS count FROM users`)),
    safeQueryOne("todayNew",       () => db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE created_at::date = ${today}::date`)),
    safeQueryOne("premium",        () => db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE stripe_subscription_status IN ('active','trialing')`)),
    safeQueryOne("teachers",       () => db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE role = 'teacher'`)),
    safeQueryOne("gov",            () => db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE role = 'government'`)),
    safeQueryOne("todayActive",    () => db.execute(sql`SELECT COUNT(DISTINCT user_id)::int AS count FROM user_activity WHERE study_date = ${today}`)),
    safeQueryOne("pending",        () => db.execute(sql`SELECT COUNT(*)::int AS count FROM role_requests WHERE status = 'pending'`)),
    safeQueryOne("studyingNow",    () => db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE last_seen_at >= NOW() - INTERVAL '30 minutes'`)),
    safeQueryOne("newInRange",     () => db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date`)),
    safeQueryOne("prevNewUsers",   () => db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE created_at::date BETWEEN ${prevFrom}::date AND ${prevTo}::date`)),
    safeQueryOne("activeInRange",  () => db.execute(sql`SELECT COUNT(DISTINCT user_id)::int AS count FROM user_activity WHERE study_date BETWEEN ${rangeFrom} AND ${rangeTo}`)),
    safeQueryOne("prevActive",     () => db.execute(sql`SELECT COUNT(DISTINCT user_id)::int AS count FROM user_activity WHERE study_date BETWEEN ${prevFrom} AND ${prevTo}`)),
  ]);

  // ── Subscription distribution (Financeiro) ──────────────────────────────────
  const subscriptionDist = await safeQuery("subsDist", () => db.execute(sql`
    SELECT COALESCE(stripe_subscription_status, 'free') AS status, COUNT(*)::int AS count
    FROM users GROUP BY stripe_subscription_status ORDER BY count DESC
  `));

  // ── Login events ─────────────────────────────────────────────────────────────
  const [loginsByDay, loginsByHour, recentLogins, loginsInRange, prevLoginsRow] = await Promise.all([
    safeQuery("loginsByDay", () => db.execute(sql`
      SELECT event_date::text AS day, COUNT(*)::int AS count
      FROM login_events WHERE event_date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date
      GROUP BY event_date ORDER BY event_date
    `)),
    safeQuery("loginsByHour", () => db.execute(sql`
      SELECT event_hour AS hour, COUNT(*)::int AS count
      FROM login_events WHERE event_date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date
      GROUP BY event_hour ORDER BY event_hour
    `)),
    safeQuery("recentLogins", () => db.execute(sql`
      SELECT DISTINCT ON (le.id) le.created_at, u.id, u.email, u.first_name, u.last_name, u.role
      FROM login_events le
      JOIN users u ON (u.id = le.user_id OR u.clerk_id = le.user_id)
      WHERE le.event_date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date
      ORDER BY le.id DESC, le.created_at DESC LIMIT 20
    `)),
    safeQueryOne("loginsInRange", () => db.execute(sql`SELECT COUNT(*)::int AS count FROM login_events WHERE event_date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date`)),
    safeQueryOne("prevLogins",    () => db.execute(sql`SELECT COUNT(*)::int AS count FROM login_events WHERE event_date BETWEEN ${prevFrom}::date AND ${prevTo}::date`)),
  ]);

  // ── Activity events ────────────────────────────────────────────────────────
  const [recentEvents, eventsByType30d, activeUsersFromEvents] = hasActivityEvents
    ? await Promise.all([
      safeQuery("recentEvents", () => db.execute(sql`
        SELECT ae.event_type, ae.created_at, ae.metadata, u.email, u.first_name, u.last_name
        FROM activity_events ae
        LEFT JOIN users u ON u.id = ae.user_id OR u.clerk_id = ae.user_id
        WHERE ae.created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date
        ORDER BY ae.created_at DESC LIMIT 50
      `)),
      safeQuery("eventsByTypeRange", () => db.execute(sql`
        SELECT event_type, COUNT(*)::int AS count, COUNT(DISTINCT user_id)::int AS users
        FROM activity_events
        WHERE created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date
        GROUP BY event_type ORDER BY count DESC
      `)),
      safeQueryOne("activeUsersEvents", () => db.execute(sql`
        SELECT COUNT(DISTINCT user_id)::int AS count FROM activity_events
        WHERE created_at >= NOW() - INTERVAL '30 minutes'
      `)),
    ])
    : [[], [], null];

  // ── Per-day charts ───────────────────────────────────────────────────────────
  const [plansPerDay, simuladosPerDay, newUsersPerDay, activityHeatmap] = await Promise.all([
    safeQuery("plansPerDay",     () => db.execute(sql`SELECT DATE(created_at)::text AS day, COUNT(*)::int AS count FROM study_plans WHERE created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date GROUP BY DATE(created_at) ORDER BY day`)),
    safeQuery("simuladosPerDay", () => db.execute(sql`SELECT DATE(created_at)::text AS day, COUNT(*)::int AS count FROM simulado_results WHERE created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date GROUP BY DATE(created_at) ORDER BY day`)),
    safeQuery("newUsersPerDay",  () => db.execute(sql`SELECT DATE(created_at)::text AS day, COUNT(*)::int AS count FROM users WHERE created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date GROUP BY DATE(created_at) ORDER BY day`)),
    safeQuery("activityHeatmap", () => db.execute(sql`SELECT study_date, COUNT(DISTINCT user_id)::int AS active_users FROM user_activity WHERE study_date BETWEEN ${rangeFrom} AND ${rangeTo} GROUP BY study_date ORDER BY study_date`)),
  ]);

  // ── Recent users + top materias ──────────────────────────────────────────────
  const [recentUsers, topMaterias] = await Promise.all([
    safeQuery("recentUsers", () => db.execute(sql`SELECT id, email, first_name, last_name, stripe_subscription_status, role, created_at FROM users WHERE created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date ORDER BY created_at DESC LIMIT 10`)),
    safeQuery("topMaterias", () => db.execute(sql`SELECT materia, COUNT(*)::int AS count, ROUND(AVG(CASE WHEN total > 0 THEN score::numeric/total*100 ELSE 0 END),1)::float AS avg_score FROM simulado_results WHERE created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date GROUP BY materia ORDER BY count DESC LIMIT 6`)),
  ]);

  // ── AI cost metrics ───────────────────────────────────────────────────────────
  const [aiCostRange, aiCostPrev, aiCostByFeature, aiCostByModel, aiCostPerDay, aiCallsTotal, aiCostToday, aiCostMonth, aiLastEvent] = hasAiCostLog
    ? await Promise.all([
      safeQueryOne("aiCostRange",  () => db.execute(sql`
        SELECT
          COALESCE(SUM(cost_usd::numeric), 0)::float AS total,
          COUNT(*)::int AS calls,
          COALESCE(SUM(COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0)), 0)::int AS tokens
        FROM ai_cost_log
        WHERE (created_at AT TIME ZONE ${ADMIN_TIME_ZONE})::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date
      `)),
      safeQueryOne("aiCostPrev",   () => db.execute(sql`
        SELECT
          COALESCE(SUM(cost_usd::numeric), 0)::float AS total
        FROM ai_cost_log
        WHERE (created_at AT TIME ZONE ${ADMIN_TIME_ZONE})::date BETWEEN ${prevFrom}::date AND ${prevTo}::date
      `)),
      safeQuery("aiByFeature",     () => db.execute(sql`
        SELECT
          COALESCE(NULLIF(BTRIM(feature), ''), 'Não classificado') AS feature,
          COUNT(*)::int AS calls,
          COALESCE(SUM(cost_usd::numeric), 0)::float AS cost_usd,
          COALESCE(SUM(COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0)), 0)::int AS tokens
        FROM ai_cost_log
        WHERE (created_at AT TIME ZONE ${ADMIN_TIME_ZONE})::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date
        GROUP BY 1
        ORDER BY cost_usd DESC
      `)),
      safeQuery("aiByModel",       () => db.execute(sql`
        WITH normalized AS (
          SELECT
            COALESCE(NULLIF(BTRIM(model), ''), 'Não classificado') AS raw_model,
            cost_usd,
            COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0) AS tokens
          FROM ai_cost_log
          WHERE (created_at AT TIME ZONE ${ADMIN_TIME_ZONE})::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date
        )
        SELECT
          CASE
            WHEN POSITION('/' IN raw_model) > 0 THEN SPLIT_PART(raw_model, '/', 1)
            WHEN POSITION(':' IN raw_model) > 0 THEN SPLIT_PART(raw_model, ':', 1)
            ELSE 'Não informado'
          END AS provider,
          CASE
            WHEN POSITION('/' IN raw_model) > 0 THEN SUBSTRING(raw_model FROM POSITION('/' IN raw_model) + 1)
            WHEN POSITION(':' IN raw_model) > 0 THEN SUBSTRING(raw_model FROM POSITION(':' IN raw_model) + 1)
            ELSE raw_model
          END AS model,
          COUNT(*)::int AS calls,
          COALESCE(SUM(cost_usd::numeric), 0)::float AS cost_usd,
          COALESCE(SUM(tokens), 0)::int AS tokens
        FROM normalized
        GROUP BY 1, 2
        ORDER BY cost_usd DESC
      `)),
      // One row per calendar day in the normalized admin timezone, so charts reconcile with the selected range.
      safeQuery("aiPerDay",        () => db.execute(sql`
        WITH days AS (
          SELECT generate_series(${rangeFrom}::date, ${rangeTo}::date, interval '1 day')::date AS d
        )
        SELECT
          days.d::text AS day,
          COALESCE(SUM(l.cost_usd::numeric), 0)::float AS cost_usd,
          COUNT(l.id)::int AS calls
        FROM days
        LEFT JOIN ai_cost_log l ON (l.created_at AT TIME ZONE ${ADMIN_TIME_ZONE})::date = days.d
        GROUP BY days.d
        ORDER BY days.d
      `)),
      safeQueryOne("aiCallsTotal", () => db.execute(sql`SELECT COUNT(*)::int AS calls, COALESCE(SUM(COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0)), 0)::int AS tokens FROM ai_cost_log`)),
      safeQueryOne("aiCostToday",  () => db.execute(sql`
        SELECT
          COALESCE(SUM(cost_usd::numeric), 0)::float AS total,
          COUNT(*)::int AS calls,
          COALESCE(SUM(COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0)), 0)::int AS tokens
        FROM ai_cost_log
        WHERE (created_at AT TIME ZONE ${ADMIN_TIME_ZONE})::date = ${today}::date
      `)),
      safeQueryOne("aiCostMonth",  () => db.execute(sql`
        SELECT COALESCE(SUM(cost_usd::numeric), 0)::float AS total
        FROM ai_cost_log
        WHERE DATE_TRUNC('month', created_at AT TIME ZONE ${ADMIN_TIME_ZONE}) = DATE_TRUNC('month', NOW() AT TIME ZONE ${ADMIN_TIME_ZONE})
      `)),
      safeQueryOne("aiLastEvent", () => db.execute(sql`SELECT MAX(created_at)::text AS last_event_at FROM ai_cost_log`)),
    ])
    : [null, null, [], [], [], null, null, null, null];

  // ── AI feature metrics (date-filtered) ────────────────────────────────────────
  const [
    trilhaRows, trilhaSess, notebookDocs, notebookOverviews, notebookOvRange,
    mindmapsPro, mindmapsDoc, tiagaoConv, tiagaoConvRange,
    redacoesAll, redacoesRange, flashRevRange, teacherContent, institutions,
  ] = await Promise.all([
    safeQuery("trilhaProgress",  () => db.execute(sql`SELECT subject, COUNT(*)::int AS cnt, ROUND(AVG(level)::numeric,1)::float AS avg_level, MAX(level)::int AS max_level FROM trilha_mestre_progress GROUP BY subject`)),
    safeQueryOne("trilhaSess",   () => db.execute(sql`SELECT COUNT(*)::int AS count, COUNT(DISTINCT user_id)::int AS users FROM trilha_mestre_sessions WHERE created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date`)),
    safeQueryOne("notebookDocs", () => db.execute(sql`SELECT COUNT(*)::int AS count, COALESCE(SUM(file_size_kb), 0)::int AS total_kb FROM knowledge_documents WHERE is_chunk = false OR is_chunk IS NULL`)),
    safeQueryOne("notebookOv",   () => db.execute(sql`SELECT COUNT(*)::int AS count FROM notebook_overviews`)),
    safeQueryOne("notebookOvRng",() => db.execute(sql`SELECT COUNT(*)::int AS count FROM notebook_overviews WHERE created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date`)),
    safeQueryOne("mindmapsPro",  () => db.execute(sql`SELECT COUNT(*)::int AS count, COUNT(DISTINCT professor_id)::int AS users FROM professor_mindmaps`)),
    safeQueryOne("mindmapsDoc",  () => db.execute(sql`SELECT COUNT(*)::int AS count, COUNT(DISTINCT user_id)::int AS users FROM user_doc_mindmaps`)),
    safeQueryOne("tiagaoAll",    () => db.execute(sql`SELECT COUNT(DISTINCT user_id)::int AS count, COUNT(DISTINCT user_id)::int AS users FROM tiagao_conversations`)),
    safeQueryOne("tiagaoRange",  () => db.execute(sql`SELECT COUNT(DISTINCT user_id)::int AS count FROM tiagao_conversations WHERE criado_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date`)),
    safeQueryOne("redacoesAll",  () => db.execute(sql`SELECT COUNT(*)::int AS count, COUNT(DISTINCT user_id)::int AS users FROM redacoes`)),
    safeQueryOne("redacoesRange",() => db.execute(sql`SELECT COUNT(*)::int AS count FROM redacoes WHERE created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date`)),
    safeQueryOne("flashRevRange",() => db.execute(sql`SELECT COUNT(*)::int AS count FROM flashcard_reviews WHERE updated_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date`)),
    safeQueryOne("teacherContent",() => db.execute(sql`SELECT COUNT(*)::int AS count FROM teacher_content`)),
    safeQueryOne("institutions", () => db.execute(sql`SELECT COUNT(*)::int AS count, COUNT(*) FILTER (WHERE contract_end IS NULL OR contract_end > NOW())::int AS active FROM instituicoes`)),
  ]);

  const costRangeUsd  = (aiCostRange as any)?.total ?? 0;
  const costPrevUsd   = (aiCostPrev as any)?.total ?? 0;
  const costTodayUsd  = (aiCostToday as any)?.total ?? 0;
  const costMonthUsd  = (aiCostMonth as any)?.total ?? 0;
  const totalDocsKb   = (notebookDocs as any)?.total_kb ?? 0;
  const aiFeatureCostUsd = sumUsd(aiCostByFeature);
  const aiModelCostUsd = sumUsd(aiCostByModel);
  const aiDailyCostUsd = sumUsd(aiCostPerDay);
  const aiTotalCostUsd = roundMoney(costRangeUsd);
  const providerBilling = await buildProviderBilling(rangeFrom, rangeTo);
  const aiCostConsistent = [aiFeatureCostUsd, aiModelCostUsd, aiDailyCostUsd]
    .every(total => Math.abs(total - aiTotalCostUsd) < 0.000001);
  const aiProvidersDiagnostics = buildProviderDiagnostics(aiCostByModel, providerBilling);
  const integrationInventory = buildIntegrationInventory(providerBilling, missingTables);
  const billingIntegratedProviders = providerBilling.filter(provider => provider.billingIntegrated).map(provider => provider.provider);
  const missingProviderConfigs = aiProvidersDiagnostics.filter(provider => !provider.ok).map(provider => provider.id);
  const loggedFeatures = aiCostByFeature.map((row: any) => String(row.feature));
  const hasLoggedFeature = (...features: string[]) => features.some(feature => loggedFeatures.includes(feature));
  const telemetryCoverage = [
    {
      id: "tiagao-chat-streaming",
      label: "Tiagão/chat streaming",
      status: hasLoggedFeature("tiagao-chat", "tiagao-chat-math", "tiagao-chat-landing", "tiagao_voice_chat") ? "instrumented" : "routed_via_openrouter",
      provider: "OpenRouter",
      features: ["tiagao-chat", "tiagao-chat-math", "tiagao-chat-landing", "tiagao_voice_chat"],
      notes: "Streaming estima tokens quando o SDK não devolve usage no stream.",
    },
    {
      id: "openrouter-fallback",
      label: "OpenRouter fallback/non-streaming/streaming",
      status: "instrumented",
      provider: "OpenRouter",
      features: ["chat_completion", "chat_completion_stream", "generate_with_gemini"],
      notes: "Cliente central registra modelo final usado e fallback OpenAI direto com prefixo openai-direct.",
    },
    {
      id: "openai-direct",
      label: "OpenAI direto",
      status: isConfigured("OPENAI_API_KEY", "AI_INTEGRATIONS_OPENAI_API_KEY") ? "instrumented" : "requires_env",
      provider: "OpenAI",
      features: ["tiagao_voice_tts", "tiagao_voice_transcription", "aula_ia_transcription", "notebook_audio_transcription"],
      notes: "STT/TTS registram estimativas locais; custo real exige OPENAI_ADMIN_API_KEY.",
    },
    {
      id: "anthropic-direct",
      label: "Anthropic direto",
      status: "routed_via_openrouter",
      provider: "Anthropic via OpenRouter",
      features: ["claude_helper_text", "claude_helper_chat", "claude_helper_json_fallback"],
      notes: "Não há SDK Anthropic direto ativo; Claude usa slugs anthropic/* via OpenRouter.",
    },
    {
      id: "gemini-direct",
      label: "Gemini direto",
      status: "routed_via_openrouter",
      provider: "Gemini compat via OpenRouter/OpenAI",
      features: ["gemini_compat_vision_problem", "gemini_compat_explain_text", "gemini_compat_image_generation"],
      notes: "Rotas /gemini são compatibilidade; billing real Google exige Cloud Billing Export/API.",
    },
    {
      id: "elevenlabs-tts",
      label: "ElevenLabs TTS",
      status: "unsupported",
      provider: "ElevenLabs",
      features: [],
      notes: "Não foi encontrado runtime TTS ElevenLabs; só há consulta de assinatura/uso quando ELEVENLABS_API_KEY existe.",
    },
    {
      id: "image-generation",
      label: "Geração/edição de imagem",
      status: hasLoggedFeature("openai_image_generation", "openai_wallpaper_generation", "openai_image_edit", "gemini_compat_image_generation") ? "instrumented" : "requires_env",
      provider: "OpenAI gpt-image-1",
      features: ["openai_image_generation", "openai_wallpaper_generation", "openai_image_edit", "gemini_compat_image_generation"],
      notes: "Registra custo estimado por imagem; fatura real permanece no providerBilling/OpenAI Costs.",
    },
    {
      id: "embeddings-rag-notebook",
      label: "Embeddings/RAG/notebook",
      status: hasLoggedFeature("semantic_cache_embedding", "notebook", "notebook_stream") ? "instrumented" : "requires_env",
      provider: "OpenAI/OpenRouter",
      features: ["semantic_cache_embedding", "notebook", "notebook_stream"],
      notes: "Embeddings e chat do notebook são registrados; RAG externo gratuito não gera custo de IA.",
    },
    {
      id: "ocr-transcription",
      label: "OCR/transcrição",
      status: hasLoggedFeature("ocr_explain_vision", "notebook_audio_transcription", "aula_ia_transcription", "tiagao_voice_transcription") ? "instrumented" : "requires_env",
      provider: "OpenRouter/OpenAI",
      features: ["ocr_explain_vision", "notebook_audio_transcription", "aula_ia_transcription", "tiagao_voice_transcription"],
      notes: "OCR vision usa OpenRouter; transcrição direta usa Whisper com tokens aproximados por texto transcrito.",
    },
    {
      id: "hermes-jobs",
      label: "Hermes jobs/QA/sugestões",
      status: hasLoggedFeature("hermes_qa_sintetico") ? "instrumented" : "not_instrumented",
      provider: "OpenRouter",
      features: ["hermes_qa_sintetico"],
      notes: "QA sintético está instrumentado; demais jobs Hermes diretos ainda devem migrar para helper rastreado ou logar feature própria.",
    },
  ];
  const loggedModels = aiCostByModel.map((row: any) => {
    const provider = String(row.provider ?? "");
    const model = String(row.model ?? "");
    return provider && provider !== "Não informado" ? `${provider}/${model}` : model;
  });
  const costBasis: CostBasis = billingIntegratedProviders.length > 0 ? "mixed" : "logged_usage";
  const providerConfigActions: Record<string, string> = {
    openrouter: "Configuração ausente: OpenRouter precisa de AI_INTEGRATIONS_OPENROUTER_API_KEY/OPENROUTER_API_KEY para uso e OPENROUTER_MANAGEMENT_API_KEY para saldo real.",
    openai: "Configuração ausente: OpenAI direto precisa de OPENAI_API_KEY; custo real deve usar OPENAI_ADMIN_API_KEY com permissão de Usage/Costs.",
    anthropic: "Configuração ausente: Anthropic direto precisa de ANTHROPIC_API_KEY para mensagens ou ANTHROPIC_ADMIN_API_KEY para Cost Report; modelos anthropic/* via OpenRouter dependem do OpenRouter.",
    deepseek: "Configuração ausente: DeepSeek direto precisa de DEEPSEEK_API_KEY; neste deploy normalmente é medido via OpenRouter.",
    gemini: "Configuração ausente: Gemini precisa de GEMINI_API_KEY ou GOOGLE_GENERATIVE_AI_API_KEY; fatura real exige Google Cloud Billing Export/API.",
    elevenlabs: "Configuração ausente: ElevenLabs precisa de ELEVENLABS_API_KEY para uso real de caracteres.",
  };
  const missingSources = [
    billingIntegratedProviders.length === 0
      ? "Nenhuma API real de billing/saldo conectada; os totais abaixo continuam vindo somente de ai_cost_log."
      : null,
    ...providerBilling
      .filter(provider => provider.status !== "connected")
      .map(provider => `${provider.provider}: ${provider.action}`),
    !loggedFeatures.includes("semantic_cache_embedding") ? "embeddings/cache semântico sem eventos no período" : null,
    !loggedFeatures.includes("hermes_qa_sintetico") ? "Hermes QA sintético sem eventos no período" : null,
    "transcrição/OCR/TTS/imagem: exigem logger específico quando houver chamadas diretas fora do cliente central",
    ...missingProviderConfigs.map(provider => providerConfigActions[provider] ?? `Configuração ausente para ${provider}.`),
  ].filter((value): value is string => Boolean(value));

  // ── Helper: compute % change ─────────────────────────────────────────────────
  const pct = (cur: number, prev: number) => prev === 0 ? null : Math.round(((cur - prev) / prev) * 100);

  res.json({
    // ── Meta: the applied date range (so UI can show it) ──────────────────────
    dateRange: { ...normalizedRange, prevFrom, prevTo, days: rangeDays },

    // User counts
    totalUsers: (totalUsersRow as any)?.count ?? 0,
    todayNewUsers: (todayNewRow as any)?.count ?? 0,
    premiumUsers: (premiumRow as any)?.count ?? 0,
    teacherCount: (teacherRow as any)?.count ?? 0,
    govCount: (govRow as any)?.count ?? 0,
    institutionsTotal: (institutions as any)?.count ?? 0,
    institutionsActive: (institutions as any)?.active ?? 0,
    todayActive: (todayActiveRow as any)?.count ?? 0,
    studyingNow: Math.max(
      (studyingNowRow as any)?.count ?? 0,
      (activeUsersFromEvents as any)?.count ?? 0,
    ),
    pendingRequests: (pendingRow as any)?.count ?? 0,

    // Range-specific counts with comparison
    newUsersInRange:    (newUsersInRange as any)?.count ?? 0,
    prevNewUsers:       (prevNewUsersRow as any)?.count ?? 0,
    newUsersPct:        pct((newUsersInRange as any)?.count ?? 0, (prevNewUsersRow as any)?.count ?? 0),
    activeInRange:      (activeInRange as any)?.count ?? 0,
    prevActive:         (prevActiveRow as any)?.count ?? 0,
    activePct:          pct((activeInRange as any)?.count ?? 0, (prevActiveRow as any)?.count ?? 0),
    loginsInRange:      (loginsInRange as any)?.count ?? 0,
    prevLogins:         (prevLoginsRow as any)?.count ?? 0,
    loginsPct:          pct((loginsInRange as any)?.count ?? 0, (prevLoginsRow as any)?.count ?? 0),

    // Financeiro
    subscriptionDist: subscriptionDist.map(r => ({ status: (r as any).status, count: (r as any).count })),

    // Charts
    plansPerDay,
    simuladosPerDay,
    newUsersPerDay,
    activityHeatmap,
    loginsByDay,
    loginsByHour,
    recentLogins,
    recentUsers,
    topMaterias,

    // Activity events
    recentEvents,
    eventsByType30d,

    // AI features
    aiFeatures: [
      { feature: "Tiagão (Voz)",  uses: (tiagaoConvRange as any)?.count ?? 0, users: (tiagaoConv as any)?.users ?? 0, last7d: (tiagaoConvRange as any)?.count ?? 0 },
      { feature: "Trilha do Mestre", uses: (trilhaSess as any)?.count ?? 0, users: (trilhaSess as any)?.users ?? 0, last7d: (trilhaSess as any)?.count ?? 0 },
      { feature: "Notebook (RAG)", uses: (notebookOvRange as any)?.count ?? 0, users: 0, last7d: (notebookOvRange as any)?.count ?? 0 },
      { feature: "Mapa Mental",   uses: ((mindmapsPro as any)?.count ?? 0) + ((mindmapsDoc as any)?.count ?? 0), users: ((mindmapsPro as any)?.users ?? 0) + ((mindmapsDoc as any)?.users ?? 0), last7d: 0 },
      { feature: "Redação",       uses: (redacoesRange as any)?.count ?? 0, users: (redacoesAll as any)?.users ?? 0, last7d: (redacoesRange as any)?.count ?? 0 },
      { feature: "Flashcards",    uses: (flashRevRange as any)?.count ?? 0, users: 0, last7d: (flashRevRange as any)?.count ?? 0 },
    ],
    aiProviders: aiProvidersDiagnostics,
    providerBilling,
    integrationInventory,
    dataQuality: {
      costBasis,
      lastEventAt: (aiLastEvent as any)?.last_event_at ?? null,
      missingTables,
      missingSources,
      trackedSources: {
        features: loggedFeatures,
        models: loggedModels,
        providers: aiProvidersDiagnostics.filter(provider => provider.loggedVia.length > 0).map(provider => provider.id),
      },
      telemetryCoverage,
      warning: billingIntegratedProviders.length > 0
        ? "IA & Custos separa gasto real dos provedores do uso registrado internamente. Não some os dois sem reconciliação."
        : "IA & Custos mostra uso/custo registrado no sistema, não gasto real de fatura dos provedores. Configure billing/saldo para reconciliar com invoice.",
    },
    trilhaBySubject: trilhaRows.map((r: any) => ({ subject: r.subject, students: r.cnt, avgLevel: r.avg_level, maxLevel: r.max_level })),
    diagnosticsCompleted30d: 0,
    notebookDocsTotal: (notebookDocs as any)?.count ?? 0,
    notebookStorageMb: Math.round(totalDocsKb / 1024),
    notebookOverviewsTotal: (notebookOverviews as any)?.count ?? 0,
    teacherContentTotal: (teacherContent as any)?.count ?? 0,
    contentBreakdown: [
      { label: "Documentos (PDF/Texto)", value: totalDocsKb, color: "#3b82f6" },
      { label: "Mapas Mentais", value: ((mindmapsPro as any)?.count ?? 0) + ((mindmapsDoc as any)?.count ?? 0), color: "#a855f7" },
      { label: "Questões ENEM", value: topMaterias.reduce((s: number, m: any) => s + (m.count ?? 0), 0), color: "#f59e0b" },
      { label: "Notebook Overviews", value: (notebookOverviews as any)?.count ?? 0, color: "#10b981" },
      { label: "Redações", value: (redacoesAll as any)?.count ?? 0, color: "#ef4444" },
    ],
    aiCost: {
      costBasis,
      label: "Custo registrado no sistema",
      lastEventAt: (aiLastEvent as any)?.last_event_at ?? null,
      dataQuality: {
        missingTables,
        missingSources,
        trackedFeatures: loggedFeatures,
        trackedModels: loggedModels,
        telemetryCoverage,
        warning: "Totais desta seção são calculados somente a partir de ai_cost_log. O gasto real dos provedores está em providerBilling.",
      },
      period: {
        ...normalizedRange,
        boundary: "created_at convertido para America/Sao_Paulo, com from/to inclusivos",
      },
      currency: { source: "USD", display: "BRL", usdToBrl: USD_TO_BRL },
      // Range-based (respects dateRange filter)
      rangeUsd: costRangeUsd,
      rangeBrl: costRangeUsd * USD_TO_BRL,
      prevRangeUsd: costPrevUsd,
      prevRangeBrl: costPrevUsd * USD_TO_BRL,
      costPct: pct(costRangeUsd, costPrevUsd),
      callsRange: (aiCostRange as any)?.calls ?? 0,
      tokensRange: (aiCostRange as any)?.tokens ?? 0,
      // Fixed-period (today / this month) — always shown
      todayUsd: costTodayUsd,
      todayBrl: costTodayUsd * USD_TO_BRL,
      monthUsd: costMonthUsd,
      monthBrl: costMonthUsd * USD_TO_BRL,
      callsToday: (aiCostToday as any)?.calls ?? 0,
      callsTotal: (aiCallsTotal as any)?.calls ?? 0,
      tokensToday: (aiCostToday as any)?.tokens ?? 0,
      tokensTotal: (aiCallsTotal as any)?.tokens ?? 0,
      byFeature: aiCostByFeature.map((r: any) => ({ feature: r.feature, calls: r.calls, costUsd: r.cost_usd, costBrl: r.cost_usd * USD_TO_BRL, tokens: Number(r.tokens) })),
      byModel: aiCostByModel.map((r: any) => ({
        provider: r.provider,
        model: r.model,
        label: r.provider && r.provider !== "Não informado" ? `${r.provider}/${r.model}` : r.model,
        calls: r.calls,
        costUsd: r.cost_usd,
        costBrl: r.cost_usd * USD_TO_BRL,
        tokens: Number(r.tokens),
      })),
      perDay: aiCostPerDay.map((r: any) => ({ day: r.day, costUsd: r.cost_usd, costBrl: r.cost_usd * USD_TO_BRL, calls: r.calls })),
      reconciliation: {
        source: "ai_cost_log",
        totalUsd: aiTotalCostUsd,
        featureUsd: aiFeatureCostUsd,
        modelUsd: aiModelCostUsd,
        dailyUsd: aiDailyCostUsd,
        consistent: aiCostConsistent,
        rule: "rangeUsd, byFeature, byModel e perDay são agregados das mesmas linhas filtradas por period.from/to.",
      },
    },
  });
});

// ─── Medidor de Fontes de Conhecimento — consumo + economia ──────────────────
router.get("/admin/fonte-consumo", async (req: Request, res: Response) => {
  if (!await isAdminUserAsync(req.userId)) {
    res.status(403).json({ erro: "Acesso negado" });
    return;
  }

  const FREE_MODELS = ["wikipedia-api", "bncc-local", "fts-kb", "exatas-kb", "cache-semantic"];
  const FREE_SAVED: Record<string, number> = {
    "wikipedia-api": 0.00018,
    "bncc-local":    0.000075,
    "fts-kb":        0.000225,
    "exatas-kb":     0.000300, // ~500 tokens de fórmulas curadas por chamada
  };
  const USD_TO_BRL = 5.70;

  try {
    const { pool } = await import("@workspace/db");
    const [hasAiCostLogSource, hasAiResponseCacheSource] = await Promise.all([
      tableExists("ai_cost_log"),
      tableExists("ai_response_cache"),
    ]);

    // ── IA Paga: custo e chamadas reais ──────────────────────────────────────
    const iaRes = hasAiCostLogSource ? await pool.query(`
      SELECT
        model,
        COUNT(*)::int                            AS calls,
        COALESCE(SUM(cost_usd::numeric), 0)::float AS cost_usd,
        COALESCE(SUM(tokens_in + tokens_out), 0)::bigint AS tokens
      FROM ai_cost_log
      WHERE model NOT IN (${FREE_MODELS.map((_, i) => `$${i + 1}`).join(",")})
      GROUP BY model
      ORDER BY cost_usd DESC
    `, FREE_MODELS) : { rows: [] };

    const iaTotals = hasAiCostLogSource ? await pool.query(`
      SELECT
        COUNT(*)::int                            AS total_calls,
        COALESCE(SUM(cost_usd::numeric), 0)::float AS total_cost,
        COALESCE(SUM(tokens_in + tokens_out), 0)::bigint AS total_tokens
      FROM ai_cost_log
      WHERE model NOT IN (${FREE_MODELS.map((_, i) => `$${i + 1}`).join(",")})
    `, FREE_MODELS) : { rows: [{ total_calls: 0, total_cost: 0, total_tokens: 0 }] };

    // ── Fontes Gratuitas: chamadas por modelo ────────────────────────────────
    const freeRes = hasAiCostLogSource ? await pool.query(`
      SELECT
        model,
        COUNT(*)::int                            AS calls,
        COALESCE(SUM(tokens_out), 0)::int        AS tokens_out
      FROM ai_cost_log
      WHERE model IN (${FREE_MODELS.map((_, i) => `$${i + 1}`).join(",")})
      GROUP BY model
    `, FREE_MODELS) : { rows: [] };

    // ── Cache Semântico ──────────────────────────────────────────────────────
    const cacheRes = hasAiResponseCacheSource ? await pool.query(`
      SELECT
        feature,
        COUNT(*)::int                             AS entries,
        COALESCE(SUM(uso_count), 0)::int          AS hits
      FROM ai_response_cache
      GROUP BY feature
      ORDER BY hits DESC
    `) : { rows: [] };

    const cacheTotals = hasAiResponseCacheSource ? await pool.query(`
      SELECT
        COUNT(*)::int                             AS total_entries,
        COALESCE(SUM(uso_count), 0)::int          AS total_hits
      FROM ai_response_cache
    `) : { rows: [{ total_entries: 0, total_hits: 0 }] };

    // ── Calcula economias ────────────────────────────────────────────────────
    const ia = iaTotals.rows[0] as any;
    const totalIaCalls  = Number(ia?.total_calls  ?? 0);
    const totalIaCost   = Number(ia?.total_cost   ?? 0);
    const avgCostPerIaCall = totalIaCalls > 0 ? totalIaCost / totalIaCalls : 0;

    const cacheTotal = cacheTotals.rows[0] as any;
    const cacheHits    = Number(cacheTotal?.total_hits    ?? 0);
    const cacheSavedUsd = cacheHits * avgCostPerIaCall;

    // Savings from each free source
    const freeByModel: Record<string, number> = {};
    for (const row of freeRes.rows as any[]) {
      freeByModel[row.model] = Number(row.calls);
    }

    const wikiCalls   = freeByModel["wikipedia-api"] ?? 0;
    const bnccCalls   = freeByModel["bncc-local"]    ?? 0;
    const ftsCalls    = freeByModel["fts-kb"]        ?? 0;
    const exatasCalls = freeByModel["exatas-kb"]     ?? 0;

    const wikiSaved   = wikiCalls   * FREE_SAVED["wikipedia-api"];
    const bnccSaved   = bnccCalls   * FREE_SAVED["bncc-local"];
    const ftsSaved    = ftsCalls    * FREE_SAVED["fts-kb"];
    const exatasSaved = exatasCalls * FREE_SAVED["exatas-kb"];
    const totalSavedUsd = cacheSavedUsd + wikiSaved + bnccSaved + ftsSaved + exatasSaved;

    const taxaEconomia = (totalIaCost + totalSavedUsd) > 0
      ? Math.round((totalSavedUsd / (totalIaCost + totalSavedUsd)) * 100)
      : 0;

    res.json({
      ia: {
        totalCalls:  totalIaCalls,
        totalCostUsd: totalIaCost,
        totalCostBrl: totalIaCost * USD_TO_BRL,
        byModel: (iaRes.rows as any[]).map(r => ({
          model: r.model,
          calls: Number(r.calls),
          costUsd: Number(r.cost_usd),
          costBrl: Number(r.cost_usd) * USD_TO_BRL,
          tokens: Number(r.tokens),
        })),
      },
      cache: {
        totalEntries: Number(cacheTotal?.total_entries ?? 0),
        totalHits:    cacheHits,
        savedUsd:     cacheSavedUsd,
        savedBrl:     cacheSavedUsd * USD_TO_BRL,
        avgCostPerIaCall,
        byFeature: (cacheRes.rows as any[]).map(r => ({
          feature: r.feature,
          entries: Number(r.entries),
          hits:    Number(r.hits),
        })),
      },
      fontes: [
        {
          id: "ia-paga", nome: "IA Paga (OpenAI / Claude)", tipo: "ia",
          calls: totalIaCalls, costUsd: totalIaCost, costBrl: totalIaCost * USD_TO_BRL,
          savedUsd: 0, savedBrl: 0, cor: "#3b82f6", emoji: "🤖",
          descricao: "Chamadas reais aos modelos GPT-4o-mini, Claude, Gemini",
        },
        {
          id: "cache", nome: "Cache Semântico", tipo: "cache",
          calls: cacheHits, costUsd: 0, costBrl: 0,
          savedUsd: cacheSavedUsd, savedBrl: cacheSavedUsd * USD_TO_BRL,
          cor: "#10b981", emoji: "⚡",
          descricao: "Respostas reutilizadas por similaridade vetorial (pgvector)",
        },
        {
          id: "wikipedia", nome: "Wikipedia PT", tipo: "free-api",
          calls: wikiCalls, costUsd: 0, costBrl: 0,
          savedUsd: wikiSaved, savedBrl: wikiSaved * USD_TO_BRL,
          cor: "#06b6d4", emoji: "🌐",
          descricao: "API pública do Wikipedia em português — zero custo",
        },
        {
          id: "bncc", nome: "BNCC Local (MEC)", tipo: "free-local",
          calls: bnccCalls, costUsd: 0, costBrl: 0,
          savedUsd: bnccSaved, savedBrl: bnccSaved * USD_TO_BRL,
          cor: "#8b5cf6", emoji: "📚",
          descricao: "Base Nacional Comum Curricular em memória — sem latência",
        },
        {
          id: "fts-kb", nome: "Base de Conhecimento (FTS)", tipo: "free-local",
          calls: ftsCalls, costUsd: 0, costBrl: 0,
          savedUsd: ftsSaved, savedBrl: ftsSaved * USD_TO_BRL,
          cor: "#f59e0b", emoji: "🗄️",
          descricao: "Busca em texto completo no banco de dados local (PostgreSQL)",
        },
        {
          id: "exatas-kb", nome: "Banco de Fórmulas Exatas", tipo: "free-local",
          calls: exatasCalls, costUsd: 0, costBrl: 0,
          savedUsd: exatasSaved, savedBrl: exatasSaved * USD_TO_BRL,
          cor: "#ef4444", emoji: "📐",
          descricao: "Banco curado de fórmulas ENEM — Matemática, Física e Química (in-memory)",
        },
      ],
      totalSavedUsd,
      totalSavedBrl: totalSavedUsd * USD_TO_BRL,
      totalIaCostUsd: totalIaCost,
      totalIaCostBrl: totalIaCost * USD_TO_BRL,
      taxaEconomia,
      costBasis: "logged_usage",
      dataQuality: {
        missingTables: [
          !hasAiCostLogSource ? "ai_cost_log" : null,
          !hasAiResponseCacheSource ? "ai_response_cache" : null,
        ].filter(Boolean),
        warning: "Medidor usa registros internos e cache local; não consulta faturas dos provedores.",
      },
    });
  } catch (err) {
    console.error("[admin/fonte-consumo]", err);
    res.status(500).json({ erro: "Erro ao calcular fontes de consumo" });
  }
});

// ─── Cache Semântico — estatísticas ──────────────────────────────────────────
router.get("/admin/cache/stats", async (req: Request, res: Response) => {
  if (!await isAdminUserAsync(req.userId)) {
    res.status(403).json({ erro: "Acesso negado" });
    return;
  }
  const stats = await cacheStats();
  res.json(stats);
});

router.delete("/admin/cache/clear", async (req: Request, res: Response) => {
  if (!await isAdminUserAsync(req.userId)) {
    res.status(403).json({ erro: "Acesso negado" });
    return;
  }
  const { feature } = req.body as { feature?: string };
  try {
    const { pool } = await import("@workspace/db");
    if (!await tableExists("ai_response_cache")) {
      res.json({ ok: false, mensagem: "Tabela ai_response_cache ausente; nada para limpar.", missingTable: "ai_response_cache" });
      return;
    }
    if (feature) {
      await pool.query(`DELETE FROM ai_response_cache WHERE feature = $1`, [feature]);
      res.json({ ok: true, mensagem: `Cache '${feature}' limpo.` });
    } else {
      await pool.query(`DELETE FROM ai_response_cache`);
      res.json({ ok: true, mensagem: "Cache completo limpo." });
    }
  } catch (err) {
    res.status(500).json({ erro: (err as Error).message });
  }
});

// ─── Memória Generativa — visualização e estatísticas ────────────────────────
router.get("/admin/memoria-generativa", async (req: Request, res: Response) => {
  if (!await isAdminUserAsync(req.userId)) {
    res.status(403).json({ erro: "Acesso negado" });
    return;
  }
  try {
    const { pool } = await import("@workspace/db");

    // Stats gerais
    const statsRes = await pool.query(`
      SELECT
        COUNT(*) as total_perfis,
        COUNT(CASE WHEN jsonb_array_length(ultimas_sessoes::jsonb) > 0 THEN 1 END) as com_sessoes,
        COUNT(CASE WHEN jsonb_array_length(topicos_frequentes::jsonb) > 0 THEN 1 END) as com_topicos,
        AVG(jsonb_array_length(ultimas_sessoes::jsonb)) as media_sessoes,
        AVG(jsonb_array_length(topicos_frequentes::jsonb)) as media_topicos,
        MAX(atualizado_at) as ultima_atualizacao
      FROM user_profile_memory
    `);
    const stats = statsRes.rows[0];

    // Top tópicos mais estudados na plataforma (cross-user)
    const topTopicsRes = await pool.query(`
      SELECT
        t->>'topico' as topico,
        t->>'materia' as materia,
        SUM((t->>'count')::int) as total_acessos
      FROM user_profile_memory,
        jsonb_array_elements(topicos_frequentes::jsonb) as t
      GROUP BY t->>'topico', t->>'materia'
      ORDER BY total_acessos DESC
      LIMIT 20
    `);

    // Legacy tiagao_memory count
    const legacyRes = await pool.query(`
      SELECT COUNT(*) as total, COUNT(DISTINCT user_id) as usuarios
      FROM tiagao_memory
    `);

    res.json({
      perfisAtivos: Number(stats.total_perfis),
      perfisComSessoes: Number(stats.com_sessoes),
      perfisComTopicos: Number(stats.com_topicos),
      mediasSessoesPorPerfil: parseFloat(stats.media_sessoes ?? "0").toFixed(1),
      mediaTopicosPorPerfil: parseFloat(stats.media_topicos ?? "0").toFixed(1),
      ultimaAtualizacao: stats.ultima_atualizacao,
      topTopicosPlataforma: topTopicsRes.rows,
      memoriasLegacy: {
        total: Number(legacyRes.rows[0]?.total ?? 0),
        usuarios: Number(legacyRes.rows[0]?.usuarios ?? 0),
      },
    });
  } catch (err) {
    console.error("[admin/memoria-generativa]", err);
    res.status(500).json({ erro: (err as Error).message });
  }
});

router.get("/admin/memoria-generativa/:userId", async (req: Request, res: Response) => {
  if (!await isAdminUserAsync(req.userId)) {
    res.status(403).json({ erro: "Acesso negado" });
    return;
  }
  try {
    const { userId } = req.params;
    const { pool } = await import("@workspace/db");

    const profileRes = await pool.query(
      `SELECT * FROM user_profile_memory WHERE user_id = $1`,
      [userId]
    );
    const legacyRes = await pool.query(
      `SELECT memoria, categoria, importancia, atualizado_at FROM tiagao_memory WHERE user_id = $1 ORDER BY importancia DESC LIMIT 30`,
      [userId]
    );

    const contextBlock = await getFullMemoryContext(String(userId), "Usuário");

    res.json({
      perfil: profileRes.rows[0] ?? null,
      memoriasLegacy: legacyRes.rows,
      blocoContexto: contextBlock,
    });
  } catch (err) {
    res.status(500).json({ erro: (err as Error).message });
  }
});

export default router;
