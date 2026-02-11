// _worker.js - Cloudflare Pages Worker for Saju Analysis Site

import { calculateSaju, lunarToSolar } from '@fullstackfamily/manseryeok';

// --- Element Mapping Constants ---
const STEM_ELEMENTS = {
  '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
  '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수'
};

const BRANCH_ELEMENTS = {
  '子': '수', '丑': '토', '寅': '목', '卯': '목', '辰': '토', '巳': '화',
  '午': '화', '未': '토', '申': '금', '酉': '금', '戌': '토', '亥': '수'
};

const STEM_YINYANG = {
  '甲': '양', '乙': '음', '丙': '양', '丁': '음', '戊': '양',
  '己': '음', '庚': '양', '辛': '음', '壬': '양', '癸': '음'
};
const BRANCH_YINYANG = {
  '子': '양', '丑': '음', '寅': '양', '卯': '음', '辰': '양', '巳': '음',
  '午': '양', '未': '음', '申': '양', '酉': '음', '戌': '양', '亥': '음'
};

// --- Rate Limiting (in-memory) ---
const rateLimitMap = new Map();
const RATE_LIMIT = 10; // requests per minute per IP
const RATE_WINDOW = 60000; // 1 minute in ms

function checkRateLimit(ip) {
  const now = Date.now();
  // Inline cleanup: remove expired entries on each check
  if (rateLimitMap.size > 100) {
    for (const [key, rec] of rateLimitMap) {
      if (now - rec.start > RATE_WINDOW) rateLimitMap.delete(key);
    }
  }
  const record = rateLimitMap.get(ip);
  if (!record || now - record.start > RATE_WINDOW) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return true;
  }
  record.count++;
  return record.count <= RATE_LIMIT;
}

// Parse ISO 8601 duration (PT4M13S) to seconds
function parseDuration(duration) {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) {
    console.warn(`Failed to parse duration: ${duration}`);
    return 0;
  }
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  return totalSeconds;
}


// --- Prompt Injection Sanitization ---
function sanitizeQuestion(text) {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\b(system|assistant|user|human|ai|claude|gpt)\s*[:：]/gi, '')
    .replace(/\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N}\s.,!?·~()（）\-]/gu, '')
    .trim()
    .slice(0, 500);
}

// --- Security Headers ---
const BASE_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

const CSP_VALUE = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://www.youtube.com https://www.googletagmanager.com https://www.google-analytics.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https: blob:; frame-src https://www.youtube-nocookie.com https://www.youtube.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google; connect-src 'self' https://pagead2.googlesyndication.com https://www.google-analytics.com https://www.googletagmanager.com;";

