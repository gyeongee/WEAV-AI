# WEAV-AI 빠른 시작 가이드 (macOS)

이 문서는 macOS 환경에서 **최소 설정으로 빠르게 테스트**할 수 있도록 정리한 가이드입니다.
Docker 기반 실행을 기본으로 합니다.

---

## 0. 사전 준비

필수
- Docker Desktop
- Node.js 18 이상
- Git

계정/키
- fal.ai API Key (필수)
- Firebase 프로젝트 + Admin 키(JSON, 로그인 테스트 시 필수)

---

## 1. 저장소 클론

```bash
git clone <your-repo-url>
cd WEAV-AI
```

---

## 2. 인프라 환경 변수 설정

```bash
cp infra/.env.example infra/.env
```

`infra/.env`에 최소 항목을 채웁니다.
- `SECRET_KEY`
- `POSTGRES_PASSWORD`
- `FAL_KEY`
- `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` (로그인 테스트 시)

예시
```
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/app/firebase-admin.json
```

Firebase Admin 키 파일은 아래처럼 위치시키면 됩니다.
```
backend/firebase-admin.json
```

선택 (MinIO 로컬 디렉터리 바인드)
```
MINIO_DATA_DIR=./minio-data
```

---

## 3. 인프라 실행

```bash
cd infra
docker compose up -d --build
```

상태 확인
```bash
docker compose ps
curl http://localhost:8080/healthz
curl http://localhost:8080/api/v1/health/
```

---

## 4. DB 마이그레이션 (최초 1회)

```bash
cd ../infra
docker compose run --rm -v "$(pwd)/../backend:/app" --entrypoint "" api python manage.py migrate
```

---

## 5. 프론트 환경 변수 설정

```bash
cd ../frontend
cp .env.example .env
```

`frontend/.env`에 Firebase 키를 입력합니다.
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

로컬 API 주소는 기본값 사용
```
VITE_API_BASE_URL=http://localhost:8080
```

---

## 6. 프론트 실행

```bash
npm install
npm run dev
```

접속
- 프론트: `http://localhost:3000`
- 백엔드 API: `http://localhost:8080/api/v1/`
- MinIO 콘솔: `http://localhost:9001`

---

## 7. 빠른 테스트 체크

1) 로그인 버튼 클릭 → Google 로그인 성공
2) 목표 입력 → AI 폴더 자동 생성
3) 텍스트/이미지/비디오 생성 1건씩 확인
4) 채팅/폴더가 DB에 저장되고 새로고침 후 유지되는지 확인

---

## macOS 호환성 체크

- Docker Desktop + Docker Compose 사용
- 파일 경로는 **컨테이너 내부 경로(`/app/...`)** 기준
- 로컬 경로는 `./` 상대 경로 사용 권장

---

**마지막 업데이트**: 2026-01-28
