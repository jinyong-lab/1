// _worker.js - This file acts as the main server for the Cloudflare Pages site.

async function callOpenAi(apiKey, messages) {
  const apiRequestBody = {
    model: 'gpt-3.5-turbo',
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

  return new Response(JSON.stringify({ items }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function getSajuPrompt(sajuData, question) {
  const systemPrompt = `당신은 사주(四柱) 전문 상담가입니다. 따뜻하고 공감하는 말투로 존댓말을 사용하세요.\n- 응답은 한국어로만 작성합니다. 영어 문구(예: User's Information)는 절대 쓰지 마세요.\n- 마크다운 형식을 사용하되 표는 사용하지 마세요.\n- 섹션 제목 앞에 이모티콘을 넣고, 핵심 키워드는 **굵게** 표시하세요.\n- 각 섹션은 5~7문장으로 풍부하게 쓰고, 마지막에 1~2개의 불릿 요약을 추가하세요.\n- 감성적인 분위기와 색감을 떠올릴 수 있는 표현을 섞어주세요.\n- 구체적인 예시를 1개 이상 포함해주세요.\n- 천간/지지 의미 설명은 추상적이지 않게, 생활 사례와 연결해 상세히 쓰세요.`;

  const calLabel = sajuData.cal === 'lunar' ? '음력' : '양력';
  const genderLabel = sajuData.gender === 'female' ? '여자' : '남자';

  let userPrompt = `아래 정보를 바탕으로 상세하고 깊이 있는 사주 분석을 작성해주세요.\n\n**사용자 정보**\n- 생년월일: ${sajuData.year}-${sajuData.month}-${sajuData.day} (${sajuData.b_time_ext})\n- 달력: ${calLabel}\n- 성별: ${genderLabel}\n- 출생지: ${sajuData.place || '미입력'}\n\n**사주 구성 표기 규칙**\n- 반드시 한자 + 한글 병기: 예) 년주: 壬寅(임인)\n- 로마자 표기는 사용하지 마세요.\n- 영어 문장은 절대 출력하지 마세요.\n\n**요약 카드 (정확히 아래 형식 사용)**\n- 한줄 요약: ...\n- 키워드: ..., ..., ...\n- 행운 색: ...\n- 행운 숫자: ...\n- 행운 방향: ...\n- 추천 행동: ...\n- 추천 음악: ...\n\n**상세 분석**\n1. **사주 구성과 핵심 포인트**: 사주 구성(연·월·일·시)을 한자+한글로 제시하고 인상적인 특징을 짚어주세요.\n2. **오행(목·화·토·금·수) 균형**: 강약, 결핍, 과다 요소와 성향을 자세히 설명하고, 반드시 \"목 N개, 화 N개, 토 N개, 금 N개, 수 N개\" 형태로 개수를 한 줄로 명시하세요.\n3. **성격과 기질**: 장점, 단점, 대인관계 스타일을 예시와 함께 자세히 설명해주세요.\n4. **연애/관계운**: 관계에서의 강점과 주의점, 추천 커뮤니케이션 방식을 알려주세요.\n5. **진로/재물운**: 어울리는 분야, 성향에 맞는 일 스타일, 재정 관리 팁을 제시해주세요.\n6. **건강운**: 취약 포인트와 생활습관 조언을 포함해주세요.\n7. **시기별 운의 흐름**: 단기/중기/장기 흐름을 자세히 요약해주세요.\n8. **오늘을 위한 한 줄 조언**: 긍정적인 메시지로 마무리해주세요.\n\n**운세 카드 (정확히 아래 형식 사용)**\n- 건강운: ...\n- 연애운: ...\n- 재물운: ...\n- 직업운: ...\n- 성장운: ...\n\n**작성 팁**\n- 각 섹션 끝에 \"핵심 포인트\" 불릿 1~2개를 넣어주세요.\n- 감성적이고 컬러풀한 표현(예: 따뜻한 골드, 청량한 블루)을 섞어주세요.\n- 운세 카드는 각 항목을 한 줄 안에 4~6문장으로 길게 작성하고, 실천 팁 1~2개를 문장 속에 포함하세요.\n\n마지막에 반드시 다음 줄을 추가하세요.\n### 오행: [목/화/토/금/수]`;

  if (question) {
    userPrompt += `\n\n---\n**사용자의 추가 질문**: "${question}"\n\n질문에 대해 공감하며 구체적으로 답변해주세요.`;
  }

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

function getCompatPrompt(person1, person2, question) {
  const systemPrompt = `당신은 사주 궁합 전문 상담가입니다. 따뜻하고 공감하는 말투로 존댓말을 사용하세요.\n- 응답은 한국어로만 작성합니다. 영어 문구는 쓰지 마세요.\n- 마크다운 형식을 사용하되 표는 사용하지 마세요.\n- 섹션 제목 앞에 이모티콘을 넣고, 핵심 키워드는 **굵게** 표시하세요.\n- 각 섹션은 5~7문장으로 풍부하게 쓰고, 마지막에 1~2개의 불릿 요약을 추가하세요.\n- 감성적인 분위기와 색감을 떠올릴 수 있는 표현을 섞어주세요.\n- 현실적인 조언을 포함해주세요.`;

  let userPrompt = `아래 두 사람의 정보를 바탕으로 궁합 분석을 작성해주세요.\n\n**Person 1**\n- 생년월일: ${person1.year}-${person1.month}-${person1.day} (시간: ${person1.time || '미입력'})\n\n**Person 2**\n- 생년월일: ${person2.year}-${person2.month}-${person2.day} (시간: ${person2.time || '미입력'})\n\n**작성 구조**\n1. **오행 궁합**: 서로의 기운이 어떻게 보완/충돌하는지 설명해주세요.\n2. **성격 합과 생활 리듬**: 잘 맞는 부분과 주의할 부분을 비교해주세요.\n3. **강점 포인트**: 두 분의 시너지를 강조해주세요.\n4. **갈등 포인트와 해결법**: 실천 가능한 조언을 주세요.\n5. **궁합 점수**: 100점 만점 점수 + 등급(A/B/C) + 한 줄 총평을 주세요.\n\n**작성 팁**\n- 각 섹션 끝에 \"핵심 포인트\" 불릿 1~2개를 넣어주세요.\n- 감성적이고 컬러풀한 표현을 섞어주세요.`;

  if (question) {
    userPrompt += `\n\n---\n**사용자의 추가 질문**: "${question}"\n\n질문에 대해 공감하며 구체적으로 답변해주세요.`;
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
