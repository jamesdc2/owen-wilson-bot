import config from '../config';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

const REQUEST_TIMEOUT_MS = 60_000;

export function isOpenRouterConfigured(): boolean {
    return Boolean(config.openRouter.apiKey && config.openRouter.model);
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
