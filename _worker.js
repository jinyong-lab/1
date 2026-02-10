// _worker.js - Cloudflare Pages Worker for Saju Analysis Site

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

  return new Response(response.body, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleYouTubeRequest(request, env) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query');
  const YOUTUBE_API_KEY = env.YOUTUBE_API_KEY;
  const region = request.cf?.country || 'US';

  if (!query) {
    return new Response(JSON.stringify({ error: { message: 'Missing query parameter.' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!YOUTUBE_API_KEY) {
    return new Response(JSON.stringify({ error: { message: 'Server configuration error: YOUTUBE_API_KEY is not set.' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
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
    return new Response(JSON.stringify({ error: { message: data.error?.message || 'YouTube API error.' } }), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
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
    return new Response(JSON.stringify({ error: { message: 'No results found.' } }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
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

  return new Response(JSON.stringify({ items: filteredItems }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
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

  let userPrompt = `아래 정보를 바탕으로 깊이있고 폭이 넓은 사주 분석을 작성해주세요.

**사용자 정보**
- 생년월일: ${sajuData.year}년 ${sajuData.month}월 ${sajuData.day}일 (${sajuData.b_time_ext})
- 달력: ${calLabel}
- 성별: ${genderLabel}
- 출생지: ${sajuData.place || '미입력'}

**사주 표기 규칙**
- 반드시 한자 + 한글 병기: 예) 년주: 갑자(甲子)
- 로마자 표기는 사용하지 마세요.
- 사주 정보는 항상 정확하게 계산하세요.

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

    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: { message: 'Server configuration error: OPENAI_API_KEY is not set.' } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let messages;
    if (type === 'saju') {
      const sajuData = JSON.parse(url.searchParams.get('sajuData'));
      const question = url.searchParams.get('question');
      messages = getSajuPrompt(sajuData, question);
    } else if (type === 'compat') {
      const person1 = JSON.parse(url.searchParams.get('person1'));
      const person2 = JSON.parse(url.searchParams.get('person2'));
      const question = url.searchParams.get('question');
      messages = getCompatPrompt(person1, person2, question);
    } else {
      return new Response(JSON.stringify({ error: { message: 'Invalid request type.' } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return callOpenAi(OPENAI_API_KEY, messages);

  } catch (error) {
    console.error('Worker function error:', error);
    return new Response(JSON.stringify({ error: { message: 'An internal server error occurred.' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/saju') {
        return handleApiRequest(request, env);
      }
      if (url.pathname === '/api/youtube') {
        return handleYouTubeRequest(request, env);
      }
      return new Response('Not Found', { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};
