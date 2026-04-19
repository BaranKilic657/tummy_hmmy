import "server-only";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type CogneeConfig = {
  baseUrl: string;
  apiKey: string;
  tenantId?: string;
  datasetName?: string;
  timeoutMs: number;
  topK: number;
  searchType: string;
  endpointCandidates: string[];
};

type CogneeSearchPayload = {
  query: string;
  search_type: string;
  top_k: number;
  datasets?: string[];
};

type CogneeRequestVariant = {
  timeoutMs: number;
  payload: CogneeSearchPayload;
  label: string;
};

export type CogneeRetrievalResult = {
  enabled: boolean;
  used: boolean;
  context: string;
  query: string;
  endpoint?: string;
  warning?: string;
  debug: {
    attempts: CogneeDebugAttempt[];
  };
};

export type CogneeDebugAttempt = {
  endpoint: string;
  url: string;
  requestBody: Record<string, unknown>;
  ok: boolean;
  status?: number;
  warning?: string;
  responsePreview?: unknown;
};

const DEFAULT_ENDPOINT_CANDIDATES = [
  "/api/v1/search",
  "/api/v1/recall",
  "/api/v1/search/",
  "/api/v1/recall/",
];

export async function retrieveCogneeContext(params: {
  latestUserPrompt: string;
  messages: ChatMessage[];
}): Promise<CogneeRetrievalResult> {
  const attempts: CogneeDebugAttempt[] = [];
  const query = params.latestUserPrompt.trim();
  if (!query) {
    return {
      enabled: false,
      used: false,
      context: "",
      query: "",
      warning: "No user message to query Cognee with.",
      debug: { attempts },
    };
  }

  const config = getCogneeConfig();
  if (!config) {
    return {
      enabled: false,
      used: false,
      context: "",
      query,
      warning: "Cognee is not configured. Set COGWIT_API_BASE and COGWIT_API_KEY.",
      debug: { attempts },
    };
  }

  const history = params.messages
    .slice(-8)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");

  for (const endpoint of config.endpointCandidates) {
    const result = await callCogneeEndpoint(config, endpoint, query, history);
    attempts.push(result.attempt);
    if (result.ok) {
      return {
        enabled: true,
        used: true,
        context: result.context,
        query,
        endpoint,
        debug: { attempts },
      };
    }

    if (!result.retriable) {
      return {
        enabled: true,
        used: false,
        context: "",
        query,
        endpoint,
        warning: result.warning,
        debug: { attempts },
      };
    }
  }

  return {
    enabled: true,
    used: false,
    context: "",
    query,
    warning: "Cognee request failed on all configured endpoints.",
    debug: { attempts },
  };
}

function getCogneeConfig(): CogneeConfig | null {
  const baseUrl = process.env.COGWIT_API_BASE?.trim();
  const apiKey = process.env.COGWIT_API_KEY?.trim();
  const tenantId = process.env.COGWIT_TENANT_ID?.trim();
  const datasetName = process.env.COGWIT_DATASET_NAME?.trim();

  if (!baseUrl || !apiKey) {
    return null;
  }

  const endpointCandidates = process.env.COGWIT_SEARCH_PATH?.trim()
    ? [process.env.COGWIT_SEARCH_PATH.trim()]
    : DEFAULT_ENDPOINT_CANDIDATES;

  const timeoutMsRaw = Number.parseInt(process.env.COGWIT_TIMEOUT_MS?.trim() || "4500", 10);
  const topKRaw = Number.parseInt(process.env.COGWIT_TOP_K?.trim() || "6", 10);
  const searchType = process.env.COGWIT_SEARCH_TYPE?.trim() || "GRAPH_COMPLETION";

  return {
    baseUrl,
    apiKey,
    tenantId,
    datasetName,
    timeoutMs: Number.isFinite(timeoutMsRaw) && timeoutMsRaw > 0 ? timeoutMsRaw : 4500,
    topK: Number.isFinite(topKRaw) && topKRaw > 0 ? topKRaw : 6,
    searchType,
    endpointCandidates,
  };
}

async function callCogneeEndpoint(
  config: CogneeConfig,
  endpoint: string,
  query: string,
  history: string,
): Promise<
  | { ok: true; context: string; attempt: CogneeDebugAttempt }
  | { ok: false; status?: number; warning: string; retriable: boolean; attempt: CogneeDebugAttempt }
