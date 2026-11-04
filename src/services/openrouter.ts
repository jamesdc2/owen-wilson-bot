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

/** Sends a conversation to the chat model (MODEL) and returns the reply text. */
export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
    const body = await request('/chat/completions', {
        body: { model: config.openRouter.model, messages },
    });

    const answer = body?.choices?.[0]?.message?.content;
    if (typeof answer !== 'string' || !answer.trim()) {
        throw new Error(`OpenRouter returned no content: ${JSON.stringify(body)}`);
    }

    return answer;
}

/**
 * Asks a model to pick exactly one tool. Returns the first tool call, or null if the model
 * answered in text instead (callers should treat that as "no tool").
 */
export async function chooseTool(model: string, messages: ChatMessage[], tools: ToolDefinition[]): Promise<ToolCall | null> {
    const body = await request('/chat/completions', {
        body: { model, messages, tools, tool_choice: 'required', temperature: 0 },
    });

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

/**
 * Generates an image with IMAGE_MODEL. Image-only models (e.g. Flux) want modalities ["image"],
 * mixed models (e.g. Gemini) want ["image", "text"]; try the mixed form first and fall back.
 */
export async function generateImage(prompt: string): Promise<Buffer> {
    const send = (modalities: string[]) => request('/chat/completions', {
        body: {
            model: config.openRouter.imageModel,
            messages: [{ role: 'user', content: prompt }],
            modalities,
        },
        timeoutMs: IMAGE_TIMEOUT_MS,
    });

    let body: any;
    try {
        body = await send(['image', 'text']);
    } catch (err) {
        if (!(err instanceof OpenRouterError) || err.status !== 400) throw err;
        body = await send(['image']);
    }

    const url: unknown = body?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (typeof url !== 'string') {
        // Log the shape (minus any huge base64) so an API format change is easy to diagnose.
        throw new Error(`OpenRouter returned no image: ${JSON.stringify(body).slice(0, 1000)}`);
    }

    if (url.startsWith('data:')) {
        return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    }

    const download = await fetch(url, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) });
    if (!download.ok) throw new Error(`Image download failed: ${download.status}`);
    return Buffer.from(await download.arrayBuffer());
}
