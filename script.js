console.log('[SAJU] Build version: 20260219a');
const bY = document.getElementById('bY');
const bM = document.getElementById('bM');
const bD = document.getElementById('bD');
const bT = document.getElementById('bT');
const bTUnknown = document.getElementById('bTUnknown');
const bP = document.getElementById('bP');
const cY1 = document.getElementById('cY1');
const cM1 = document.getElementById('cM1');
const cD1 = document.getElementById('cD1');
const cT1 = document.getElementById('cT1');
const cY2 = document.getElementById('cY2');
const cM2 = document.getElementById('cM2');
const cD2 = document.getElementById('cD2');
const cT2 = document.getElementById('cT2');
const themeToggle = document.getElementById('themeToggle');

let currentQuery = 'korean ballad playlist';
let currentSajuData = null; // Store saju data for fortune tabs

// --- 시간 모름 체크박스 핸들러 ---
function setupTimeUnknown(timeInput, unknownCheckbox) {
  if (!timeInput || !unknownCheckbox) return;
  unknownCheckbox.addEventListener('change', () => {
    timeInput.disabled = unknownCheckbox.checked;
    if (unknownCheckbox.checked) timeInput.value = '';
  });
}
setupTimeUnknown(bT, bTUnknown);
setupTimeUnknown(document.getElementById('cT1'), document.getElementById('cT1Unknown'));
setupTimeUnknown(document.getElementById('cT2'), document.getElementById('cT2Unknown'));

// --- Theme Persistence ---
(function() {
  const saved = localStorage.getItem('saju-theme');
  if (['light', 'dark'].includes(saved)) document.documentElement.dataset.theme = saved;
})();

if (document.documentElement.dataset.theme === 'light') {
  const tBtn = document.getElementById('themeToggle');
  if (tBtn) tBtn.textContent = '다크 모드';
}

// --- GA4 Event Tracking ---
function trackEvent(name, params) {
  if (typeof gtag === 'function') gtag('event', name, params || {});
}

// --- Toast Notifications ---
function showToast(message, type = 'error', duration = 3500) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast toast-' + type + ' visible';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.classList.remove('visible'); }, duration);
}

// --- Social Sharing ---
async function handleShare() {
  if (navigator.share) {
    try {
      await navigator.share({ title: '사주로 보는 나의 운명', text: 'AI가 분석한 나의 사주 결과를 확인해보세요!', url: window.location.href });
      trackEvent('share', { method: 'native' });
    } catch (_e) { /* user cancelled */ }
  } else {
    handleCopyLink();
  }
}
function handleCopyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    showToast('링크가 복사되었습니다!', 'success');
    trackEvent('share', { method: 'clipboard' });
  }).catch(() => showToast('링크 복사에 실패했습니다.', 'error'));
}

function updateDays(year, month, daySelect) {
  if (!daySelect) return;
  daySelect.innerHTML = '<option value="">선택</option>';
  if (!year || !month) {
    return;
  }
  const daysInMonth = new Date(year, month, 0).getDate();
  const selectedDay = daySelect.value;
  for (let i = 1; i <= daysInMonth; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `${i}일`;
    daySelect.appendChild(option);
  }
  if (selectedDay && Number(selectedDay) <= daysInMonth) {
    daySelect.value = selectedDay;
  }
}

function setThemeLabel(theme) {
  themeToggle.textContent = theme === 'dark' ? '라이트 모드' : '다크 모드';
}

function setupEventListeners() {
  bY.addEventListener('change', () => updateDays(parseInt(bY.value, 10), parseInt(bM.value, 10), bD));
  bM.addEventListener('change', () => updateDays(parseInt(bY.value, 10), parseInt(bM.value, 10), bD));
  cY1.addEventListener('change', () => updateDays(parseInt(cY1.value, 10), parseInt(cM1.value, 10), cD1));
  cM1.addEventListener('change', () => updateDays(parseInt(cY1.value, 10), parseInt(cM1.value, 10), cD1));
  cY2.addEventListener('change', () => updateDays(parseInt(cY2.value, 10), parseInt(cM2.value, 10), cD2));
  cM2.addEventListener('change', () => updateDays(parseInt(cY2.value, 10), parseInt(cM2.value, 10), cD2));

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  if (!bY.value) bY.value = currentYear;
  if (!bM.value) bM.value = currentMonth;
  updateDays(parseInt(bY.value, 10), parseInt(bM.value, 10), bD);

  updateDays(null, null, cD1);
  updateDays(null, null, cD2);

  // 메인 탭 (사주/궁합) 전환
  document.querySelectorAll('.main-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.main-tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      document.querySelectorAll('.main-tab-pane').forEach(p => {
        p.style.display = 'none';
        p.classList.remove('active');
      });
      const target = document.getElementById(btn.dataset.mainTab);
      if (target) {
        target.style.display = 'block';
        target.classList.add('active');
      }
    });
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector('.tab-btn.active').classList.remove('active');
      btn.classList.add('active');
      document.querySelector('.tab-pane.active').classList.remove('active');
      document.getElementById(btn.dataset.tab).classList.add('active');

      // Update ARIA
      document.querySelectorAll('.tab-btn').forEach(b => b.setAttribute('aria-selected', b === btn ? 'true' : 'false'));
    });
  });

  themeToggle.addEventListener('click', () => {
    const newTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = newTheme;
    localStorage.setItem('saju-theme', newTheme);
    setThemeLabel(newTheme);
  });

  setThemeLabel(document.documentElement.dataset.theme || 'dark');
}

setupEventListeners();

const elementQueries = {
  '목': '잔잔한 어쿠스틱 감성 한국 노래',
  '화': '신나는 댄스 팝 한국 노래',
  '토': '따뜻한 발라드 한국 노래',
  '금': '웅장한 OST 한국 영화음악',
  '수': '차분한 R&B 힙합 한국 노래'
};

const STEM_YINYANG = {
  '甲': '양', '乙': '음', '丙': '양', '丁': '음', '戊': '양',
  '己': '음', '庚': '양', '辛': '음', '壬': '양', '癸': '음'
};
const BRANCH_YINYANG = {
  '子': '양', '丑': '음', '寅': '양', '卯': '음', '辰': '양', '巳': '음',
  '午': '양', '未': '음', '申': '양', '酉': '음', '戌': '양', '亥': '음'
};

function calculateYinYang(pillars) {
  const ganToHanja = {
    '갑': '甲', '을': '乙', '병': '丙', '정': '丁', '무': '戊',
    '기': '己', '경': '庚', '신': '辛', '임': '壬', '계': '癸'
  };
  const jiToHanja = {
    '자': '子', '축': '丑', '인': '寅', '묘': '卯', '진': '辰', '사': '巳',
    '오': '午', '미': '未', '신': '申', '유': '酉', '술': '戌', '해': '亥'
  };
  let yang = 0, yin = 0;
  pillars.forEach(p => {
    if (!p) return;
    let hanja = p.hanja;
    if ((!hanja || hanja.length !== 2) && p.hangul && p.hangul.length === 2) {
      hanja = (ganToHanja[p.hangul[0]] || '') + (jiToHanja[p.hangul[1]] || '');
    }
    if (!hanja || hanja.length !== 2) return;
    const stem = hanja[0];
    const branch = hanja[1];
    if (STEM_YINYANG[stem] === '양') yang++; else if (STEM_YINYANG[stem]) yin++;
    if (BRANCH_YINYANG[branch] === '양') yang++; else if (BRANCH_YINYANG[branch]) yin++;
  });
  return { yang, yin };
}

function getElementHanja(key) {
  const map = {
    '목': { hanja: '木', gradient: 'linear-gradient(135deg, #2d6a4f, #52b788)', color: '#52b788' },
    '화': { hanja: '火', gradient: 'linear-gradient(135deg, #e63946, #ff6b6b)', color: '#ff6b6b' },
    '토': { hanja: '土', gradient: 'linear-gradient(135deg, #e9c46a, #f4a261)', color: '#f4a261' },
    '금': { hanja: '金', gradient: 'linear-gradient(135deg, #adb5bd, #dee2e6)', color: '#dee2e6' },
    '수': { hanja: '水', gradient: 'linear-gradient(135deg, #1d9bf0, #4cc9f0)', color: '#4cc9f0' },
  };
  return map[key] || map['목'];
}

const pillarPhotos = [
  'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=900&q=80'
];

const heroPhotos = {
  '목': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
  '화': 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1400&q=80',
  '토': 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1400&q=80',
  '금': 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1400&q=80',
  '수': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80'
};

