import { Skill } from './skill';
import { WebSource, chatWithWebSearch } from '../services/openrouter';
import { systemPrompt } from '../prompt';
import config from '../config';

const DISCORD_MAX_LENGTH = 2000;
const MAX_SOURCES = 3;

const MAX_LABEL = 40;

const SEARCH_INSTRUCTIONS = `You have web search results for this question.
Answer only the question that was asked, only from those results. If they don't answer it, say you couldn't find it; don't fall back on what you remember, and don't pad the answer with unrelated facts from the results.
For anything time-related, say when it happened. Never call something recent or current unless the result shows it is.
Keep it short. Don't add links, citations or source names; sources are listed below your answer automatically.`;

/** Introduces the results instead of OpenRouter's default, which asks for inline citations. */
const SEARCH_PROMPT = 'Web search results are below. Use them to answer, following your instructions. Do not cite or link them in your answer.';

/** Inline citations the model adds anyway, like "[apnews.com](https://...)": removed, since sources are listed below. */
const INLINE_CITATION = /\s*\[[\w.-]+\.[a-z]{2,}\]\([^)\s]+\)/gi;

/** "Panama City Beach, Florida - Wikipedia" → "Panama City Beach, Florida"; falls back to the site name. */
function sourceLabel(source: WebSource): string {
    let host = source.url;
    try {
        host = new URL(source.url).hostname.replace(/^www\./, '');
    } catch {
        // Not a valid URL: show it as is.
    }
    const title = source.title && source.title !== source.url
        ? source.title.replace(/\s+[-|–—]\s+[^-|–—]{1,30}$/, '').replace(/[[\]]/g, '').trim()
        : '';
    if (!title) return host;
    return title.length > MAX_LABEL ? title.slice(0, MAX_LABEL - 1) + '…' : title;
}

/** "-# Sources: [Page title](<url>) · …" as small text; <> stops Discord embedding previews. */
function formatSources(sources: WebSource[]): string {
    if (sources.length === 0) return '';
    const links = sources.slice(0, MAX_SOURCES).map(source => `[${sourceLabel(source)}](<${source.url}>)`);
    return `\n-# Sources: ${links.join(' · ')}`;
}

const webSearchSkill: Skill = {
    name: 'web_search',
    description:
        'Look up facts on trusted websites. Use for factual questions about specific named things the bot may not know or could get wrong: ' +
        'who a real person or a fictional character is (actors, voice actors, roles), details of shows, games, movies, books, ' +
        'historical events, places, news and recent events, or what a philosopher or writer actually said. ' +
        'Do NOT use for opinions, debates, philosophical arguments, hypotheticals, advice, jokes or casual chat, ' +
        'even when they mention a famous person or idea.',
    parameters: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'A standalone search query in English. Resolve references to earlier messages ("his brother" → the name).',
            },
        },
        required: ['query'],
    },
    progressMessage: '🔎 Looking it up...',
    run: async (args, { prompt, history }) => {
        const query = typeof args.query === 'string' && args.query.trim() ? args.query.trim() : prompt;

        const { answer: rawAnswer, sources } = await chatWithWebSearch([
            { role: 'system', content: `${systemPrompt()}\n\n${SEARCH_INSTRUCTIONS}` },
            ...history,
            { role: 'user', content: query === prompt ? prompt : `${prompt}\n\n(Search for: ${query})` },
        ], { ...config.search, searchPrompt: SEARCH_PROMPT });

        const answer = rawAnswer.replace(INLINE_CITATION, '');

        const footer = formatSources(sources);
        const room = DISCORD_MAX_LENGTH - footer.length;
        const body = answer.length > room ? answer.slice(0, room - 3) + '...' : answer;

        console.log(`${new Date().toISOString()} [search] "${query}" → ${sources.length} sources`);
        // The model sometimes adds its own links despite the instructions; don't let them preview.
        return { type: 'reply', content: body + footer, summary: answer, suppressEmbeds: true };
    },
};

export default webSearchSkill;