function addSecurityHeaders(response, isHtml = false) {
  const newResponse = new Response(response.body, response);
  for (const [key, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    newResponse.headers.set(key, value);
  }
  if (isHtml) {
    newResponse.headers.set('Content-Security-Policy', CSP_VALUE);
  }
  return newResponse;
}

function apiResponse(data, status = 200) {
  const body = JSON.stringify(data);
  const response = new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
  for (const [key, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

// --- Input Validation Helpers ---
function validateUrlParams(url) {
  for (const [, value] of url.searchParams) {
    if (value && value.length > 2000) {
      return 'URL parameter exceeds maximum allowed length.';
    }
  }
  return null;
}

function validateDateFields(obj, label) {
  if (typeof obj !== 'object' || obj === null) {
    return `${label}: invalid data structure.`;
  }
  const year = Number(obj.year);
  const month = Number(obj.month);
  const day = Number(obj.day);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) {
    return `${label}: year must be between 1900 and 2100.`;
  }
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    return `${label}: month must be between 1 and 12.`;
  }
  if (!Number.isFinite(day) || day < 1 || day > 31) {
    return `${label}: day must be between 1 and 31.`;
  }
  return null;
}

// --- Core Business Logic (unchanged) ---

/**
 * Calculate accurate saju using the manseryeok library
 * @param {Object} sajuData - Object containing year, month, day, time, cal (calendar type)
 * @returns {Object} Calculated saju with yearPillar, monthPillar, dayPillar, hourPillar, elements
 */
function calculateAccurateSaju(sajuData) {
  try {
    // Map time value to hour and minute
    // time 0 = 23:30 (자시), time 1 = 01:30 (축시), time 2 = 03:30 (인시), etc.
    // time -1 (모름) = use 12:00 as default
    const timeToHourMin = {
      '-1': [12, 0],  // 모름
      '0': [23, 30],  // 자시 (23:00-01:00)
      '1': [1, 30],   // 축시 (01:00-03:00)
      '2': [3, 30],   // 인시 (03:00-05:00)
      '3': [5, 30],   // 묘시 (05:00-07:00)
      '4': [7, 30],   // 진시 (07:00-09:00)
      '5': [9, 30],   // 사시 (09:00-11:00)
      '6': [11, 30],  // 오시 (11:00-13:00)
      '7': [13, 30],  // 미시 (13:00-15:00)
      '8': [15, 30],  // 신시 (15:00-17:00)
      '9': [17, 30],  // 유시 (17:00-19:00)
      '10': [19, 30], // 술시 (19:00-21:00)
      '11': [21, 30], // 해시 (21:00-23:00)
    };

    const [hour, minute] = timeToHourMin[String(sajuData.time)] || [12, 0];

    let year = Number(sajuData.year);
    let month = Number(sajuData.month);
    let day = Number(sajuData.day);

    // Convert lunar to solar if needed
    if (sajuData.cal === 'lunar') {
      const lunarResult = lunarToSolar(year, month, day);
      if (lunarResult && lunarResult.solar) {
        year = lunarResult.solar.year;
        month = lunarResult.solar.month;
        day = lunarResult.solar.day;
      }
    }

    // Calculate saju using Seoul longitude
    const result = calculateSaju(year, month, day, hour, minute, { longitude: 126.978 });

    // Extract pillars from result (format: yearPillar, monthPillar, dayPillar, hourPillar)
    // Each pillar is a string like "甲子"
    const extractPillar = (pillarStr) => {
      if (!pillarStr || pillarStr.length !== 2) return null;
      const stem = pillarStr[0];
      const branch = pillarStr[1];
      const stemElement = STEM_ELEMENTS[stem] || '?';
      const branchElement = BRANCH_ELEMENTS[branch] || '?';
      return { stem, branch, stemElement, branchElement };
    };

    const yearPillar = extractPillar(result.yearPillarHanja);
    const monthPillar = extractPillar(result.monthPillarHanja);
    const dayPillar = extractPillar(result.dayPillarHanja);
    const hourPillar = extractPillar(result.hourPillarHanja);

    // Count elements from all 8 characters (4 stems + 4 branches)
    const elements = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
    const pillars = [yearPillar, monthPillar, dayPillar, hourPillar];

    pillars.forEach(pillar => {
      if (pillar) {
        const stemElement = STEM_ELEMENTS[pillar.stem];
        const branchElement = BRANCH_ELEMENTS[pillar.branch];
        if (stemElement) elements[stemElement] = (elements[stemElement] || 0) + 1;
        if (branchElement) elements[branchElement] = (elements[branchElement] || 0) + 1;
      }
    });

    // 음양 계산 (4천간 + 4지지 = 8글자)
    let yangCount = 0, yinCount = 0;
    pillars.forEach(pillar => {
      if (pillar) {
        if (STEM_YINYANG[pillar.stem] === '양') yangCount++; else yinCount++;
        if (BRANCH_YINYANG[pillar.branch] === '양') yangCount++; else yinCount++;
      }
    });

    return {
      yearPillar,
      monthPillar,
      dayPillar,
      hourPillar,
      elements,
      yinYang: { yang: yangCount, yin: yinCount }
    };
  } catch (error) {
    console.error('calculateAccurateSaju error:', error);
    return null;  // Fallback to old behavior
  }
}

async function callOpenAi(apiKey, messages) {
  const apiRequestBody = {
    model: 'gpt-4o-mini',
    messages: messages,
    temperature: 0,      // 일관된 결과를 위해 0으로 설정
    seed: 42,            // 재현 가능성을 위한 고정 seed
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(apiRequestBody)
  });

  const openAiResponse = new Response(response.body, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' }
  });
  for (const [key, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    openAiResponse.headers.set(key, value);
  }
  return openAiResponse;
}

async function handleYouTubeRequest(request, env) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query');
  const YOUTUBE_API_KEY = env.YOUTUBE_API_KEY;
  const region = request.cf?.country || 'US';

  if (!query) {
    return apiResponse({ error: { message: 'Missing query parameter.' } }, 400);
  }

  // Input validation: limit query length
  if (query.length > 200) {
    return apiResponse({ error: { message: 'Query exceeds maximum length of 200 characters.' } }, 400);
  }

  if (!YOUTUBE_API_KEY) {
    console.error('⚠️ YOUTUBE_API_KEY is not set in environment variables.');
    return apiResponse({
      error: {
        message: 'YouTube API 키가 설정되지 않았습니다. Cloudflare Pages 설정에서 환경변수를 추가해주세요.'
      }
    }, 500);
  }

  const apiUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  const enhancedQuery = `${query} MV`;
  apiUrl.search = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    videoCategoryId: '10',
    maxResults: '20',
    q: enhancedQuery,
    safeSearch: 'moderate',
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    regionCode: 'KR',
    key: YOUTUBE_API_KEY,
  }).toString();

  const response = await fetch(apiUrl.toString());

  if (!response.ok) {
    const errorText = await response.text();
    console.error('YouTube search failed:', response.status, errorText);
    return apiResponse({
      error: {
        message: `YouTube 검색 실패 (${response.status}): ${errorText.slice(0, 100)}`
      }
    }, response.status);
  }

  const data = await response.json();

  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items = rawItems
    .map(item => ({
      videoId: item?.id?.videoId,
      title: item?.snippet?.title || '',
      channelTitle: item?.snippet?.channelTitle || '',
      thumbnail: item?.snippet?.thumbnails?.medium?.url || item?.snippet?.thumbnails?.default?.url || ''
    }))
    .filter(item => item.videoId)
    .filter(item => {
      const title = item.title.toLowerCase();
      const excludeKeywords = [
        'medley', 'mix', 'mashup', 'compilation',
        '메들리', '믹스', '모음집', '합본',
        '연속듣기', '플레이리스트',
        '1시간', '2시간', '3시간', '4시간', '10시간',
        'playlist', 'hour', '연속재생', '모아듣기',
        '논스톱', 'nonstop',
        '#shorts', 'shorts', '#쇼츠', '쇼츠', 'tiktok',
        'cover', '커버', 'reaction', '리액션'
      ];
      return !excludeKeywords.some(keyword => title.includes(keyword));
    });

  if (!items.length) {
    return apiResponse({ error: { message: 'No results found.' } }, 404);
  }

  const idParam = items.map(item => item.videoId).join(',');
  const detailUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
  detailUrl.search = new URLSearchParams({
    part: 'status,contentDetails',
    id: idParam,
    key: YOUTUBE_API_KEY,
  }).toString();

  let filteredItems = items;
  try {
    const detailResponse = await fetch(detailUrl.toString());
    const detailData = await detailResponse.json();
    if (detailResponse.ok && Array.isArray(detailData.items)) {
      const detailMap = new Map();
      detailData.items.forEach(item => {
        detailMap.set(item.id, {
          embeddable: item?.status?.embeddable !== false,
          blocked: item?.contentDetails?.regionRestriction?.blocked || [],
          duration: parseDuration(item?.contentDetails?.duration)
        });
      });
      filteredItems = items.filter(item => {
        const detail = detailMap.get(item.videoId);
        if (!detail) {
          console.warn(`No detail for ${item.videoId}, excluding`);
          return false;  // detail 없으면 제외
        }
        if (!detail.embeddable) return false;
        if (Array.isArray(detail.blocked) && detail.blocked.includes(region)) return false;
        // Filter: min 60s (exclude Shorts), max 600s (exclude compilations)
        if (detail.duration < 60 || detail.duration > 600) {
          return false;
        }
        return true;
      }).slice(0, 5); // Limit to 5 results
      // 필터링 후 결과가 없으면 빈 배열 반환 (긴 영상 반환 방지)
      if (!filteredItems.length) {
        console.warn('All videos filtered out due to duration/embeddability');
        filteredItems = [];
      }
    }
  } catch (_err) {
    console.warn('YouTube detail fetch failed, returning empty results');
    filteredItems = [];
  }

  return apiResponse({ items: filteredItems }, 200);
}

