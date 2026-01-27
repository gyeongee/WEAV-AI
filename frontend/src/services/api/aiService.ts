import { AIModel, Message } from "../../types";
import { VideoOptions } from "../../components/chat/VideoOptions";
import { MODELS } from "../../constants/models";

// 백엔드 API 클라이언트 사용
import { apiClient } from './apiClient';

// 백엔드 Gateway 사용


// --- Access Control ---
const checkAccess = (user: any) => {
  if (!user) {
    throw new Error("로그인이 필요한 기능입니다.");
  }
  return true;
};

// --- Main Service Export ---
export const aiService = {
  /**
   * Parse/normalize planner response to avoid AI folder breakage
   */
  _normalizePlanResult: (rawText: string, userGoal: string) => {
    const allowedModels = new Set(MODELS.map((m) => m.model));
    const modelById = new Map(MODELS.map((m) => [m.model, m]));
    const defaultModel =
      MODELS.find((m) => m.category === 'LLM' && m.name === 'Gemini 3 Flash')?.model ||
      MODELS.find((m) => m.category === 'LLM')?.model ||
      MODELS[0]?.model;
    const defaultImageModel =
      MODELS.find((m) => m.isImage)?.model ||
      MODELS.find((m) => m.category === 'Image')?.model ||
      defaultModel;
    const defaultVideoModel =
      MODELS.find((m) => m.isVideo)?.model ||
      MODELS.find((m) => m.category === 'Video')?.model ||
      defaultModel;

    const inferCategory = (title: string, goal: string) => {
      const text = `${title} ${goal}`.toLowerCase();
      const videoKeywords = ['영상', '동영상', '비디오', '유튜브', '쇼츠', '릴스', '촬영', '편집', '컷', '모션', '영상화', '제작'];
      const imageKeywords = ['이미지', '썸네일', '비주얼', '디자인', '일러스트', '프레임', '커버'];
      const llmKeywords = ['기획', '구성', '대본', '스크립트', '아이디어', '분석', '조사', '전략', '스토리보드', '요약', '정리'];

      if (videoKeywords.some((k) => text.includes(k))) return 'video';
      if (imageKeywords.some((k) => text.includes(k))) return 'image';
      if (llmKeywords.some((k) => text.includes(k))) return 'llm';
      return 'llm';
    };

    const modelCategory = (modelId?: string) => {
      const m = modelId ? modelById.get(modelId) : undefined;
      if (!m) return 'llm';
      if ((m as any).isVideo || m.category === 'Video') return 'video';
      if ((m as any).isImage || m.category === 'Image') return 'image';
      return 'llm';
    };

    const extractJson = (text: string) => {
      const trimmed = text.trim().replace(/```json/g, '').replace(/```/g, '').trim();
      try {
        return JSON.parse(trimmed);
      } catch {
        const match = trimmed.match(/\{[\s\S]*\}/);
        if (match) {
          return JSON.parse(match[0]);
        }
      }
      throw new Error('AI 플래너 응답을 JSON으로 파싱할 수 없습니다.');
    };

    const parsed = extractJson(rawText);
    const projectName =
      typeof parsed?.projectName === 'string' && parsed.projectName.trim()
        ? parsed.projectName.trim()
        : 'AI 프로젝트';

    const rawSteps = Array.isArray(parsed?.steps) ? parsed.steps : [];
    let steps = rawSteps
      .map((s: any, idx: number) => {
        const title =
          typeof s?.title === 'string' && s.title.trim()
            ? s.title.trim()
            : `단계 ${idx + 1}`;
        const model =
          typeof s?.model === 'string' && allowedModels.has(s.model.trim())
            ? s.model.trim()
            : defaultModel;
        const inferred = inferCategory(title, userGoal);
        const currentCategory = modelCategory(model);
        const normalizedModel =
          inferred === 'video'
            ? defaultVideoModel
            : inferred === 'image'
              ? defaultImageModel
              : defaultModel;
        const systemInstruction =
          typeof s?.systemInstruction === 'string' && s.systemInstruction.trim()
            ? s.systemInstruction.trim()
            : `목표: "${userGoal}"에 대해 ${title} 작업을 수행해 주세요.`;
        return {
          title,
          model: currentCategory === inferred ? model : normalizedModel,
          systemInstruction
        };
      })
      .filter((s: any) => s.model);

    if (steps.length === 0) {
      steps = [
        {
          title: '프로젝트 개요 정리',
          model: defaultModel,
          systemInstruction: `목표: "${userGoal}"에 대해 전체 구조를 간단히 정리해 주세요.`,
        },
        {
          title: '실행 계획 작성',
          model: defaultModel,
          systemInstruction: `목표: "${userGoal}"을 달성하기 위한 실행 계획을 작성해 주세요.`,
        },
      ];
    } else if (steps.length === 1) {
      steps.push({
        title: '최종 정리',
        model: defaultModel,
        systemInstruction: `목표: "${userGoal}"에 대해 최종 결과를 정리해 주세요.`,
      });
    }

    if (steps.length > 5) steps = steps.slice(0, 5);
    if (steps.length < 2 && defaultModel) {
      steps.push({
        title: '추가 정리',
        model: defaultModel,
        systemInstruction: `목표: "${userGoal}"을 보완할 내용을 정리해 주세요.`,
      });
    }

    return { projectName, steps };
  },
  /**
   * Plan Project Structure (백엔드 Gateway)
   */
  planProjectStructure: async (userGoal: string, user: any): Promise<{ projectName: string; steps: { title: string; model: string; systemInstruction: string }[] }> => {
    if (!user) throw new Error("로그인이 필요한 기능입니다.");

    const allowedModels = MODELS.map((m) => m.model).join(', ');
    const plannerModel = MODELS.find((m) => m.category === 'LLM' && m.name === 'Gemini 3 Flash')?.model || MODELS.find((m) => m.category === 'LLM')?.model;
    const prompt = `
      You are an expert AI Project Manager. The user wants to achieve the following goal: "${userGoal}".
      
      Please design a project structure.
      
      **CRITICAL RULES:**
      1.  **Strict Model Selection:** You MUST ONLY use the models listed below. Do NOT invent new models.
          - Allowed models: ${allowedModels}
          
      2.  **Language:** The 'projectName' and 'title' (step names) MUST be in **Korean (한국어)**. The 'systemInstruction' should also be in Korean.
      
      3.  **Model Fit:** Choose models based on step type:
          - Planning/outline/script/analysis -> LLM models
          - Image/thumbnail/design -> Image models
          - Video creation/editing -> Video models

      4.  **Efficiency:** Create only the necessary steps to achieve the goal (Minimum 2, Maximum 5). Do NOT arbitrarily create 4 steps if 2 are enough. For simple requests (e.g., "Write a blog post"), 2 steps (Outline -> Writing) might be enough.

      Return ONLY raw JSON in the following format:
      {
        "projectName": "프로젝트 이름 (Korean)",
        "steps": [
          {
            "title": "단계 1: [작업명] (Korean)",
            "model": "[Exact model name from list above]",
            "systemInstruction": "[Persona and detailed instruction in Korean]"
          }
        ]
      }
    `;

    // 백엔드 Gateway 호출
    const result = await apiClient.post('/api/v1/chat/complete/', {
      provider: 'fal',
      model: plannerModel,
      input_text: prompt,
      system_prompt: 'You are an expert AI Project Manager. Always respond in valid JSON format only.',
      max_output_tokens: 1024
    }) as { text?: string };

    if (!result.text) throw new Error("Empty response from AI Planner");

    return aiService._normalizePlanResult(result.text, userGoal);
  },
  createTextJob: async (
    model: AIModel,
    prompt: string,
    history: Message[] = [],
    systemInstruction?: string,
    signal?: AbortSignal
  ): Promise<string> => {
    const historyArray = history
      .filter(msg => msg.type === 'text' && !msg.isStreaming && msg.content.trim() !== '')
      .map(msg => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.content
      }));

    const job = await apiClient.post('/api/v1/jobs/', {
      provider: model.provider || 'fal',
      model: model.model,
      arguments: {
        input_text: prompt,
        system_prompt: systemInstruction,
        history: historyArray,
        temperature: 0.7,
        max_output_tokens: 1024
      },
      store_result: true
    }, { signal }) as { id?: string };

    if (!job.id) throw new Error('작업 ID를 받지 못했습니다.');
    return job.id;
  },

  getJob: async (jobId: string, signal?: AbortSignal): Promise<{ status: string; result?: { text?: string; url?: string; type?: string }; error?: string }> => {
    return (await apiClient.get(`/api/v1/jobs/${jobId}/`, { signal })) as {
      status: string;
      result?: { text?: string; url?: string; type?: string };
      error?: string;
    };
  },

  createImageJob: async (model: AIModel, prompt: string, signal?: AbortSignal): Promise<string> => {
    const jobData = {
      provider: model.provider || 'fal',
      model: model.model,
      arguments: { prompt },
      store_result: true
    };

    const createRes = (await apiClient.post('/api/v1/jobs/', jobData, { signal })) as { id?: string };
    const jobId = createRes.id;
    if (!jobId) throw new Error('작업 ID를 받지 못했습니다.');
    return jobId;
  },

  /**
   * Generate Video (백엔드 Jobs API — 비동기, 폴링)
   */
  generateVideo: async (model: AIModel, prompt: string, videoOptions: VideoOptions, user: any, signal?: AbortSignal): Promise<string | null> => {
    const jobData = {
      provider: model.provider || 'fal',
      model: model.model,
      arguments: {
        prompt,
        duration: videoOptions.duration,
        resolution: videoOptions.resolution,
        aspect_ratio: videoOptions.aspectRatio,
        style: videoOptions.style
      },
      store_result: true
    };

    const createRes = (await apiClient.post('/api/v1/jobs/', jobData)) as { id?: string };
    const jobId = createRes.id;
    if (!jobId) throw new Error('작업 ID를 받지 못했습니다.');

    const maxWaitMs = 10 * 60 * 1000;
    const startedAt = Date.now();
    const pollIntervalMs = 2000;
    while (true) {
      if (signal?.aborted) throw new Error('비디오 생성이 중단되었습니다.');
      if (Date.now() - startedAt > maxWaitMs) {
        throw new Error('비디오 생성 시간이 초과되었습니다.');
      }
      const detail = (await apiClient.get(`/api/v1/jobs/${jobId}/`, { signal })) as { status: string; result?: { url?: string; text?: string }; error?: string };
      if (detail.status === 'COMPLETED') {
        if (detail.result?.url) return detail.result.url;
        throw new Error('비디오 생성 결과를 받지 못했습니다.');
      }
      if (detail.status === 'FAILED') {
        throw new Error(detail.error || '비디오 생성에 실패했습니다.');
      }
      await new Promise(r => setTimeout(r, pollIntervalMs));
    }
  },

  // --- Helper Functions ---

  // 비디오 생성은 Jobs API 사용


  /**
   * Generate Image (백엔드 Jobs API — 비동기, 폴링)
   */
  generateImage: async (model: AIModel, prompt: string, user: any, signal?: AbortSignal): Promise<string | null> => {
    const jobData = {
      provider: model.provider || 'fal',
      model: model.model,
      arguments: { prompt },
      store_result: true
    };

    const createRes = (await apiClient.post('/api/v1/jobs/', jobData)) as { id?: string };
    const jobId = createRes.id;
    if (!jobId) throw new Error('작업 ID를 받지 못했습니다.');

    const maxWaitMs = 2 * 60 * 1000;
    const startedAt = Date.now();
    const pollIntervalMs = 1500;
    while (true) {
      if (signal?.aborted) throw new Error('이미지 생성이 중단되었습니다.');
      if (Date.now() - startedAt > maxWaitMs) {
        throw new Error('이미지 생성 시간이 초과되었습니다.');
      }
      const detail = (await apiClient.get(`/api/v1/jobs/${jobId}/`, { signal })) as { status: string; result?: { url?: string; text?: string }; error?: string };
      if (detail.status === 'COMPLETED') {
        if (detail.result?.url) return detail.result.url;
        throw new Error('이미지 생성 결과를 받지 못했습니다.');
      }
      if (detail.status === 'FAILED') {
        throw new Error(detail.error || '이미지 생성에 실패했습니다.');
      }
      await new Promise(r => setTimeout(r, pollIntervalMs));
    }
  },

  /**
   * Generate Text (백엔드 Gateway - 일반 POST 응답)
   * 스트리밍 없이 전체 응답을 한 번에 받아서 반환
   */
  generateTextStream: async function* (model: AIModel, prompt: string, history: Message[] = [], systemInstruction?: string, user?: any, signal?: AbortSignal) {
    try {
      checkAccess(user);
    } catch (e: any) {
      yield `\n[오류: ${e.message}]`;
      return;
    }

    try {
      // provider 결정
      let provider = model.provider || 'fal';

      // 히스토리 변환
      const historyArray = history
        .filter(msg => msg.type === 'text' && !msg.isStreaming && msg.content.trim() !== '')
        .map(msg => ({
          role: msg.role === 'model' ? 'assistant' : 'user',
          content: msg.content
        }));

      // 백엔드 Gateway 호출
      const result = await apiClient.post('/api/v1/chat/complete/', {
        provider,
        model: model.model,
        input_text: prompt,
        system_prompt: systemInstruction,
        history: historyArray,
        temperature: 0.7,
        max_output_tokens: 1024
      }, { signal }) as { text?: string; error?: string };

      if (result.error) {
        yield `\n[오류: ${result.error}]`;
        return;
      }

      if (!result.text) {
        yield `\n[오류: 응답이 비어있습니다]`;
        return;
      }

      // 전체 텍스트를 한 글자씩 yield (UX 유지)
      // TODO: 향후 백엔드 SSE 스트리밍 지원 시 실제 스트리밍으로 변경
      for (const char of result.text) {
        if (signal?.aborted) break;
        yield char;
        // 약간의 딜레이로 자연스러운 타이핑 효과
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    } catch (error: any) {
      if (signal?.aborted) return;
      console.error("Text Generation Error:", error);
      const message = error?.message || "API Error";
      yield `\n[오류 발생: ${message}]`;
    }
  }
};
