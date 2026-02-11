# 사주 분석 웹사이트 - 개발 명세서

> **프로젝트명**: 사주로 보는 나의 운명
> **URL**: https://1-bb4.pages.dev/
> **저장소**: https://github.com/jinyong-lab/1
> **최종 업데이트**: 2026-02-11 (v3.0)

---

## 1. 프로젝트 개요

### 1.1 목적
생년월일/시/성별을 입력하면 AI 기반 사주(四柱) 분석을 제공하는 웹 서비스.
만세력 라이브러리로 정확한 사주 계산 → GPT-4o-mini로 전문가급 해석 → YouTube 음악 추천까지 원스톱 제공.

### 1.2 기술 스택

| 구분 | 기술 |
|------|------|
| **프론트엔드** | Vanilla HTML/CSS/JS (프레임워크 없음) |
| **백엔드** | Cloudflare Workers (`_worker.js`, ESM) |
| **호스팅** | Cloudflare Pages (Git 자동 배포) |
| **AI** | OpenAI GPT-4o-mini (temperature: 0, seed: 42) |
| **만세력** | `@fullstackfamily/manseryeok` v1.0.4 |
| **음악** | YouTube Data API v3 |
| **디자인** | Glassmorphism 2026 (dark/light 테마) |

### 1.3 파일 구조

```
week/
├── index.html          # 메인 페이지 (입력 폼 + 결과 컨테이너)
├── script.js           # 프론트엔드 로직 (60+ 함수, ~1600줄)
├── _worker.js          # Cloudflare Worker 백엔드 (~970줄)
├── style.css           # 전체 스타일 (100+ 컴포넌트, ~1800줄)
├── wrangler.toml       # Cloudflare Pages 설정
├── package.json        # npm 의존성
├── about.html          # 소개 페이지
├── guide.html          # 이용 가이드
├── contact.html        # 문의
├── privacy-policy.html # 개인정보 처리방침
├── CHANGELOG.md        # 개발 히스토리
├── SPEC.md             # 이 파일 (개발 명세서)
├── ROADMAP.md          # 개발 계획서
└── .gitignore          # node_modules, .wrangler, .env
```

---

## 2. 기능 명세

### 2.1 사주 분석 (핵심 기능)

#### 입력
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| 생년 | select (1924-2026) | O | 출생 연도 |
| 생월 | select (1-12) | O | 출생 월 |
| 생일 | select (1-28~31) | O | 출생 일 (월에 따라 동적) |
| 양력/음력 | radio | O | 달력 유형 |
| 생시 | select (12시진+모름) | O | 자시~해시 또는 모름 |
| 출생지 | text | O | 출생 지역 |
| 성별 | radio | O | 남/여 |
| 질문 | textarea | X | 선택적 추가 질문 |

#### 처리 흐름
```
사용자 입력 → 검증 → /api/saju 호출
  → 만세력 계산 (calculateAccurateSaju)
    → 4주 (년주/월주/일주/시주) 추출
    → 오행 분포 계산 (목/화/토/금/수)
    → 음양 균형 계산 (양 N개, 음 N개)
  → GPT 프롬프트 생성 (계산 데이터 주입)
  → OpenAI API 호출 (temp=0, seed=42)
  → 구조화된 응답 반환 { content, calculatedSaju }
```

#### 출력 (12개 섹션)
1. 요약 카드 (행운 색상/숫자/방향/행동/음악)
2. 사주 기둥 4개 (한자 + 한글 + 오행)
3. 오행 분포 차트 (한자 + 색상 + 비율)
4. 음양 분석 바 (양 N/8, 음 N/8 + 성향 설명)
5. 음양(陰陽) 분석 상세
6. 살(煞) 분석 (도화살, 역마살, 백호살 등)
7. 귀인(貴人) 분석 (천을귀인, 월덕귀인 등)
8. 성격과 재능
9. 관계/대인관계
10. 직업/재물운
11. 건강운
12. 마무리 조언

#### Fortune 카드 (5종)
- 건강운, 연애운, 재물운, 직업운, 성장운 (각 250자+)

### 2.2 상세 운세 탭 (4종)

