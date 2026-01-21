import { GoogleGenAI } from "@google/genai";
import { AIModel, Message } from "../types";

// --- Configuration & Helpers ---
const requireEnv = (key: string, name: string): string => {
  // Vite uses import.meta.env
  const env = (import.meta as any).env;
  const value = env ? env[key] : undefined;
  if (!value) {
    console.warn(`[WEAV AI] Warning: ${name} (${key}) is missing.`);
    return "";
  }
  return value;
};

// --- Google GenAI Client ---
const getGoogleClient = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// --- OpenAI Helpers ---
const getOpenAIKey = () => {
    const key = requireEnv('VITE_OPENAI_API_KEY', 'OpenAI API Key');
    if (!key) throw new Error("OpenAI API Key (VITE_OPENAI_API_KEY)가 설정되지 않았습니다. .env 파일을 확인해주세요.");
    return key;
};

// OpenAI Streaming Helper
async function* streamOpenAI(modelName: string, prompt: string, history: Message[], systemInstruction?: string, signal?: AbortSignal) {
  try {
    const apiKey = getOpenAIKey();
    
    // Default System Prompt
    let finalSystemPrompt = systemInstruction || "You are a helpful assistant. Respond in Korean unless asked otherwise.";

    // Custom Persona Logic for GPT-5-mini (Instant)
    if (!systemInstruction && modelName === 'gpt-5-mini') {
        finalSystemPrompt = `당신은 OpenAI의 초고속 AI 모델인 ChatGPT-5.2 Instant입니다.
(이하 생략 - 기본 페르소나 유지)...`;
    }
    
    const messages = [
      { role: "system", content: finalSystemPrompt },
      ...history
        .filter(msg => msg.type === 'text' && !msg.isStreaming && msg.content.trim() !== '')
        .map(msg => ({ role: msg.role === 'model' ? 'assistant' : 'user', content: msg.content })),
      { role: "user", content: prompt }
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        stream: true
      }),
      signal // Pass AbortSignal
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI API Error (${response.status}): ${err}`);
    }
    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; 

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          const data = trimmed.slice(6);
          if (data === "[DONE]") return;
          try {
            const json = JSON.parse(data);
            const content = json.choices[0]?.delta?.content;
            if (content) yield content;
          } catch (e) {
            // Ignore parsing errors for partial chunks
          }
        }
      }
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('OpenAI Stream Aborted');
      return;
    }
    console.error("OpenAI Stream Error:", error);
    yield `\n[오류 발생: ${error.message}]`;
  }
}

// OpenAI Image Helper
async function generateOpenAIImage(modelName: string, prompt: string, signal?: AbortSignal): Promise<string | null> {
    const apiKey = getOpenAIKey();
    
    const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: modelName,
            prompt: prompt,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json"
        }),
        signal
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI Image Error: ${err}`);
    }
    
    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;
    return b64 ? `data:image/png;base64,${b64}` : null;
}

// OpenAI Video Helper (SORA)
async function generateOpenAIVideo(modelName: string, prompt: string, signal?: AbortSignal): Promise<string | null> {
    const apiKey = getOpenAIKey();
    
    const response = await fetch("https://api.openai.com/v1/videos", { 
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: modelName,
            prompt: prompt,
            size: "1024x1024",
            quality: "standard" 
        }),
        signal
    });

    if (!response.ok) throw new Error(`OpenAI Video Error: ${response.statusText}`);

    const data = await response.json();
    if (data.data && data.data[0] && data.data[0].url) return data.data[0].url;
    if (data.url) return data.url;
    
    return null;
}

/**
 * Sanitize history for Gemini API.
 */
function sanitizeHistory(messages: Message[]) {
    const validMessages = messages.filter(
        msg => msg.type === 'text' && !msg.isStreaming && msg.content.trim() !== ''
    );

    const sanitized: { role: string; parts: { text: string }[] }[] = [];

    for (const msg of validMessages) {
        const role = msg.role;
        const text = msg.content;

        if (sanitized.length === 0) {
            if (role === 'model') {
                 sanitized.push({ role: 'user', parts: [{ text: "[이전 대화 내역 연동]" }] });
                 sanitized.push({ role: 'model', parts: [{ text: text }] });
            } else {
                sanitized.push({ role, parts: [{ text }] });
            }
        } else {
            const lastMsg = sanitized[sanitized.length - 1];
            if (lastMsg.role === role) {
                lastMsg.parts[0].text += `\n\n${text}`;
            } else {
                sanitized.push({ role, parts: [{ text }] });
            }
        }
    }
    return sanitized;
}


