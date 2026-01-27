# Project Design Document: Discord-to-Web Shorts Platform

## 1. Overview
Discord 채널에 업로드되는 영상(mp4, mov 등)과 이미지(jpg, png, gif)를 자동으로 수집하여 MinIO 스토리지에 아카이빙하고, 이를 웹 클라이언트에서 틱톡/릴스 스타일의 **'무한 스크롤(Infinite Scroll) 랜덤 뷰어'** 형태로 제공하는 개인화 서비스.

### Core Value
- **Zero-Touch Archiving:** 사용자는 Discord에 파일을 올리기만 하면 됨.
- **Permanent Storage:** Discord CDN 링크 만료 문제 해결 (MinIO에 영구 저장).
- **Random Discovery:** 오래된 추억의 짤/영상을 랜덤하게 다시 보는 즐거움.

---

## 2. Architecture & Tech Stack

### System Flow
1. **Source:** Discord Channels (Target multiple channels defined in ENV).
2. **Collector (Backend):** - **Boot:** Fetch missing past messages (Backfill).
   - **Runtime:** Listen to `messageCreate` events via WebSocket.
3. **Storage:** Stream download from Discord -> Stream upload to MinIO (No local temp files).
4. **Database:** Store metadata (minio_path, file_type, discord_msg_id) in PostgreSQL.
5. **Viewer (Frontend):** Fetch random media list -> Render Infinite Scroll View.

### Tech Stack
- **Frontend:** React (Vite), TypeScript, Styled-components, Framer Motion (optional), Intersection Observer.
- **Backend:** NestJS, TypeORM, Discord.js, MinIO Client.
- **Database:** PostgreSQL.
- **Storage:** MinIO (S3 Compatible).
- **Infrastructure:** Docker Compose (All-in-one).

---

## 3. Functional Requirements

### A. Backend (NestJS)
**1. Discord Bot Service**
- **Multi-Channel Support:** `DISCORD_CHANNEL_IDS` 환경변수(Comma separated) 파싱.
- **Smart Backfill (OnBoot):**
  - DB에서 채널별 마지막 `discord_message_id` 조회.
  - 해당 ID 이후의 메시지를 Discord API로 Fetch (Pagination 적용).
  - 누락된 데이터 자동 수집.
- **Real-time Listener:**
  - `messageCreate` 이벤트 핸들링.
  - 첨부파일(`attachments`) 필터링: MIME type `video/*`, `image/*`.
  - 중복 수집 방지 로직 필수.

**2. Storage Service**
- **Stream Processing:** `axios(stream)` -> `minioClient.putObject(stream)` 파이프라이닝.
- **Naming Convention:** `{channel_id}/{discord_message_id}_{original_filename}`.

**3. API Service**
- `GET /feed`:
  - Query Params: `?type=video,image` (Multi-select support).
  - Logic: `ORDER BY RANDOM()` (PostgreSQL) -> `LIMIT 10`.
  - Response: Media list with public MinIO URLs.

### B. Frontend (React)
**1. UI/UX**
- **Viewport:** Mobile-first design (`100dvh`). PC에서는 중앙 정렬 Container (Max-width 480px).
- **Navigation:** Vertical Snap Scroll (CSS `scroll-snap-type: y mandatory`).
- **Media Player:**
  - Video: `autoplay`, `muted`, `loop`, `playsInline`.
  - Visibility Check: 현재 뷰포트에 들어온 슬라이드만 재생, 벗어나면 정지.

**2. Filter Control**
- Overlay UI (Top-center).
- Checkbox: [v] Video / [v] Image.
- 상태 변경 시 리스트 초기화 및 API 재호출.

---

## 4. Database Schema (PostgreSQL)

**Table: `media`**

| Column Name        | Type        | Constraints          | Description                   |
|--------------------|-------------|----------------------|-------------------------------|
| `id`               | UUID        | PK, Generated        |                               |
| `type`             | ENUM        | 'video', 'image'     | 미디어 타입                   |
| `minio_url`        | VARCHAR     | Not Null             | MinIO Public URL              |
| `discord_msg_id`   | VARCHAR     | Unique, Not Null     | 중복 방지용 디스코드 메시지 ID |
| `original_channel` | VARCHAR     | Not Null             | 출처 채널 ID                  |
| `created_at`       | TIMESTAMP   | Default NOW()        | 수집 일시                     |

---

## 5. Infrastructure (Docker Compose)

### Services
1. **postgres**: Port 5432. Volume `pgdata`.
2. **minio**: Port 9000(API), 9001(Console). Volume `minio_data`. Command `server /data`.
3. **backend**: Port 3000. Depends on `postgres`, `minio`.
4. **frontend**: Port 5173. Depends on `backend`.

### Environment Variables (.env)
```ini
# Discord
DISCORD_TOKEN=your_token_here
DISCORD_CHANNEL_IDS=123456789,987654321

# DB
DB_HOST=postgres
DB_PORT=5432
DB_USER=admin
DB_PASS=password
DB_NAME=shorts_db

# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=password
MINIO_BUCKET=shorts-media
MINIO_PUBLIC_ENDPOINT=http://localhost:9000
```