| 탭 | API type | 내용 |
|----|----------|------|
| 내일의 운세 | `tomorrow` | 에너지 흐름, 연애/재물/직업/건강, 행운 시간/색상 |
| 연애운 | `love` | 연애 성향, 이상형, 연애 패턴, 결혼운, 월별 흐름 |
| 건강운 | `health` | 체질, 취약 장기, 맞춤 관리, 정신건강, 나이별 로드맵 |
| 재물운 | `wealth` | 재물 본질, 수입원, 투자 전략, 자산 관리, 손실 예방 |

- 지연 로딩 (탭 클릭 시 API 호출)
- 캐시: `fortuneTabCache`에 저장하여 재호출 방지

### 2.3 궁합 분석

#### 입력
- 나: 생년/월/일/시
- 상대: 생년/월/일/시
- 선택 질문

#### 출력
- 오행 조화/충돌 분석
- 성격 궁합
- 시너지 포인트
- 주의점 & 해결책
- 궁합 점수 (0-100) + 등급 (A/B/C)

### 2.4 음악 추천

| 오행 | 검색 쿼리 | 장르 |
|------|-----------|------|
| 목 | 잔잔한 어쿠스틱 감성 한국 노래 | 어쿠스틱 |
| 화 | 신나는 댄스 팝 한국 노래 | 댄스/팝 |
| 토 | 따뜻한 발라드 한국 노래 | 발라드 |
| 금 | 웅장한 OST 한국 영화음악 | OST |
| 수 | 차분한 R&B 힙합 한국 노래 | R&B/힙합 |

- 5곡 추천 (60~600초, 임베드 가능, 지역 제한 없음)
- 자동 재생: 현재 곡 종료 시 다음 곡 자동 전환
- "다시 추천" 버튼으로 새 곡 목록

### 2.5 키워드 툴팁

28개 사주 용어에 hover 시 설명 표시:
- 살: 도화살, 역마살, 백호살, 화개살, 과숙살, 현침살, 겁살, 원진살, 귀문관살, 양인살
- 귀인: 천을귀인, 천덕귀인, 월덕귀인, 문창귀인, 학당귀인, 금여귀인, 천관귀인, 태극귀인
- 십성: 식신, 상관, 편관, 정관, 편재, 정재, 편인, 정인, 비겁, 겁재

---

## 3. API 명세

### 3.1 사주 분석 API

```
GET /api/saju?type=saju&sajuData={JSON}&question={string}
```

**sajuData 구조:**
```json
{
  "year": 1995,
  "month": 3,
  "day": 15,
  "time": "09:00",
  "cal": "solar",
  "gender": "male",
  "place": "서울",
  "b_time_ext": "사시 (09~11시)"
}
```

**응답 (type=saju):**
```json
{
  "content": "## 1. 사주 요약\n...(GPT 마크다운)",
  "calculatedSaju": {
    "yearPillar": {
      "stem": "乙", "branch": "亥",
      "hangulStem": "을", "hangulBranch": "해",
      "stemElement": "목", "branchElement": "수"
    },
    "monthPillar": { ... },
    "dayPillar": { ... },
    "hourPillar": { ... },
    "elements": { "목": 2, "화": 1, "토": 2, "금": 1, "수": 2 },
    "yinYang": { "yang": 3, "yin": 5 }
  }
}
```

**응답 (type=tomorrow/love/health/wealth):**
```json
{
  "choices": [{
    "message": { "content": "GPT 마크다운 텍스트" }
  }]
}
```

### 3.2 YouTube API

```
GET /api/youtube?query={string}
```

**응답:**
```json
{
  "items": [
    {
      "videoId": "dQw4w9WgXcQ",
      "title": "노래 제목",
      "channelTitle": "채널명",
      "thumbnail": "https://i.ytimg.com/vi/.../mqdefault.jpg"
    }
  ]
}
```

**필터링 조건:**
- 재생시간: 60~600초
- 임베드 가능
- 지역 차단 없음
- 제외 키워드: medley, mix, mashup, compilation, 메들리, 모음, 연속듣기, 플레이리스트, 1시간, 2시간, cover, reaction

### 3.3 보안