let playerIframe = null;

function resetPlayer() {
  playerIframe = null;
}

function getEmbedUrl(videoId) {
  const base = 'https://www.youtube-nocookie.com/embed';
  const params = new URLSearchParams({
    autoplay: '1',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    enablejsapi: '1'
  });
  if (window.location && window.location.origin) {
    params.set('origin', window.location.origin);
  }
  if (!videoId) return '';
  return `${base}/${videoId}?${params.toString()}`;
}

function renderPlayerPlaceholder(playerContainer, message) {
  if (!playerContainer) return;
  playerContainer.innerHTML = `<div class="player-placeholder">${escapeHtml(message)}</div>`;
  playerIframe = null;
}

function createPlayerIframe(playerContainer, videoId) {
  if (!playerContainer) return;
  if (!videoId) {
    renderPlayerPlaceholder(playerContainer, '추천 영상을 불러오지 못했습니다.');
    return;
  }
  const iframe = document.createElement('iframe');
  iframe.src = getEmbedUrl(videoId);
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.referrerPolicy = 'origin-when-cross-origin';
  iframe.allowFullscreen = true;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  playerContainer.innerHTML = '';
  playerContainer.appendChild(iframe);
  playerIframe = iframe;
}

function ensureIframePlayer(playerContainer, videoId) {
  if (!playerContainer) return;
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    renderPlayerPlaceholder(playerContainer, '추천 영상을 불러오지 못했습니다.');
    return;
  }
  trackEvent('song_play', { event_category: 'engagement' });
  if (!playerIframe || !playerContainer.contains(playerIframe)) {
    createPlayerIframe(playerContainer, videoId);
    return;
  }
  playerIframe.src = getEmbedUrl(videoId);
}

function renderSongList(videos, resultDiv, playerContainer) {
  const list = resultDiv.querySelector('[data-role="song-list"]');
  if (!list) return;

  if (!videos.length) {
    list.innerHTML = '<li class="fallback-note">추천 곡을 불러오지 못했습니다.</li>';
    return;
  }

  const songVideos = videos.slice(0, 5);
  list.innerHTML = songVideos.map((video, idx) => {
    const title = escapeHtml(video.title || '제목 없음');
    const channel = escapeHtml(video.channelTitle || '');
    const videoId = video.videoId || '';
    const watchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : '#';
    return `
      <li class="${idx === 0 ? 'now-playing' : ''}" data-song-index="${idx}">
        <button class="play-btn" data-video-id="${videoId}" data-index="${idx}">
          ${idx === 0 ? '▶' : (idx + 1)}
        </button>
        <div class="song-info">
          <span class="song-title-text">${title}</span>
          <span class="song-channel">${channel}</span>
        </div>
        <a class="yt-link" href="${watchUrl}" target="_blank" rel="noopener">유�브</a>
      </li>
    `;
  }).join('');

  let currentIndex = 0;

  function playSong(index) {
    if (index < 0 || index >= songVideos.length) return;
    currentIndex = index;
    const vid = songVideos[index];
    if (!vid.videoId) return;
    ensureIframePlayer(playerContainer, vid.videoId);
    list.querySelectorAll('li').forEach((li, i) => {
      li.classList.toggle('now-playing', i === index);
      const btn = li.querySelector('.play-btn');
      if (btn) btn.textContent = i === index ? '▶' : String(i + 1);
    });
  }

  list.onclick = event => {
    const button = event.target.closest('[data-video-id]');
    if (!button) return;
    const index = parseInt(button.dataset.index, 10);
    if (!isNaN(index)) playSong(index);
  };

  // Auto-advance: check every 5 seconds if iframe has ended
  // YouTube iframe API postMessage approach
  let autoAdvanceTimer = null;
  function startAutoAdvance() {
    if (autoAdvanceTimer) clearInterval(autoAdvanceTimer);
    autoAdvanceTimer = setInterval(() => {
      if (!playerIframe) return;
      try {
        // Request player state via postMessage
        playerIframe.contentWindow.postMessage('{"event":"command","func":"getPlayerState","args":""}', '*');
      } catch (e) { /* cross-origin, expected */ }
    }, 3000);
  }

  window.addEventListener('message', event => {
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      // YouTube player state 0 = ended
      if (data.event === 'onStateChange' && data.info === 0) {
        if (currentIndex < songVideos.length - 1) {
          playSong(currentIndex + 1);
        }
      }
    } catch (e) { /* ignore non-JSON messages */ }
  });

  // Play first song
  if (songVideos[0]?.videoId) {
    playSong(0);
    startAutoAdvance();
  }
}

async function getSongs(sajuElement, resultDiv) {
  const musicBox = resultDiv.querySelector('.music-box');
  const playerContainer = resultDiv.querySelector('#player-container');
  const musicMeta = resultDiv.querySelector('.music-meta');

  if (!musicBox || !playerContainer) {
    console.error('Music box or player container not found');
    return;
  }

  const query = elementQueries[sajuElement] || 'korean ballad playlist';
  console.log('🎵 YouTube 검색 쿼리:', query, '(오행:', sajuElement, ')');
  currentQuery = query;

  let videoData = null;
  try {
    videoData = await fetchYouTubeVideos(query);
    console.log('🎵 YouTube API 응답:', videoData);
  } catch (error) {
    console.error('YouTube fetch error:', error);
  }

  const videoItems = Array.isArray(videoData?.items)
    ? videoData.items
    : (videoData?.videoId ? [videoData] : []);
  const primaryVideo = videoItems[0];
  console.log('🎵 비디오 아이템 개수:', videoItems.length, '첫 번째:', primaryVideo);

  renderSongList(videoItems, resultDiv, playerContainer);

  if (musicMeta) {
    if (videoData?.error) {
      console.error('❌ YouTube 에러:', videoData.error);
      musicMeta.textContent = `추천 정보를 불러오지 못했습니다. (${videoData.error})`;
    } else if (primaryVideo?.title) {
      const channelText = primaryVideo.channelTitle ? ` · ${primaryVideo.channelTitle}` : '';
      console.log('✅ 음악 추천 성공:', primaryVideo.title);
      musicMeta.textContent = `추천 영상: ${primaryVideo.title}${channelText}`;
    } else {
      console.warn('⚠️ 비디오 없음. videoData:', videoData);
      musicMeta.textContent = '추천 영상을 찾지 못했습니다. 다시 시도해주세요.';
    }
  }

  try {
    playerContainer.style.display = 'block';
    ensureIframePlayer(playerContainer, primaryVideo?.videoId || null);
  } catch (error) {
    console.error('YouTube Player Error:', error);
    renderPlayerPlaceholder(playerContainer, '노래 플레이어를 로드하는 중 오류가 발생했습니다.');
  }
}

function showError(message, boxId) {
  const errBox = document.getElementById(boxId);
  errBox.textContent = message;
  errBox.style.display = 'block';
  showToast(message, 'error');
}

function escapeHtml(value) {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function truncateText(value, maxLength) {
  if (!value) return '';
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}…`;
}

function parseSummary(md) {
  const summary = {
    oneLine: '',
    keywords: [],
    luckyColor: '',
    luckyNumber: '',
    luckyDirection: '',
    action: '',
    music: ''
  };

  if (!md) return summary;
  const lines = md.split('\n');
  const labelMap = {
    '한줄요약': 'oneLine',
    '요약': 'oneLine',
    '키워드': 'keywords',
    '핵심키워드': 'keywords',
    '행운색': 'luckyColor',
    '행운색상': 'luckyColor',
    '행운숫자': 'luckyNumber',
    '행운번호': 'luckyNumber',
    '행운방향': 'luckyDirection',
    '추천행동': 'action',
    '추천음악': 'music'
  };

  for (const line of lines) {
    const match = line.match(/^\s*[-*]\s*([^:：]+)\s*[:：]\s*(.+)\s*$/);
    if (!match) continue;

    const rawLabel = match[1].replace(/[\s()\[\]{}]/g, '');
    const rawValue = match[2].replace(/[*_`]/g, '').trim();
    const key = labelMap[rawLabel];

    if (!key) continue;
    if (key === 'keywords') {
      summary.keywords = rawValue
        .split(/[,/·•|]/)
        .map(item => item.trim())
        .filter(Boolean)
        .slice(0, 5);
    } else {
      summary[key] = rawValue;
    }
  }

  return summary;
}

