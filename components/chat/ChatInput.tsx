import React, { useRef, useEffect, useState } from 'react';
import { ArrowUp, AlertCircle, X, Sparkles, ChevronRight, Square } from 'lucide-react';
import { ModelSelector } from './ModelSelector';
import { AIModel, PromptTemplate } from '../../types';

interface ChatInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  isLoading: boolean;
  selectedModel: AIModel;
  onModelSelect: (model: AIModel) => void;
  widthStyle: React.CSSProperties;
  hasStarted: boolean;
  prompts: PromptTemplate[];
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  inputValue, 
  onInputChange, 
  onSend, 
  onStop,
  isLoading, 
  selectedModel, 
  onModelSelect,
  widthStyle,
  hasStarted,
  prompts
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const promptMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading) {
        setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isLoading]);

  // Handle click outside for prompt menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (promptMenuRef.current && !promptMenuRef.current.contains(event.target as Node)) {
            setShowPrompts(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleModelSelect = (model: AIModel) => {
    if (hasStarted && model.id !== selectedModel.id) {
        setShowWarning(true);
    }
    onModelSelect(model);
  };

  const handlePromptClick = (content: string) => {
      onInputChange(content);
      setShowPrompts(false);
      setTimeout(() => {
          if (inputRef.current) {
              inputRef.current.style.height = 'auto';
              inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
              inputRef.current.focus();
          }
      }, 50);
  };

  return (
    <div 
        className={`fixed z-20 transition-all duration-700 ease-in-out ${hasStarted ? 'bottom-0' : 'bottom-6'}`}
        style={widthStyle}
    >
        {/* Gradient Backdrop for Fade Effect */}
        <div 
            className={`absolute bottom-0 left-0 right-0 z-0 pointer-events-none transition-all duration-500 ease-in-out
            bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent backdrop-blur-[2px]
            ${hasStarted ? 'h-64 opacity-100' : 'h-0 opacity-0'}`}
        />

        {/* Content Wrapper */}
        <div className={`max-w-5xl mx-auto px-4 relative z-10 ${hasStarted ? 'pb-2' : ''}`}>
            
            {/* Warning Popup */}
            <div 
                className={`absolute bottom-full left-4 right-4 mb-4 bg-[#1a1a1a] border border-neutral-800 rounded-xl p-4 shadow-2xl backdrop-blur-md transform transition-all duration-500 origin-bottom z-30 flex items-start gap-3
                ${showWarning ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'}`}
            >
                <div className="shrink-0 text-yellow-500 mt-0.5">
                    <AlertCircle size={20} />
                </div>
                <div className="flex-1 mr-2">
                    <h4 className="text-sm font-semibold text-neutral-200 mb-1">모델 변경 주의</h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                        모델을 변경하면 대화의 <strong>맥락이 어색</strong>해질 수 있으며, 누적된 대화 내역을 전송하는 과정에서 <strong>추가 크레딧(토큰)이 소모</strong>될 수 있습니다.
                    </p>
                </div>
                <button onClick={() => setShowWarning(false)} className="shrink-0 text-neutral-500 hover:text-white transition-colors">
                    <X size={16} />
                </button>
            </div>

            {/* Prompt Menu */}
            <div 
                ref={promptMenuRef}
                className={`absolute bottom-full left-4 mb-2 w-72 max-w-[85vw] bg-[#0a0a0a] border border-neutral-800 rounded-xl shadow-2xl overflow-hidden transition-all duration-200 origin-bottom-left z-30
                ${showPrompts ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'}`}
            >
                <div className="flex flex-col max-h-[400px]">
                    <div className="px-4 py-3 bg-neutral-900/50 border-b border-neutral-800">
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles size={12} className="text-indigo-400" />
                            프롬프트 라이브러리
                        </span>
                    </div>
                    <div className="overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {prompts.length === 0 ? (
                             <div className="p-4 text-center text-xs text-neutral-500">저장된 템플릿이 없습니다.</div>
                        ) : (
                            prompts.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handlePromptClick(item.content)}
                                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-neutral-800 group transition-all flex items-start justify-between border border-transparent hover:border-neutral-700/50"
                                >
                                    <div className="flex-1 min-w-0 mr-2">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            {item.isDefault && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500/50" />}
                                            <span className="text-sm text-neutral-300 group-hover:text-white font-medium truncate">{item.title}</span>
                                        </div>
                                        <span className="text-[10px] text-neutral-500 group-hover:text-neutral-400 line-clamp-1">{item.description}</span>
                                    </div>
                                    <ChevronRight size={14} className="text-neutral-600 group-hover:text-neutral-400 mt-1" />
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className={`relative bg-[#0F0F0F] border transition-all duration-300 ${isLoading ? 'border-neutral-700 shadow-lg' : 'border-neutral-800 hover:border-neutral-700'} rounded-2xl flex flex-col p-2`}>
                <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="WEAV AI에게 메시지 보내기..."
                    className="w-full bg-transparent text-white placeholder-neutral-600 px-3 py-3 focus:outline-none text-base font-normal resize-none overflow-y-auto custom-scrollbar"
                    style={{ minHeight: '48px', maxHeight: '200px' }}
                    rows={1}
                    disabled={isLoading}
                />

                <div className="flex items-center justify-between px-2 pt-2 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <ModelSelector selectedModel={selectedModel} onSelect={handleModelSelect} disabled={isLoading} />
                        <button
                            onClick={() => setShowPrompts(!showPrompts)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200
                                ${showPrompts ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'}
                            `}
                        >
                            <Sparkles size={14} className={showPrompts ? "text-indigo-400" : ""} />
                            <span className="hidden sm:inline">프롬프트 불러오기</span>
                            <span className="sm:hidden">프롬프트</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                         {isLoading && onStop && (
                             <button
                                onClick={onStop}
                                className="p-2 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white transition-colors"
                                title="생성 중단"
                             >
                                 <Square size={16} fill="currentColor" />
                             </button>
                         )}
                        <button 
                            onClick={onSend}
                            disabled={!inputValue.trim() || isLoading}
                            className={`p-2 rounded-lg transition-all duration-200 shrink-0 ${inputValue.trim() && !isLoading ? 'bg-white text-black hover:bg-neutral-200' : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'}`}
                        >
                            {isLoading ? <div className="w-5 h-5 border-2 border-neutral-600 border-t-transparent rounded-full animate-spin" /> : <ArrowUp size={20} />}
                        </button>
                    </div>
                </div>
            </div>
            
            <div className={`text-center mt-3 transition-opacity duration-500 ${hasStarted ? 'opacity-50' : 'opacity-100'}`}>
                <p className="text-[10px] text-neutral-600">
                    WEAV AI는 인물, 장소 또는 사실에 대한 부정확한 정보를 제공할 수 있습니다.
                </p>
            </div>
        </div>
    </div>
  );
};