import { DiscordAPIError, RESTJSONErrorCodes } from 'discord.js';
import { EmptyResponseError, OpenRouterError } from '../services/openrouter';

/**
 * Turns a failure into a short, specific reply, so people know whether to retry, rephrase or
 * tell the admin. Full details still go to the logs.
 */
export const ERROR_REPLIES = {
    noCredits: "💸 I'm out of OpenRouter credits. Someone top me up (`/credits` shows the balance).",
    rateLimited: '🐢 Too many requests right now. Try again in a minute.',
    badKey: "🔑 My OpenRouter key isn't working. Tell the admin.",
    blocked: "🙅 The model's content filter blocked that one. Try rephrasing.",
    modelUnavailable: "⚙️ The model I'm set up to use isn't available right now. Tell the admin if it keeps happening.",
    providerDown: "📉 The model's provider is having problems. Try again in a few minutes.",
    timeout: '⏳ That took too long and I gave up. Try again.',
    offline: "📡 I couldn't reach OpenRouter. Try again in a minute.",
    empty: '🤐 The model came back with nothing. Try rephrasing.',
    noPermission: "🔒 I don't have permission to post that here.",
    unknown: '🤢 Something messed up. The details are in my logs.',
} as const;

/** Every error reply, so the reply chain can skip them as conversation history. */
export const ERROR_REPLY_TEXTS = new Set<string>(Object.values(ERROR_REPLIES));

const BLOCKED_WORDS = /moderation|flagged|safety|content[ _-]?(policy|filter)|nsfw|prohibited|violat/i;

export function errorReply(err: unknown): string {
    if (err instanceof OpenRouterError) {
        const detail = JSON.stringify(err.detail ?? '');
        if (BLOCKED_WORDS.test(detail)) return ERROR_REPLIES.blocked;
        switch (err.status) {
            case 401: return ERROR_REPLIES.badKey;
            case 402: return ERROR_REPLIES.noCredits;
            case 403: return ERROR_REPLIES.blocked; // OpenRouter uses 403 for flagged input.
            case 404: return ERROR_REPLIES.modelUnavailable;
            case 408: return ERROR_REPLIES.timeout;
            case 429: return ERROR_REPLIES.rateLimited;
        }
        if (err.status >= 500) return ERROR_REPLIES.providerDown;
        return ERROR_REPLIES.unknown;
    }

    if (err instanceof EmptyResponseError) {
        return err.finishReason === 'content_filter' || err.finishReason === 'safety'
            ? ERROR_REPLIES.blocked
            : ERROR_REPLIES.empty;
    }

    // AbortSignal.timeout() aborts fetch with a TimeoutError.
    if (err instanceof Error && err.name === 'TimeoutError') return ERROR_REPLIES.timeout;
    // Node's fetch reports DNS/connection failures as "TypeError: fetch failed".
    if (err instanceof TypeError && err.message === 'fetch failed') return ERROR_REPLIES.offline;

    if (err instanceof DiscordAPIError && err.code === RESTJSONErrorCodes.MissingPermissions) {
        return ERROR_REPLIES.noPermission;
    }

    return ERROR_REPLIES.unknown;
}