function buildSummaryHtml(summary) {
  const hasSummary = summary.oneLine || summary.keywords.length || summary.luckyColor || summary.luckyNumber || summary.luckyDirection || summary.action || summary.music;
  if (!hasSummary) return '';

  const keywordHtml = summary.keywords.length
    ? `<div class="summary-item">
         <div class="summary-label">키워드</div>
         <div class="summary-keywords">
           ${summary.keywords.map((word, index) => `<span class="summary-keyword tone-${(index % 5) + 1}">${escapeHtml(word)}</span>`).join('')}
         </div>
       </div>`
    : '';

  const items = [];
  if (summary.luckyColor) items.push({ label: '행운 색', value: summary.luckyColor });
  if (summary.luckyNumber) items.push({ label: '행운 숫자', value: summary.luckyNumber });
  if (summary.luckyDirection) items.push({ label: '행운 방향', value: summary.luckyDirection });
  if (summary.action) items.push({ label: '추천 행동', value: summary.action });
  if (summary.music) items.push({ label: '추천 음악', value: summary.music });

  const itemHtml = items.map(item => `
      <div class="summary-item">
        <div class="summary-label">${escapeHtml(item.label)}</div>
        <div class="summary-value">${escapeHtml(item.value)}</div>
      </div>
    `).join('');

  return `
    <div class="summary-card">
      ${summary.oneLine ? `<p class="summary-line">${escapeHtml(summary.oneLine)}</p>` : ''}
      <div class="summary-grid">
        ${keywordHtml}
        ${itemHtml}
      </div>
    </div>
  `;
}

async function fetchYouTubeVideos(query) {
  const apiUrl = `/api/youtube?query=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    if (!response.ok) {
      console.error('YouTube API Error:', data);
      return { error: data?.error?.message || 'YouTube API error' };
    }
    return data;
  } catch (error) {
    console.error('YouTube API Request Failed:', error);
    return { error: 'Network error' };
  }
}

async function getAiResponse(payload) {
  const params = new URLSearchParams(payload);
  const apiPath = `/api/saju?${params.toString()}`;

  try {
    const response = await fetch(apiPath);
    const data = await response.json();

    if (!response.ok) {
      console.error('API Error:', data);
      return `**오류 발생:** ${data.error?.message || 'API 응답을 받는 중 오류가 발생했습니다.'}`;
    }

    // New structured format: { content, calculatedSaju }
    if (data.content && typeof data.content === 'string') {
      if (payload.type === 'saju' && data.calculatedSaju) {
        return { content: data.content, calculatedSaju: data.calculatedSaju };
      }
      return data.content;
    }

    // Old OpenAI passthrough format: { choices: [{ message: { content } }] }
    if (data?.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }

    console.error('Invalid API response:', data);
    return '**오류 발생:** AI 분석 결과를 받지 못했습니다. 다시 시도해주세요.';
  } catch (error) {
    console.error('Error calling worker function:', error);
    if (error instanceof SyntaxError) {
      return '**오류 발생:** 서버 응답 형식이 올바르지 않습니다. API가 정상적으로 배포되었는지 확인해주세요.';
    }
    return '**오류 발생:** 서버와 통신하는 중 오류가 발생했습니다.';
  }
}

function renderMarkdown(md) {
  if (!md) return '';
  let html = md.replace(/\r\n/g, '\n').trim();

  html = html.replace(/^###\s+(.*)$/gim, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.*)$/gim, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.*)$/gim, '<h1>$1</h1>');
  html = html.replace(/^---$/gim, '<hr>');

  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  html = html.replace(/^(?:\s*[-*]\s+.*(?:\n|$))+?/gm, match => {
    const items = match
      .trim()
      .split('\n')
      .map(line => line.replace(/^\s*[-*]\s+/, '').trim())
      .filter(Boolean);
    return `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
  });

  html = html.replace(/^(?:\s*\d+\.\s+.*(?:\n|$))+?/gm, match => {
    const items = match
      .trim()
      .split('\n')
      .map(line => line.replace(/^\s*\d+\.\s+/, '').trim())
      .filter(Boolean);
    return `<ol>${items.map(item => `<li>${item}</li>`).join('')}</ol>`;
  });

  html = html.replace(/^(?:>\s?.*(?:\n|$))+?/gm, match => {
    const lines = match
      .trim()
      .split('\n')
      .map(line => line.replace(/^>\s?/, ''));
    return `<blockquote>${lines.join('<br>')}</blockquote>`;
  });

  const blocks = html.split(/\n{2,}/).map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (/^<h\d|^<ul>|^<ol>|^<blockquote>|^<hr>/.test(trimmed)) {
      return trimmed;
    }
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  });

  return blocks.join('');
}

function renderMarkdownSafe(md) {
  return renderMarkdown(escapeHtml(md || ''));
}

function initElementCounts() {
  return { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 };
}

function getElementCountsFromPillars(pillars) {
  const counts = initElementCounts();
  if (!pillars || !pillars.length) return counts;

  const ganToElement = {
    '갑': '목', '을': '목', '병': '화', '정': '화', '무': '토',
    '기': '토', '경': '금', '신': '금', '임': '수', '계': '수',
    '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
    '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수'
  };
  const jiToElement = {
    '자': '수', '축': '토', '인': '목', '묘': '목', '진': '토', '사': '화',
    '오': '화', '미': '토', '신': '금', '유': '금', '술': '토', '해': '수',
    '子': '수', '丑': '토', '寅': '목', '卯': '목', '辰': '토', '巳': '화',
    '午': '화', '未': '토', '申': '금', '酉': '금', '戌': '토', '亥': '수'
  };

  // Hanja to Hangul conversion mapping
  const hanjaToHangul = {
    '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무', '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계',
    '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사', '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해'
  };

  pillars.forEach(pillar => {
    const hangul = pillar.hangul || '';
    const hanja = pillar.hanja || '';

    // Handle both Hangul (갑자) and Hanja (甲子) formats
    let g = hangul[0] || hanja[0];
    let j = hangul[1] || hanja[1];

    // Validate and convert Hanja to Hangul for consistent lookup
    if (g && hanjaToHangul[g]) g = hanjaToHangul[g];
    if (j && hanjaToHangul[j]) j = hanjaToHangul[j];

    const gEl = ganToElement[g];
    const jEl = jiToElement[j];

    // Only count if valid characters found
    if (gEl) counts[gEl] += 1;
    if (jEl) counts[jEl] += 1;
  });

  return counts;
}

// DEPRECATED: No longer used as backend provides accurate calculation
// Kept for backward compatibility but never called
function getElementCountsFromText(md) {
  const counts = initElementCounts();
  if (!md) return counts;
  const text = md.replace(/\r\n/g, '\n');
  const patterns = [
    { key: '목', rx: /(목|나무|木)\s*[:：]?\s*(\d+)\s*개?/g },
    { key: '화', rx: /(화|불|火)\s*[:：]?\s*(\d+)\s*개?/g },
    { key: '토', rx: /(토|흙|土)\s*[:：]?\s*(\d+)\s*개?/g },
    { key: '금', rx: /(금|金)\s*[:：]?\s*(\d+)\s*개?/g },
    { key: '수', rx: /(수|물|水)\s*[:：]?\s*(\d+)\s*개?/g }
  ];

  patterns.forEach(({ key, rx }) => {
    let match;
    while ((match = rx.exec(text)) !== null) {
      const value = parseInt(match[2], 10);
      if (!Number.isNaN(value)) {
        counts[key] = value;
      }
    }
  });

  return counts;
}

// Backend now provides accurate calculation, this is just for display
function getElementCounts(md, pillars) {
  const fromPillars = getElementCountsFromPillars(pillars);
  const total = Object.values(fromPillars).reduce((sum, val) => sum + val, 0);

  // If pillar extraction succeeded, use it
  if (total > 0) return fromPillars;

  // If extraction failed, return balanced default (common pattern: 2 of each element in 4 pillars)
  console.warn('Pillar extraction failed, using default distribution');
  return { '목': 2, '화': 2, '토': 2, '금': 1, '수': 1 };
}

function buildElementStats(counts) {
  const total = Object.values(counts).reduce((sum, val) => sum + val, 0) || 8;
  const order = ['목', '화', '토', '금', '수'];
  return order.map((key, index) => {
    const value = counts[key] || 0;
    const pct = Math.round((value / total) * 100);
    return `
      <div class="saju-stat" data-tone="${(index % 5) + 1}">
        <div class="stat-label">${key}</div>
        <div class="stat-value">${value}<span class="stat-total">/${total}</span></div>
        <div class="stat-meter"><span style="width:${pct}%"></span></div>
      </div>
    `;
  }).join('');
}

