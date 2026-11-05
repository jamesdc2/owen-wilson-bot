import { Skill } from './skill';
import { ChatMessage, ToolDefinition, chooseTool } from '../services/openrouter';
import config from '../config';

const CHAT_TOOL = 'chat';
/**
 * The router only needs the gist of recent turns for follow-ups ("now make it blue"),
 * so it gets fewer, shortened messages than the chat model.
 */
const ROUTER_HISTORY = 4;
const ROUTER_TURN_CHARS = 200;

const trimTurn = (m: ChatMessage): ChatMessage =>
    m.content.length > ROUTER_TURN_CHARS ? { ...m, content: m.content.slice(0, ROUTER_TURN_CHARS) + '…' } : m;

const ROUTER_PROMPT = `You route messages sent to a Discord bot. Call exactly one tool.
Call "${CHAT_TOOL}" for conversation, questions, jokes, advice, or anything no other tool clearly covers.
Only call another tool when the user is clearly asking for what it does.
Opinions, debates, philosophy, hypotheticals and "what do you think" questions are "${CHAT_TOOL}", even when they name a famous person or idea.`;

const chatTool: ToolDefinition = {
    type: 'function',
    function: {
        name: CHAT_TOOL,
        description: 'Reply with text: conversation, questions, and anything not covered by another tool.',
        parameters: { type: 'object', properties: {} },
    },
};

export type RouteDecision =
    | { kind: 'chat'; reason: string }
    | { kind: 'skill'; skill: Skill; args: Record<string, unknown> };

/**
 * Uses the small ROUTER_MODEL to decide whether a message is plain chat or a skill request.
 * Without ROUTER_MODEL, or if no skills are available, everything is chat.
 */
export async function routeMessage(prompt: string, history: ChatMessage[], skills: Skill[]): Promise<RouteDecision> {
    const routerModel = config.openRouter.routerModel;
    const available = skills.filter(skill => skill.isAvailable?.() ?? true);

    if (!routerModel) return { kind: 'chat', reason: 'ROUTER_MODEL unset' };
    if (available.length === 0) return { kind: 'chat', reason: 'no skills available' };

    const tools: ToolDefinition[] = [
        chatTool,
        ...available.map(skill => ({
            type: 'function' as const,
            function: { name: skill.name, description: skill.description, parameters: skill.parameters },
        })),
    ];

    const call = await chooseTool(routerModel, [
        { role: 'system', content: ROUTER_PROMPT },
        ...history.slice(-ROUTER_HISTORY).map(trimTurn),
        { role: 'user', content: prompt },
    ], tools);

    if (!call) return { kind: 'chat', reason: 'router returned no tool call' };
    if (call.name === CHAT_TOOL) return { kind: 'chat', reason: 'router chose chat' };

    const skill = available.find(s => s.name === call.name);
    if (!skill) return { kind: 'chat', reason: `router chose unknown tool "${call.name}"` };

    return { kind: 'skill', skill, args: call.args };
}
