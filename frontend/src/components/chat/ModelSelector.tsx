import React, { useState, useRef, useEffect, memo, useMemo } from 'react';
import { ChevronDown, Box } from 'lucide-react';
import { AIModel, ModelCategory } from '../../types';
import { MODELS } from '../../constants/models';

interface ModelSelectorProps {
  selectedModel: AIModel;
  onSelect: (model: AIModel) => void;
  disabled?: boolean;
}

// Custom Icons
const BananaLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 13c3.5-2 8-2 10 2a5.5 5.5 0 0 1 8 5" />
    <path d="M5.15 17a9 9 0 1 0 17.77-4.22" />
    <line x1="10" x2="15" y1="11" y2="15" />
  </svg>
);

const VideoLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L14.4 9.6H22L15.8 14.1L18.2 21.7L12 17.2L5.8 21.7L8.2 14.1L2 9.6H9.6L12 2Z" />
    <circle cx="12" cy="12" r="2" className="text-black" />
  </svg>
);



const ModelSelectorComponent: React.FC<ModelSelectorProps> = ({ selectedModel, onSelect, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getModelIcon = (modelKey: string) => {
    switch (modelKey) {
      case 'openai/gpt-4o-mini': return <Box size={16} className="text-emerald-400" />;
      case 'google/gemini-flash-1.5': return <Box size={16} className="text-indigo-400" />;

      case 'fal-ai/flux-2': return <Box size={16} className="text-purple-400" />;
      case 'fal-ai/nano-banana': return <BananaLogo className="w-4 h-4 text-yellow-300" />;

      case 'fal-ai/sora-2/text-to-video': return <VideoLogo className="w-4 h-4 text-white" />;

      default: return <Box size={16} className="text-neutral-400" />;
    }
  };
  

  const groupedModels = MODELS.reduce((acc, model) => {
  if (!acc[model.category]) acc[model.category] = [];
  acc[model.category].push(model);
  return acc;
}, {} as Record<ModelCategory, AIModel[]>);

  // const groupedModels = useMemo(() => {
  //   return MODELS.reduce((acc, model) => {
  //     if (!acc[model.category]) acc[model.category] = [];
  //     acc[model.category].push(model);
  //     return acc;
  //   }, {} as Record<ModelCategory, AIModel[]>);
  // }, []);

  const categories: ModelCategory[] = useMemo(() => ['LLM', 'Image', 'Video'], []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium text-neutral-300 border border-transparent hover:border-neutral-700 focus:outline-none"
      >
        <div className="flex items-center space-x-2">
          {getModelIcon(selectedModel.model)}
          <span>{selectedModel.name}</span>
        </div>
        <ChevronDown size={14} className={`text-neutral-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      <div
        className={`absolute bottom-full left-0 mb-2 w-64 bg-[#0a0a0a] border border-neutral-800 rounded-xl shadow-2xl overflow-hidden transition-all duration-200 origin-bottom-left z-50 ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'}`}
      >
        <div className="max-h-80 overflow-y-auto custom-scrollbar p-2 space-y-3">
          {categories.map((category) => (
            <div key={category}>
              {groupedModels[category]?.length > 0 && (
                <>
                  <div className="px-2 py-1 text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center space-x-1 border-b border-neutral-800/50 mb-1 pb-1">
                    <span>{category} 시리즈</span>
                  </div>
                  <div className="mt-1 space-y-1">
                    {groupedModels[category]?.map((model) => {
                      return (
                        <button
                          key={model.model}
                          onClick={() => {
                            onSelect(model);
                            setIsOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between group 
                            ${selectedModel.model === model.model ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'}
                        `}
                        >
                          <div className="flex items-center space-x-2">
                            <div className="opacity-70 group-hover:opacity-100 transition-opacity">
                            {getModelIcon(model.model)}
                            </div>
                            <span>{model.name}</span>
                            {model.isVideo && (
                              <div className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                                VIDEO
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {selectedModel.model === model.model && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ModelSelector = memo(ModelSelectorComponent);