function buildSajuHero(sajuElement, counts) {
  const photo = heroPhotos[sajuElement] || heroPhotos['목'];
  return `
    <div class="saju-hero" style="--hero-photo:url('${photo}')">
      <div class="saju-hero-inner">
        <div class="saju-hero-copy">
          <p class="saju-hero-eyebrow">🌙 사주 시그니처</p>
          <h4 class="saju-hero-title">오행 분포와 기운의 무드</h4>
          <p class="saju-hero-desc">오행 비중을 한눈에 보고, 지금 흐르는 에너지의 톤을 확인하세요.</p>
        </div>
        <div class="saju-hero-stats">
          ${buildElementStats(counts)}
        </div>
      </div>
    </div>
  `;
}

function enhanceCallouts(container) {
  if (!container) return;
  const paragraphs = Array.from(container.querySelectorAll('p'));
  paragraphs.forEach(p => {
    const text = (p.textContent || '').trim();
    if (!text) return;
    if (text.length <= 120 && /(오늘|한 줄|조언|키워드|핵심|행운|추천)/.test(text)) {
      p.classList.add('callout');
    }
  });
}

function sanitizeVisibleText(text) {
  if (!text) return '';
  const allowedHanja = new Set(['甲','乙','丙','丁','戊','己','庚','辛','壬','癸','子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']);
  let cleaned = text.replace(/[\u3400-\u9FFF]/g, ch => (allowedHanja.has(ch) ? ch : ''));
  cleaned = cleaned.replace(/[^\p{Script=Hangul}\p{Script=Latin}0-9\s\p{P}\p{Extended_Pictographic}\u3400-\u9FFF]/gu, '');
  return cleaned;
}

function sanitizeAiResponse(md) {
  if (!md) return { cleaned: '', fortunes: {} };
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const banned = [
    /^User's Information:/i,
    /^Birth Date:/i,
    /^Calendar:/i,
    /^Gender:/i,
    /^Your Analysis/i
  ];
  const summaryLabels = [
    '한줄 요약', '키워드', '행운 색', '행운 숫자', '행운 방향', '추천 행동', '추천 음악'
  ];

  const fortunes = {};
  let cleanedLines = [];
  let inFortune = false;
  let currentFortune = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (inFortune && currentFortune) {
        fortunes[currentFortune] = `${fortunes[currentFortune]}\n`;
        continue;
      }
      cleanedLines.push(rawLine);
      continue;
    }

    if (banned.some(rx => rx.test(line))) {
      continue;
    }

    const isFortuneHeader = /^#+\s*운세/.test(line) || /운세\s*카드/.test(line);
    if (isFortuneHeader) {
      inFortune = true;
      currentFortune = null;
      continue;
    }

    const fortuneMatch = rawLine.match(/^\s*[-*]\s*(건강운|연애운|재물운|직업운|학업운|성장운|대인운)\s*[:：]\s*(.+)\s*$/);
    if (fortuneMatch) {
      fortunes[fortuneMatch[1]] = fortuneMatch[2].trim();
      currentFortune = fortuneMatch[1];
      inFortune = true;
      continue;
    }

    if (inFortune) {
      if (/^#+\s*/.test(line)) {
        inFortune = false;
        currentFortune = null;
      } else {
        if (currentFortune) {
          fortunes[currentFortune] = `${fortunes[currentFortune]}\n${line}`;
        }
        continue;
      }
    }

    if (/요약\s*카드/.test(line)) {
      continue;
    }
    if (summaryLabels.some(label => new RegExp(`^[-*]\\s*${label}\\s*[:：]`).test(line))) {
      continue;
    }

    cleanedLines.push(rawLine);
  }

  const cleaned = sanitizeVisibleText(cleanedLines.join('\n').trim());
  const sanitizedFortunes = {};
  Object.keys(fortunes).forEach(key => {
    sanitizedFortunes[key] = sanitizeVisibleText(fortunes[key]);
  });
  return { cleaned, fortunes: sanitizedFortunes };
}

function injectPillarHanja(md) {
  if (!md) return md;
  const ganMap = {
    '갑': '甲', '을': '乙', '병': '丙', '정': '丁', '무': '戊',
    '기': '己', '경': '庚', '신': '辛', '임': '壬', '계': '癸'
  };
  const jiMap = {
    '자': '子', '축': '丑', '인': '寅', '묘': '卯', '진': '辰', '사': '巳',
    '오': '午', '미': '未', '신': '申', '유': '酉', '술': '戌', '해': '亥'
  };
  const hanjaRegex = /[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]/;
  const hangulPairToHanja = (hangul) => {
    if (!hangul || hangul.length < 2) return '';
    const g = hangul[0];
    const j = hangul[1];
    return `${ganMap[g] || ''}${jiMap[j] || ''}`;
  };

  let normalized = md.replace(/([A-Za-z]+)\s*([A-Za-z]+)\s*\(([가-힣]{2})\)/g, (_m, _a, _b, hangul) => {
    const hanja = hangulPairToHanja(hangul);
    return hanja ? `${hangul}(${hanja})` : hangul;
  });

  normalized = normalized.replace(/([A-Za-z]+)\s*([A-Za-z]+)\s*\(([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])\)/g, (_m, _a, _b, hanja) => {
    const hangul = `${Object.entries(ganMap).find(([, v]) => v === hanja[0])?.[0] || ''}${Object.entries(jiMap).find(([, v]) => v === hanja[1])?.[0] || ''}`;
    return hangul ? `${hangul}(${hanja})` : hanja;
  });
  normalized = normalized.replace(/([A-Za-z]+)\s*\(([가-힣])\)/g, (_m, _a, hangul) => {
    const hanja = ganMap[hangul] || jiMap[hangul] || '';
    return hanja ? `${hangul}(${hanja})` : hangul;
  });

  return normalized.split('\n').map(line => {
    if (!/(년주|월주|일주|시주)/.test(line)) return line;
    if (hanjaRegex.test(line)) return line;
    let updated = line.replace(/:\s*[A-Za-z]+\s*\(([^)]+)\)/, ': $1');
    updated = updated.replace(/([갑을병정무기경신임계])([자축인묘진사오미신유술해])/g, (match, g, j) => {
      const hanja = `${ganMap[g]}${jiMap[j]}`;
      return `${g}${j}(${hanja})`;
    });
    return updated;
  }).join('\n');
}

function buildPillarsFromServer(saju) {
  if (!saju) return [];
  const labels = [
    { key: 'yearPillar', label: '년주', name: 'year' },
    { key: 'monthPillar', label: '월주', name: 'month' },
    { key: 'dayPillar', label: '일주', name: 'day' },
    { key: 'hourPillar', label: '시주', name: 'hour' }
  ];
  return labels.map(({ key, label, name }) => {
    const pillar = saju[key];
    if (!pillar || !pillar.stem || !pillar.branch) return null;
    return {
      label,
      hanja: pillar.stem + pillar.branch,
      hangul: (pillar.hangulStem || '') + (pillar.hangulBranch || ''),
      stemElement: pillar.stemElement || '',
      branchElement: pillar.branchElement || '',
      tenGodStem: saju.tenGods ? saju.tenGods[name + 'Stem'] || '' : '',
      tenGodBranch: saju.tenGods ? saju.tenGods[name + 'Branch'] || '' : '',
      twelveStage: saju.twelveStages ? saju.twelveStages[name] || '' : '',
      hiddenStems: saju.hiddenStems ? saju.hiddenStems[name] || [] : []
    };
  }).filter(Boolean);
}

