import { Skill } from './skill';
import { WebSource, chatWithWebSearch } from '../services/openrouter';
import { systemPrompt } from '../prompt';
import config from '../config';

const DISCORD_MAX_LENGTH = 2000;
const MAX_SOURCES = 3;

const SEARCH_INSTRUCTIONS = `You have web search results for this question.
Answer only from those results. If they don't answer the question, say you couldn't find it; don't fall back on what you remember.
Keep it short. Don't list sources or URLs yourself; they are added below your answer.`;

/** "-# Sources: [en.wikipedia.org](<url>) · …" as small text; <> stops Discord embedding previews. */
function formatSources(sources: WebSource[]): string {
    if (sources.length === 0) return '';
    const links = sources.slice(0, MAX_SOURCES).map(source => {
        let label = source.url;
        try {
            label = new URL(source.url).hostname.replace(/^www\./, '');
        } catch {
            // Not a valid URL: show it as is.
        }
        return `[${label}](<${source.url}>)`;
    });
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

        const { answer, sources } = await chatWithWebSearch([
            { role: 'system', content: `${systemPrompt()}\n\n${SEARCH_INSTRUCTIONS}` },
            ...history,
            { role: 'user', content: query === prompt ? prompt : `${prompt}\n\n(Search for: ${query})` },
        ], config.search);

        const footer = formatSources(sources);
        const room = DISCORD_MAX_LENGTH - footer.length;
        const body = answer.length > room ? answer.slice(0, room - 3) + '...' : answer;

        console.log(`${new Date().toISOString()} [search] "${query}" → ${sources.length} sources`);
        return { type: 'reply', content: body + footer, summary: answer };
    },
};

export default webSearchSkill;
