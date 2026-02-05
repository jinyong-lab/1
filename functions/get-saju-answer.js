// [DEBUGGING CODE]
// This is a temporary code to check which request method the Cloudflare server receives.
export default {
  async fetch(request, env, ctx) {
    // Simply return the method that was received.
    const responseBody = {
      message: "This is a debug response.",
      received_method: request.method,
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  },
};

