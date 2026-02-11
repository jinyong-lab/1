# 사주 분석 사이트 - 개발 히스토리

## 배포 정보
- **GitHub**: https://github.com/jinyong-lab/1
- **Cloudflare Pages**: https://1-bb4.pages.dev/
- **기술 스택**: Vanilla HTML/CSS/JS + Cloudflare Workers (_worker.js) + OpenAI GPT API + YouTube Data API v3
- **만세력 라이브러리**: `@fullstackfamily/manseryeok`

---

## v3.0 - 3차 개선 (2026-02-11) `9546bd7`

### 핵심 변경: 구조화된 API 응답
**문제**: 프론트엔드가 GPT 텍스트를 regex로 파싱하여 오행/음양 데이터 추출 → 파싱 실패 시 잘못된 결과(음양 0/0, 오행 기본값)
**해결**: `/api/saju` 엔드포인트가 GPT 텍스트 + `calculatedSaju` 구조화 JSON을 함께 반환

### 수정 내역

| # | 항목 | 파일 | 내용 |
|---|------|------|------|
| 1 | 음양 0/0 수정 | `_worker.js`, `script.js` | 서버 계산 데이터를 JSON으로 전달, 프론트에서 서버 데이터 우선 사용 |
| 2 | 오행 불일치 해결 | `_worker.js`, `script.js` | GPT 텍스트 파싱 의존 제거 → `calculatedSaju.elements` 직접 사용 |
| 3 | 빈 아코디언 | `script.js` | 서버 기둥 데이터로 정확한 렌더링 |
| 4 | 키워드 툴팁 | `script.js`, `style.css` | 28개 사주 키워드 hover 시 설명 표시 (도화살, 천을귀인 등) |
| 5 | 입력 폼 가독성 | `style.css` | 라벨 13px→15px, 입력 14px→16px, 간격 확대 |
| 6 | YouTube 5곡 | `script.js`, `style.css` | 1곡→5곡 추천, 자동 재생 (iframe API postMessage) |
| 7 | 배포 수정 | `wrangler.toml` | `[build] command = "npm install"` 추가 |

### 기술 상세

**_worker.js 변경 (extractPillar 함수)**:
- `hangulStem`, `hangulBranch` 필드 추가 (한자→한글 변환)
- `/api/saju` 분기에서 early return으로 구조화된 응답 반환

**script.js 변경**:
- `getAiResponse()`: saju 타입일 때 `{ content, calculatedSaju }` 객체 반환
- `buildPillarsFromServer()`: 서버 데이터를 프론트 기둥 포맷으로 변환
- `SAJU_KEYWORDS` 사전 + `injectKeywordTooltips()` TreeWalker 기반 키워드 치환
- `renderSongList()`: 5곡 리스트 + `now-playing` 상태 관리 + 자동 진행

**style.css 변경**:
- `.keyword-tooltip` Glassmorphism 툴팁 (backdrop-filter, rgba)
- `[data-role="song-list"]` 5곡 리스트 + active 상태 스타일
- 폼 요소 크기/간격 증가

---

## v2.1 - 배포 수정 (2026-02-11) `9819671`
- `package.json`에 build 스크립트 추가
- `.github/workflows/deploy.yml` 삭제 (Cloudflare Pages 직접 Git 연결 사용)

## v2.0 - UI/UX 전면 리디자인 (2026-02-11) `d64ec7c`

### 수정 내역 (11가지)
1. 노래 추천 한국어 쿼리로 변경
2. 음양(陰陽) 분석 섹션 추가
3. 귀살/귀인 전용 분석 섹션
4. Fortune 탭 위치 변경 (노래 추천 전)
5. 보고서 스타일 상세 결과 (3000자+)
6. 에이전트 병렬 실행
7. 결과 화면 상단 짤림 수정
8. Glassmorphism 2026 디자인 적용
9. 오행 한자(木火土金水) + 고유색상 표현
10. 분석 결과 일관성 (temperature:0, seed:42)
11. 최신 CSS 트렌드 (container query, nesting, scroll-animation)

---

## v1.0 - 초기 버전
- 사주 분석 기본 기능
- OpenAI GPT 기반 사주 해석
- YouTube 노래 추천 (1곡)
- 궁합 분석
- 운세 탭 (내일운세/연애운/건강운/재물운)

---

## 프로젝트 구조

```
week/
├── index.html          # 메인 HTML (입력 폼, 결과 컨테이너)
├── style.css           # 전체 스타일 (Glassmorphism, 반응형)
├── script.js           # 프론트엔드 로직 (API 호출, 결과 렌더링)
├── _worker.js          # Cloudflare Worker (OpenAI API, YouTube API, 만세력 계산)
├── wrangler.toml       # Cloudflare Pages 설정
├── package.json        # npm 의존성 (@fullstackfamily/manseryeok)
├── CHANGELOG.md        # 이 파일
└── .gitignore          # node_modules, .wrangler, .env
```

## 환경 변수 (Cloudflare Dashboard)
- `OPENAI_API_KEY`: OpenAI API 키
- `YOUTUBE_API_KEY`: YouTube Data API v3 키