// --- Main Service Export ---
export const aiService = {
  /**
   * Plan Project Structure based on User Goal
   */
  planProjectStructure: async (userGoal: string): Promise<{ projectName: string; steps: { title: string; modelId: string; systemInstruction: string }[] }> => {
    try {
        const ai = getGoogleClient();
        const model = "gemini-3-pro-preview"; 
        
        const prompt = `
        You are an expert AI Project Manager. The user wants to achieve the following goal: "${userGoal}".
        
        Please design a project structure.
        
        **CRITICAL RULES:**
        1.  **Strict Model Selection:** You MUST ONLY use the Model IDs listed below. Do NOT invent new model IDs.
            - 'gpt-5.2-instant' (For brainstorming, simple text)
            - 'gemini-3-flash' (For general fast chat)
            - 'gpt-image-1.5' (For high-quality DALL-E 3 images)
            - 'nano-banana' (For fast illustrations/logos)
            - 'sora' (For video generation)
            - 'veo-3.1' (For video generation)
            
        2.  **Language:** The 'projectName' and 'title' (step names) MUST be in **Korean (한국어)**. The 'systemInstruction' should also be in Korean.
        
        3.  **Efficiency:** Create only the necessary steps to achieve the goal (Minimum 2, Maximum 5). Do NOT arbitrarily create 4 steps if 2 are enough. For simple requests (e.g., "Write a blog post"), 2 steps (Outline -> Writing) might be enough.

        Return ONLY raw JSON in the following format:
        {
          "projectName": "프로젝트 이름 (Korean)",
          "steps": [
            {
              "title": "단계 1: [작업명] (Korean)",
              "modelId": "[Exact Model ID from list above]",
              "systemInstruction": "[Persona and detailed instruction in Korean]"
            }
          ]
        }
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json"
            }
        });

        let text = response.text || "";
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        if (!text) throw new Error("Empty response from AI Planner");

        return JSON.parse(text);
    } catch (error) {
        console.error("Project Planning Error:", error);
        return {
            projectName: "새 프로젝트 (수동 설정 필요)",
            steps: [
                { 
                    title: "일반 대화", 
                    modelId: "gpt-5.2-instant", 
                    systemInstruction: "자유롭게 대화를 나눠보세요." 
                }
            ]
        };
    }
  },

  /**
   * Generate Video (Routes to Google Veo or OpenAI Sora)
   */
  generateVideo: async (model: AIModel, prompt: string, signal?: AbortSignal): Promise<string | null> => {
    // Route to OpenAI (SORA)
    if (model.id === 'sora') {
        return await generateOpenAIVideo(model.apiModelName, prompt, signal);
    }

    // Default to Google (Veo)
    const ai = getGoogleClient();
    
    try {
      let operation = await ai.models.generateVideos({
        model: model.apiModelName, 
        prompt: prompt,
        config: { 
            numberOfVideos: 1,
        }
      });

      // Simple polling (Note: Cancellation of ongoing operation is complex in SDK, simple abort for now just stops polling)
      while (!operation.done) {
        if (signal?.aborted) throw new Error("Aborted");
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (videoUri) {
        return `${videoUri}&key=${process.env.API_KEY}`;
      }
      return null;
    } catch (error) {
      if (error === "Aborted") {
          console.log("Veo Generation Aborted");
          return null;
      }
      console.error("Veo Generation Error:", error);
      throw error;
    }
  },

  /**
   * Generate Image (Routes to Google or OpenAI)
   */
  generateImage: async (model: AIModel, prompt: string, signal?: AbortSignal): Promise<string | null> => {
    try {
        // Route to OpenAI (DALL-E / GPT Image 1.5)
        if (model.id === 'gpt-image-1.5' || model.category === 'GPT') {
            return await generateOpenAIImage(model.apiModelName, prompt, signal);
        }

        // Route to Google (Imagen/Gemini)
        const ai = getGoogleClient();
        const response = await ai.models.generateContent({
            model: model.apiModelName,
            contents: { parts: [{ text: prompt }] }
        });

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        return null;
    } catch (error) {
        console.error("Image Generation Error:", error);
        throw error;
    }
  },

  /**
   * Generate Text Stream (Routes to Google or OpenAI)
   */
  generateTextStream: async function* (model: AIModel, prompt: string, history: Message[] = [], systemInstruction?: string, signal?: AbortSignal) {
    // Route to OpenAI
    if (model.category === 'GPT') {
        yield* streamOpenAI(model.apiModelName, prompt, history, systemInstruction, signal);
        return;
    }

    // Route to Google Gemini
    try {
        const ai = getGoogleClient();
        
        let finalSystemInstruction = systemInstruction || "You are a helpful and intelligent AI assistant. Unless requested otherwise, please respond in Korean.";

        if (!systemInstruction && model.apiModelName === 'gemini-2.5-flash-lite') {
            finalSystemInstruction = `당신은 Google의 최신 AI 모델인 Gemini 3 Flash Preview입니다... (이하 생략)`;
        }

        const sdkHistory = sanitizeHistory(history);

        const chat = ai.chats.create({ 
            model: model.apiModelName,
            history: sdkHistory,
            config: {
                systemInstruction: finalSystemInstruction,
            }
        });

        const result = await chat.sendMessageStream({ message: prompt });

        for await (const chunk of result) {
            if (signal?.aborted) {
                break;
            }
            if (chunk.text) {
                yield chunk.text;
            }
        }
    } catch (error: any) {
        if (signal?.aborted) return;
        console.error("Text Generation Error (Gemini):", error);
        yield `\n[오류 발생: ${error.message || "Gemini API Error"}]`;
    }
  }
};