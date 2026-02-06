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
  const systemPrompt = "You are an expert fortune teller specializing in Saju (Four Pillars of Destiny, 사주팔자). Your tone should be wise, empathetic, and insightful. Format your entire response in Markdown.";
  
  let userPrompt = `Please provide a detailed and comprehensive Saju reading for the user with the following information. Structure your response clearly with the following sections:

**User's Information:**
*   Birth Date: ${sajuData.year}-${sajuData.month}-${sajuData.day} (${sajuData.b_time_ext})
*   Calendar: ${sajuData.cal}
*   Gender: ${sajuData.gender}

**Your Analysis (in Korean):**
1.  **사주팔자 구성**: Accurately determine the user's Four Pillars (Year, Month, Day, Time pillars) with their Heavenly Stems and Earthly Branches (간지). Display this in a clear, structured way.
2.  **일간(日干) 분석**: Analyze the user's Day Master. Describe its core characteristics and nature.
3.  **오행(五行) 분석**: Analyze the overall balance of the Five Elements (목, 화, 토, 금, 수) in their chart. Identify which elements are strong, weak, or missing, and explain what this means.
4.  **종합 총평**: Provide a general, comprehensive reading of their personality, innate talents, strengths, and weaknesses. Offer actionable advice for their life path, relationships, and career based on this analysis.
5.  **주요 신살(神殺) 분석**: Identify and explain the meaning of significant Sal (e.g., 도화살, 역마살) and Gwi-in (e.g., 천을귀인) in the user's chart. Explain them in an easy-to-understand way with examples.
6.  **가족 관계 운세**: Briefly analyze the user's fortune related to their ancestors, parents, and children based on their chart.
7.  **핵심 오행 키워드**: At the very end of your response, on a new line, write "### 핵심오행: [키워드]" where [키워드] is the single most important element (목, 화, 토, 금, or 수) for the user's fortune.
`;

  if (question) {
    userPrompt += `
---
**사용자의 추가 질문**: "${question}"

Based on the comprehensive analysis above, please provide a thoughtful answer to the user's specific question.`;
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