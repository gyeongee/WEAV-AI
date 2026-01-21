import React, { createContext, useContext, useEffect, useState } from 'react';
import { Folder, ChatSession } from '../types';
import { aiService } from '../services/aiService';
import { toast } from 'sonner';

interface FolderContextType {
  folders: Folder[];
  folderChats: Record<string, ChatSession[]>;
  createFolder: (name: string, type: 'custom') => void;
  createAIFolder: (goal: string) => Promise<void>;
  deleteFolder: (folderId: string) => void;
  addChatToFolder: (folderId: string, chat: ChatSession) => void;
  removeChatFromFolder: (folderId: string, chatId: string) => void;
  updateFolderChat: (folderId: string, chatId: string, updates: Partial<ChatSession>) => void;
  isGeneratingFolder: boolean;
}

const FolderContext = createContext<FolderContextType | null>(null);

export const FolderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [folders, setFolders] = useState<Folder[]>(() => {
      const saved = localStorage.getItem('weav_folders');
      return saved ? JSON.parse(saved) : [];
  });
  
  const [folderChats, setFolderChats] = useState<Record<string, ChatSession[]>>(() => {
      const saved = localStorage.getItem('weav_folder_chats');
      return saved ? JSON.parse(saved) : {};
  });

  const [isGeneratingFolder, setIsGeneratingFolder] = useState(false);

  // Persistence
  useEffect(() => {
      localStorage.setItem('weav_folders', JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
      localStorage.setItem('weav_folder_chats', JSON.stringify(folderChats));
  }, [folderChats]);

  const createFolder = (name: string, type: 'custom') => {
    const newFolder: Folder = {
        id: Date.now().toString(),
        name,
        type,
        createdAt: Date.now()
    };
    setFolders(prev => [newFolder, ...prev]);
    setFolderChats(prev => ({ ...prev, [newFolder.id]: [] }));
    toast.success(`'${name}' 폴더가 생성되었습니다.`);
  };

  const createAIFolder = async (goal: string) => {
      setIsGeneratingFolder(true);
      try {
          const plan = await aiService.planProjectStructure(goal);
          const newFolder: Folder = {
              id: Date.now().toString(),
              name: plan.projectName,
              type: 'shorts-workflow',
              createdAt: Date.now()
          };
          
          const chats: ChatSession[] = plan.steps.map((step, index) => ({
              id: `${newFolder.id}-step${index + 1}`,
              title: step.title,
              messages: [],
              modelId: step.modelId,
              systemInstruction: step.systemInstruction,
              folderId: newFolder.id,
              lastModified: Date.now()
          }));
          
          setFolders(prev => [newFolder, ...prev]);
          setFolderChats(prev => ({ ...prev, [newFolder.id]: chats }));
          toast.success("AI 프로젝트가 성공적으로 설계되었습니다.");
      } catch (error) {
          console.error("Failed to generate AI folder", error);
          toast.error("AI 프로젝트 설계 중 오류가 발생했습니다.");
      } finally {
          setIsGeneratingFolder(false);
      }
  };

  const deleteFolder = (folderId: string) => {
      setFolders(prev => prev.filter(f => f.id !== folderId));
      setFolderChats(prev => {
          const newState = { ...prev };
          delete newState[folderId];
          return newState;
      });
      toast.info("폴더가 삭제되었습니다.");
  };

  const addChatToFolder = (folderId: string, chat: ChatSession) => {
      setFolderChats(prev => ({
          ...prev,
          [folderId]: [...(prev[folderId] || []), chat]
      }));
  };

  const removeChatFromFolder = (folderId: string, chatId: string) => {
      setFolderChats(prev => ({
          ...prev,
          [folderId]: (prev[folderId] || []).filter(c => c.id !== chatId)
      }));
  };

  const updateFolderChat = (folderId: string, chatId: string, updates: Partial<ChatSession>) => {
      setFolderChats(prev => {
          const currentChats = prev[folderId] || [];
          const updatedChats = currentChats.map(c => c.id === chatId ? { ...c, ...updates } : c);
          return { ...prev, [folderId]: updatedChats };
      });
  };

  return (
    <FolderContext.Provider value={{ 
        folders, 
        folderChats, 
        createFolder, 
        createAIFolder, 
        deleteFolder,
        addChatToFolder,
        removeChatFromFolder,
        updateFolderChat,
        isGeneratingFolder 
    }}>
      {children}
    </FolderContext.Provider>
  );
};

export const useFolder = () => {
  const context = useContext(FolderContext);
  if (!context) throw new Error('useFolder must be used within a FolderProvider');
  return context;
};