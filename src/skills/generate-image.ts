import { Skill } from './skill';
import { IMAGE_ASPECT_RATIOS, ImageAspectRatio, formatCost, generateImage } from '../services/openrouter';
import config from '../config';

const CAPTION_MAX = 300;

const isAspectRatio = (value: unknown): value is ImageAspectRatio =>
    typeof value === 'string' && (IMAGE_ASPECT_RATIOS as readonly string[]).includes(value);

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
            aspect_ratio: {
                type: 'string',
                enum: [...IMAGE_ASPECT_RATIOS],
                description: 'Only if the user implies a shape: 16:9 or 21:9 for wide/wallpaper/landscape/banner, 9:16 for tall/phone/portrait, 1:1 for square/avatar/pfp. Omit otherwise.',
            },
        },
        required: ['prompt'],
    },
    progressMessage: '🎨 Generating image...',
    isAvailable: () => Boolean(config.openRouter.imageModel),
    run: async (args, { prompt: original }) => {
        const prompt = typeof args.prompt === 'string' && args.prompt.trim() ? args.prompt.trim() : original;
        // Ignore anything the router invents outside the allowed list.
        const aspectRatio = isAspectRatio(args.aspect_ratio) ? args.aspect_ratio : undefined;

        const image = await generateImage(prompt, aspectRatio);

        const cost = image.cost !== undefined ? `, ${formatCost(image.cost)}` : '';
        console.log(`${new Date().toISOString()} [image] ${config.openRouter.imageModel} ${aspectRatio ?? 'default'}${cost}`);

        const caption = prompt.length > CAPTION_MAX ? prompt.slice(0, CAPTION_MAX) + '…' : prompt;
        return {
            type: 'reply',
            content: `🎨 *${caption}*`,
            files: [{ attachment: image.data, name: `image.${image.extension}` }],
            summary: `[Generated an image${aspectRatio ? ` (${aspectRatio})` : ''}: ${prompt}]`,
        };
    },
};

export default generateImageSkill;