function extractPillars(md) {
  if (!md) return [];
  const ganToHanja = {
    '갑': '甲', '을': '乙', '병': '丙', '정': '丁', '무': '戊',
    '기': '己', '경': '庚', '신': '辛', '임': '壬', '계': '癸'
  };
  const jiToHanja = {
    '자': '子', '축': '丑', '인': '寅', '묘': '卯', '진': '辰', '사': '巳',
    '오': '午', '미': '未', '신': '申', '유': '酉', '술': '戌', '해': '亥'
  };
  const hanjaToGan = Object.fromEntries(Object.entries(ganToHanja).map(([k, v]) => [v, k]));
  const hanjaToJi = Object.fromEntries(Object.entries(jiToHanja).map(([k, v]) => [v, k]));

  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const results = [];

  for (const rawLine of lines) {
    const match = rawLine.match(/(년주|월주|일주|시주)\s*[:：]\s*(.+)/);
    if (!match) continue;
    const label = match[1];
    const value = match[2];
    const hanjaMatch = value.match(/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/);
    const hangulMatch = value.match(/[갑을병정무기경신임계][자축인묘진사오미신유술해]/);

    let hanja = hanjaMatch ? hanjaMatch[0] : '';
    let hangul = hangulMatch ? hangulMatch[0] : '';

    if (!hanja && hangul) {
      hanja = `${ganToHanja[hangul[0]] || ''}${jiToHanja[hangul[1]] || ''}`;
    }
    if (!hangul && hanja) {
      hangul = `${hanjaToGan[hanja[0]] || ''}${hanjaToJi[hanja[1]] || ''}`;
    }

    // Validate: Each pillar should have exactly 2 characters (1 stem + 1 branch)
    if ((hanja && hanja.length === 2) || (hangul && hangul.length === 2)) {
      results.push({ label, hanja, hangul });
    } else if (hanja || hangul) {
      console.warn(`Invalid pillar format for ${label}: hanja="${hanja}" hangul="${hangul}"`);
    }
  }

  // Additional validation: Expect exactly 4 pillars (년월일시)
  if (results.length !== 4) {
    console.warn(`Expected 4 pillars, extracted ${results.length} from GPT response`);
  }

  return results;
}

function getStampSvg(tone = 1) {
  const tones = {
    1: ['var(--accent-1)', 'var(--accent-3)'],
    2: ['var(--accent-2)', 'var(--accent-4)'],
    3: ['var(--accent-3)', 'var(--accent-5)'],
    4: ['var(--accent-4)', 'var(--accent-2)'],
    5: ['var(--accent-5)', 'var(--accent-1)']
  };
  const [c1, c2] = tones[tone] || tones[1];
  return `
    <svg class="seal-svg" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id="seal-grad-${tone}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${c1}" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="${c2}" stop-opacity="0.7"/>
        </linearGradient>
      </defs>
      <rect x="14" y="14" width="92" height="92" rx="18" fill="url(#seal-grad-${tone})" opacity="0.22"/>
      <rect x="22" y="22" width="76" height="76" rx="14" fill="none" stroke="${c1}" stroke-width="3" opacity="0.6"/>
      <path d="M30 64 L90 64" stroke="${c2}" stroke-width="2" opacity="0.5"/>
      <path d="M60 30 L60 90" stroke="${c2}" stroke-width="2" opacity="0.5"/>
      <circle cx="60" cy="60" r="10" fill="${c1}" opacity="0.35"/>
    </svg>
  `;
}

function buildPillarBoard(pillars) {
  if (!pillars.length) return '';
  const cards = pillars.map((pillar, index) => {
    const tone = (index % 5) + 1;
    const photo = pillarPhotos[index % pillarPhotos.length];

    // 십성 표시 (천간 위에)
    const tenGodStemHtml = pillar.tenGodStem
      ? `<span class="pillar-tengod">${escapeHtml(pillar.tenGodStem)}</span>` : '';
    const tenGodBranchHtml = pillar.tenGodBranch
      ? `<span class="pillar-tengod branch">${escapeHtml(pillar.tenGodBranch)}</span>` : '';

    // 12운성
    const twelveStageHtml = pillar.twelveStage
      ? `<span class="pillar-stage">${escapeHtml(pillar.twelveStage)}</span>` : '';

    // 지장간
    const hiddenHtml = pillar.hiddenStems && pillar.hiddenStems.length > 0
      ? `<div class="pillar-hidden">${pillar.hiddenStems.map(s => `<span>${escapeHtml(s)}</span>`).join('')}</div>` : '';

    return `
      <div class="pillar-card" data-tone="${tone}" style="--pillar-photo:url('${photo}')">
        <div class="pillar-seal">${getStampSvg(tone)}</div>
        <div class="pillar-label">${pillar.label}</div>
        ${tenGodStemHtml}
        <div class="pillar-hanja-stem">${escapeHtml(pillar.hanja ? pillar.hanja[0] : '')}</div>
        <div class="pillar-hanja-branch">${escapeHtml(pillar.hanja ? pillar.hanja[1] : '')}</div>
        ${tenGodBranchHtml}
        <div class="pillar-hangul">${escapeHtml(pillar.hangul || '')}</div>
        ${twelveStageHtml}
        ${hiddenHtml}
      </div>
    `;
  }).join('');

  return `
    <div class="section result-shell pillar-shell">
      <div class="analysis-header">
        <div>
          <p class="analysis-eyebrow">🪷 사주 네 기둥</p>
          <h3 class="analysis-title">기운의 패턴을 그림처럼 읽기 <span style="font-size: 0.75em; color: var(--neutral-dim); font-weight: normal;" title="Backend에서 정확한 만세력 계산을 수행합니다">✓ 정확한 만세력 계산 기반</span></h3>
        </div>
      </div>
      <div class="pillar-board">
        ${cards}
      </div>
    </div>
  `;
}

function buildManseryeokTable(serverSaju) {
  if (!serverSaju || !serverSaju.daeun) return '';

  const daeun = serverSaju.daeun;
  const saeun = serverSaju.saeun || [];
  const currentYear = new Date().getFullYear();
  const birthYear = saeun.length > 0 ? saeun[0].year - saeun[0].age : currentYear - 30;

  // 오행 색상 매핑
  const elementColor = {
    '목': '#4ade80', '화': '#f87171', '토': '#fbbf24', '금': '#e2e8f0', '수': '#60a5fa'
  };

  // 대운 행 (현재 대운 하이라이트)
  const currentAge = currentYear - birthYear;
  const daeunCells = daeun.cycles.map(c => {
    const isActive = currentAge >= c.age && currentAge < c.age + 10;
    const stemColor = elementColor[c.stemElement] || '#fff';
    const branchColor = elementColor[c.branchElement] || '#fff';
    return `
      <div class="ms-cell ${isActive ? 'ms-active' : ''}">
        <div class="ms-age">${c.age}세</div>
        <div class="ms-year">${c.year}</div>
        <div class="ms-tengod">${escapeHtml(c.tenGod)}</div>
        <div class="ms-stem" style="color:${stemColor}">${escapeHtml(c.stem)}</div>
        <div class="ms-branch" style="color:${branchColor}">${escapeHtml(c.branch)}</div>
        <div class="ms-hangul">${escapeHtml(c.hangulStem)}${escapeHtml(c.hangulBranch)}</div>
        <div class="ms-stage">${escapeHtml(c.twelveStage)}</div>
      </div>
    `;
  }).join('');

  // 세운 행
  const saeunCells = saeun.map(s => {
    const stemColor = elementColor[s.stemElement] || '#fff';
    const branchColor = elementColor[s.branchElement] || '#fff';
    return `
      <div class="ms-cell ${s.isCurrent ? 'ms-active' : ''}">
        <div class="ms-age">${s.age}세</div>
        <div class="ms-year">${s.year}</div>
        <div class="ms-tengod">${escapeHtml(s.tenGod)}</div>
        <div class="ms-stem" style="color:${stemColor}">${escapeHtml(s.stem)}</div>
        <div class="ms-branch" style="color:${branchColor}">${escapeHtml(s.branch)}</div>
        <div class="ms-hangul">${escapeHtml(s.hangulStem)}${escapeHtml(s.hangulBranch)}</div>
        <div class="ms-stage">${escapeHtml(s.twelveStage)}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="section result-shell manseryeok-shell fade-in">
      <div class="analysis-header">
        <div>
          <p class="analysis-eyebrow">📜 만세력</p>
          <h3 class="analysis-title">만세력 (命式)</h3>
        </div>
        <div class="analysis-badges">
          <span class="badge tone-2">대운 ${escapeHtml(daeun.direction)}</span>
          <span class="badge tone-4">대운수 ${daeun.startAge}세</span>
        </div>
      </div>
      <div class="ms-section">
        <div class="ms-label">대운 (大運) <span class="ms-sublabel">10년 주기 운의 흐름</span></div>
        <div class="ms-scroll">
          <div class="ms-row">
            ${daeunCells}
          </div>
        </div>
      </div>
      <div class="ms-section">
        <div class="ms-label">세운 (歲運) <span class="ms-sublabel">연간 운세</span></div>
        <div class="ms-scroll">
          <div class="ms-row ms-saeun-row">
            ${saeunCells}
          </div>
        </div>
      </div>
    </div>
  `;
}


function buildElementGallery(activeKey, counts) {
  const elements = [
    { key: '목', label: '목', name: 'Wood' },
    { key: '화', label: '화', name: 'Fire' },
    { key: '토', label: '토', name: 'Earth' },
    { key: '금', label: '금', name: 'Metal' },
    { key: '수', label: '수', name: 'Water' }
  ];
  const total = Object.values(counts || {}).reduce((sum, val) => sum + val, 0) || 8;

  const cards = elements.map(el => {
    const active = el.key === activeKey ? 'active' : '';
    const { hanja, gradient, color } = getElementHanja(el.key);
    const value = counts && typeof counts[el.key] === 'number' ? counts[el.key] : 0;
    const pct = Math.round((value / total) * 100);
    return `
      <div class="element-card ${active}" data-key="${el.key}">
        <div class="element-hanja" style="background:${gradient}">
          <span class="hanja-char">${hanja}</span>
        </div>
        <div class="element-label">${el.label}(${hanja})</div>
        <div class="element-name">${el.name}</div>
        <div class="element-count">${value} / ${total}</div>
        <div class="element-meter"><span style="width:${pct}%;background:${color}"></span></div>
      </div>
    `;
  }).join('');

  return `
    <div class="section result-shell element-shell">
      <div class="analysis-header">
        <div>
          <p class="analysis-eyebrow">🎨 오행 분석</p>
          <h3 class="analysis-title">오행(五行)의 기운</h3>
        </div>
      </div>
      <div class="element-gallery">
        ${cards}
      </div>
    </div>
  `;
}

function buildFortuneHtml(fortunes) {
  const fortuneDefs = [
    { key: '건강운', label: '건강운', icon: '🩺' },
    { key: '연애운', label: '연애운', icon: '❤️' },
    { key: '재물운', label: '재물운', icon: '💰' },
    { key: '직업운', label: '직업운', icon: '💼' },
    { key: '성장운', label: '성장운', icon: '🌱' }
  ];
  const hasAny = fortuneDefs.some(def => fortunes[def.key]);
  if (!hasAny) return '';

  const buttons = fortuneDefs.map((def, index) => {
    return `<button class="fortune-btn" data-fortune="${def.key}"><span class="f-icon">${def.icon}</span>${def.label}</button>`;
  }).join('');

  const contents = fortuneDefs.map(def => {
    const text = fortunes[def.key] || '준비 중입니다.';
    const safeHtml = renderMarkdownSafe(text);
    return `
      <div class="fortune-content" data-fortune="${def.key}">
        <div class="fortune-report-header">
          <span class="fortune-report-label">${def.label}</span>
          <span class="fortune-report-sub">사주 리포트</span>
        </div>
        ${safeHtml}
      </div>
    `;
  }).join('');

  return `
    <div class="section result-shell fortune-shell">
      <div class="analysis-header">
        <div>
          <p class="analysis-eyebrow">🔔 오늘의 운세</p>
          <h3 class="analysis-title">클릭해서 확인하기</h3>
        </div>
      </div>
      <div class="fortune-grid">
        ${buttons}
      </div>
      <div class="fortune-placeholder">카드를 눌러 상세 리포트를 확인하세요.</div>
      ${contents}
    </div>
  `;
}

function bindFortuneTabs(container) {
  const buttons = Array.from(container.querySelectorAll('.fortune-btn'));
  const contents = Array.from(container.querySelectorAll('.fortune-content'));
  const placeholder = container.querySelector('.fortune-placeholder');
  if (!buttons.length || !contents.length) return;

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      buttons.forEach(btn => btn.classList.remove('active'));
      contents.forEach(content => content.classList.remove('active'));
      button.classList.add('active');
      const target = container.querySelector(`.fortune-content[data-fortune="${button.dataset.fortune}"]`);
      if (target) target.classList.add('active');
      if (placeholder) placeholder.style.display = 'none';
    });
  });
}

