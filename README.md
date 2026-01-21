# WEAV AI Monochrome

목표 지향적(Goal-Oriented) AI 워크플로우를 제공하는 웹 애플리케이션입니다.  
**Google Gemini**와 **OpenAI** 멀티 모델, **AI 프로젝트 설계**(목표 → 단계별 채팅방·모델·페르소나 자동 설계), 온보딩·페르소나·프롬프트 템플릿을 지원합니다.

---

## 설치 및 실행

**필수:** Node.js 18+

1. 의존성 설치  
   `npm install`  
   (React 19 등 peer 충돌 시 `npm install --legacy-peer-deps`)

2. 환경 변수  
   프로젝트 루트 `.env` 파일에 API 키 설정.  
   → 자세한 항목·발급처: [SecretValue_Setting.md](./SecretValue_Setting.md)

3. 실행  
   `npm run dev`  
   → http://localhost:3000/

---

## 현재 구현

- **데이터 영속성:** `localStorage` (최근 채팅 `weav_recent_chats`, 폴더 `weav_folders`, 폴더별 채팅 `weav_folder_chats`, 페르소나·프롬프트)
- **상태·구조:** `ChatContext`, `FolderContext`, `AuthContext` / `react-router-dom` / `App` 로직 분리
- **AI:** `aiService` (Gemini, OpenAI 스트리밍·이미지·비디오), `planProjectStructure`(목표→JSON 프로젝트 설계)
- **UX:** 생성 중단(AbortController), Sonner 토스트, ErrorBoundary, `react-syntax-highlighter` 코드 하이라이트, 온보딩·설정 모달

---

## 참고 · 남은 과제

- **API 키:** 클라이언트에서 `import.meta.env.VITE_*` 사용. 장기적으로는 백엔드(Next.js API, Firebase Functions 등) 프록시 권장.
- **토큰·컨텍스트:** 대화 길이·파일 첨부 시 슬라이딩 윈도우·요약·RAG 등 확장 여지.
- **파일 업로드:** PDF/문서 텍스트 추출(파서) 선행 후 업로드 UI·로직 구현.
