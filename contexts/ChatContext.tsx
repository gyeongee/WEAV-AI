import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Message, AIModel, ChatSession, PromptTemplate } from '../types';
import { MODELS } from '../constants/models';
import { aiService } from '../services/aiService';
import { useFolder } from './FolderContext';
import { toast } from 'sonner';

interface ChatContextType {
  // Current Chat State
  messages: Message[];
  inputValue: string;
  setInputValue: (val: string) => void;
  selectedModel: AIModel;
  setSelectedModel: (model: AIModel) => void;
  isLoading: boolean;
  hasStarted: boolean;
  
  // Session State
  currentSessionId: string | null;
  activeFolderId: string | null; // If null, it's a loose chat
  recentChats: ChatSession[];
  
  // Actions
  sendMessage: (overridePrompt?: string) => Promise<void>;
  stopGeneration: () => void;
  resetChat: () => void;
  loadChatSession: (sessionId: string, folderId?: string) => void;
  deleteChat: (sessionId: string, folderId?: string) => void;
  
  // System Instruction (Persona)
  systemInstruction: string | undefined;
  setSystemInstruction: (instruction: string | undefined) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addChatToFolder, updateFolderChat, folderChats, removeChatFromFolder } = useFolder();
  
  // Persisted Recent Chats
  const [recentChats, setRecentChats] = useState<ChatSession[]>(() => {
      const saved = localStorage.getItem('weav_recent_chats');
      return saved ? JSON.parse(saved) : [];
  });

  // Current Chat UI State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState<AIModel>(MODELS[0]);
  const [systemInstruction, setSystemInstruction] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Persistence for Recent Chats
  useEffect(() => {
      localStorage.setItem('weav_recent_chats', JSON.stringify(recentChats));
  }, [recentChats]);

  // Sync Current Messages to Session Storage (Folder or Recent)
  useEffect(() => {
      if (!currentSessionId || messages.length === 0) return;

      const now = Date.now();
      const sessionUpdate = {
          messages,
          lastModified: now,
          modelId: selectedModel.id,
          systemInstruction
      };

      if (activeFolderId) {
          updateFolderChat(activeFolderId, currentSessionId, sessionUpdate);
      } else {
          setRecentChats(prev => prev.map(c => 
              c.id === currentSessionId ? { ...c, ...sessionUpdate } : c
          ));
      }
  }, [messages, currentSessionId, activeFolderId, selectedModel, systemInstruction]);

  const stopGeneration = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
          setIsLoading(false);
          // Mark last streaming message as done
          setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'model' && last.isStreaming) {
                  return prev.map(m => m.id === last.id ? { ...m, isStreaming: false, content: m.content + " [중단됨]" } : m);
              }
              return prev;
          });
          toast.info("생성이 중단되었습니다.");
      }
  };

  const resetChat = () => {
      stopGeneration();
      setMessages([]);
      setInputValue('');
      setHasStarted(false);
      setIsLoading(false);
      setCurrentSessionId(null);
      setActiveFolderId(null);
      setSelectedModel(MODELS[0]);
      setSystemInstruction(undefined); // Persona sets this again if needed via useEffect in App
  };

  const loadChatSession = (sessionId: string, folderId?: string) => {
      stopGeneration();
      
      let session: ChatSession | undefined;
      
      if (folderId) {
          session = folderChats[folderId]?.find(c => c.id === sessionId);
      } else {
          session = recentChats.find(c => c.id === sessionId);
      }

      if (session) {
          setMessages(session.messages);
          setHasStarted(session.messages.length > 0);
          setSystemInstruction(session.systemInstruction);
          setCurrentSessionId(session.id);
          setActiveFolderId(folderId || null);
          
          const model = MODELS.find(m => m.id === session!.modelId) || MODELS[0];
          setSelectedModel(model);
          setInputValue('');
      } else {
          toast.error("채팅 세션을 찾을 수 없습니다.");
      }
  };

  const deleteChat = (sessionId: string, folderId?: string) => {
      if (currentSessionId === sessionId) {
          resetChat();
      }
      
      if (folderId) {
          removeChatFromFolder(folderId, sessionId);
      } else {
          setRecentChats(prev => prev.filter(c => c.id !== sessionId));
      }
      toast.info("채팅이 삭제되었습니다.");
  };

  const sendMessage = async (overridePrompt?: string) => {
    const promptToSend = overridePrompt || inputValue;
    if (!promptToSend.trim() || isLoading) return;

    // Create New Session if needed
    if (!currentSessionId) {
        const newId = Date.now().toString();
        setCurrentSessionId(newId);
        const title = promptToSend.slice(0, 30) + (promptToSend.length > 30 ? '...' : '');
        
        const newSession: ChatSession = {
            id: newId,
            title,
            messages: [],
            modelId: selectedModel.id,
            systemInstruction,
            lastModified: Date.now(),
            folderId: activeFolderId || undefined
        };

        if (activeFolderId) {
            addChatToFolder(activeFolderId, newSession);
        } else {
            setRecentChats(prev => [newSession, ...prev]);
        }
    }

    setHasStarted(true);
    
    // Add User Message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: promptToSend,
      type: 'text',
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Abort Controller Setup
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const botMessageId = (Date.now() + 1).toString();
    const addBotPlaceholder = (type: 'text'|'image'|'video', content: string) => {
        setMessages(prev => [...prev, {
            id: botMessageId,
            role: 'model',
            content,
            type,
            timestamp: Date.now(),
            isStreaming: true
        }]);
    };

    try {
        if (selectedModel.isVideo) {
            addBotPlaceholder('video', '비디오 생성 중...');
            const videoUrl = await aiService.generateVideo(selectedModel, promptToSend, signal);
            if (signal.aborted) return;
            setMessages(prev => prev.map(m => m.id === botMessageId ? { 
                ...m, mediaUrl: videoUrl || undefined, content: videoUrl ? '비디오가 생성되었습니다.' : '실패했습니다.', isStreaming: false 
            } : m));
        } else if (selectedModel.isImage) {
            addBotPlaceholder('image', '이미지 생성 중...');
            const imageUrl = await aiService.generateImage(selectedModel, promptToSend, signal);
            if (signal.aborted) return;
            setMessages(prev => prev.map(m => m.id === botMessageId ? { 
                ...m, mediaUrl: imageUrl || undefined, content: imageUrl ? '이미지가 생성되었습니다.' : '실패했습니다.', type: 'image', isStreaming: false 
            } : m));
        } else {
            addBotPlaceholder('text', '');
            let fullText = '';
            const stream = aiService.generateTextStream(selectedModel, promptToSend, messages, systemInstruction, signal);
            
            for await (const chunk of stream) {
                if (signal.aborted) break;
                fullText += chunk;
                setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, content: fullText } : m));
            }
            if (!signal.aborted) {
                setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, isStreaming: false } : m));
            }
        }
    } catch (error: any) {
        if (error.name !== 'AbortError') {
            console.error(error);
            setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, content: "오류가 발생했습니다.", isStreaming: false } : m));
            toast.error("메시지 전송 실패");
        }
    } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
    }
  };

  return (
    <ChatContext.Provider value={{
        messages,
        inputValue,
        setInputValue,
        selectedModel,
        setSelectedModel,
        isLoading,
        hasStarted,
        currentSessionId,
        activeFolderId,
        recentChats,
        sendMessage,
        stopGeneration,
        resetChat,
        loadChatSession,
        deleteChat,
        systemInstruction,
        setSystemInstruction
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChatContext must be used within a ChatProvider');
  return context;
};