> {
  const url = joinUrl(config.baseUrl, endpoint);
  const baseRequestBody: CogneeSearchPayload = {
    query,
    search_type: config.searchType,
    top_k: config.topK,
    datasets: config.datasetName ? [config.datasetName] : undefined,
  };

  const variants: CogneeRequestVariant[] = [
    {
      timeoutMs: config.timeoutMs,
      payload: baseRequestBody,
      label: "default",
    },
    {
      timeoutMs: Math.max(config.timeoutMs * 2, 12000),
      payload: {
        ...baseRequestBody,
        top_k: Math.max(2, Math.min(baseRequestBody.top_k, 4)),
      },
      label: "timeout-retry-light",
    },
  ];

  for (const variant of variants) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": config.apiKey,
        },
        body: JSON.stringify(variant.payload),
        signal: AbortSignal.timeout(variant.timeoutMs),
      });

      if (!response.ok) {
        const detail = await safeReadError(response);
        const warning = `Cognee HTTP ${response.status}${detail ? `: ${detail}` : ""}`;
        const retriable = isRetriableEndpointFailure(response.status, detail);

        if (retriable && variant.label !== variants[variants.length - 1].label) {
          continue;
        }

        return {
          ok: false,
          status: response.status,
          warning,
          retriable,
          attempt: {
            endpoint,
            url,
            requestBody: variant.payload,
            ok: false,
            status: response.status,
            warning,
            responsePreview: detail,
          },
        };
      }

      const payload = await safeJson(response);
      const context = extractCogneeContext(payload, query);
      if (!context) {
        return {
          ok: false,
          warning: "Cognee returned no usable context.",
          retriable: false,
          attempt: {
            endpoint,
            url,
            requestBody: variant.payload,
            ok: false,
            warning: "Cognee returned no usable context.",
            responsePreview: sanitizePreview(payload),
          },
        };
      }

      return {
        ok: true,
        context,
        attempt: {
          endpoint,
          url,
          requestBody: variant.payload,
          ok: true,
          responsePreview: sanitizePreview(payload),
        },
      };
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Cognee error";
      const isTimeout = isTimeoutError(error);

      if (isTimeout && variant.label !== variants[variants.length - 1].label) {
        continue;
      }

      return {
        ok: false,
        warning: `Cognee request failed: ${message}`,
        retriable: true,
        attempt: {
          endpoint,
          url,
          requestBody: variant.payload,
          ok: false,
          warning: `Cognee request failed: ${message}`,
        },
      };
    }
  }

  return {
    ok: false,
    warning: "Cognee request failed: exhausted retry variants",
    retriable: true,
    attempt: {
      endpoint,
      url,
      requestBody: baseRequestBody,
      ok: false,
      warning: "Cognee request failed: exhausted retry variants",
    },
  };
}

function extractCogneeContext(payload: unknown, query: string): string {
  if (typeof payload === "string") {
    return payload.trim();
  }

  if (Array.isArray(payload)) {
    const snippets = payload
      .flatMap((item) => extractSearchArrayTexts(item, query))
      .filter((text) => text.trim().length > 0)
      .slice(0, 6);

    if (snippets.length === 0) {
      return "";
    }

    return ["Supporting memory snippets:", ...snippets.map((text, index) => `${index + 1}. ${text}`)].join("\n");
  }

  if (!payload || typeof payload !== "object") {
    return "";
  }

  const record = payload as Record<string, unknown>;
  const directAnswer =
    getString(record.answer) ||
    getString(record.response) ||
    getString(record.result) ||
    getString(record.search_result) ||
    getString(record.summary) ||
    getString(record.message);

  const documents = collectDocumentText(record, query);
  const chunks: string[] = [];

  if (directAnswer) {
    chunks.push(`Summary: ${directAnswer}`);
  }

  if (documents.length > 0) {
    chunks.push("Supporting memory snippets:");
    chunks.push(...documents.slice(0, 6).map((doc, index) => `${index + 1}. ${doc}`));
  }

  return chunks.join("\n").trim();
}

