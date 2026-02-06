// _worker.js - This file acts as the main server for the Cloudflare Pages site.

async function callOpenAi(apiKey, messages) {
  const apiRequestBody = {
    model: "gpt-3.5-turbo",
    messages: messages,
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(apiRequestBody)
  });

  return new Response(response.body, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function getSajuPrompt(sajuData, question) {
  const systemPrompt = "You are an expert fortune teller specializing in Saju (Four Pillars of Destiny, 사주팔자). Your tone should be wise, empathetic, and insightful. Provide detailed explanations with easy-to-understand examples. Format your entire response in Markdown, using headings, bold text, and lists where appropriate for readability.";
  
  let userPrompt = `Please provide a detailed and comprehensive Saju reading for the user with the following information. Structure your response clearly with the following sections, ensuring rich content and easy-to-understand explanations with examples:

**User's Information:**
*   Birth Date: ${sajuData.year}-${sajuData.month}-${sajuData.day} (${sajuData.b_time_ext})
*   Calendar: ${sajuData.cal}
*   Gender: ${sajuData.gender}

**Your Analysis (in Korean):**
1.  **사주팔자 구성 및 특징**: 사용자의 사주팔자(년주, 월주, 일주, 시주)를 정확히 명시하고, 각 주의 천간(天干)과 지지(地支)의 의미를 설명해주세요. 일간(日干)의 특징과 성격을 상세히 분석해주세요.
2.  **오행(五行) 분석 및 균형**: 사주 내 오행(木, 火, 土, 金, 水)의 분포와 강약을 분석하고, 오행의 상생(相生)과 상극(相剋) 관계를 통해 성격, 운세에 미치는 영향을 설명해주세요. 부족하거나 과도한 오행이 있다면 어떤 영향을 미 주는지 예시를 들어 설명해주세요.
3.  **주요 신살(神殺) 분석**: 도화살(桃花殺), 역마살(驛馬殺), 화개살(華蓋殺) 등 주요 길흉신살(吉凶神殺)과 천을귀인(天乙貴人) 같은 귀인(貴人)이 있다면 그 의미와 사용자 삶에 미칠 영향을 구체적인 예시와 함께 설명해주세요. (사용자에게 해당하는 신살/귀인만 언급)
4.  **초년운(初年運) / 중년운(中年運) / 말년운(末年運)**: 각 시기별 운세의 흐름과 특징을 설명하고, 각 시기에 주의할 점이나 기회를 잡을 방법에 대한 조언을 해주세요.
5.  **건강/재물/직업운 조언**: 사주를 바탕으로 건강, 재물, 직업과 관련하여 특별히 주의할 점이나 발전시킬 수 있는 부분에 대한 실질적인 조언을 제공해주세요.
6.  **가족 관계 및 대인운**: 조상, 부모, 배우자, 자식과의 관계에서 나타날 수 있는 운세의 특징과 원만한 관계를 위한 조언을 해주세요.
7.  **종합 운세 총평**: 전체 사주 분석 내용을 바탕으로 사용자의 삶에 대한 전반적인 운세 총평과 함께 긍정적인 메시지 및 발전적인 방향을 제시해주세요.
8.  **핵심 오행 키워드**: 응답의 맨 마지막 줄에는 다음과 같은 형식으로 사용자의 사주에서 가장 중요한 핵심 오행을 한글로 제시해주세요. (예: ### 핵심오행: [목])
`;

  if (question) {
    userPrompt += `
---
**사용자의 추가 질문**: "${question}"

위의 종합적인 분석을 바탕으로, 사용자의 질문에 대해 신중하게 답변해주세요.`;
  }

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];
}

function getCompatPrompt(person1, person2, question) {
    const systemPrompt = "You are an expert in marital and relationship compatibility based on Saju (궁합). Your tone should be balanced, providing both positive aspects and points to be mindful of. Format your entire response in Markdown.";

    let userPrompt = `Please provide a detailed compatibility reading (궁합) between the two people below.

**Person 1:**
*   ${person1.year}-${person1.month}-${person1.day} (Time: ${person1.time})

**Person 2:**
*   ${person2.year}-${person2.month}-${person2.day} (Time: ${person2.time})

**Your Analysis (in Korean):**
1.  **오행 궁합**: Analyze the harmony and clash between the Five Elements of both individuals.
2.  **일간(日干) 관계**: Analyze the relationship between their Day Masters.
3.  **긍정적인 궁합 요소**: Highlight the strengths and synergistic aspects of their relationship.
4.  **주의 및 조언**: Point out potential challenges or areas for caution, and provide constructive advice for a harmonious relationship.
5.  **궁합 총평 및 점수**: Provide a final summary and a compatibility score out of 100.
`;

    if (question) {
        userPrompt += `
---
**사용자의 추가 질문**: "${question}"

Based on the compatibility analysis, please provide a thoughtful answer to their specific question.`;
    }

    return [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ];
}


// Main API handler
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
    console.error("Worker function error:", error);
    return new Response(JSON.stringify({ error: { message: 'An internal server error occurred.' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Main fetch handler for all requests
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/saju') {
        return handleApiRequest(request, env);
      }
      return new Response('Not Found', { status: 404 });
    }

    // For all other requests, serve the static assets
    return env.ASSETS.fetch(request);
  },
};