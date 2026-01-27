# Role
너는 시니어 풀스택 개발자이자 시스템 엔지니어야. 
현재 "Discord 기반 숏폼 랜덤 재생 서비스"를 구축하려고 해.

# Goal
아래 요구사항에 맞춰 Docker Compose 기반의 NestJS(백엔드) + React/Vite(프론트엔드) + MinIO + PostgreSQL 프로젝트 전체 코드를 작성해 줘.

# Requirements

1. **Infrastructure (Docker Compose)**
   - `postgres`, `minio`, `backend`, `frontend` 4개의 컨테이너 구성.
   - MinIO는 버킷(`shorts-media`)을 자동 생성해야 함.
   - Backend는 DB와 MinIO가 준비될 때까지 대기(Healthcheck)하거나 재시도 로직 필요.

2. **Backend (NestJS)**
   - `discord.js`를 사용해 봇 기능 구현.
   - **Feature 1 (Backfill):** 앱 시작 시 DB의 마지막 `discord_message_id`를 조회하고, 그 이후의 디스코드 메시지를 fetch 하여 누락 데이터를 수집.
   - **Feature 2 (Realtime):** `messageCreate` 이벤트를 리스닝하여 영상/이미지가 올라오면 즉시 MinIO에 스트림 업로드 후 DB 저장.
   - **Feature 3 (API):** `GET /feed` 엔드포인트 구현. `type` 쿼리(video/image)를 받아 `ORDER BY RANDOM()`으로 데이터를 반환.
   - `stream` 처리를 사용하여 서버 메모리 부하 최소화할 것.

3. **Frontend (React + Vite + Styled-components)**
   - 모바일 뷰포트(`100dvh`) 기준의 숏폼 UI.
   - PC에서는 중앙 정렬된 모바일 비율 레이아웃.
   - **CSS Scroll Snap**을 적용하여 한 번에 하나씩 넘기기.
   - 상단에 [영상], [사진] 체크박스를 두어 실시간 필터링 구현.
   - `IntersectionObserver`를 사용해 현재 보이는 비디오만 재생(나머지는 정지).

4. **Database (TypeORM)**
   - `Media` 엔티티: id, type, minioUrl, discordMessageId(Unique), createdAt.

# Constraints
- 모든 코드는 TypeScript로 작성.
- 에러 처리를 꼼꼼하게 (MinIO 연결 실패, Discord 다운로드 실패 등).
- `.env` 파일을 사용하여 민감 정보 관리.
- 프로젝트 폴더 구조를 명확히 잡고, 각 파일의 전체 코드를 제공해 줘.