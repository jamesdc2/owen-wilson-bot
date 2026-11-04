import config from '../config';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

const REQUEST_TIMEOUT_MS = 60_000;

export function isOpenRouterConfigured(): boolean {
    return Boolean(config.openRouter.apiKey && config.openRouter.model);
}

export interface Credits {
    purchased: number;
    used: number;
    remaining: number;
}

/** Account balance in USD from OpenRouter's credits endpoint. */
export async function getCredits(): Promise<Credits> {
    const response = await fetch(`${config.openRouter.baseUrl}/credits`, {
        headers: { 'Authorization': `Bearer ${config.openRouter.apiKey}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const body: any = await response.json();

    if (!response.ok) {
        throw new Error(`OpenRouter ${response.status}: ${JSON.stringify(body?.error ?? body)}`);
    }

    const purchased = Number(body?.data?.total_credits);
    const used = Number(body?.data?.total_usage);
    if (!Number.isFinite(purchased) || !Number.isFinite(used)) {
        throw new Error(`OpenRouter returned unexpected credits: ${JSON.stringify(body)}`);
    }

    return { purchased, used, remaining: purchased - used };
}

/** Sends a conversation to OpenRouter's chat completions API and returns the reply text. */
export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
    const response = await fetch(`${config.openRouter.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.openRouter.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://discord.com',
            'X-Title': 'Discord OpenRouter Bot',
        },
        body: JSON.stringify({ model: config.openRouter.model, messages }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const body: any = await response.json();

    if (!response.ok) {
        throw new Error(`OpenRouter ${response.status}: ${JSON.stringify(body?.error ?? body)}`);
    }

    const answer = body?.choices?.[0]?.message?.content;
    if (typeof answer !== 'string' || !answer.trim()) {
        throw new Error(`OpenRouter returned no content: ${JSON.stringify(body)}`);
    }

    return answer;
}