function collectDocumentText(record: Record<string, unknown>, query: string): string[] {
  const candidateArrays: unknown[] = [];

  for (const key of ["documents", "results", "items", "matches", "data", "context", "search_result"]) {
    const value = record[key];
    if (Array.isArray(value)) {
      candidateArrays.push(value);
    }
  }

  const nestedData = record.data;
  if (nestedData && typeof nestedData === "object" && !Array.isArray(nestedData)) {
    const nestedRecord = nestedData as Record<string, unknown>;
    for (const key of ["documents", "results", "items", "matches", "context"]) {
      const value = nestedRecord[key];
      if (Array.isArray(value)) {
        candidateArrays.push(value);
      }
    }
  }

  return candidateArrays
    .flatMap((arr) => arr)
    .map((entry) => {
      if (typeof entry === "string") {
        return entry.trim();
      }
      if (!entry || typeof entry !== "object") {
        return "";
      }
      const row = entry as Record<string, unknown>;
      return (
        getSearchResultText(row.search_result, query) ||
        takeRelevantSentences(getString(row.text) || "", query) ||
        takeRelevantSentences(getString(row.content) || "", query) ||
        takeRelevantSentences(getString(row.snippet) || "", query) ||
        takeRelevantSentences(getString(row.summary) || "", query) ||
        ""
      ).trim();
    })
    .filter((text) => text.length > 0)
    .slice(0, 10);
}

function getSearchResultText(value: unknown, query: string): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  const record = value as Record<string, unknown>;
  return (
    takeRelevantSentences(getString(record.text) || "", query) ||
    takeRelevantSentences(getString(record.content) || "", query) ||
    takeRelevantSentences(getString(record.summary) || "", query) ||
    takeRelevantSentences(getString(record.snippet) || "", query) ||
    takeRelevantSentences(safeStringify(record), query)
  );
}

function extractSearchArrayTexts(item: unknown, query: string): string[] {
  if (!item || typeof item !== "object") {
    return [];
  }

  const record = item as Record<string, unknown>;
  const textResults = Array.isArray(record.text_result) ? record.text_result : [];
  const searchResults = Array.isArray(record.search_result) ? record.search_result : [];

  const normalizedSearchResults = searchResults
    .map((entry) => {
      if (typeof entry === "string") {
        return takeRelevantSentences(entry, query) || entry.trim();
      }
      if (entry && typeof entry === "object") {
        return getSearchResultText(entry, query);
      }
      return "";
    })
    .filter((text) => text.length > 0);

  const normalizedTextResults = textResults
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return "";
      }

      const row = entry as Record<string, unknown>;
      return (
        takeRelevantSentences(getString(row.text) || "", query) ||
        takeRelevantSentences(getString(row.content) || "", query) ||
        takeRelevantSentences(getString(row.snippet) || "", query) ||
        takeRelevantSentences(getString(row.summary) || "", query) ||
        ""
      ).trim();
    })
    .filter((text) => text.length > 0);

  return [...normalizedSearchResults, ...normalizedTextResults];
}

function takeRelevantSentences(text: string, query: string): string {
  const cleaned = text.trim();
  if (!cleaned) {
    return "";
  }

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (sentences.length === 0) {
    return "";
  }

  const queryTerms = new Set(
    query
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((term) => term.trim())
      .filter((term) => term.length >= 4),
  );

  if (queryTerms.size === 0) {
    return sentences.slice(0, 2).join(" ");
  }

  const ranked = sentences
    .map((sentence) => ({
      sentence,
      score: overlapScore(sentence, queryTerms),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.sentence);

  return ranked.length > 0 ? ranked.join(" ") : sentences.slice(0, 2).join(" ");
}

function overlapScore(sentence: string, queryTerms: Set<string>): number {
  const lowered = sentence.toLowerCase();
  let score = 0;

  for (const term of queryTerms) {
    if (lowered.includes(term)) {
      score += 1;
    }
  }

  return score;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

function isRetriableEndpointFailure(status?: number, detail?: string): boolean {
  if (!status) {
    return true;
  }

  if (status === 405) {
    return true;
  }

  if (status === 404) {
    const lowered = (detail || "").toLowerCase();
    if (lowered.includes("no data") || lowered.includes("nodataerror")) {
      return false;
    }
    return lowered.includes("not found") || lowered.includes("<html");
  }

  return false;
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function safeReadError(response: Response): Promise<string> {
  try {
    const text = (await response.text()).trim();
    if (!text) {
      return "";
    }

    if (text.length <= 300) {
      return text;
    }

    return `${text.slice(0, 297)}...`;
  } catch {
    return "";
  }
}

function sanitizePreview(value: unknown): unknown {
  const text = safeStringify(value);
  if (text.length <= 1600) {
    return value;
  }

  return `${text.slice(0, 1600)}...`;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value ?? "");
  }
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const msg = error.message.toLowerCase();
  return msg.includes("timeout") || msg.includes("aborted");
}