function applyAccordion(container) {
  if (!container) return;

  const elements = Array.from(container.children);
  const hasH2 = elements.some(el => el.tagName === 'H2');
  if (!hasH2) return;

  const accordion = document.createElement('div');
  accordion.className = 'accordion';
  let current = null;

  const flush = () => {
    if (!current) return;
    // Skip sections with no meaningful content
    const hasContent = current.nodes.some(node => {
      const text = (node.textContent || '').trim();
      return text.length > 10;
    });
    if (!hasContent) { current = null; return; }

    const details = document.createElement('details');
    details.className = 'accordion-item';
    if (!accordion.children.length) {
      details.open = true;
    }

    details.dataset.tone = String((accordion.children.length % 5) + 1);

    const summary = document.createElement('summary');
    const titleSpan = document.createElement('span');
    titleSpan.className = 'accordion-title';
    titleSpan.textContent = current.title || '섹션';
    summary.appendChild(titleSpan);

    const body = document.createElement('div');
    body.className = 'accordion-body';
    current.nodes.forEach(node => body.appendChild(node));

    details.appendChild(summary);
    details.appendChild(body);
    accordion.appendChild(details);
    current = null;
  };

  elements.forEach(el => {
    if (el.tagName === 'H2') {
      flush();
      current = { title: el.textContent.trim(), nodes: [] };
    } else {
      if (!current) {
        current = { title: '핵심 정리', nodes: [] };
      }
      current.nodes.push(el);
    }
  });

  flush();
  container.innerHTML = '';
  container.appendChild(accordion);
}

function badge(text, tone) {
  return `<span class="badge" data-tone="${tone}">${escapeHtml(text)}</span>`;
}

// --- 이벤트 리스너 ---

