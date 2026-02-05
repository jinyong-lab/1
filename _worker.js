// _worker.js - This file acts as the main server for the Cloudflare Pages site.

// The OpenAI API calling logic
async function handleApiRequest(request, env) {
  try {
    const url = new URL(request.url);
    const sajuData = JSON.parse(url.searchParams.get('sajuData'));
    const question = url.searchParams.get('question');

    if (!question) {
      return new Response(JSON.stringify({ error: { message: 'Question is missing.' } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const OPENAI_API_KEY = env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: { message: 'Server configuration error: OPENAI_API_KEY is not set.' } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiRequestBody = {
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful Saju (Korean astrology) assistant." },
        { role: "user", content: `My saju data is ${JSON.stringify(sajuData)}. Please answer this question based on my saju: ${question}` }
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

    // Pass the OpenAI response directly back to the client
    return new Response(response.body, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });

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

    // Route API requests to the API handler
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/saju') {
        return handleApiRequest(request, env);
      }
      return new Response('Not Found', { status: 404 });
    }

    // For all other requests, serve the static assets
    // This makes the rest of your site (index.html, etc.) work
    return env.ASSETS.fetch(request);
  },
};
