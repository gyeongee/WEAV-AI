# WEAV AI - 프로젝트 현황 및 명세서

## 1. 프로젝트 개요

**WEAV AI Monochrome**은 목표 지향적(Goal-Oriented) AI 워크플로우를 제공하는 웹 애플리케이션입니다.  
사용자가 **목표(Goal)**를 입력하면 AI가 **단계별 채팅방·모델·페르소나**를 자동 설계합니다.

---

## 2. 핵심 기능: AI Project Planner

사용자가 *"판타지 소설을 쓰고 싶어"*, *"유튜브 숏츠 영상을 만들고 싶어"* 등을 입력하면:

1. **의도 분석:** `gemini-3-pro-preview`가 작업 단계를 기획
2. **구조 생성:** JSON으로 프로젝트 폴더명·하위 세션(Step) 정의
3. **모델 배정:** 단계별 `modelId`·`systemInstruction` 자동 할당 (아래 사용 가능 모델 ID만 사용)
4. **페르소나:** 각 채팅방에 시스템 프롬프트 자동 주입

---

## 3. UI/UX 디자인

- **테마:** Monochrome High Contrast 다크
- **사이드바:** 폴더 > 채팅 세션 트리, 단계별 아이콘, 애니메이션
- **채팅:** 텍스트·이미지·비디오, 실시간 스트리밍, 생성 중단(Stop)

---

## 4. 연동 AI 모델 (`constants/models.ts` 기준)

### 사용자 선택용 (모델 셀렉터)

| 표시 이름 | id | API 모델명 | 용도 |
| :--- | :--- | :--- | :--- |
| **ChatGPT-5.2 Instant** | `gpt-5.2-instant` | `gpt-5-mini` | 일반·아이디어 |
| **Gemini 3 Flash Preview** | `gemini-3-flash` | `gemini-2.5-flash-lite` | 일반 대화 |
| **GPT Image 1.5** | `gpt-image-1.5` | `gpt-image-1.5` | DALL·E 이미지 |
| **Nano Banana (Gemini)** | `nano-banana` | `gemini-2.5-flash-image` | Gemini 이미지 |
| **SORA** | `sora` | `sora-1.0-turbo` | OpenAI 비디오 |
| **VEO 3.1** | `veo-3.1` | `veo-3.1-fast-generate-preview` | Google 비디오 |

### 내부 전용 (API 직접 호출)

| 용도 | API 모델명 |
| :--- | :--- |
| **AI 프로젝트 설계** (`planProjectStructure`) | `gemini-3-pro-preview` |

---

## 5. 기술 스택 및 아키텍처

- **Frontend:** React 19, TypeScript, Vite
- **상태:** `ChatContext`(`useChatContext`), `FolderContext`, `AuthContext` (Firebase Auth)
- **라우팅:** `react-router-dom`
- **API:** `aiService.ts` — Google `@google/genai`, OpenAI REST; `planProjectStructure`, 스트리밍·이미지·비디오
- **기타:** Sonner(토스트), ErrorBoundary, `react-syntax-highlighter`, `localStorage` 영속성

---

## 6. 리팩토링·최적화 현황

- [x] **Context 분리:** Chat, Folder, Auth
- [x] **localStorage 영속성:** 최근 채팅, 폴더, 폴더별 채팅
- [x] **AI 설계 JSON 강제:** `responseMimeType: application/json`로 파싱 오류 감소
- [x] **생성 중단:** AbortController + Stop 버튼
- [x] **에러·알림:** ErrorBoundary, Sonner
- [x] **코드 하이라이트:** `react-syntax-highlighter`
- [x] **Neon* 컴포넌트 사용 중단** (NeonButton, NeonCard는 미사용)
