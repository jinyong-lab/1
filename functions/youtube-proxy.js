export async function onRequest(context) {
  // 클라이언트에서 보낸 검색어를 URL에서 추출합니다.
  const url = new URL(context.request.url);
  const query = url.searchParams.get('q');

  if (!query) {
    return new Response('검색어가 없습니다.', { status: 400 });
  }

  // Cloudflare에 안전하게 저장된 환경 변수에서 API 키를 가져옵니다.
  const API_KEY = context.env.YOUTUBE_API_KEY;

  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
    return new Response('서버에 API 키가 설정되지 않았습니다.', { status: 500 });
  }

  // 실제 YouTube API 요청 URL을 만듭니다.
  const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&key=${API_KEY}`;

  try {
    const response = await fetch(youtubeUrl);
    const data = await response.json();
    
    // YouTube API로부터 받은 결과를 클라이언트에 그대로 전달합니다.
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response('YouTube API 요청 중 오류가 발생했습니다.', { status: 500 });
  }
}
