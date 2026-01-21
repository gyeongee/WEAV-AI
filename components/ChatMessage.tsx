import React from 'react';
import { User, Bot } from 'lucide-react';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  const getLoadingText = (type: string) => {
     switch(type) {
         case 'image': return '이미지 생성 중...';
         case 'video': return '비디오 생성 중...';
         default: return '생성 중...';
     }
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in mb-6`}>
      <div className={`flex max-w-[80%] md:max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-4`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${isUser ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-white'}`}>
          {isUser ? <User size={14} className="text-neutral-400" /> : <Bot size={14} className="text-black" />}
        </div>

        {/* Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div 
            className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed tracking-wide shadow-sm
              ${isUser 
                ? 'bg-neutral-800 text-neutral-100 rounded-tr-none border border-neutral-700' 
                : 'bg-white text-black rounded-tl-none border border-neutral-200 shadow-[0_2px_10px_rgba(255,255,255,0.05)]'
              }`}
          >
            {message.type === 'text' && (
              <div className="whitespace-pre-wrap font-sans">
                {message.content}
                {message.isStreaming && <span className="inline-block w-1.5 h-3 ml-1 align-middle bg-neutral-400 animate-pulse" />}
              </div>
            )}
            
            {message.type === 'image' && message.mediaUrl && (
              <div className="rounded-lg overflow-hidden border border-neutral-200 mt-2">
                <img src={message.mediaUrl} alt="Generated" className="max-w-full h-auto" />
              </div>
            )}

            {message.type === 'video' && message.mediaUrl && (
               <div className="rounded-lg overflow-hidden border border-neutral-200 mt-2">
                 <video controls src={message.mediaUrl} className="max-w-full h-auto" />
               </div>
            )}
            
            {/* Loading placeholder for media */}
            {(message.type === 'image' || message.type === 'video') && !message.mediaUrl && (
                <div className="flex items-center space-x-2 text-xs opacity-70">
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>{getLoadingText(message.type)}</span>
                </div>
            )}
          </div>
          
          <span className="text-[10px] text-neutral-600 mt-1 px-1 font-mono">
            {new Date(message.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};