import { everyonePing } from './everyone-ping';

// 👍 and 🚨 grant temporary roles; see REACTION_ROLES in events/reaction-handler.ts.
export default everyonePing(
    'rollcall',
    "Ask who's gaming tonight. React 👍 for Gamer or 🚨 for Bad Boi (8 hours).",
    "@everyone who's gaming tonight?",
    'https://media.giphy.com/media/l2JJvaMbxKrKtOWVa/giphy.gif',
    ['👍', '👎', '🚨'],
);