| 항목 | 구현 |
|------|------|
| Rate Limiting | 10 req/min per IP (in-memory Map) |
| Input Sanitization | 코드 블록, 시스템 프롬프트, HTML 태그 제거 |
| URL 파라미터 제한 | 최대 2000자 |
| 날짜 검증 | 1900-2100년, 1-12월, 1-31일 |
| Security Headers | X-Content-Type-Options, X-Frame-Options, HSTS, CSP |
| XSS 방지 | `escapeHtml()` 전역 적용 |

---

## 4. 디자인 시스템

### 4.1 색상 팔레트

| 변수 | 다크 | 라이트 | 용도 |
|------|------|--------|------|
| `--accent-1` | `#7c66d9` | `#6c54c9` | 메인 보라 (주요 강조) |
| `--accent-2` | `#ff8a65` | `#e57550` | 오렌지 (서브 강조) |
| `--accent-3` | `#4cc9f0` | `#2db3d9` | 시안 (링크, 정보) |
| `--accent-4` | `#f5c842` | `#d4a82f` | 노랑 (경고, 별) |
| `--accent-5` | `#66bb6a` | `#4caf50` | 초록 (성공) |
| `--bg` | `#0d0f1a` | `#fafbff` | 배경 |
| `--fg` | `#e0e2f0` | `#1a1d35` | 전경 텍스트 |
| `--muted` | `rgba(255,255,255,0.5)` | `rgba(0,0,0,0.5)` | 보조 텍스트 |

### 4.2 오행 색상

| 오행 | 한자 | 그라데이션 |
|------|------|-----------|
| 목 | 木 | `#2d6a4f` → `#52b788` (초록) |
| 화 | 火 | `#e63946` → `#ff6b6b` (빨강) |
| 토 | 土 | `#e9c46a` → `#f4a261` (노랑) |
| 금 | 金 | `#adb5bd` → `#dee2e6` (은색) |
| 수 | 水 | `#1d9bf0` → `#4cc9f0` (파랑) |

### 4.3 타이포그래피

| 용도 | 폰트 | 크기 |
|------|------|------|
| 본문 | Noto Sans KR | 15-15.5px |
| 제목 | Gowun Batang | 20-28px |
| 라벨 | Noto Sans KR | 15px (Bold 600) |
| 입력 | Noto Sans KR | 16px |
| 기둥 한자 | Gowun Batang | 32-40px |

### 4.4 반응형 브레이크포인트

| 너비 | 대상 | 변경 사항 |
|------|------|----------|
| > 900px | 데스크톱 | 3열 그리드, 전체 레이아웃 |
| 600-900px | 태블릿 | 2열 그리드, 축소된 간격 |
| < 600px | 모바일 | 1열, 수직 레이아웃, 축소된 폰트 |

### 4.5 2026 CSS 트렌드 적용

- `backdrop-filter: blur(20px)` — Glassmorphism 카드
- `container-type: inline-size` — Container Queries
- `text-wrap: balance` — 제목 텍스트 균형
- `animation-timeline: view()` — Scroll-driven Animations
- `color-mix(in srgb, ...)` — 동적 색상 혼합

---

## 5. 환경 변수

| 변수 | 위치 | 설명 |
|------|------|------|
| `OPENAI_API_KEY` | Cloudflare Dashboard | OpenAI API 키 |
| `YOUTUBE_API_KEY` | Cloudflare Dashboard | YouTube Data API v3 키 |

### 배포 설정 (wrangler.toml)
```toml
name = "1"
compatibility_date = "2024-02-05"
pages_build_output_dir = "."

[build]
command = "npm install"
```

---

## 6. 외부 의존성

| 의존성 | 버전 | 용도 | 비용 |
|--------|------|------|------|
| OpenAI GPT-4o-mini | - | AI 사주 해석 | ~$0.01/분석 |
| YouTube Data API v3 | - | 음악 검색 | 무료 (10,000 units/일) |
| @fullstackfamily/manseryeok | 1.0.4 | 만세력 계산 | 무료 (npm) |
| Google Fonts | - | Noto Sans KR, Gowun Batang | 무료 |
| Google Analytics 4 | - | 사용자 분석 | 무료 |
