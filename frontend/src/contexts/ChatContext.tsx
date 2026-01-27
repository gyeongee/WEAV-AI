import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Message, AIModel, ChatSession, PromptTemplate, ImageEditTarget } from '../types';
import { VideoOptions } from '../components/chat/VideoOptions';
import { MODELS } from '../constants/models';
import { aiService } from '../services/api/aiService';
import { chatApi } from '../services/api/chatApi';
import { APIError } from '../services/api/apiClient';
import { useFolder } from './FolderContext';
import { useAuth } from './AuthContext';
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

    // Video Options
    videoOptions: VideoOptions;
    setVideoOptions: (options: VideoOptions) => void;

    // Actions
    sendMessage: (overridePrompt?: string) => Promise<void>;
    retryFromMessage: (messageId: string) => void;
    stopGeneration: () => void;
    resetChat: (folderId?: string | null) => void;
    loadChatSession: (sessionId: string, folderId?: string) => void;
    deleteChat: (sessionId: string, folderId?: string) => void;
    deleteAllChats: () => Promise<void>;

    // Image Edit Target
    imageEditTarget: ImageEditTarget | null;
    setImageEditTarget: (target: ImageEditTarget | null) => void;
    clearImageEditTarget: () => void;

    // System Instruction (Persona)
    systemInstruction: string | undefined;
    setSystemInstruction: (instruction: string | undefined) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const navigate = useNavigate();
    const { user, loading: authLoading, jwtReady, openLoginPrompt } = useAuth();
    const { addChatToFolder, updateFolderChat, folderChats, removeChatFromFolder, clearAllChats } = useFolder();

    // Persisted Recent Chats (사용자별로 분리)
    const [recentChats, setRecentChats] = useState<ChatSession[]>([]);

    // 사용자 변경 시 초기화 및 최근 채팅 DB 로드
    useEffect(() => {
        if (authLoading || !jwtReady) return;
        if (!user) {
            setMessages([]);
            setRecentChats([]);
            setCurrentSessionId(null);
            setActiveFolderId(null);
            setHasStarted(false);
            return;
        }
        let ok = true;
        (async () => {
            try {
                const list = await chatApi.getChats(null);
                if (!ok) return;
                setRecentChats(list);
            } catch (e) {
                console.error('Failed to load recent chats:', e);
                toast.error('최근 채팅을 불러오지 못했습니다.', { description: '백엔드 연결 상태를 확인해주세요.' });
                setRecentChats([]);
            }
        })();
        return () => { ok = false; };
    }, [authLoading, jwtReady, user?.uid]);

    // Current Chat UI State
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [selectedModel, setSelectedModel] = useState<AIModel>(MODELS[0]);
    const [systemInstruction, setSystemInstruction] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
    const [imageEditTarget, setImageEditTarget] = useState<ImageEditTarget | null>(null);

    const clearImageEditTarget = () => setImageEditTarget(null);

    // Video Options State
    const [videoOptions, setVideoOptions] = useState<VideoOptions>({
        duration: '10s',
        resolution: '1080p',
        style: 'realistic',
        aspectRatio: '16:9'
    });

    const abortControllerRef = useRef<AbortController | null>(null);
    const textJobControllersRef = useRef<Map<string, AbortController>>(new Map());
    const imageJobControllersRef = useRef<Map<string, AbortController>>(new Map());
    const pendingSessionIdRef = useRef<string | null>(null);
    const currentSessionIdRef = useRef<string | null>(null);
    const debugIdRef = useRef(0);
    const dlog = (label: string, data?: Record<string, unknown>) => {
        const id = ++debugIdRef.current;
        // Keep logs small but structured for first-message debugging
        console.log(`[ChatDebug ${id}] ${label}`, data || {});
    };

    const recentPersistRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const errorToMessage = (error: unknown): string => {
        if (error instanceof APIError) {
            const data: any = error.data || {};
            if (error.status === 429) {
                return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
            }
            if (data.detail || data.error) {
                return data.detail || data.error;
            }
            return error.message || '요청 처리에 실패했습니다.';
        }
        if (typeof (error as any)?.message === 'string') {
            const msg = (error as any).message as string;
            if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
                return '백엔드 연결에 실패했습니다. 서버 상태를 확인해주세요.';
            }
            return msg;
        }
        if (error && typeof error === 'object' && 'message' in error) {
            return (error as any).message || '요청 처리에 실패했습니다.';
        }
        return '요청 처리에 실패했습니다.';
    };


    useEffect(() => {
        if (!currentSessionId || messages.length === 0) return;

        const now = Date.now();
        const sessionUpdate = {
            messages,
            lastModified: now,
            model: selectedModel.model,
            systemInstruction
        };

        if (activeFolderId) {
            updateFolderChat(activeFolderId, currentSessionId, sessionUpdate);
        } else {
            setRecentChats(prev => prev.map(c =>
                c.id === currentSessionId ? { ...c, ...sessionUpdate } : c
            ));
            if (recentPersistRef.current) clearTimeout(recentPersistRef.current);
            recentPersistRef.current = setTimeout(async () => {
                recentPersistRef.current = null;
                try {
                    await chatApi.updateChat(currentSessionId, {
                        messages: sessionUpdate.messages as any,
                        model: selectedModel.model,
                        system_instruction: systemInstruction ?? ''
                    });
                } catch (e) {
                    console.warn('Failed to persist recent chat:', e);
                    toast.error('채팅 저장에 실패했습니다.', { description: '네트워크 상태를 확인해주세요.' });
                }
            }, 1500);
        }
        return () => {
            if (recentPersistRef.current) {
                clearTimeout(recentPersistRef.current);
                recentPersistRef.current = null;
            }
        };
    }, [messages, currentSessionId, activeFolderId, selectedModel, systemInstruction, updateFolderChat]);

    const stopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsLoading(false);
            // Mark last streaming message as done
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'model' && last.isStreaming) {
                    if (last.jobId) {
                        const controller = textJobControllersRef.current.get(last.jobId);
                        if (controller) {
                            controller.abort();
                            textJobControllersRef.current.delete(last.jobId);
                        }
                        const imageController = imageJobControllersRef.current.get(last.jobId);
                        if (imageController) {
                            imageController.abort();
                            imageJobControllersRef.current.delete(last.jobId);
                        }
                    }
                    return prev.map(m => m.id === last.id ? { ...m, isStreaming: false, content: m.content + " [중단됨]" } : m);
                }
                return prev;
            });
            toast.info("생성이 중단되었습니다.");
        }
    };

    const resetChat = (folderId: string | null = null) => {
        stopGeneration();
        setMessages([]);
        setInputValue('');
        setHasStarted(false);
        setIsLoading(false);
        setCurrentSessionId(null);
        setActiveFolderId(folderId);
        setSelectedModel(MODELS[0]);
        setImageEditTarget(null);
        setSystemInstruction(undefined); // Persona sets this again if needed via useEffect in App
    };

    useEffect(() => {
        if (pendingSessionIdRef.current && currentSessionId === pendingSessionIdRef.current && messages.length > 0) {
            dlog('pending session resolved', {
                pendingSessionId: pendingSessionIdRef.current,
                currentSessionId,
                messages: messages.length
            });
            pendingSessionIdRef.current = null;
        }
    }, [currentSessionId, messages.length]);

    useEffect(() => {
        currentSessionIdRef.current = currentSessionId;
    }, [currentSessionId]);

    const loadChatSession = (sessionId: string, folderId?: string) => {
        dlog('loadChatSession called', { sessionId, folderId, currentSessionId, pendingSessionId: pendingSessionIdRef.current, localMessages: messages.length });
        if (pendingSessionIdRef.current === sessionId) {
            dlog('loadChatSession skipped (pending)', { sessionId });
            return;
        }
        let session: ChatSession | undefined;

        if (folderId) {
            session = folderChats[folderId]?.find(c => c.id === sessionId);
        } else {
            // First check recent chats
            session = recentChats.find(c => c.id === sessionId);

            // If not found, search in all folders
            if (!session) {
                for (const [fId, chats] of Object.entries(folderChats)) {
                    const found = (chats as ChatSession[]).find(c => c.id === sessionId);
                    if (found) {
                        session = found;
                        folderId = fId; // Found the folder ID
                        break;
                    }
                }
            }
        }

        if (session) {
            const shouldPreserveLocal = messages.length > 0 && session.messages.length === 0 && (currentSessionId === sessionId || pendingSessionIdRef.current === sessionId || !currentSessionId);
            dlog('loadChatSession resolved', { sessionId, shouldPreserveLocal, serverMessages: session.messages.length, localMessages: messages.length });
            if (!shouldPreserveLocal) {
                setMessages(session.messages);
                dlog('loadChatSession setMessages', { count: session.messages.length });
            }
            setHasStarted(prev => prev || session.messages.length > 0 || messages.length > 0);
            setSystemInstruction(session.systemInstruction);
            setCurrentSessionId(session.id);
            setActiveFolderId(folderId || null);

            const model = MODELS.find(m => m.model === session!.model) || MODELS[0];
            setSelectedModel(model);
            setInputValue('');
            setImageEditTarget(null);

            // Resume any pending jobs in this session
            const pending = session.messages.filter(m => m.isStreaming && m.jobId);
            if (pending.length > 0) {
                pending.forEach(msg => {
                    if (!msg.jobId) return;
                    if (msg.type === 'text') {
                        startTextJobPolling(msg.jobId, msg.id, session.id, folderId || null);
                    } else if (msg.type === 'image') {
                        startImageJobPolling(msg.jobId, msg.id, session.id, folderId || null);
                    }
                });
            }
        } else {
            toast.error("채팅 세션을 찾을 수 없습니다.");
            navigate('/'); // Redirect to home if not found
        }
    };

    const deleteChat = async (sessionId: string, folderId?: string) => {
        if (currentSessionId === sessionId) resetChat();
        try {
            if (folderId) {
                await removeChatFromFolder(folderId, sessionId);
            } else {
                await chatApi.deleteChat(sessionId);
                setRecentChats(prev => prev.filter(c => c.id !== sessionId));
            }
            toast.info('채팅이 삭제되었습니다.');
        } catch (e: any) {
            toast.error(e?.message || '채팅 삭제에 실패했습니다.');
        }
    };

    const deleteAllChats = async () => {
        if (!user || !jwtReady) {
            openLoginPrompt();
            return;
        }
        try {
            const ids = new Set<string>();
            const folders = await chatApi.getFolders();
            for (const folder of folders) {
                const chats = await chatApi.getChats(folder.id);
                chats.forEach(c => ids.add(c.id));
            }
            const rootChats = await chatApi.getChats(null);
            rootChats.forEach(c => ids.add(c.id));

            for (const id of ids) {
                await chatApi.deleteChat(id);
            }

            resetChat();
            setRecentChats([]);
            clearAllChats();
            toast.success('모든 채팅방이 삭제되었습니다.');
        } catch (e: any) {
            toast.error(e?.message || '모든 채팅방 삭제에 실패했습니다.');
        }
    };

    const updateSessionMessages = async (
        sessionId: string,
        folderId: string | null,
        updater: (messages: Message[]) => Message[]
    ) => {
        if (currentSessionIdRef.current === sessionId || pendingSessionIdRef.current === sessionId) {
            if (currentSessionId !== sessionId) {
                setCurrentSessionId(sessionId);
            }
            if (folderId !== undefined) {
                setActiveFolderId(folderId);
            }
            setMessages(prev => {
                const next = updater(prev);
                dlog('updateSessionMessages -> local', { sessionId, folderId, prev: prev.length, next: next.length });
                return next;
            });
            return;
        }

        if (folderId) {
            const chats = folderChats[folderId] || [];
            const target = chats.find(c => c.id === sessionId);
            if (target) {
                const nextMessages = updater(target.messages as Message[]);
                updateFolderChat(folderId, sessionId, { messages: nextMessages as any });
                await chatApi.updateChat(sessionId, { messages: nextMessages as any });
            }
            return;
        }

        const target = recentChats.find(c => c.id === sessionId);
        if (target) {
            const nextMessages = updater(target.messages as Message[]);
            setRecentChats(prev => prev.map(c => c.id === sessionId ? { ...c, messages: nextMessages as any } : c));
            await chatApi.updateChat(sessionId, { messages: nextMessages as any });
        }
    };

    const startTextJobPolling = async (jobId: string, botMessageId: string, sessionId: string, folderId: string | null) => {
        if (textJobControllersRef.current.has(jobId)) return;
        dlog('startTextJobPolling', { jobId, botMessageId, sessionId, folderId, currentSessionId: currentSessionIdRef.current });
        const controller = new AbortController();
        textJobControllersRef.current.set(jobId, controller);
        const applyUpdate = async (updater: (messages: Message[]) => Message[]) => {
            if (currentSessionIdRef.current === sessionId || pendingSessionIdRef.current === sessionId) {
                setMessages(prev => {
                    const next = updater(prev);
                    dlog('applyUpdate -> local', { sessionId, jobId, prev: prev.length, next: next.length });
                    return next;
                });
                return;
            }
            await updateSessionMessages(sessionId, folderId, updater);
        };

        try {
            const maxWaitMs = 5 * 60 * 1000;
            const startedAt = Date.now();
            const pollIntervalMs = 1500;
            while (true) {
                if (controller.signal.aborted) break;
                if (Date.now() - startedAt > maxWaitMs) {
                    throw new Error('텍스트 생성 시간이 초과되었습니다.');
                }
                const detail = await aiService.getJob(jobId, controller.signal);
                dlog('job status', { jobId, status: detail.status });
                if (detail.status === 'COMPLETED') {
                    const text = detail.result?.text || '';
                    dlog('job completed', { jobId, textLength: text.length });
                    await applyUpdate(prev => {
                        const next = prev.map(m => m.id === botMessageId ? { ...m, content: text || '응답이 비어있습니다.', isStreaming: false } : m);
                        const exists = prev.some(m => m.id === botMessageId);
                        if (exists) return next;
                        return [...next, {
                            id: botMessageId,
                            role: 'model',
                            content: text || '응답이 비어있습니다.',
                            type: 'text',
                            timestamp: Date.now(),
                            isStreaming: false
                        }];
                    });
                    break;
                }
                if (detail.status === 'FAILED') {
                    dlog('job failed', { jobId, error: detail.error });
                    await applyUpdate(prev => {
                        const next = prev.map(m => m.id === botMessageId ? { ...m, content: detail.error || '텍스트 생성에 실패했습니다.', isStreaming: false } : m);
                        const exists = prev.some(m => m.id === botMessageId);
                        if (exists) return next;
                        return [...next, {
                            id: botMessageId,
                            role: 'model',
                            content: detail.error || '텍스트 생성에 실패했습니다.',
                            type: 'text',
                            timestamp: Date.now(),
                            isStreaming: false
                        }];
                    });
                    break;
                }
                await new Promise(r => setTimeout(r, pollIntervalMs));
            }
        } catch (e: any) {
            if (!controller.signal.aborted) {
                const message = errorToMessage(e);
                dlog('job polling error', { jobId, message });
                await applyUpdate(prev => {
                    const next = prev.map(m => m.id === botMessageId ? { ...m, content: `[${message}]`, isStreaming: false } : m);
                    const exists = prev.some(m => m.id === botMessageId);
                    if (exists) return next;
                    return [...next, {
                        id: botMessageId,
                        role: 'model',
                        content: `[${message}]`,
                        type: 'text',
                        timestamp: Date.now(),
                        isStreaming: false
                    }];
                });
            }
        } finally {
            textJobControllersRef.current.delete(jobId);
        }
    };

    const startImageJobPolling = async (jobId: string, botMessageId: string, sessionId: string, folderId: string | null) => {
        if (imageJobControllersRef.current.has(jobId)) return;
        dlog('startImageJobPolling', { jobId, botMessageId, sessionId, folderId, currentSessionId: currentSessionIdRef.current });
        const controller = new AbortController();
        imageJobControllersRef.current.set(jobId, controller);

        const applyUpdate = async (updater: (messages: Message[]) => Message[]) => {
            if (currentSessionIdRef.current === sessionId || pendingSessionIdRef.current === sessionId) {
                setMessages(prev => {
                    const next = updater(prev);
                    dlog('applyUpdate -> local', { sessionId, jobId, prev: prev.length, next: next.length });
                    return next;
                });
                return;
            }
            await updateSessionMessages(sessionId, folderId, updater);
        };

        try {
            const maxWaitMs = 3 * 60 * 1000;
            const startedAt = Date.now();
            const pollIntervalMs = 1500;
            while (true) {
                if (controller.signal.aborted) break;
                if (Date.now() - startedAt > maxWaitMs) {
                    throw new Error('이미지 생성 시간이 초과되었습니다.');
                }
                const detail = await aiService.getJob(jobId, controller.signal);
                dlog('job status', { jobId, status: detail.status });
                if (detail.status === 'COMPLETED') {
                    const url = detail.result?.url || '';
                    await applyUpdate(prev => {
                        const next = prev.map(m => m.id === botMessageId ? {
                            ...m,
                            mediaUrl: url || undefined,
                            content: url ? '이미지가 생성되었습니다.' : '이미지 생성 결과를 받지 못했습니다.',
                            isStreaming: false,
                            type: 'image'
                        } : m);
                        const exists = prev.some(m => m.id === botMessageId);
                        if (exists) return next;
                        return [...next, {
                            id: botMessageId,
                            role: 'model',
                            content: url ? '이미지가 생성되었습니다.' : '이미지 생성 결과를 받지 못했습니다.',
                            type: 'image',
                            mediaUrl: url || undefined,
                            timestamp: Date.now(),
                            isStreaming: false
                        }];
                    });
                    break;
                }
                if (detail.status === 'FAILED') {
                    const error = detail.error || '이미지 생성에 실패했습니다.';
                    await applyUpdate(prev => {
                        const next = prev.map(m => m.id === botMessageId ? { ...m, content: error, isStreaming: false } : m);
                        const exists = prev.some(m => m.id === botMessageId);
                        if (exists) return next;
                        return [...next, {
                            id: botMessageId,
                            role: 'model',
                            content: error,
                            type: 'image',
                            timestamp: Date.now(),
                            isStreaming: false
                        }];
                    });
                    break;
                }
                await new Promise(r => setTimeout(r, pollIntervalMs));
            }
        } catch (e: any) {
            if (!controller.signal.aborted) {
                const message = errorToMessage(e);
                await applyUpdate(prev => {
                    const next = prev.map(m => m.id === botMessageId ? { ...m, content: `[${message}]`, isStreaming: false } : m);
                    const exists = prev.some(m => m.id === botMessageId);
                    if (exists) return next;
                    return [...next, {
                        id: botMessageId,
                        role: 'model',
                        content: `[${message}]`,
                        type: 'image',
                        timestamp: Date.now(),
                        isStreaming: false
                    }];
                });
            }
        } finally {
            imageJobControllersRef.current.delete(jobId);
        }
    };

    const sendMessage = async (overridePrompt?: string) => {
        const promptToSend = overridePrompt || inputValue;
        if (!promptToSend.trim() || isLoading) return;
        dlog('sendMessage start', { promptLength: promptToSend.length, currentSessionId, pendingSessionId: pendingSessionIdRef.current, localMessages: messages.length });

        // 로그인 확인 (DB 저장 필요)
        if (!user || !jwtReady) {
            toast.error('로그인이 필요한 기능입니다.');
            return;
        }

        let effectiveSessionId = currentSessionId;
        // Create New Session if needed (DB에 저장)
        if (!currentSessionId) {
            const title = promptToSend.slice(0, 30) + (promptToSend.length > 30 ? '...' : '');
            try {
                const c = await chatApi.createChat({
                    title,
                    folder_id: activeFolderId || undefined,
                    messages: [],
                    model: selectedModel.model,
                    system_instruction: systemInstruction ?? ''
                });
                pendingSessionIdRef.current = c.id;
                dlog('createChat success', { sessionId: c.id, folderId: activeFolderId || null });
                effectiveSessionId = c.id;
                setCurrentSessionId(c.id);
                if (activeFolderId) {
                    addChatToFolder(activeFolderId, c);
                } else {
                    setRecentChats(prev => [c, ...prev]);
                }
                navigate(`/chat/${c.id}`);
            } catch (e: any) {
                toast.error(errorToMessage(e));
                return;
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
        dlog('user message added', { sessionId: effectiveSessionId, messageId: userMessage.id });
        setInputValue('');
        setIsLoading(true);

        // Abort Controller Setup
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        const botMessageId = (Date.now() + 1).toString();
        const addBotPlaceholder = (type: 'text' | 'image' | 'video', content: string, jobId?: string) => {
            setMessages(prev => [...prev, {
                id: botMessageId,
                role: 'model',
                content,
                type,
                jobId,
                timestamp: Date.now(),
                isStreaming: true,
                ...(type === 'video' && { progress: 0, estimatedTime: '3분' })
            }]);
            dlog('bot placeholder added', { botMessageId, type, jobId, sessionId: effectiveSessionId });
        };

        try {
            if (selectedModel.isVideo) {
                addBotPlaceholder('video', `비디오 생성 중... (${videoOptions.duration}, ${videoOptions.resolution}, ${videoOptions.style})`);

                // Simulate progress updates for video generation
                const progressInterval = setInterval(() => {
                    setMessages(prev => prev.map(m => {
                        if (m.id === botMessageId && m.progress !== undefined) {
                            const newProgress = Math.min(m.progress + Math.random() * 15, 95);
                            const estimatedTime = newProgress < 50 ? '2분' : newProgress < 80 ? '1분' : '30초';
                            return { ...m, progress: newProgress, estimatedTime };
                        }
                        return m;
                    }));
                }, 2000);

                try {
                    // Pass user to backend for permission check
                    const videoUrl = await aiService.generateVideo(selectedModel, promptToSend, videoOptions, user, signal);
                    clearInterval(progressInterval);

                    if (signal.aborted) return;

                    setMessages(prev => prev.map(m => m.id === botMessageId ? {
                        ...m,
                        mediaUrl: videoUrl || undefined,
                        content: videoUrl ? '비디오가 생성되었습니다.' : '실패했습니다.',
                        isStreaming: false,
                        progress: 100,
                        estimatedTime: undefined
                    } : m));

                    // Add to video generations history if successful
                    if (videoUrl) {
                        const videoGeneration = {
                            id: botMessageId,
                            prompt: promptToSend,
                            videoUrl,
                            options: videoOptions,
                            createdAt: Date.now(),
                            model: selectedModel.model
                        };

                        // Update current session with video generation
                        if (activeFolderId && effectiveSessionId) {
                            updateFolderChat(activeFolderId, effectiveSessionId, {
                                videoGenerations: [
                                    ...(folderChats[activeFolderId]?.find(c => c.id === effectiveSessionId)?.videoGenerations || []),
                                    videoGeneration
                                ]
                            });
                        } else if (effectiveSessionId) {
                            setRecentChats(prev => prev.map(c =>
                                c.id === effectiveSessionId
                                    ? { ...c, videoGenerations: [...(c.videoGenerations || []), videoGeneration] }
                                    : c
                            ));
                        }
                    }
                } catch (error) {
                    clearInterval(progressInterval);
                    setMessages(prev => prev.map(m => m.id === botMessageId ? {
                        ...m,
                        content: '비디오 생성 중 오류가 발생했습니다. (권한 또는 API 오류)',
                        isStreaming: false,
                        progress: undefined,
                        estimatedTime: undefined
                    } : m));
                    throw error;
                }
            } else if (selectedModel.isImage) {
                const imagePrompt = imageEditTarget
                    ? [
                        imageEditTarget.prompt
                            ? `기존 이미지 프롬프트: "${imageEditTarget.prompt}"`
                            : `기존 이미지 URL: ${imageEditTarget.imageUrl}`,
                        `수정 요청: "${promptToSend}"`,
                        '위 내용을 반영해 새로운 이미지를 생성해줘.'
                    ].join('\n')
                    : promptToSend;

                addBotPlaceholder('image', '이미지 생성 중...');
                const jobId = await aiService.createImageJob(selectedModel, imagePrompt, signal);
                dlog('createImageJob success', { jobId });
                setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, jobId, prompt: imagePrompt } : m));
                if (imageEditTarget) {
                    setImageEditTarget(null);
                }
                await startImageJobPolling(jobId, botMessageId, effectiveSessionId!, activeFolderId || null);
            } else {
                if (systemInstruction) {
                    console.log('[ChatDebug] system_prompt length:', systemInstruction.length);
                    console.log('[ChatDebug] system_prompt:', systemInstruction);
                } else {
                    console.log('[ChatDebug] system_prompt length: 0');
                    console.log('[ChatDebug] system_prompt:', '');
                }
                const jobId = await aiService.createTextJob(selectedModel, promptToSend, messages, systemInstruction, signal);
                dlog('createTextJob success', { jobId });
                addBotPlaceholder('text', '', jobId);
                await startTextJobPolling(jobId, botMessageId, effectiveSessionId!, activeFolderId || null);
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error(error);
                const errorMessage = errorToMessage(error);
                dlog('sendMessage error', { errorMessage });

                setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, content: `[${errorMessage}]`, isStreaming: false } : m));
                toast.error("메시지 전송 실패", { description: errorMessage });
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    const retryFromMessage = (messageId: string) => {
        if (isLoading) return;
        const idx = messages.findIndex(m => m.id === messageId);
        if (idx === -1) return;
        for (let i = idx - 1; i >= 0; i -= 1) {
            const msg = messages[i];
            if (msg.role === 'user' && msg.content.trim()) {
                sendMessage(msg.content);
                return;
            }
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
            videoOptions,
            setVideoOptions,
            sendMessage,
            retryFromMessage,
            stopGeneration,
            resetChat,
            loadChatSession,
            deleteChat,
            deleteAllChats,
            imageEditTarget,
            setImageEditTarget,
            clearImageEditTarget,
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
