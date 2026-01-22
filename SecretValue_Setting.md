# 환경 변수 및 시크릿 설정 가이드

WEAV AI는 **Google Gemini**와 **OpenAI**, **Firebase**를 사용합니다.  
Vite 프로젝트이므로 **클라이언트에 노출되는 값은 `VITE_` 접두사**로 정의해야 합니다.

---

## 1. Google Gemini

채팅, Gemini 이미지, **AI 프로젝트 설계**(`planProjectStructure`)에 사용됩니다.

| 환경 변수 | 설명 | 발급 |
| :--- | :--- | :--- |
| **`VITE_API_KEY`** | Google AI Studio API Key | [Google AI Studio](https://aistudio.google.com/app/apikey) |

> **참고:** `aiService`의 `getGoogleClient`는 현재 `process.env.API_KEY`를 참조합니다. Vite에서는 `process.env`가 클라이언트에 주입되지 않으므로, `import.meta.env.VITE_API_KEY`를 쓰도록 `aiService` 수정이 필요할 수 있습니다.

---

## 2. OpenAI

SORA, ChatGPT-5.2 Instant(`gpt-5-mini`), GPT Image 1.5에 사용됩니다.

| 환경 변수 | 설명 | 발급 |
| :--- | :--- | :--- |
| **`VITE_OPENAI_API_KEY`** | OpenAI API Key | [OpenAI Platform](https://platform.openai.com/api-keys) |

---

## 3. Firebase (Google 로그인)

1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트 생성
2. Web 앱 추가 후 Config 확인
3. Authentication에서 **Google 로그인** 활성화

| 환경 변수 | 설명 |
| :--- | :--- |
| `VITE_FIREBASE_API_KEY` | API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | App ID |

---

## 4. .env 예시

프로젝트 루트에 `.env`를 만들고 (`.env.local` 사용 시 Vite가 자동 로드):

```env
# Google GenAI
VITE_API_KEY=AIzaSy...

# OpenAI
VITE_OPENAI_API_KEY=sk-proj-...

# Firebase
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

> `.env`는 GitHub 등 외부에 올리지 마세요. `.gitignore`에 포함되어 있는지 확인하세요.
