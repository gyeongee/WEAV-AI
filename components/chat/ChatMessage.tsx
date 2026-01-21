import React, { useState } from 'react';
import { User, Bot, Copy, Check } from 'lucide-react';
import { Message } from '../../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const getLoadingText = (type: string) => {
     switch(type) {
         case 'image': return '이미지 생성 중...';
         case 'video': return '비디오 생성 중...';
         default: return '생성 중...';
     }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in mb-6`}>
      <div className={`flex max-w-[90%] md:max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-4`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${isUser ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-white'}`}>
          {isUser ? <User size={14} className="text-neutral-400" /> : <Bot size={14} className="text-black" />}
        </div>

        {/* Bubble & Footer Container */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full min-w-0`}>
          <div 
            className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed tracking-wide shadow-sm min-w-[60px]
              ${isUser 
                ? 'bg-neutral-800 text-neutral-100 rounded-tr-none border border-neutral-700' 
                : 'bg-white text-black rounded-tl-none border border-neutral-200 shadow-[0_2px_10px_rgba(255,255,255,0.05)]'
              }`}
          >
            {message.type === 'text' && (
              <div className="font-sans break-words markdown-body">
                {isUser ? (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                ) : (
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                            li: ({node, ...props}) => <li className="pl-1" {...props} />,
                            h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-2 mt-4 border-b border-neutral-200/20 pb-1" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-base font-bold mb-2 mt-3" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-sm font-bold mb-1 mt-2" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-bold text-inherit" {...props} />,
                            blockquote: ({node, ...props}) => (
                                <blockquote className="border-l-4 border-neutral-300 pl-3 py-1 my-2 text-neutral-500 italic bg-neutral-50/50 rounded-r" {...props} />
                            ),
                            a: ({node, ...props}) => <a className="text-blue-600 hover:underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
                            code({node, inline, className, children, ...props}: any) {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline && match ? (
                                    <div className="rounded-lg overflow-hidden my-3 border border-neutral-200/20 shadow-sm">
                                        <SyntaxHighlighter
                                            style={vscDarkPlus}
                                            language={match[1]}
                                            PreTag="div"
                                            customStyle={{ margin: 0, borderRadius: 0, fontSize: '12px' }}
                                            {...props}
                                        >
                                            {String(children).replace(/\n$/, '')}
                                        </SyntaxHighlighter>
                                    </div>
                                ) : (
                                    <code className="bg-neutral-200/50 text-neutral-800 rounded px-1.5 py-0.5 text-xs font-mono font-medium" {...props}>
                                        {children}
                                    </code>
                                );
                            },
                            table: ({node, ...props}) => (
                                <div className="overflow-x-auto my-3 border border-neutral-200 rounded-lg">
                                    <table className="min-w-full divide-y divide-neutral-200" {...props} />
                                </div>
                            ),
                            thead: ({node, ...props}) => <thead className="bg-neutral-100" {...props} />,
                            tbody: ({node, ...props}) => <tbody className="divide-y divide-neutral-200 bg-white" {...props} />,
                            tr: ({node, ...props}) => <tr className="" {...props} />,
                            th: ({node, ...props}) => <th className="px-3 py-2 text-left text-xs font-bold text-neutral-600 uppercase tracking-wider" {...props} />,
                            td: ({node, ...props}) => <td className="px-3 py-2 text-xs text-neutral-700 whitespace-nowrap" {...props} />,
                            hr: ({node, ...props}) => <hr className="my-4 border-neutral-200" {...props} />,
                        }}
                    >
                        {message.content}
                    </ReactMarkdown>
                )}
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
            
            {(message.type === 'image' || message.type === 'video') && !message.mediaUrl && (
                <div className="flex items-center space-x-2 text-xs opacity-70">
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>{getLoadingText(message.type)}</span>
                </div>
            )}
          </div>
          
          <div className={`flex items-center gap-2 mt-1 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              <button 
                onClick={handleCopy}
                className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors py-1"
                title="메시지 복사"
              >
                  {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  <span>{copied ? '복사됨' : '복사'}</span>
              </button>
              <span className="text-[10px] text-neutral-600 font-mono">
                {new Date(message.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </span>
          </div>

        </div>
      </div>
    </div>
  );
};