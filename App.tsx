import React, { useState, useRef, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'sonner';

import { AuthProvider } from './contexts/AuthContext';
import { FolderProvider, useFolder } from './contexts/FolderContext';
import { ChatProvider, useChatContext } from './contexts/ChatContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

import { Sidebar } from './components/layout/Sidebar';
import { ChatMessage } from './components/chat/ChatMessage';
import { ChatInput } from './components/chat/ChatInput';
import { WelcomeScreen } from './components/chat/WelcomeScreen';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { SettingsModal } from './components/settings/SettingsModal';

import { Persona, PromptTemplate } from './types';
import { PERSONAS } from './constants/personas';
import { DEFAULT_PROMPTS } from './constants/prompts';

// Main Content Component separated from Context Providers
const MainLayout: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userPersona, setUserPersona] = useState<Persona | null>(null);
  
  const [customPrompts, setCustomPrompts] = useState<PromptTemplate[]>(() => {
      const saved = localStorage.getItem('weav_custom_prompts');
      return saved ? JSON.parse(saved) : [];
  });

  const { 
      messages, inputValue, setInputValue, selectedModel, setSelectedModel, 
      isLoading, hasStarted, sendMessage, stopGeneration, 
      systemInstruction, setSystemInstruction, currentSessionId, activeFolderId, recentChats
  } = useChatContext();

  const { folderChats } = useFolder();

  // Load Prompts persistence
  useEffect(() => {
      localStorage.setItem('weav_custom_prompts', JSON.stringify(customPrompts));
  }, [customPrompts]);

  const handleSavePrompt = (prompt: PromptTemplate) => {
      setCustomPrompts(prev => [...prev, prompt]);
  };

  const handleDeletePrompt = (id: string) => {
      setCustomPrompts(prev => prev.filter(p => p.id !== id));
  };
  
  const allPrompts = [...DEFAULT_PROMPTS, ...customPrompts];

  // Initial Persona Check
  useEffect(() => {
      const storedPersonaId = localStorage.getItem('weav_user_persona');
      if (storedPersonaId && PERSONAS[storedPersonaId as keyof typeof PERSONAS]) {
          setUserPersona(PERSONAS[storedPersonaId as keyof typeof PERSONAS]);
      } else {
          setShowOnboarding(true);
      }
  }, []);

  // Update System Instruction when Persona changes (if chat is empty)
  useEffect(() => {
      if (userPersona && !currentSessionId && !systemInstruction) {
          setSystemInstruction(userPersona.systemInstruction);
      }
  }, [userPersona, currentSessionId, systemInstruction, setSystemInstruction]);

  const handleOnboardingComplete = (persona: Persona) => {
      localStorage.setItem('weav_user_persona', persona.id);
      setUserPersona(persona);
      setShowOnboarding(false);
      // Immediately apply to current empty chat
      if (!currentSessionId) {
          setSystemInstruction(persona.systemInstruction);
      }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Header Title Logic
  const getCurrentChatTitle = () => {
    if (!currentSessionId) return null;
    if (activeFolderId) {
        return folderChats[activeFolderId]?.find(c => c.id === currentSessionId)?.title;
    }
    return recentChats.find(c => c.id === currentSessionId)?.title;
  };
  const currentChatTitle = getCurrentChatTitle();
  const showHeader = hasStarted || !!activeFolderId || !!currentSessionId;

  // Layout calculations
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const mainContentClass = isMenuOpen ? 'md:pl-[280px]' : 'md:pl-[72px]';
  const desktopWidthStyle = {
      left: isMenuOpen ? '280px' : '72px',
      width: `calc(100% - ${isMenuOpen ? '280px' : '72px'})`
  };
  const contentStyle = isMobile ? { left: 0, width: '100%' } : desktopWidthStyle;

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden relative font-sans flex">
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #333 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}
      
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        currentPersona={userPersona}
        onRetakeOnboarding={() => { setShowSettings(false); setShowOnboarding(true); }}
        customPrompts={customPrompts}
        onSavePrompt={handleSavePrompt}
        onDeletePrompt={handleDeletePrompt}
      />

      <Sidebar 
        isOpen={isMenuOpen} 
        onToggle={() => setIsMenuOpen(!isMenuOpen)} 
        onOpenSettings={() => setShowSettings(true)}
      />

      <div className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative pl-0 ${mainContentClass}`}>
        <header className={`fixed top-0 z-30 p-4 md:p-6 flex items-center justify-between transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${showHeader ? 'bg-[#050505]/80 backdrop-blur-md' : ''}`} style={contentStyle}>
            <div className="flex items-center gap-3 overflow-hidden">
                <button onClick={() => setIsMenuOpen(true)} className="md:hidden p-2 -ml-2 text-neutral-400 hover:text-white">
                    <Menu size={24} />
                </button>
                <h1 className={`font-medium tracking-tight text-lg transition-all duration-700 whitespace-nowrap ${showHeader ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                    WEAV AI
                </h1>
                {showHeader && (
                     <div className="flex items-center text-sm text-neutral-500 animate-fade-in overflow-hidden">
                        {currentChatTitle && (
                            <>
                                <span className="mx-2 shrink-0">/</span>
                                <span className="text-neutral-200 font-medium truncate max-w-[120px] sm:max-w-[200px]">{currentChatTitle}</span>
                            </>
                        )}
                     </div>
                )}
            </div>
            <div className="w-8 shrink-0" />
        </header>

        <main className="flex-1 w-full max-w-5xl mx-auto flex flex-col relative z-10 pt-20">
            <div className={`flex-1 overflow-y-auto px-4 pb-64 custom-scrollbar transition-opacity duration-1000 ${hasStarted ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                ))}
                <div ref={messagesEndRef} />
            </div>
            {!hasStarted && <WelcomeScreen />}
        </main>

        <ChatInput 
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSend={() => sendMessage()}
            onStop={isLoading ? stopGeneration : undefined}
            isLoading={isLoading}
            selectedModel={selectedModel}
            onModelSelect={setSelectedModel}
            hasStarted={hasStarted}
            widthStyle={contentStyle}
            prompts={allPrompts}
        />
      </div>
    </div>
  );
};

// Root App Component with Providers
const App: React.FC = () => {
  return (
      <ErrorBoundary>
        <Router>
          <AuthProvider>
            <FolderProvider>
                <ChatProvider>
                    <MainLayout />
                    <Toaster theme="dark" position="top-center" richColors />
                </ChatProvider>
            </FolderProvider>
          </AuthProvider>
        </Router>
      </ErrorBoundary>
  );
};

export default App;