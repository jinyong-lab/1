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

// --- Rate Limiting (in-memory) ---
const rateLimitMap = new Map();
const RATE_LIMIT = 10; // requests per minute per IP
const RATE_WINDOW = 60000; // 1 minute in ms

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now - record.start > RATE_WINDOW) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return true;
  }
  record.count++;
  return record.count <= RATE_LIMIT;
}

// Periodic cleanup to prevent memory leak (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap) {
    if (now - record.start > RATE_WINDOW) rateLimitMap.delete(ip);
  }
}, 300000);

// --- Prompt Injection Sanitization ---
function sanitizeQuestion(text) {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, '')  // Remove code blocks
    .replace(/\b(system|assistant)\s*:/gi, '')  // Remove role markers
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

    return {
      yearPillar,
      monthPillar,
      dayPillar,
      hourPillar,
      elements
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
    console.error('YOUTUBE_API_KEY is not set.');
    return apiResponse({ error: { message: 'Internal server error.' } }, 500);
  }

  const apiUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  apiUrl.search = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: '5',
    q: query,
    safeSearch: 'moderate',
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    regionCode: region,
    key: YOUTUBE_API_KEY,
  }).toString();

  const response = await fetch(apiUrl.toString());
  const data = await response.json();

  if (!response.ok) {
    console.error('YouTube API error:', data.error?.message || 'Unknown');
    return apiResponse({ error: { message: 'YouTube search failed.' } }, response.status);
  }

  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items = rawItems
    .map(item => ({
      videoId: item?.id?.videoId,
      title: item?.snippet?.title || '',
      channelTitle: item?.snippet?.channelTitle || '',
      thumbnail: item?.snippet?.thumbnails?.medium?.url || item?.snippet?.thumbnails?.default?.url || ''
    }))
    .filter(item => item.videoId);

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
          blocked: item?.contentDetails?.regionRestriction?.blocked || []
        });
      });
      filteredItems = items.filter(item => {
        const detail = detailMap.get(item.videoId);
        if (!detail) return true;
        if (!detail.embeddable) return false;
        if (Array.isArray(detail.blocked) && detail.blocked.includes(region)) return false;
        return true;
      });
      if (!filteredItems.length) {
        filteredItems = items;
      }
    }
  } catch (_err) {
    filteredItems = items;
  }

  return apiResponse({ items: filteredItems }, 200);
}

function getSajuPrompt(sajuData, question) {
  const systemPrompt = `당신은 사주(四柱) 분석 전문 역학가입니다. 정확하고 풍부한 분석을 한국어로 제공하세요.
- 분석은 한국어로만 작성합니다. 영어 표현(예: User's Information)은 절대 쓰지 마세요.
- 마크다운 문법을 사용하되 표는 사용하지 마세요.
- 각 섹션 앞에 이모티콘을 넣고, 핵심 키워드는 **볼드** 표시하세요.
- 각 섹션은 5~7문장으로 풍부하게 쓰고, 마지막에 1~2개의 속담이나 비유를 추가하세요.
- 은유적이고 문학적인 감성을 담은 표현을 사용해주세요.
- 전체적인 분석을 충실하게 제공해주세요.
- 천간/지지 의미 설명을 딱딱하게 하지 않고, 생활 속에서 실용적인 조언으로 풀어주세요.`;

  const calLabel = sajuData.cal === 'lunar' ? '음력' : '양력';
  const genderLabel = sajuData.gender === 'female' ? '여자' : '남자';

  // Calculate accurate saju
  const calculatedSaju = calculateAccurateSaju(sajuData);

  let userPrompt = `아래 정보를 바탕으로 깊이있고 폭이 넓은 사주 분석을 작성해주세요.

**사용자 정보**
- 생년월일: ${sajuData.year}년 ${sajuData.month}월 ${sajuData.day}일 (${sajuData.b_time_ext})
- 달력: ${calLabel}
- 성별: ${genderLabel}
- 출생지: ${sajuData.place || '미입력'}`;

  // Add calculated saju information if available
  if (calculatedSaju && calculatedSaju.yearPillar) {
    userPrompt += `

**정확하게 계산된 사주**
- 년주(年柱): ${calculatedSaju.yearPillar.stem}${calculatedSaju.yearPillar.branch} (천간: ${calculatedSaju.yearPillar.stemElement}, 지지: ${calculatedSaju.yearPillar.branchElement})
- 월주(月柱): ${calculatedSaju.monthPillar.stem}${calculatedSaju.monthPillar.branch} (천간: ${calculatedSaju.monthPillar.stemElement}, 지지: ${calculatedSaju.monthPillar.branchElement})
- 일주(日柱): ${calculatedSaju.dayPillar.stem}${calculatedSaju.dayPillar.branch} (천간: ${calculatedSaju.dayPillar.stemElement}, 지지: ${calculatedSaju.dayPillar.branchElement})
- 시주(時柱): ${calculatedSaju.hourPillar.stem}${calculatedSaju.hourPillar.branch} (천간: ${calculatedSaju.hourPillar.stemElement}, 지지: ${calculatedSaju.hourPillar.branchElement})
- 오행 분포: 목 ${calculatedSaju.elements.목}개, 화 ${calculatedSaju.elements.화}개, 토 ${calculatedSaju.elements.토}개, 금 ${calculatedSaju.elements.금}개, 수 ${calculatedSaju.elements.수}개

아래 정확하게 계산된 사주를 해석해주세요.`;
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
3. **성격과 재능**: 일주, 일간, 십이운성이 나타내는 성향과 함께 자세히 분석해주세요.
4. **관계/대인관계**: 어울리는 사람의 특징과, 추천 커뮤니케이션 방법을 알려주세요.
5. **직업/재물운**: 적성 분야, 시기에 맞는 돈 흐름과, 재무 관리 방법을 제공해주세요.
6. **건강운**: 취약 포인트와 생활밀착 관리법을 제공해주세요.
7. **시기별 운세 흐름**: 단기/중기/장기 흐름을 자세히 알려주세요.
8. **마무리 조언 및 한 줄 메시지**: 따뜻한 메시지를 남겨주세요.

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