document.getElementById('btnGo').addEventListener('click', async () => {
  const errBox = document.getElementById('errBox');
  errBox.style.display = 'none';

  const timeUnknown = bTUnknown && bTUnknown.checked;
  const sajuData = {
    year: bY.value,
    month: bM.value,
    day: bD.value,
    time: timeUnknown ? '-1' : bT.value,
    gender: document.querySelector('input[name="gender"]:checked').value,
    cal: document.querySelector('input[name="cal"]:checked').value,
    place: bP.value,
    b_time_ext: timeUnknown ? '모름' : (bT.value || '모름'),
  };
  const userQuestion = document.getElementById('bQ').value || '';

  if (!sajuData.year || !sajuData.month || !sajuData.day || (!timeUnknown && !bT.value)) {
    showError('생년월일과 시간을 모두 입력해주세요. (시간을 모르면 "모름" 체크)', 'errBox');
    return;
  }
  if (!sajuData.place || !sajuData.place.trim()) {
    showError('출생지를 입력해주세요. (예: 서울, 부산, 인천)', 'errBox');
    return;
  }

  // Store saju data globally for fortune tabs
  currentSajuData = sajuData;

  const resultDiv = document.getElementById('basicResult');
  resultDiv.style.display = 'block';
  resultDiv.innerHTML = `
    <div class="section result-shell loading-state fade-in" style="padding:60px 24px;text-align:center;">
      <div style="font-size:48px;margin-bottom:20px;">🔮</div>
      <p class="loading-text" style="font-size:18px;font-weight:600;">사주를 깊이 분석하고 있습니다</p>
      <p class="loading-text" style="font-size:14px;color:var(--muted);margin-top:10px;">잠시만 기다려주세요<span class="loading-dots"></span></p>
    </div>
  `;
  resultDiv.scrollIntoView({ behavior: 'smooth' });

  resetPlayer();

  // 새 분석 시 fortune 캐시 초기화
  fortuneTabCache = {};

  const aiPayload = {
    type: 'saju',
    sajuData: JSON.stringify(sajuData),
    question: userQuestion
  };

  const rawResponse = await getAiResponse(aiPayload);
  let aiResponse, serverSaju;
  if (rawResponse && typeof rawResponse === 'object' && rawResponse.content) {
    aiResponse = rawResponse.content;
    serverSaju = rawResponse.calculatedSaju || null;
  } else {
    aiResponse = rawResponse;
    serverSaju = null;
  }

  const analysisSummary = parseSummary(aiResponse);
  const sanitized = sanitizeAiResponse(aiResponse);
  const cleanedResponse = injectPillarHanja(sanitized.cleaned);
  const pillars = serverSaju ? buildPillarsFromServer(serverSaju) : extractPillars(cleanedResponse);
  const elementCounts = serverSaju?.elements || getElementCounts(cleanedResponse, pillars);

  const yinYangData = serverSaju?.yinYang || calculateYinYang(pillars);
  const yangCount = yinYangData.yang;
  const yinCount = yinYangData.yin;
  const total = yangCount + yinCount || 1;
  const yangPercent = Math.round((yangCount / total) * 100);
  const yinPercent = 100 - yangPercent;
  const yinYangDesc = yangCount > yinCount ? '양의 기운이 강한 사주입니다. 적극적이고 활동적인 에너지가 넘치며, 자신감 있게 앞으로 나아가는 성향을 보입니다. 도전을 두려워하지 않고 새로운 시도를 즐깁니다.' : yinCount > yangCount ? '음의 기운이 강한 사주입니다. 내면의 깊이와 섬세한 감성이 돋보이며, 차분하고 신중하게 상황을 파악하는 능력이 뛰어납니다. 타인의 감정을 잘 이해하고 배려심이 많습니다.' : '음양이 균형 잡힌 사주입니다. 조화로운 에너지 흐름을 가지고 있어 상황에 따라 유연하게 대처할 수 있습니다. 적극성과 신중함을 모두 갖춘 균형잡힌 성격입니다.';

  const elementMatch = cleanedResponse.match(/(?:###\s*오행|오행)\s*[:：]\s*\[?(목|화|토|금|수)\]?/);
  const sajuElement = elementMatch ? elementMatch[1] : '목';
  const calLabel = document.querySelector('input[name="cal"]:checked').value === 'solar' ? '양력' : '음력';
  const genderLabel = document.querySelector('input[name="gender"]:checked').value === 'male' ? '남자' : '여자';
  const birthLabel = `${sajuData.year}.${sajuData.month}.${sajuData.day}`;
  const timeLabel = sajuData.b_time_ext || '시간 미입력';
  const questionPreview = truncateText(userQuestion.trim(), 36);
  const questionChip = questionPreview
    ? `<span class="meta-chip">질문: ${escapeHtml(questionPreview)}</span>`
    : '';
  const elementBadge = sajuElement ? badge(`오행 ${sajuElement}`, 1) : '';

  const fortuneHtml = buildFortuneHtml(sanitized.fortunes);

  resultDiv.innerHTML = `
    <div class="section result-shell fade-in">
      <div class="analysis-header">
        <div>
          <p class="analysis-eyebrow">🔮 사주 리딩</p>
          <h3 class="analysis-title">당신의 사주 분석 결과</h3>
        </div>
        <div class="analysis-badges">
          ${elementBadge}
          ${badge(calLabel, 2)}
          ${badge(genderLabel, 3)}
        </div>
      </div>
      <div class="analysis-meta">
        <span class="meta-chip">생년월일 ${birthLabel}</span>
        <span class="meta-chip">시간 ${escapeHtml(timeLabel)}</span>
        ${questionChip}
      </div>
      ${buildSummaryHtml(analysisSummary)}
      <div class="saju-search-wrap">
        <div class="saju-search-box">
          <input type="text" class="saju-search-input" data-role="saju-search" placeholder="사주 용어가 궁금하면 여기에 검색하세요 (예: 도화살, 편관, 대운)" maxlength="100">
          <button class="saju-search-btn" data-role="saju-search-btn">검색</button>
        </div>
        <div class="saju-search-result" data-role="saju-search-result" style="display:none;"></div>
      </div>
      <div class="share-actions">
        <button class="share-btn" data-action="share">공유하기</button>
        <button class="share-btn" data-action="copy-link">링크 복사</button>
      </div>
      ${buildSajuHero(sajuElement, elementCounts)}
      <div class="manseryeok-slot" data-role="manseryeok-slot"></div>
      <div class="pillar-slot" data-role="pillar-slot"></div>
      <div class="element-slot" data-role="element-slot"></div>
      <div class="section result-shell yinyang-card fade-in" style="margin:16px 0;">
        <div class="analysis-header">
          <div>
            <p class="analysis-eyebrow">☯ 음양 분석</p>
            <h3 class="analysis-title">음양의 기운</h3>
          </div>
          <div class="analysis-badges">
            ${badge('양 ' + yangCount + '개', 2)}
            ${badge('음 ' + yinCount + '개', 4)}
          </div>
        </div>
        <div class="yinyang-bar">
          <div class="yang-bar" style="width:${yangPercent}%">
            <span style="font-size:16px;">☀</span> 양 ${yangCount}/8
          </div>
          <div class="yin-bar" style="width:${yinPercent}%">
            <span style="font-size:16px;">🌙</span> 음 ${yinCount}/8
          </div>
        </div>
        <div class="yinyang-details" style="margin-top:20px;padding:16px;background:var(--bg-secondary);border-radius:12px;">
          <p style="font-weight:600;margin-bottom:10px;">
            ${yangCount > yinCount ? '양의 기운이 우세합니다' : yinCount > yangCount ? '음의 기운이 우세합니다' : '음양이 완벽하게 균형을 이룹니다'}
          </p>
          <p class="yinyang-desc" style="line-height:1.8;">${escapeHtml(yinYangDesc)}</p>
          <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">
            <div style="padding:12px;background:rgba(255,107,107,0.1);border-radius:8px;">
              <strong>양의 특성:</strong><br>
              외향적, 활동적, 적극적, 창의적
            </div>
            <div style="padding:12px;background:rgba(76,201,240,0.1);border-radius:8px;">
              <strong>음의 특성:</strong><br>
              내향적, 사려깊음, 수용적, 안정적
            </div>
          </div>
        </div>
      </div>
      <div class="analysis-body" data-role="analysis-body"></div>
    </div>
    ${fortuneHtml}
    <div class="section result-shell fortune-tabs-shell fade-in">
      <div class="analysis-header">
        <div>
          <p class="analysis-eyebrow">🔮 상세 운세</p>
          <h3 class="analysis-title">상세 운세 분석</h3>
        </div>
      </div>
      <div class="tabs fortune-detail-tabs" role="tablist" aria-label="상세 운세 메뉴">
        <button class="tab-btn active" data-fortune="tomorrow" role="tab">내일의 운세</button>
        <button class="tab-btn" data-fortune="love" role="tab">연애운</button>
        <button class="tab-btn" data-fortune="health" role="tab">건강운</button>
        <button class="tab-btn" data-fortune="wealth" role="tab">재물운</button>
      </div>
      <div class="fortune-tab-content" data-role="fortune-detail-content">
        <p style="text-align:center;color:var(--muted);padding:40px 20px;">탭을 클릭하면 상세 분석이 표시됩니다.</p>
      </div>
    </div>
    <div class="section result-shell music-shell">
      <div class="analysis-header">
        <div>
          <p class="analysis-eyebrow">🎧 음악 추천</p>
          <h3 class="analysis-title">오늘의 분위기 맞춤 플레이</h3>
        </div>
        <div class="analysis-badges">
          ${badge('키워드 ' + sajuElement, 2)}
        </div>
      </div>
      <div class="music-box">
        <div class="player-wrap">
          <div id="player-container"></div>
        </div>
        <p class="music-meta" style="font-size:12px; text-align:center; color: var(--muted); margin-top:10px;"></p>
        <p class="song-list-title">오늘의 추천곡</p>
        <ul class="song-list" data-role="song-list"></ul>
        <div class="music-actions">
          <button class="refresh-btn" data-role="refresh-songs">다시 추천</button>
        </div>
        <p style="font-size:12px; text-align:center; color: var(--muted); margin-top:10px;">'${escapeHtml(sajuElement)}' 기운에 어울리는 플레이리스트를 자동으로 재생합니다.</p>
      </div>
    </div>
  `;

  const analysisBody = resultDiv.querySelector('[data-role="analysis-body"]');
  if (analysisBody) {
    analysisBody.innerHTML = renderMarkdownSafe(cleanedResponse);
    enhanceCallouts(analysisBody);
    applyAccordion(analysisBody);
  }

  const manseryeokSlot = resultDiv.querySelector('[data-role="manseryeok-slot"]');
  if (manseryeokSlot && serverSaju) {
    manseryeokSlot.innerHTML = buildManseryeokTable(serverSaju);
  }

  const pillarSlot = resultDiv.querySelector('[data-role="pillar-slot"]');
  if (pillarSlot) {
    pillarSlot.innerHTML = buildPillarBoard(pillars);
  }

  const elementSlot = resultDiv.querySelector('[data-role="element-slot"]');
  if (elementSlot) {
    elementSlot.innerHTML = buildElementGallery(sajuElement, elementCounts);
  }

  bindFortuneTabs(resultDiv);

  // Fortune 상세 탭 클릭 핸들러 (fortune-detail-tabs 내부만 선택)
  resultDiv.querySelectorAll('.fortune-detail-tabs [data-fortune]').forEach(btn => {
    btn.addEventListener('click', () => {
      resultDiv.querySelectorAll('.fortune-detail-tabs [data-fortune]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadFortuneInResult(btn.dataset.fortune, resultDiv);
    });
  });

  const refreshBtn = resultDiv.querySelector('[data-role="refresh-songs"]');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => getSongs(sajuElement, resultDiv));
  }

  resultDiv.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.action === 'share') handleShare();
      else if (btn.dataset.action === 'copy-link') handleCopyLink();
    });
  });

  getSongs(sajuElement, resultDiv);

  // 첫 번째 상세 운세 탭 자동 로드
  setTimeout(() => {
    loadFortuneInResult('tomorrow', resultDiv);
  }, 500);

  // Saju term search
  const searchInput = resultDiv.querySelector('[data-role="saju-search"]');
  const searchBtn = resultDiv.querySelector('[data-role="saju-search-btn"]');
  const searchResult = resultDiv.querySelector('[data-role="saju-search-result"]');

  async function doSearch() {
    const query = searchInput?.value?.trim();
    if (!query || query.length < 2) {
      showToast('검색어를 2자 이상 입력해주세요.', 'error');
      return;
    }
    searchResult.style.display = 'block';
    searchResult.innerHTML = '<p class="search-loading">검색 중<span class="loading-dots"></span></p>';
    searchBtn.disabled = true;

    try {
      const params = new URLSearchParams({ type: 'search', query });
      const resp = await fetch(`/api/saju?${params.toString()}`);
      const data = await resp.json();

      let answer = '';
      if (data?.choices?.[0]?.message?.content) {
        answer = data.choices[0].message.content;
      } else if (data?.content) {
        answer = data.content;
      } else if (data?.error?.message) {
        answer = `오류: ${data.error.message}`;
      } else {
        answer = '검색 결과를 가져오지 못했습니다.';
      }

      searchResult.innerHTML = `
        <div class="search-answer">
          <div class="search-answer-header">
            <span class="search-query-label">"${escapeHtml(query)}"</span>
            <button class="search-close-btn" data-role="search-close">✕</button>
          </div>
          <div class="search-answer-body">${renderMarkdownSafe(answer)}</div>
        </div>
      `;

      searchResult.querySelector('[data-role="search-close"]')?.addEventListener('click', () => {
        searchResult.style.display = 'none';
      });
    } catch (err) {
      searchResult.innerHTML = '<p class="search-error">검색 중 오류가 발생했습니다. 다시 시도해주세요.</p>';
    }
    searchBtn.disabled = false;
  }

  if (searchBtn) searchBtn.addEventListener('click', doSearch);
  if (searchInput) searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch();
  });

  trackEvent('saju_analysis_complete', { event_category: 'engagement', element: sajuElement || 'unknown' });
});

