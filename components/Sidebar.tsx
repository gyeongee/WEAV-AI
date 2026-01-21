import React from 'react';
import { Menu, MessageSquare, Settings, HelpCircle, SquarePen } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const RECENT_CHATS = [
    "미래 도시 컨셉 디자인",
    "파이썬 스크립트 분석",
    "클라이언트 이메일 초안",
    "로고 디자인 아이디어",
    "React 컴포넌트 리팩토링"
  ];

  const NavItem = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick?: () => void }) => (
    <button 
      onClick={onClick}
      className="group flex items-center w-full p-3 rounded-xl text-neutral-400 hover:text-white hover:bg-[#2a2a2a] transition-colors duration-200"
      title={!isOpen ? label : undefined}
    >
      {/* Icon Container - Strictly fixed size to prevent movement */}
      <div className="flex items-center justify-center w-6 h-6 shrink-0">
        <Icon size={20} strokeWidth={1.5} />
      </div>
      
      {/* Text Container - Smoother reveal animation */}
      <div 
        className={`flex items-center whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${isOpen ? 'max-w-[180px] opacity-100 translate-x-0 pl-3' : 'max-w-0 opacity-0 -translate-x-2 pl-0'}
        `}
      >
        <span className="text-sm font-medium">{label}</span>
      </div>
    </button>
  );

  return (
    <div 
      className={`fixed top-0 left-0 h-full bg-[#1e1e1e] border-r border-neutral-800 z-50 transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col
        ${isOpen ? 'w-[280px]' : 'w-[72px]'}
      `}
    >
      {/* Top Section */}
      <div className="flex flex-col w-full px-3 pt-4 gap-2">
        
        {/* Menu Toggle Button - Aligned exactly with NavItems */}
        <button 
            onClick={onToggle}
            className="group flex items-center w-full p-3 rounded-xl text-neutral-400 hover:text-white hover:bg-[#2a2a2a] transition-colors duration-200 mb-2"
        >
            <div className="flex items-center justify-center w-6 h-6 shrink-0">
                <Menu size={24} strokeWidth={1.5} />
            </div>
        </button>

        {/* New Chat */}
        <NavItem icon={SquarePen} label="새 채팅" />
      </div>

      {/* History Section */}
      <div className={`flex-1 overflow-hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className={`px-3 h-full overflow-y-auto custom-scrollbar transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-4'}`}>
                {/* Content wrapper with fixed minimum width to prevent reflow during transition */}
                <div className="mt-4 mb-6 min-w-[200px]">
                    <h3 className="px-3 text-[11px] font-bold text-neutral-500 mb-2 uppercase tracking-wider whitespace-nowrap">
                        최근 활동
                    </h3>
                    <div className="space-y-1">
                        {RECENT_CHATS.map((chat, idx) => (
                            <button 
                                key={idx}
                                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-neutral-800/50 text-left group transition-colors"
                            >
                                <MessageSquare size={16} className="text-neutral-500 group-hover:text-white transition-colors flex-shrink-0" />
                                <span className="text-sm text-neutral-400 group-hover:text-white truncate">
                                    {chat}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
          </div>
      </div>

      {/* Bottom Section */}
      <div className="p-3 pb-6 mt-auto flex flex-col gap-1">
         <NavItem icon={HelpCircle} label="도움말" />
         <NavItem icon={Settings} label="설정 및 활동" />
         
         {/* Location Indicator */}
         <div className={`
             mt-4 px-2 flex items-center space-x-2 text-[10px] text-neutral-600 font-medium pt-2 border-t border-neutral-800 overflow-hidden transition-all duration-300
             ${isOpen ? 'opacity-100 max-h-10 border-t-neutral-800 delay-100' : 'opacity-0 max-h-0 border-t-transparent delay-0'}
         `}>
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-500 flex-shrink-0" />
            <span className="whitespace-nowrap">대한민국 서울</span>
         </div>
      </div>
    </div>
  );
};