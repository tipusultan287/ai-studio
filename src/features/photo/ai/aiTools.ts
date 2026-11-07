import { ImageMinus, Layers, type LucideIcon, Paintbrush, Scissors, Shirt, Wand2, ZoomIn } from 'lucide-react-native';
import { editImage, removeBackground, removeObject, replaceBackground, upscaleImage } from '@/lib/runware';
import type { RunOptions } from '@/lib/runware';

export type AIToolId = 'bg' | 'remove' | 'edit' | 'person' | 'cutout' | 'upscale' | 'restyle';

export type AITool = { id: AIToolId; label: string; blurb: string; icon: LucideIcon; needsPrompt?: boolean; placeholder?: string; suggestions?: string[] };

export const AI_TOOLS: AITool[] = [
  {
    id: 'bg',
    label: 'Replace background',
    blurb: 'Keep the subject, drop it into a new scene.',
    icon: Layers,
    needsPrompt: true,
    placeholder: 'Describe the new background…',
    suggestions: ['On Mars at golden hour', 'Neon Tokyo street at night', 'Minimal studio white', 'Tropical beach at sunset', 'Snowy alpine cabin', 'Parisian café terrace', 'Lush jungle waterfall', 'Futuristic spaceship interior', 'Soft pastel gradient backdrop', 'New York rooftop at dusk'],
  },
  { id: 'remove', label: 'Remove object', blurb: 'Paint over anything to erase it cleanly.', icon: ImageMinus },
  {
    id: 'edit',
    label: 'Edit anything',
    blurb: 'Describe a change in plain words.',
    icon: Wand2,
    needsPrompt: true,
    placeholder: 'e.g. make it night with a full moon',
    suggestions: ['Make it night with a full moon', 'Add a cat on the sofa', 'Make it snow', 'Turn the sky into a dramatic sunset', 'Add warm fairy lights', 'Remove the people in the background', 'Make it look like autumn', 'Add a rainbow in the sky'],
  },
  {
    id: 'person',
    label: 'Change person / outfit',
    blurb: 'Swap clothes, hair or look — optionally from a reference photo.',
    icon: Shirt,
    needsPrompt: true,
    placeholder: 'e.g. change the jacket to a red leather jacket',
    suggestions: ['Red leather jacket', 'Elegant black tuxedo', 'Summer floral dress', 'Streetwear hoodie and cap', 'Blonde curly hair', 'Add stylish sunglasses', 'Wear the outfit from the reference photo', 'Business suit with tie'],
  },
  { id: 'cutout', label: 'Cut out', blurb: 'Remove the background — transparent PNG.', icon: Scissors },
  { id: 'upscale', label: 'Upscale', blurb: 'Sharper, bigger: 2× or 4×.', icon: ZoomIn },
  { id: 'restyle', label: 'Restyle', blurb: 'Reimagine the photo in a new art style.', icon: Paintbrush },
];

export const RESTYLES: { id: string; label: string; prompt: string }[] = [
  { id: 'anime', label: 'Anime', prompt: 'a vibrant Japanese anime illustration, clean line art, cel shading' },
  { id: 'ghibli', label: 'Storybook', prompt: 'a soft hand-painted storybook illustration with watercolor textures' },
  { id: 'pixar', label: '3D Animated', prompt: 'a 3D animated movie still with soft global illumination and expressive features' },
  { id: 'clay', label: 'Claymation', prompt: 'a claymation stop-motion scene, plasticine textures, handmade look' },
  { id: 'oil', label: 'Oil painting', prompt: 'a classical oil painting with visible brush strokes and rich colors' },
  { id: 'film', label: '35mm Film', prompt: 'a 35mm analog film photograph with natural grain, Kodak Portra colors' },
  { id: 'cyber', label: 'Cyberpunk', prompt: 'a cyberpunk scene with neon lighting, magenta and teal, rain reflections' },
  { id: 'sketch', label: 'Pencil sketch', prompt: 'a detailed graphite pencil sketch on textured paper' },
  { id: 'comic', label: 'Comic', prompt: 'a bold comic book panel with halftone dots and ink outlines' },
  { id: 'lego', label: 'Brick toy', prompt: 'a scene built entirely out of plastic toy bricks' },
];

export const toolById = (id?: string) => AI_TOOLS.find((t) => t.id === id) ?? AI_TOOLS[0];

export type RunInput = { tool: AIToolId; uri: string; prompt: string; maskUri?: string; refUri?: string; factor: 2 | 4; styleId: string };

/** Dispatch to the right Runware op. Returns [resultUrl, promptUsedForLibrary]. */
export async function runAITool(p: RunInput, opts: RunOptions): Promise<[string | undefined, string]> {
  switch (p.tool) {
    case 'bg':
      return [await replaceBackground({ uri: p.uri, scene: p.prompt }, opts), `Background: ${p.prompt}`];
    case 'remove':
      if (!p.maskUri) throw new Error('Paint over the object you want to remove.');
      return [await removeObject({ uri: p.uri, maskUri: p.maskUri }, opts), 'Removed object'];
    case 'edit':
      return [await editImage({ uri: p.uri, instruction: p.prompt }, opts), p.prompt];
    case 'person': {
      const instruction = p.refUri
        ? `${p.prompt}. Use the second image as the reference for the new look. Keep the person's face, identity, pose and the rest of the scene unchanged.`
        : `${p.prompt}. Keep the person's face, identity, pose and the rest of the scene unchanged. Photorealistic.`;
      return [await editImage({ uri: p.uri, instruction, extraReferenceUris: p.refUri ? [p.refUri] : undefined }, opts), p.prompt];
    }
    case 'cutout':
      return [await removeBackground({ uri: p.uri }, opts), 'Cut out'];
    case 'upscale':
      return [await upscaleImage({ uri: p.uri, factor: p.factor }, opts), `Upscaled ${p.factor}×`];
    case 'restyle': {
      const st = RESTYLES.find((r) => r.id === p.styleId) ?? RESTYLES[0];
      const extra = p.prompt.trim() ? ` ${p.prompt.trim()}.` : '';
      return [
        await editImage({ uri: p.uri, instruction: `Redraw this exact image as ${st.prompt}. Keep the same composition, subjects and pose.${extra}` }, opts),
        `Restyle: ${st.label}${extra}`,
      ];
    }
  }
}