function getSajuPrompt(sajuData, question) {
  const systemPrompt = `당신은 사주(四柱) 분석 전문 역학가입니다. 정확하고 풍부한 분석을 한국어로 제공하세요.
- 분석은 한국어로만 작성합니다. 영어 표현(예: User's Information)은 절대 쓰지 마세요.
- 마크다운 문법을 사용하되 표는 사용하지 마세요.
- 각 섹션 앞에 이모티콘을 넣고, 핵심 키워드는 **볼드** 표시하세요.
- **보고서 형식 (필수)**:
  * 각 섹션은 **최소 10~15문장**으로 매우 상세하게 작성하세요.
  * 각 섹션 첫 문장은 핵심 요약으로 시작하세요.
  * 각 섹션 마지막에 속담이나 비유를 추가하세요.
  * 전체 분석 길이: **최소 4000자 이상**으로 충실하게 작성하세요.
  * 은유적이고 문학적인 감성을 담은 표현을 사용해주세요.
  * 천간/지지 의미를 생활 속 실용적 조언으로 풀어주세요.`;

  const calLabel = sajuData.cal === 'lunar' ? '음력' : '양력';
  const genderLabel = sajuData.gender === 'female' ? '여자' : '남자';

  // Calculate accurate saju
  const calculatedSaju = calculateAccurateSaju(sajuData);

  // 만세력: 대운 계산 (10년 주기)
  const currentYear = new Date().getFullYear();
  const birthYear = Number(sajuData.year);
  const age = currentYear - birthYear;
  const daeunStart = Math.floor(age / 10) * 10; // 현재 대운 시작 나이
  const daeunYears = `${daeunStart}세~${daeunStart+9}세`;

  // 세운 (올해)
  const saeun = `${currentYear}년 (${age}세)`;

  let userPrompt = `아래 정보를 바탕으로 깊이있고 폭이 넓은 사주 분석을 작성해주세요.

**사용자 정보**
- 생년월일: ${sajuData.year}년 ${sajuData.month}월 ${sajuData.day}일 (${sajuData.b_time_ext})
- 달력: ${calLabel}
- 성별: ${genderLabel}
- 출생지: ${sajuData.place || '미입력'}`;

  // Add calculated saju information if available
  if (calculatedSaju && calculatedSaju.yearPillar) {
    const yangCount = calculatedSaju.yinYang.yang;
    const yinCount = calculatedSaju.yinYang.yin;
    let yinYangBalance;
    if (yangCount === yinCount) {
      yinYangBalance = '완벽한 균형(4:4)은 조화로운 성격을 의미합니다.';
    } else if (yangCount > yinCount) {
      yinYangBalance = '양이 우세하면 적극적이고 외향적인 성격입니다.';
    } else {
      yinYangBalance = '음이 우세하면 차분하고 내면적인 성격입니다.';
    }

    userPrompt += `

**정확하게 계산된 사주**
- 년주(年柱): ${calculatedSaju.yearPillar.stem}${calculatedSaju.yearPillar.branch} (천간: ${calculatedSaju.yearPillar.stemElement}, 지지: ${calculatedSaju.yearPillar.branchElement})
- 월주(月柱): ${calculatedSaju.monthPillar.stem}${calculatedSaju.monthPillar.branch} (천간: ${calculatedSaju.monthPillar.stemElement}, 지지: ${calculatedSaju.monthPillar.branchElement})
- 일주(日柱): ${calculatedSaju.dayPillar.stem}${calculatedSaju.dayPillar.branch} (천간: ${calculatedSaju.dayPillar.stemElement}, 지지: ${calculatedSaju.dayPillar.branchElement})
- 시주(時柱): ${calculatedSaju.hourPillar.stem}${calculatedSaju.hourPillar.branch} (천간: ${calculatedSaju.hourPillar.stemElement}, 지지: ${calculatedSaju.hourPillar.branchElement})
- 오행 분포: 목 ${calculatedSaju.elements.목}개, 화 ${calculatedSaju.elements.화}개, 토 ${calculatedSaju.elements.토}개, 금 ${calculatedSaju.elements.금}개, 수 ${calculatedSaju.elements.수}개
- 음양 분포: 양 ${yangCount}개, 음 ${yinCount}개 (총 8글자 중)
- 현재 대운: ${daeunYears}
- 올해 세운: ${saeun}

아래 정확하게 계산된 사주를 해석해주세요. 음양 분석에서는 "${yinYangBalance}" 이 점을 반드시 고려하세요.`;
  } else {
    userPrompt += `

**사주 표기 규칙**
- 반드시 한자 + 한글 병기: 예) 년주: 갑자(甲子)
- 로마자 표기는 사용하지 마세요.
- 사주 정보는 항상 정확하게 계산하세요.`;
  }

  userPrompt += `

**요약 카드 (정확히 아래 형식 준수)**
- 한줄요약: ...
- 키워드: ..., ..., ...
- 행운색: ...
- 행운숫자: ...
- 행운방향: ...
- 추천행동: ...
- 추천음악: ...

**본 분석**
1. **사주 기둥의 핵심 하이라이트**: 사주 기둥(년주·월주·일주·시주)를 한자+한글로 정확하게 표기하고, 각 기둥의 특징을 짚어주세요.
2. **오행(목·화·토·금·수) 분석**: 강약, 균형, 보완 요소를 자세히 설명하고, 반드시 "목 N개, 화 N개, 토 N개, 금 N개, 수 N개" 형태로 정리한 후 바로 설명하세요.
3. **☯ 음양(陰陽) 분석**
핵심: 음양 균형이 운명의 흐름에 미치는 영향
${calculatedSaju && calculatedSaju.yinYang ? `
- 양(${calculatedSaju.yinYang.yang}개): 외향성, 활동성, 적극성, 남성성
- 음(${calculatedSaju.yinYang.yin}개): 내향성, 수용성, 소극성, 여성성` : ''}
- 음양 비율에 따른 건강, 대인관계, 직업 적성을 구체적으로 설명하세요.
- 각 천간·지지의 음양 속성을 명시하세요.
- 음양의 균형/불균형이 성격, 건강, 대인관계에 미치는 영향을 최소 12문장 이상으로 자세히 풀어주세요.
4. **🔥 살(煞) 분석**: 사주에 존재하는 살(도화살, 역마살, 백호살, 과숙살, 현침살, 양인살, 화개살, 괴강살 등)을 정확히 찾아내고, 각 살의 이름을 소제목으로 나열한 뒤, 의미·영향·실생활 대처법을 각각 5문장 이상으로 자세히 설명해주세요.
5. **⭐ 귀인(貴人) 분석**: 사주에 존재하는 귀인(천을귀인, 천덕귀인, 월덕귀인, 문창귀인, 학당귀인 등)을 찾아내고, 각 귀인의 이름을 소제목으로 나열한 뒤, 의미·가져다주는 복·활용법을 각각 5문장 이상으로 상세히 설명해주세요.
6. **대운(大運) 분석**: 현재 대운 시기(${daeunYears})와 향후 주요 대운 전환기를 명시하고, 각 시기별 운세 흐름과 주의사항을 자세히 알려주세요.
7. **성격과 재능**: 일주, 일간, 십이운성이 나타내는 성향과 함께 자세히 분석해주세요.
8. **관계/대인관계**: 어울리는 사람의 특징과, 추천 커뮤니케이션 방법을 알려주세요.
9. **직업/재물운**: 적성 분야, 시기에 맞는 돈 흐름과, 재무 관리 방법을 제공해주세요.
10. **건강운**: 취약 포인트와 생활밀착 관리법을 제공해주세요.
11. **시기별 운세 흐름**: 단기/중기/장기 흐름을 자세히 알려주세요.
12. **마무리 조언 및 한 줄 메시지**: 따뜻한 메시지를 남겨주세요.

**운세 카드 (정확히 아래 형식 준수)**
- 건강운: ... (첫 줄에 요약 작성)
  이어지는 줄에서 상세한 내용으로 작성하세요. "원인:", "상세 해석:", "추천 행동:" 등으로 소제목을 정리하고, 줄바꿈으로 구분해 주세요. 속담이나 비유도 추가하세요.
- 연애운: ...
  이어지는 줄에서 상세한 내용으로 작성하세요.
- 재물운: ...
  이어지는 줄에서 상세한 내용으로 작성하세요.
- 직업운: ...
  이어지는 줄에서 상세한 내용으로 작성하세요.
- 성장운: ...
  이어지는 줄에서 상세한 내용으로 작성하세요.

**작성 팁**
- 각 섹션 안에 "핵심 하이라이트" 속담 1~2개를 넣어주세요.
- 은유적이고 컬러풀한 표현(예: 봄바람의 기운, 청명한 여명)을 사용해주세요.
- 운세 카드는 각각 독립적 분석이며, 각 항목 최소 6줄 이상, 250자 이상으로 상세 작성하고 추천 팁 1~2개를 마지막 앞에 삽입하세요.

마지막으로 반드시 아래 정보를 추가하세요.
### 오행: [목/화/토/금/수]`;

  if (question) {
    userPrompt += `\n\n---\n**사용자의 추가 질문**: "${question}"\n\n위 질문도 함께 반영하며 전체적으로 답변해주세요.`;
  }

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

function getCompatPrompt(person1, person2, question) {
  const systemPrompt = `당신은 사주 기반 궁합 분석 전문 역학가입니다. 정확하고 풍부한 분석을 한국어로 제공하세요.
- 분석은 한국어로만 작성합니다. 영어 표현은 절대 쓰지 마세요.
- 마크다운 문법을 사용하되 표는 사용하지 마세요.
- 각 섹션 앞에 이모티콘을 넣고, 핵심 키워드는 **볼드** 표시하세요.
- 각 섹션은 5~7문장으로 풍부하게 쓰고, 마지막에 1~2개의 속담이나 비유를 추가하세요.
- 은유적이고 문학적인 감성을 담은 표현을 사용해주세요.
- 따뜻하고 긍정적인 분석을 제공해주세요.`;

  let userPrompt = `아래 두 사람의 정보를 바탕으로 궁합 분석을 작성해주세요.

**첫 번째 사람**
- 생년월일: ${person1.year}년 ${person1.month}월 ${person1.day}일 (시간: ${person1.time || '미입력'})

**두 번째 사람**
- 생년월일: ${person2.year}년 ${person2.month}월 ${person2.day}일 (시간: ${person2.time || '미입력'})

**작성 순서**
1. **오행 궁합**: 두 사람의 오행이 어떻게 조화/충돌하는지 분석해주세요.
2. **성격 합과 생활 궁합**: 잘 맞는 부분과 다른 부분을 설명해주세요.
3. **좋은 포인트**: 두 사람의 시너지를 분석해주세요.
4. **주의 포인트와 해결법**: 추천 방법을 알려주세요.
5. **궁합 점수**: 100점 만점 점수 + 등급(A/B/C) + 한 줄 코멘트를 제공해주세요.

**작성 팁**
- 각 섹션 안에 "핵심 하이라이트" 속담 1~2개를 넣어주세요.
- 은유적이고 컬러풀한 표현을 사용해주세요.`;

  if (question) {
    userPrompt += `\n\n---\n**사용자의 추가 질문**: "${question}"\n\n위 질문도 함께 반영하며 전체적으로 답변해주세요.`;
  }

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

function getTomorrowFortunePrompt(sajuData) {
  const systemPrompt = `당신은 사주 기반 일운(日運) 분석 전문가입니다. 내일의 운세를 보고서 형식으로 매우 상세하고 실용적으로 한국어로 제공하세요. 각 섹션은 최소 10문장 이상으로 깊이있게 작성하세요.`;

  const calculatedSaju = calculateAccurateSaju(sajuData);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}년 ${tomorrow.getMonth()+1}월 ${tomorrow.getDate()}일`;

  const userPrompt = `${tomorrowStr} 내일의 운세를 다음 형식으로 작성해주세요:

**🔮 내일의 전체 운세**
- 내일의 기운과 흐름을 10~12문장으로 설명하고, 실천 가능한 조언을 추가하세요.

**💖 연애운**
- 10~15문장으로 내일의 연애운을 상세히 설명하고, 구체적인 행동 팁 2~3가지를 제공하세요.

**💰 재물운**
- 10~15문장으로 내일의 재물운을 설명하고, 금전 관리 팁과 주의사항을 알려주세요.

**💼 직업/업무운**
- 10~15문장으로 내일의 업무운을 분석하고, 효율적인 업무 처리 방법을 제시하세요.

**🏥 건강운**
- 10~15문장으로 건강 상태를 체크하고, 주의해야 할 신체 부위와 관리법을 알려주세요.

**🎯 추천 행동**
- 시간대별 길한 시간
- 추천 색상
- 추천 방향
- 피해야 할 것

각 섹션마다 속담이나 격언 1개씩 포함하고, 따뜻하고 희망적인 톤으로 작성해주세요.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

function getTraditionalSajuPrompt(sajuData) {
  const systemPrompt = `당신은 정통 명리학 전문가입니다. 고전 명리학 이론에 근거한 깊이있는 사주 분석을 한국어로 제공하세요.`;

  const calculatedSaju = calculateAccurateSaju(sajuData);

  const userPrompt = `정통 명리학에 기반한 상세한 사주 분석을 다음 형식으로 작성해주세요:

**📜 사주 기본 정보**
- 사주팔자를 한자+한글로 정확히 표기
- 대운, 세운, 월운 정보
- 십신 구성 및 배치

**🔥 격국(格局) 분석**
- 사주의 격국을 판정하고 (정격/변격)
- 격국의 특징과 의미를 8~10문장으로 상세 설명
- 격국에 따른 인생 방향성 제시

**⭐ 용신(用神) 분석**
- 용신, 희신, 기신, 구신을 명확히 제시
- 각각의 역할과 영향을 7~9문장으로 설명
- 용신을 활용한 개운 방법 제공

**🌟 십성(十星) 상세 분석**
- 비견, 겁재, 식신, 상관, 편재, 정재, 편관, 정관, 편인, 정인의 배치와 강약
- 각 십성이 인생에 미치는 영향을 상세히 설명 (8~10문장)

**🎭 신살(神煞) 분석**
- 길신: 천을귀인, 천덕귀인, 월덕귀인, 문창귀인 등
- 흉살: 도화살, 역마살, 백호살, 과숙살, 현침살 등
- 각 신살의 작용과 대처법을 7~9문장으로 설명

**🔮 대운(大運) 흐름**
- 현재 대운과 이전/이후 대운 분석
- 각 대운 시기별 특징과 주의사항 (10~12문장)
- 대운 전환기의 중요성과 준비 방법

**💎 천간지지 상생상극**
- 천간 합충형해 분석
- 지지 합충형해파 분석
- 상생상극이 미치는 실질적 영향 (7~9문장)

**🎯 개운 방법**
- 방위, 색상, 숫자, 직업, 인간관계 등
- 구체적이고 실천 가능한 방법 제시 (8~10문장)

각 섹션마다 고전 명리학 원전의 격언이나 문구를 인용하고, 학술적이면서도 이해하기 쉽게 설명해주세요.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

function getLoveFortunePrompt(sajuData) {
  const systemPrompt = `당신은 사주 기반 연애운 분석 전문가입니다. 애정운과 인연운을 보고서 형식으로 매우 깊이있게 분석하여 한국어로 제공하세요. 각 섹션은 최소 10문장 이상으로 작성하세요.`;

  const calculatedSaju = calculateAccurateSaju(sajuData);
  const genderLabel = sajuData.gender === 'female' ? '여자' : '남자';

  const userPrompt = `연애운과 애정운을 다음 형식으로 상세히 작성해주세요:

**💖 전체 연애운 개요**
- 사주에 나타난 연애 성향과 패턴을 10~12문장으로 분석
- ${genderLabel}로서의 매력 포인트와 연애 스타일

**👥 이상형 분석**
- 어울리는 상대의 사주적 특징 (천간, 지지, 오행)
- 좋은 인연의 시기와 만남의 장소
- 피해야 할 상대의 특징
(각 항목 10~15문장)

**💑 연애 패턴 및 주의사항**
- 연애할 때 나타나는 습관과 패턴
- 연애에서 겪을 수 있는 어려움
- 극복 방법과 개선점
(10~15문장)

**💍 결혼운**
- 결혼 적령기와 좋은 시기
- 배우자의 특징과 만남의 인연
- 결혼 후 생활 패턴
(10~15문장)

**🌹 월별/시기별 연애운**
- 올해 남은 기간의 연애운 흐름
- 좋은 달과 조심해야 할 달
- 각 시기별 연애 전략
(10~15문장)

**💝 연애 개운 방법**
- 연애운을 높이는 색상, 장소, 패션
- 데이트 추천 장소와 시간대
- 고백/프러포즈 좋은 시기
(10~12문장)

각 섹션마다 사랑과 인연에 관한 속담이나 명언을 포함하고, 희망적이고 따뜻한 톤으로 작성해주세요.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

function getHealthFortunePrompt(sajuData) {
  const systemPrompt = `당신은 사주 기반 건강운 분석 전문가입니다. 건강 관련 사주 분석을 보고서 형식으로 매우 상세하게 한국어로 제공하세요. 각 섹션은 최소 10문장 이상으로 작성하세요.`;

  const calculatedSaju = calculateAccurateSaju(sajuData);

  const userPrompt = `건강운을 다음 형식으로 상세히 작성해주세요:

**🏥 전체 건강운 개요**
- 사주의 오행 균형으로 본 체질과 건강 특성
- 선천적인 강점과 약점
(10~15문장)

**🫀 취약 장기 및 주의사항**
- 오행별 대응 장기 분석 (목-간담, 화-심장, 토-비위, 금-폐대장, 수-신장방광)
- 특히 주의해야 할 장기와 질환
- 계절별, 시기별 건강 주의점
(10~15문장)

**💊 체질 맞춤 건강 관리법**
- 체질에 맞는 음식과 피해야 할 음식
- 적합한 운동과 생활 습관
- 수면, 스트레스 관리 방법
(10~15문장)

**🌿 사주로 보는 질병 예방**
- 대운, 세운별 건강 취약 시기
- 예방을 위한 정기 검진 항목
- 건강 관리 타이밍
(10~15문장)

**🧘 정신 건강 및 스트레스**
- 사주에 나타난 스트레스 패턴
- 심리적 안정을 위한 방법
- 명상, 휴식의 적기
(10~12문장)

**⚕️ 연령대별 건강 로드맵**
- 현재부터 노년까지 건강 흐름
- 각 시기별 주의사항과 관리 포인트
- 장수 비결과 건강한 노후 준비
(10~15문장)

각 섹션마다 건강에 관한 속담이나 한의학 격언을 포함하고, 예방과 관리에 중점을 둔 실용적인 조언을 제공해주세요.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

function getWealthFortunePrompt(sajuData) {
  const systemPrompt = `당신은 사주 기반 재물운 분석 전문가입니다. 재물운과 재테크 조언을 보고서 형식으로 매우 상세하게 한국어로 제공하세요. 각 섹션은 최소 10문장 이상으로 작성하세요.`;

  const calculatedSaju = calculateAccurateSaju(sajuData);

  const userPrompt = `재물운을 다음 형식으로 상세히 작성해주세요:

**💰 전체 재물운 개요**
- 사주의 재성(정재, 편재) 분석
- 돈을 버는 방식과 재물 축적 패턴
- 재물운의 강약과 특징
(10~15문장)

**📈 수입원 및 재물 획득 방법**
- 주수입원(월급, 사업, 투자 등) 적성 분석
- 부수입 창출 가능성
- 재물이 들어오는 경로와 시기
- 대박운 여부와 타이밍
(10~15문장)

**💎 재테크 성향 및 전략**
- 투자 성향 (안정형/공격형/균형형)
- 적합한 투자 방법 (부동산, 주식, 저축 등)
- 투자 성공 확률이 높은 분야
- 투자 주의 시기
(10~15문장)

**🏦 재물 관리 및 저축**
- 돈 관리 습관과 소비 패턴
- 저축 성공 전략
- 낭비 주의 포인트
- 재물 축적 방법
(10~15문장)

**📊 시기별 재물운 흐름**
- 대운별 재물운 변화
- 올해 및 향후 3년간 재물운
- 재물운이 좋은 시기와 투자 적기
- 재물운이 약한 시기와 대처법
(10~15문장)

**🎯 재물 증대 개운법**
- 재물운을 높이는 방위, 색상, 숫자
- 돈을 부르는 습관과 행동
- 재물신을 모시는 방법
- 기부와 나눔의 효과
(10~15문장)

**⚠️ 재물 손실 주의사항**
- 돈이 새는 구멍과 원인
- 사기, 손실 주의 시기
- 보증, 투자 실패 방지법
- 재물 트러블 예방책
(10~12문장)

각 섹션마다 돈과 재물에 관한 속담이나 격언을 포함하고, 현실적이고 실천 가능한 조언을 제공해주세요.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

async function handleApiRequest(request, env) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const OPENAI_API_KEY = env.OPENAI_API_KEY;

    // Validate URL param lengths
    const paramError = validateUrlParams(url);
    if (paramError) {
      return apiResponse({ error: { message: paramError } }, 400);
    }

    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set.');
      return apiResponse({ error: { message: 'Internal server error.' } }, 500);
    }

    let messages;
    if (type === 'saju') {
      let sajuData;
      try {
        sajuData = JSON.parse(url.searchParams.get('sajuData'));
      } catch (_e) {
        return apiResponse({ error: { message: 'Invalid sajuData JSON.' } }, 400);
      }

      const dateError = validateDateFields(sajuData, 'sajuData');
      if (dateError) {
        return apiResponse({ error: { message: dateError } }, 400);
      }

      const question = sanitizeQuestion(url.searchParams.get('question'));
      messages = getSajuPrompt(sajuData, question);

    } else if (type === 'compat') {
      let person1, person2;
      try {
        person1 = JSON.parse(url.searchParams.get('person1'));
      } catch (_e) {
        return apiResponse({ error: { message: 'Invalid person1 JSON.' } }, 400);
      }
      try {
        person2 = JSON.parse(url.searchParams.get('person2'));
      } catch (_e) {
        return apiResponse({ error: { message: 'Invalid person2 JSON.' } }, 400);
      }

      const p1Error = validateDateFields(person1, 'person1');
      if (p1Error) {
        return apiResponse({ error: { message: p1Error } }, 400);
      }
      const p2Error = validateDateFields(person2, 'person2');
      if (p2Error) {
        return apiResponse({ error: { message: p2Error } }, 400);
      }

      const question = sanitizeQuestion(url.searchParams.get('question'));
      messages = getCompatPrompt(person1, person2, question);

    } else if (type === 'tomorrow') {
      let sajuData;
      try {
        sajuData = JSON.parse(url.searchParams.get('sajuData'));
      } catch (_e) {
        return apiResponse({ error: { message: 'Invalid sajuData JSON.' } }, 400);
      }
      const dateError = validateDateFields(sajuData, 'sajuData');
      if (dateError) {
        return apiResponse({ error: { message: dateError } }, 400);
      }
      messages = getTomorrowFortunePrompt(sajuData);

    } else if (type === 'traditional') {
      let sajuData;
      try {
        sajuData = JSON.parse(url.searchParams.get('sajuData'));
      } catch (_e) {
        return apiResponse({ error: { message: 'Invalid sajuData JSON.' } }, 400);
      }
      const dateError = validateDateFields(sajuData, 'sajuData');
      if (dateError) {
        return apiResponse({ error: { message: dateError } }, 400);
      }
      messages = getTraditionalSajuPrompt(sajuData);

    } else if (type === 'love') {
      let sajuData;
      try {
        sajuData = JSON.parse(url.searchParams.get('sajuData'));
      } catch (_e) {
        return apiResponse({ error: { message: 'Invalid sajuData JSON.' } }, 400);
      }
      const dateError = validateDateFields(sajuData, 'sajuData');
      if (dateError) {
        return apiResponse({ error: { message: dateError } }, 400);
      }
      messages = getLoveFortunePrompt(sajuData);

    } else if (type === 'health') {
      let sajuData;
      try {
        sajuData = JSON.parse(url.searchParams.get('sajuData'));
      } catch (_e) {
        return apiResponse({ error: { message: 'Invalid sajuData JSON.' } }, 400);
      }
      const dateError = validateDateFields(sajuData, 'sajuData');
      if (dateError) {
        return apiResponse({ error: { message: dateError } }, 400);
      }
      messages = getHealthFortunePrompt(sajuData);

    } else if (type === 'wealth') {
      let sajuData;
      try {
        sajuData = JSON.parse(url.searchParams.get('sajuData'));
      } catch (_e) {
        return apiResponse({ error: { message: 'Invalid sajuData JSON.' } }, 400);
      }
      const dateError = validateDateFields(sajuData, 'sajuData');
      if (dateError) {
        return apiResponse({ error: { message: dateError } }, 400);
      }
      messages = getWealthFortunePrompt(sajuData);

    } else {
      return apiResponse({ error: { message: 'Invalid request type.' } }, 400);
    }

    return callOpenAi(OPENAI_API_KEY, messages);

  } catch (error) {
    console.error('Worker function error:', error);
    return apiResponse({ error: { message: 'An internal server error occurred.' } }, 500);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      // Rate limiting for API routes
      const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
      if (!checkRateLimit(clientIp)) {
        return apiResponse({ error: { message: 'Too many requests. Please try again later.' } }, 429);
      }

      if (url.pathname === '/api/saju') {
        return handleApiRequest(request, env);
      }
      if (url.pathname === '/api/youtube') {
        return handleYouTubeRequest(request, env);
      }
      return apiResponse({ error: { message: 'Not Found' } }, 404);
    }

    // Static assets - add security headers including CSP
    const assetResponse = await env.ASSETS.fetch(request);
    return addSecurityHeaders(assetResponse, true);
  },
};
