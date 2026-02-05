// functions/get-saju-answer.js

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    try {
      const { sajuData, question } = await request.json();

      const OPENAI_API_KEY = env.OPENAI_API_KEY; // Cloudflare Workers에서 환경 변수에 접근하는 방법

      if (!OPENAI_API_KEY) {
        return new Response(
          JSON.stringify({ error: { message: 'Server configuration error: API key is missing.' } }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const apiRequestBody = {
        model: "gpt-3.5-turbo",
        messages: [
            { role: "system", content: "당신은 사주와 운세에 대해 친절하게 설명해주는 전문가입니다." },
            { role: "user", content: `내 사주 정보는 ${JSON.stringify(sajuData)} 입니다. 이 정보에 기반해서 다음 질문에 답변해주세요: ${question}` }
        ]
      };

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(apiRequestBody)
      });

      const data = await response.json();

      if (!response.ok) {
          console.error("OpenAI API Error:", data);
          return new Response(JSON.stringify(data), { status: response.status, headers: { 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error("Worker function error:", error);
      return new Response(
        JSON.stringify({ error: { message: 'API를 호출하는 중 서버에서 오류가 발생했습니다.' } }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};

