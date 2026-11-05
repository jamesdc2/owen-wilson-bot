import generateImage from './generate-image';
import webSearch from './web-search';
import { Skill } from './skill';

export { Skill, SkillContext, SkillResult } from './skill';
export { routeMessage, RouteDecision } from './router';

/** Every skill the router can choose from. Add new skills here. */
export const skills: Skill[] = [
    generateImage,
    webSearch,
];
