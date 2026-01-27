# WEAV-AI Windows 빠른 실행 가이드

이 문서는 Windows 환경에서 **빠르게 테스트**할 수 있도록 정리한 가이드입니다.
권장 환경은 **Windows 11 + Docker Desktop + WSL2** 입니다.

---

## 0. 준비 사항

필수
- Docker Desktop (WSL2 기반)
- Node.js 18 이상
- Git

계정/키
- fal.ai API Key (필수)
- Firebase 프로젝트 + Admin 키(JSON, 로그인 테스트 시 필수)

---

## 1. 저장소 클론

PowerShell 또는 WSL에서 실행합니다.

```bash
git clone <your-repo-url>
cd WEAV-AI
```

---

## 2. 환경 변수 설정

### 2-1) infra/.env

```powershell
copy infra\.env.example infra\.env
```

`infra/.env`에 최소 항목을 채웁니다.
- `SECRET_KEY`
- `POSTGRES_PASSWORD`
- `FAL_KEY`
- `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` (로그인 테스트 시)

Firebase Admin 키 파일 위치 예시
- `backend\firebase-admin.json` 에 저장
- `FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/app/firebase-admin.json` 로 설정

중요
- **Windows 경로(C:\...)가 아니라 컨테이너 경로(/app/...)**를 사용해야 합니다.

선택 (MinIO 로컬 디렉터리 바인드)
```
MINIO_DATA_DIR=./minio-data
```

---

### 2-2) frontend/.env

```powershell
copy frontend\.env.example frontend\.env
```

필수 값
- `VITE_API_BASE_URL=http://localhost:8080`
- Firebase 관련 키들

---

## 3. Docker Desktop 설정 (필수)

- WSL2 활성화
- 프로젝트 폴더 드라이브 공유 허용

공유가 안되면 컨테이너에서 코드가 보이지 않습니다.

---

## 4. 인프라 실행

PowerShell 기준

```powershell
cd infra
docker compose up -d --build
```

상태 확인

```powershell
docker compose ps
curl http://localhost:8080/healthz
curl http://localhost:8080/api/v1/health/
```

---

## 5. DB 마이그레이션 (최초 1회)

PowerShell 기준

```powershell
cd ..
docker compose -f infra\docker-compose.yml run --rm -v "${PWD}\backend:/app" --entrypoint "" api python manage.py migrate
```

WSL 기준

```bash
cd /mnt/c/Users/<you>/Documents/GitHub/WEAV-AI
docker compose -f infra/docker-compose.yml run --rm -v "$(pwd)/backend:/app" --entrypoint "" api python manage.py migrate
```

---

## 6. 프론트 실행

```powershell
cd frontend
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

## Windows 호환성 체크

- WSL2 권장 (파일 공유 안정성)
- 경로는 컨테이너 내부 기준(`/app/...`)
- PowerShell 경로는 `\` 사용

---

**마지막 업데이트**: 2026-01-28
