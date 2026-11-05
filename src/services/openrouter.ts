import config from '../config';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/** OpenAI-style function tool definition, as accepted by OpenRouter. */
export interface ToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}

export interface ToolCall {
    name: string;
    args: Record<string, unknown>;
}

const REQUEST_TIMEOUT_MS = 60_000;
const IMAGE_TIMEOUT_MS = 120_000;

export function isOpenRouterConfigured(): boolean {
    return Boolean(config.openRouter.apiKey && config.openRouter.model);
}

async function request(path: string, init: { method?: string; body?: unknown; timeoutMs?: number } = {}): Promise<any> {
    const response = await fetch(`${config.openRouter.baseUrl}${path}`, {
        method: init.method ?? (init.body ? 'POST' : 'GET'),
        headers: {
            'Authorization': `Bearer ${config.openRouter.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://discord.com',
            'X-Title': 'Discord OpenRouter Bot',
        },
        body: init.body ? JSON.stringify(init.body) : undefined,
        signal: AbortSignal.timeout(init.timeoutMs ?? REQUEST_TIMEOUT_MS),
    });

    const body: any = await response.json();

    if (!response.ok) {
        throw new OpenRouterError(response.status, body?.error ?? body);
    }
    return body;
}

export class OpenRouterError extends Error {
    constructor(public readonly status: number, public readonly detail: unknown) {
        super(`OpenRouter ${status}: ${JSON.stringify(detail)}`);
    }
}

export interface Credits {
    purchased: number;
    used: number;
    remaining: number;
}

/** Account balance in USD from OpenRouter's credits endpoint. */
export async function getCredits(): Promise<Credits> {
    const body = await request('/credits');

    const purchased = Number(body?.data?.total_credits);
    const used = Number(body?.data?.total_usage);
    if (!Number.isFinite(purchased) || !Number.isFinite(used)) {
        throw new Error(`OpenRouter returned unexpected credits: ${JSON.stringify(body)}`);
    }

    return { purchased, used, remaining: purchased - used };
}

/**
 * Logs token counts and USD cost from a response's `usage` block, e.g.
 * "[chat] google/gemini-2.5-flash 1240 in / 310 out, $0.0004".
 */
/** "$0.0004", "$0.000021": enough digits that tiny router costs don't round to zero. */
export function formatCost(cost: number): string {
    return cost >= 0.01 || cost === 0 ? `$${cost.toFixed(4)}` : `$${Number(cost.toPrecision(2))}`;
}

function logUsage(tag: string, model: string | undefined, body: any): void {
    const usage = body?.usage;
    if (!usage) return;
    const cost = Number(usage.cost);
    const costText = Number.isFinite(cost) ? `, ${formatCost(cost)}` : '';
    console.log(`${new Date().toISOString()} [${tag}] ${model} ${usage.prompt_tokens ?? '?'} in / ${usage.completion_tokens ?? '?'} out${costText}`);
}

/** Sends a conversation to the chat model (MODEL) and returns the reply text. */
export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
    const body = await request('/chat/completions', {
        // usage.include asks OpenRouter to report cost alongside token counts.
        body: { model: config.openRouter.model, messages, usage: { include: true } },
    });
    logUsage('chat', config.openRouter.model, body);

    const answer = body?.choices?.[0]?.message?.content;
    if (typeof answer !== 'string' || !answer.trim()) {
        throw new Error(`OpenRouter returned no content: ${JSON.stringify(body)}`);
    }

    return answer;
}

export interface WebSearchOptions {
    /** Only search these sites (wildcards like `*.fandom.com` allowed). Empty searches the whole web. */
    domains: string[];
    /** OpenRouter search engine; `exa` and `parallel` support domain filtering (Google native doesn't). */
    engine: string;
    maxResults: number;
}

export interface WebSource {
    url: string;
    title: string;
}

export interface WebSearchAnswer {
    answer: string;
    /** Pages the answer cites, deduplicated, in citation order. */
    sources: WebSource[];
}

/** Chat model reply grounded in a web search, via OpenRouter's `web` plugin. */
export async function chatWithWebSearch(messages: ChatMessage[], options: WebSearchOptions): Promise<WebSearchAnswer> {
    const plugin: Record<string, unknown> = { id: 'web', engine: options.engine, max_results: options.maxResults };
    if (options.domains.length > 0) plugin.include_domains = options.domains;

    const body = await request('/chat/completions', {
        body: { model: config.openRouter.model, messages, plugins: [plugin], usage: { include: true } },
    });
    logUsage('search', `${config.openRouter.model} + ${options.engine}`, body);

    const message = body?.choices?.[0]?.message;
    const answer = message?.content;
    if (typeof answer !== 'string' || !answer.trim()) {
        throw new Error(`OpenRouter returned no content: ${JSON.stringify(body)}`);
    }

    const sources: WebSource[] = [];
    for (const annotation of message.annotations ?? []) {
        const citation = annotation?.type === 'url_citation' ? annotation.url_citation : null;
        if (typeof citation?.url !== 'string' || sources.some(s => s.url === citation.url)) continue;
        sources.push({ url: citation.url, title: typeof citation.title === 'string' ? citation.title : citation.url });
    }

    return { answer, sources };
}

/**
 * Asks a model to pick exactly one tool. Returns the first tool call, or null if the model
 * answered in text instead (callers should treat that as "no tool").
 */
export async function chooseTool(model: string, messages: ChatMessage[], tools: ToolDefinition[]): Promise<ToolCall | null> {
    const body = await request('/chat/completions', {
        body: { model, messages, tools, tool_choice: 'required', temperature: 0, usage: { include: true } },
    });
    logUsage('router', model, body);

    const call = body?.choices?.[0]?.message?.tool_calls?.[0]?.function;
    if (!call?.name) return null;

    let args: Record<string, unknown> = {};
    try {
        args = call.arguments ? JSON.parse(call.arguments) : {};
    } catch {
        // Malformed arguments: keep the tool choice, let the skill handle missing args.
    }
    return { name: call.name, args };
}

/** Aspect ratios offered to the router; the images API accepts more, but a short list routes more reliably. */
export const IMAGE_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9'] as const;
export type ImageAspectRatio = typeof IMAGE_ASPECT_RATIOS[number];

export interface GeneratedImage {
    data: Buffer;
    /** File extension matching the returned media type, e.g. "png". */
    extension: string;
    /** USD charged, if OpenRouter reported it. */
    cost?: number;
}

/**
 * Generates an image with IMAGE_MODEL via OpenRouter's images API.
 * 1K PNGs stay well under Discord's upload limit; larger resolutions may not.
 */
export async function generateImage(prompt: string, aspectRatio?: ImageAspectRatio): Promise<GeneratedImage> {
    const body = await request('/images', {
        body: {
            model: config.openRouter.imageModel,
            prompt,
            n: 1,
            resolution: '1K',
            output_format: 'png',
            ...(aspectRatio ? { aspect_ratio: aspectRatio } : {}),
        },
        timeoutMs: IMAGE_TIMEOUT_MS,
    });

    const image = body?.data?.[0];
    if (typeof image?.b64_json !== 'string') {
        // Trimmed so a format change is easy to diagnose without dumping huge base64 into logs.
        throw new Error(`OpenRouter returned no image: ${JSON.stringify(body).slice(0, 1000)}`);
    }

    const mediaType = typeof image.media_type === 'string' ? image.media_type : 'image/png';
    const extension = mediaType === 'image/jpeg' ? 'jpg' : mediaType.split('/')[1] ?? 'png';
    const cost = Number(body?.usage?.cost);

    return {
        data: Buffer.from(image.b64_json, 'base64'),
        extension,
        cost: Number.isFinite(cost) ? cost : undefined,
    };
}
