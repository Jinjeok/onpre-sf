# Discord Bot 설정 및 등록 가이드

본 가이드는 **onpre-sf (Shortcut Form Service)** 실행을 위한 Discord Bot 설정 절차를 설명합니다. 이 서비스는 채널의 메시지와 첨부파일을 읽어야 하므로 **Message Content Intent** 활성화가 필수적입니다.

## 1. Discord Application 생성

1. [Discord Developer Portal](https://discord.com/developers/applications)에 접속하여 로그인합니다.
2. 우측 상단의 **New Application** 버튼을 클릭합니다.
3. 애플리케이션 이름(예: `ShortsBot`)을 입력하고 **Create**를 클릭하여 생성합니다.

## 2. Bot 유저 생성

1. 좌측 메뉴에서 **Bot** 탭을 클릭합니다.
2. **Build-A-Bot** 섹션의 **Add Bot** 버튼을 클릭하고 확인합니다.
3. (선택 사항) 봇의 아이콘과 사용자명을 설정합니다.

## 3. Privileged Gateway Intents 활성화 (중요!)

이 서비스가 작동하려면 봇이 메시지 내용을 읽을 수 있어야 합니다.

1. **Bot** 탭에서 스크롤을 내려 **Privileged Gateway Intents** 섹션을 찾습니다.
2. 다음 항목을 **활성화(토글 켜기)** 합니다:
   - **Message Content Intent** (필수: 첨부파일 및 메시지 감지용)
   - **Server Members Intent** (선택: 필요 시 활성화)
   - **Presence Intent** (선택: 필요 시 활성화)
3. 하단의 **Save Changes** 버튼을 눌러 저장합니다.

## 4. Bot Token 발급

1. **Bot** 탭의 상단 **Build-A-Bot** 섹션으로 돌아갑니다.
2. **Token** 항목의 **Reset Token** 버튼을 클릭합니다.
3. 생성된 토큰을 복사하여 `.env` 파일의 `DISCORD_BOT_TOKEN` 값으로 붙여넣습니다.
   ```env
   DISCORD_BOT_TOKEN=여기에_복사한_토큰_붙여넣기
   ```
   > ⚠️ 토큰은 비밀번호와 같습니다. 절대 외부에 노출하지 마세요.

## 5. 서버에 Bot 초대

1. 좌측 메뉴에서 **OAuth2** -> **URL Generator** 탭을 클릭합니다.
2. **Scopes** 항목에서 `bot`을 체크합니다.
3. **Bot Permissions** 항목에서 다음 권한을 체크합니다:
   - **General Permissions**: `Read Messages/View Channels`
   - **Text Permissions**: `Send Messages`, `Attach Files`, `Read Message History` (백필 기능용)
4. 하단에 생성된 **Generated URL**을 복사합니다.
5. 웹 브라우저 주소창에 URL을 붙여넣고, 봇을 초대할 서버를 선택하여 **Authorize**를 진행합니다.

## 6. Channel ID 확인

서비스가 특정 채널의 이미지만 수집하도록 하기 위해 Channel ID가 필요합니다.

1. Discord 앱의 **사용자 설정** (좌측 하단 톱니바퀴) -> **고급 (Advanced)** 탭으로 이동합니다.
2. **개발자 모드 (Developer Mode)** 를 켭니다.
3. 봇이 활동할(이미지가 업로드될) 채널을 우클릭하고 **채널 ID 복사하기 (Copy Channel ID)** 를 클릭합니다.
4. 복사한 ID를 `.env` 파일의 `DISCORD_CHANNEL_ID` 값으로 붙여넣습니다.
   ```env
   DISCORD_CHANNEL_ID=여기에_복사한_ID_붙여넣기
   ```

## 7. 서비스 실행

모든 설정이 완료되면 Docker를 통해 서비스를 실행합니다.

```bash
docker-compose up --build
```