document.getElementById('btnCompat').addEventListener('click', async () => {
  const errBox = document.getElementById('errBox2');
  errBox.style.display = 'none';

  const cT1Unknown = document.getElementById('cT1Unknown');
  const cT2Unknown = document.getElementById('cT2Unknown');
  const time1Unknown = cT1Unknown && cT1Unknown.checked;
  const time2Unknown = cT2Unknown && cT2Unknown.checked;

  const person1 = {
    year: cY1.value,
    month: cM1.value,
    day: cD1.value,
    time: time1Unknown ? '-1' : cT1.value,
  };
  const person2 = {
    year: cY2.value,
    month: cM2.value,
    day: cD2.value,
    time: time2Unknown ? '-1' : cT2.value,
  };
  const userQuestion = document.getElementById('cQ').value || '';

  if (!person1.year || !person1.month || !person1.day || !person2.year || !person2.month || !person2.day) {
    showError('두 분의 생년월일을 모두 입력해주세요.', 'errBox2');
    return;
  }

  const resultDiv = document.getElementById('compatResult');
  resultDiv.style.display = 'block';
  resultDiv.innerHTML = `
    <div class="section result-shell loading-state fade-in" style="padding:60px 24px;text-align:center;">
      <div style="font-size:48px;margin-bottom:20px;">💞</div>
      <p class="loading-text" style="font-size:18px;font-weight:600;">궁합을 깊이 분석하고 있습니다</p>
      <p class="loading-text" style="font-size:14px;color:var(--muted);margin-top:10px;">잠시만 기다려주세요<span class="loading-dots"></span></p>
    </div>
  `;
  resultDiv.scrollIntoView({ behavior: 'smooth' });

  const aiPayload = {
    type: 'compat',
    person1: JSON.stringify(person1),
    person2: JSON.stringify(person2),
    question: userQuestion
  };

  const aiResponse = await getAiResponse(aiPayload);
  const summary = parseSummary(aiResponse);
  const sanitized = sanitizeAiResponse(aiResponse);
  const cleanedResponse = injectPillarHanja(sanitized.cleaned);
  const time1Label = time1Unknown ? '모름' : (cT1.value || '시간 미입력');
  const time2Label = time2Unknown ? '모름' : (cT2.value || '시간 미입력');
  const person1Label = `${person1.year}.${person1.month}.${person1.day}`;
  const person2Label = `${person2.year}.${person2.month}.${person2.day}`;
  const questionPreview = truncateText(userQuestion.trim(), 36);
  const questionChip = questionPreview
    ? `<span class="meta-chip">질문: ${escapeHtml(questionPreview)}</span>`
    : '';

  resultDiv.innerHTML = `
    <div class="section result-shell fade-in">
      <div class="analysis-header">
        <div>
          <p class="analysis-eyebrow">💞 궁합 리딩</p>
          <h3 class="analysis-title">두 분의 궁합 분석 결과</h3>
        </div>
        <div class="analysis-badges">
          ${badge('궁합 리딩', 1)}
        </div>
      </div>
      <div class="analysis-meta">
        <span class="meta-chip">나 ${person1Label} · ${escapeHtml(time1Label)}</span>
        <span class="meta-chip">상대 ${person2Label} · ${escapeHtml(time2Label)}</span>
        ${questionChip}
      </div>
      <div class="analysis-body" data-role="analysis-body"></div>
    </div>
  `;

  const analysisBody = resultDiv.querySelector('[data-role="analysis-body"]');
  if (analysisBody) {
    analysisBody.innerHTML = renderMarkdownSafe(cleanedResponse);
    enhanceCallouts(analysisBody);
    applyAccordion(analysisBody);
  }

  trackEvent('compat_analysis_complete', { event_category: 'engagement' });
});

// --- Fortune Tab Handlers ---
let fortuneTabCache = {}; // Cache fortune results

async function loadFortuneInResult(tabType, resultDiv) {
  const container = resultDiv.querySelector('[data-role="fortune-detail-content"]');
  if (!container || !currentSajuData) return;

  // 캐시된 HTML 재사용
  if (fortuneTabCache[tabType] && typeof fortuneTabCache[tabType] === 'string') {
    container.innerHTML = fortuneTabCache[tabType];
    const body = container.querySelector('.analysis-body');
    if (body) { enhanceCallouts(body); applyAccordion(body); }
    return;
  }

  // 로딩 표시
  container.innerHTML = `
    <div class="section result-shell loading-state fade-in" style="padding:60px 24px;text-align:center;">
      <div style="font-size:48px;margin-bottom:20px;">✨</div>
      <p class="loading-text" style="font-size:18px;font-weight:600;">상세 운세를 분석하고 있습니다</p>
      <p class="loading-text" style="font-size:14px;color:var(--muted);margin-top:10px;">잠시만 기다려주세요<span class="loading-dots"></span></p>
    </div>
  `;

  try {
    const aiPayload = {
      type: tabType,
      sajuData: JSON.stringify(currentSajuData)
    };

    const aiResponse = await getAiResponse(aiPayload);
    const sanitized = sanitizeAiResponse(aiResponse);

    const resultHtml = `<div class="analysis-body">${renderMarkdownSafe(sanitized.cleaned)}</div>`;
    container.innerHTML = resultHtml;

    const body = container.querySelector('.analysis-body');
    if (body) {
      enhanceCallouts(body);
      applyAccordion(body);
    }

    // 캐시 저장
    fortuneTabCache[tabType] = resultHtml;

    trackEvent('fortune_inline_' + tabType + '_complete', { event_category: 'engagement' });
  } catch (error) {
    console.error('Error loading inline fortune ' + tabType + ':', error);
    container.innerHTML = '<div style="padding:24px;text-align:center;"><p style="color:var(--muted);">운세 분석을 불러오지 못했습니다. 탭을 다시 클릭해주세요.</p></div>';
  }
}

const lastModified = document.getElementById('lastModified');
if (lastModified) {
  lastModified.textContent = '마지막 업데이트: ' + new Date().toLocaleString();
}
