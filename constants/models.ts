import { AIModel } from '../types';

export const MODELS: AIModel[] = [
  // GPT Series
  { id: 'gpt-5.2-instant', name: 'ChatGPT-5.2 Instant', category: 'GPT', apiModelName: 'gpt-5-mini' },
  
  // Gemini Series
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash Preview', category: 'Gemini', apiModelName: 'gemini-2.5-flash-lite' },

  // Image Series
  { id: 'gpt-image-1.5', name: 'GPT Image 1.5', category: 'Image', apiModelName: 'gpt-image-1.5', isImage: true },
  { id: 'nano-banana', name: 'Nano Banana (Gemini)', category: 'Image', apiModelName: 'gemini-2.5-flash-image', isImage: true },
  
  // Video Series
  { id: 'sora', name: 'SORA', category: 'Video', apiModelName: 'sora-1.0-turbo', isVideo: true },
  { id: 'veo-3.1', name: 'VEO 3.1', category: 'Video', apiModelName: 'veo-3.1-fast-generate-preview', isVideo: true },
];