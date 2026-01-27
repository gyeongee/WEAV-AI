import { AIModel } from '../types';

export const MODELS: AIModel[] = [
  // LLM Series (fal.ai any-llm)
  { model: 'openai/gpt-4o-mini', name: 'GPT 5.2 Instant', category: 'LLM', provider: 'fal' },
  { model: 'google/gemini-flash-1.5', name: 'Gemini 3 Flash', category: 'LLM', provider: 'fal' },

  // Image Series
  { model: 'fal-ai/flux-2', name: 'GPT Image', category: 'Image', provider: 'fal', isImage: true },
  { model: 'fal-ai/nano-banana-pro', name: 'Nano Banana', category: 'Image', provider: 'fal', isImage: true },

  // Video Series
  { model: 'fal-ai/sora-2', name: 'Sora 2', category: 'Video', provider: 'fal', isVideo: true },
];
