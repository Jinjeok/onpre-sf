# Discord-to-Web Shorts Platform (onpre-sf)

Discord 채널에 업로드된 미디어를 자동으로 수집하여 개인 웹 피드 형태로 제공하는 서비스입니다.

## 주요 기능
- **자동 수집**: Discord 채널의 메시지를 감시하여 영상/이미지 수집
- **영구 저장**: Discord 링크 만료 걱정 없이 MinIO에 안전하게 보관
- **무한 스크롤**: 틱톡/릴스 스타일의 세로형 랜덤 미디어 뷰어

---

## 🚀 시작하기

### 📝 환경 변수 설정
실행 전 `.env` 파일을 생성하고 필요한 값을 입력하세요. (`.env.example` 참고)

### 🛠️ 개발 모드로 실행
소스 코드 수정 시 실시간으로 반영되는 모드입니다. (HMR 활성화)

```bash
docker-compose up --build
```

### 🏗️ 프로덕션 모드로 실행 (권장)
서버 부하를 최소화하고 안정적인 서빙을 위한 모드입니다. (Nginx 사용)

```bash
# 서버 과부하(docker-proxy CPU 점유)를 방지하기 위해 이 방식을 권장합니다.
docker-compose -f docker-compose.prod.yml up --build -d
```

---

## 📂 프로젝트 구조

- **backend**: NestJS 기반 수집기 및 API 서버
- **frontend**: React (Vite) 기반 웹 클라이언트
- **data**: PostgreSQL 및 MinIO 데이터 저장소 (로컬 볼륨)

## 🔧 주요 구성 요소

- **Database**: PostgreSQL (메타데이터 저장)
- **Storage**: MinIO (S3 호환 오브젝트 스토리지)
- **Frontend Server**: Nginx (프로덕션 환경 정적 서빙)

---

## ❓ 문제 해결

### `docker-proxy` CPU 점유가 너무 높을 때
Vite 개발 서버의 HMR(Hot Module Replacement) WebSocket 연결이 많아질 경우 발생할 수 있습니다. 위 **프로덕션 모드** 명령어로 재시작하면 해결됩니다.

```bash
docker-compose down
docker-compose -f docker-compose.prod.yml up --build -d
```
