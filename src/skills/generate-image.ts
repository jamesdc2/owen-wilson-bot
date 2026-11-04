import { Skill } from './skill';
import { generateImage } from '../services/openrouter';
import config from '../config';

const CAPTION_MAX = 300;

const generateImageSkill: Skill = {
    name: 'generate_image',
    description:
        'Create a new picture/image/drawing/meme from a description. ' +
        'Use only when the user asks for an image to be made (draw, generate, make a picture of, imagine...). ' +
        'Do not use for questions about images or for describing things in words.',
    parameters: {
        type: 'object',
        properties: {
            prompt: {
                type: 'string',
                description: 'A detailed English description of the image to create, including details from earlier in the conversation if the user is refining a previous image.',
            },
        },
        required: ['prompt'],
    },
    progressMessage: '🎨 Generating image...',
    isAvailable: () => Boolean(config.openRouter.imageModel),
    run: async (args, { prompt: original }) => {
        const prompt = typeof args.prompt === 'string' && args.prompt.trim() ? args.prompt.trim() : original;
        const image = await generateImage(prompt);
        const caption = prompt.length > CAPTION_MAX ? prompt.slice(0, CAPTION_MAX) + '…' : prompt;

        return {
            type: 'reply',
            content: `🎨 *${caption}*`,
            files: [{ attachment: image, name: 'image.png' }],
            summary: `[Generated an image: ${prompt}]`,
        };
    },
};

export default generateImageSkill;
