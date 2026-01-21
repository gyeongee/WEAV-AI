import { LucideIcon } from 'lucide-react';

export type ModelCategory = 'GPT' | 'Gemini' | 'Image' | 'Video';

export interface AIModel {
  id: string;
  name: string;
  category: ModelCategory;
  apiModelName: string; // The actual internal model name to use
  isVideo?: boolean;
  isImage?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  type: 'text' | 'image' | 'video';
  mediaUrl?: string; // For images or videos
  timestamp: number;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  modelId: string;
  systemInstruction?: string;
  folderId?: string;
  lastModified: number;
}

export interface Folder {
  id: string;
  name: string;
  type: 'custom' | 'shorts-workflow';
  createdAt: number;
}

export interface CardProps {
  title: string;
  description: string;
  imageUrl?: string;
  delay?: number;
}

// Persona Types
export type PersonaType = 'hunter' | 'architect' | 'executive' | 'creator' | 'passive';

export interface Persona {
    id: PersonaType;
    name: string;
    englishName: string;
    description: string;
    quote: string;
    systemInstruction: string;
}

export interface OnboardingQuestion {
    id: number;
    situation: string;
    options: {
        value: 'A' | 'B';
        label: string; // The "AI A" or "AI B" label
        text: string;  // The detailed response text
    }[];
}

export interface PromptTemplate {
    id: string;
    title: string;
    description: string; // Short description or category
    content: string;
    isDefault?: boolean; // If true, cannot be deleted
}