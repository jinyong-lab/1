const fetch = require('node-fetch');

exports.handler = async function(event) {
  // 클라이언트(브라우저)가 보낸 데이터를 받습니다.
  const { sajuData, question } = JSON.parse(event.body);

  // 서버에 안전하게 저장된 API 키를 불러옵니다. (가장 중요!)
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { message: '서버에 API 키가 설정되지 않았습니다.' } })
    };
  }

  // OpenAI API에 보낼 데이터를 준비합니다.
  const apiRequestBody = {
    model: "gpt-3.5-turbo",
    messages: [
        { role: "system", content: "당신은 사주와 운세에 대해 친절하게 설명해주는 전문가입니다." },
        { role: "user", content: `내 사주 정보는 ${JSON.stringify(sajuData)} 입니다. 이 정보에 기반해서 다음 질문에 답변해주세요: ${question}` }
    ]
  };

  try {
    // 서버에서 OpenAI API를 직접 호출합니다.
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
        return { statusCode: response.status, body: JSON.stringify(data) };
    }

    // 받은 답변을 클라이언트(브라우저)에 전달합니다.
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error("Proxy function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { message: 'API를 호출하는 중 서버에서 오류가 발생했습니다.' } })
    };
  }
};
