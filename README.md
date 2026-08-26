# 청사진의 시대 — 컬러링 페이지 / 캐리커처 부스 (Render 배포 버전)

사진을 찍으면 AI가 그림으로 바꿔주는 프로그램입니다.
**Render라는 무료 호스팅 서비스에 올려두면, 노트북 없이도 인터넷 되는 아무 wifi에서나 작동해요.**

Vercel이 아니라 Render를 쓰는 이유: Vercel 무료 플랜은 요청 하나에 10초 시간제한이 있어서
AI가 그림 그리는 시간(10~20초)을 못 버틸 수 있어요. Render는 이 제한이 없습니다.

---

## 1. 배포 준비물

- 깃허브(GitHub) 계정 (없으면 무료로 만들면 됩니다)
- Render 계정 (깃허브 계정으로 바로 가입 가능, 무료)
- Gemini API 키 + 결제 카드 등록 (이미 하셨죠? 그거 그대로 씁니다)

---

## 2. 배포하는 방법 (한 번만 하면 됨)

### ① 깃허브에 코드 올리기
1. https://github.com 접속 → 계정 없으면 가입
2. 오른쪽 위 "+" 버튼 → "New repository" 클릭
3. 이름 아무거나 입력 (예: `coloring-booth`) → "Create repository"
4. "uploading an existing file" 링크 클릭
5. `coloring-booth` 폴더 안의 파일/폴더 전부 드래그해서 업로드 (`node_modules`는 빼고)
6. "Commit changes" 클릭

### ② Render에 연결하기
1. https://render.com 접속 → "Get Started" → "Continue with GitHub"로 로그인
2. "New +" 버튼 → "Web Service" 클릭
3. 방금 만든 `coloring-booth` 저장소를 찾아서 "Connect"
4. 설정 입력:
   - Name: 아무 이름 (예: `coloring-booth`)
   - Region: Singapore 또는 가까운 지역
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: **Free** 선택
5. "Environment Variables" 섹션에서 아래 추가:
   - `GEMINI_API_KEY` = (발급받은 키)
   - `GEMINI_IMAGE_MODEL` = `gemini-2.5-flash-image`
   - `MAX_DAILY_CALLS` = `1000`
6. "Create Web Service" 클릭
7. 2~5분 기다리면 배포 완료! `https://coloring-booth-xxxx.onrender.com` 같은 주소가 생겨요

---

## 3. 축제 당일 사용법

- 태블릿 브라우저에서 배포된 주소로 접속:
  - `https://coloring-booth-xxxx.onrender.com` → 컬러링 페이지 모드
  - `https://coloring-booth-xxxx.onrender.com/caricature.html` → 캐리커처 모드
- 인터넷 되는 wifi 아무거나 연결되어 있으면 됩니다

**중요 — 부스 열기 전에 꼭 하세요**: 15분 동안 아무도 안 쓰면 서버가 잠들어요. 첫 방문객 전에
아무 기기로든 그 주소에 미리 한 번 접속해서 "깨워두세요" (30~60초 정도 걸릴 수 있어요). 그 이후엔
계속 쓰는 동안 빠르게 유지돼요.

---

## 4. 코드를 수정하고 싶을 때 (프롬프트 문구 등)

1. `lib/app.js` 안의 `PROMPT`, `CARICATURE_STYLES`, `INK_PROMPT` 수정
2. 깃허브 저장소에서 해당 파일 열기 → 연필 아이콘(수정) → 내용 붙여넣기 → "Commit changes"
3. Render가 자동으로 몇 분 안에 새 버전을 다시 배포해줘요

---

## 5. 로컬(노트북)에서 미리 테스트하고 싶을 때

1. `.env.example`을 복사해서 `.env`로 만들고 키 입력
2. `npm install`
3. `npm start`
4. 터미널에 뜨는 주소로 같은 wifi의 태블릿에서 접속

---

## 6. 비용 안내

- 이미지 1장당 약 0.039달러(약 57원)
- 컬러링 페이지 모드: 1인당 1번 호출
- 캐리커처 모드: 최소 1인당 2번 호출(스타일 선택 + 흑백 변환)
- [Google Cloud 콘솔 → 결제 → 예산 및 알림]에서 지출 알림 설정 권장
- `.env`(로컬) 또는 Render 환경변수의 `MAX_DAILY_CALLS`로 하루 최대 호출 수 제한 가능
- Render 자체는 이 정도 사용량이면 무료 플랜(월 750시간 제공)으로 충분해요

---

## 7. 문제가 생기면

| 증상 | 원인/해결 |
|---|---|
| 배포는 됐는데 사진 넣으면 에러 | Render 대시보드 → Environment에 `GEMINI_API_KEY`를 넣었는지 확인. 넣은 후엔 자동으로 재배포됨 |
| 처음 접속 시 30~60초 동안 안 뜸 | 정상이에요, 서버가 잠에서 깨는 중. 부스 열기 전 미리 한 번 접속해두면 방지됨 |
| "limit: 0" 또는 quota exceeded | 결제 카드 등록이 안 되어 있는 상태 |
| "하루 최대 호출 수를 넘었어요" | Render 환경변수의 `MAX_DAILY_CALLS` 값을 늘리고 저장(자동 재배포됨) |
| 배포 자체가 실패함 | Render 대시보드의 "Logs" 탭에서 에러 확인, 화면 캡처해서 알려주시면 봐드릴게요 |

---

## 8. 미리 꼭 테스트해보세요

행사 전날 실제 얼굴 사진 몇 장으로 미리 배포된 주소에서 테스트해보는 걸 강력 추천드립니다.
- AI가 거부하는 경우가 얼마나 되는지
- 4가지 스타일 결과물이 마음에 드는지
- 실제 행사장이 아닌 다른 wifi/데이터에서도 잘 되는지
