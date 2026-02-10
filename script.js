const bY = document.getElementById('bY');
const bM = document.getElementById('bM');
const bD = document.getElementById('bD');
const bT = document.getElementById('bT');
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
  '목': 'calm acoustic playlist',
  '화': 'upbeat pop playlist',
  '토': 'cozy easy listening playlist',
  '금': 'epic cinematic playlist',
  '수': 'chill lofi hiphop playlist'
};

const elementPhotos = {
  '목': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  '화': 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1200&q=80',
  '토': 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80',
  '금': 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?auto=format&fit=crop&w=1200&q=80',
  '수': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'
};

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
    playsinline: '1'
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

  const video = videos[0];
  const title = escapeHtml(video.title || '제목 없음');
  const channel = escapeHtml(video.channelTitle || '');
  const videoId = video.videoId || '';
  const watchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : '#';
  list.innerHTML = `
    <li>
      <button class="play-btn" data-video-id="${videoId}">재생</button>
      <div class="song-info">
        <span class="song-title-text">${title}</span>
        <span class="song-channel">${channel}</span>
      </div>
      <a class="yt-link" href="${watchUrl}" target="_blank" rel="noopener">유튜브</a>
    </li>
  `;

  list.onclick = event => {
    const button = event.target.closest('[data-video-id]');
    if (!button) return;
    const videoId = button.dataset.videoId;
    if (!videoId) return;
    ensureIframePlayer(playerContainer, videoId);
  };
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
  currentQuery = query;

  let videoData = null;
  try {
    videoData = await fetchYouTubeVideos(query);
  } catch (error) {
    console.error('YouTube fetch error:', error);
  }

  const videoItems = Array.isArray(videoData?.items)
    ? videoData.items
    : (videoData?.videoId ? [videoData] : []);
  const primaryVideo = videoItems[0];

  renderSongList(videoItems, resultDiv, playerContainer);

  if (musicMeta) {
    if (videoData?.error) {
      musicMeta.textContent = `추천 정보를 불러오지 못했습니다. (${videoData.error})`;
    } else if (primaryVideo?.title) {
      const channelText = primaryVideo.channelTitle ? ` · ${primaryVideo.channelTitle}` : '';
      musicMeta.textContent = `추천 영상: ${primaryVideo.title}${channelText}`;
    } else {
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
        .slice(0, 8);
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
    if (!data?.choices?.[0]?.message?.content) {
      console.error('Invalid API response:', data);
      return '**오류 발생:** AI 분석 결과를 받지 못했습니다. 다시 시도해주세요.';
    }
    return data.choices[0].message.content;
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

  pillars.forEach(pillar => {
    const hangul = pillar.hangul || '';
    const hanja = pillar.hanja || '';
    const g = hangul[0] || hanja[0];
    const j = hangul[1] || hanja[1];
    const gEl = ganToElement[g];
    const jEl = jiToElement[j];
    if (gEl) counts[gEl] += 1;
    if (jEl) counts[jEl] += 1;
  });

  return counts;
}

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

function getElementCounts(md, pillars) {
  const fromPillars = getElementCountsFromPillars(pillars);
  const total = Object.values(fromPillars).reduce((sum, val) => sum + val, 0);
  if (total > 0) return fromPillars;
  return getElementCountsFromText(md);
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

    if (hanja || hangul) {
      results.push({ label, hanja, hangul });
    }
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
    return `
      <div class="pillar-card" data-tone="${tone}" style="--pillar-photo:url('${photo}')">
        <div class="pillar-seal">${getStampSvg(tone)}</div>
        <div class="pillar-label">${pillar.label}</div>
        <div class="pillar-hanja">${escapeHtml(pillar.hanja || '')}</div>
        <div class="pillar-hangul">${escapeHtml(pillar.hangul || '')}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="section result-shell pillar-shell">
      <div class="analysis-header">
        <div>
          <p class="analysis-eyebrow">🪷 사주 네 기둥</p>
          <h3 class="analysis-title">기운의 패턴을 그림처럼 읽기</h3>
        </div>
      </div>
      <div class="pillar-board">
        ${cards}
      </div>
    </div>
  `;
}

function getElementSvg(key) {
  const palette = {
    '목': ['#90be6d', '#4cc9f0'],
    '화': ['#ff6f59', '#f9c74f'],
    '토': ['#f4a261', '#e9c46a'],
    '금': ['#bfc0c0', '#8d99ae'],
    '수': ['#1d9bf0', '#5ad0ff']
  };
  const [c1, c2] = palette[key] || palette['목'];
  if (key === '목') {
    return `<svg viewBox="0 0 80 80" aria-hidden="true"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><circle cx="40" cy="40" r="28" fill="url(#g)" opacity="0.35"/><path d="M40 16 C30 26 26 38 26 48 C26 58 34 66 40 66 C46 66 54 58 54 48 C54 38 50 26 40 16 Z" fill="url(#g)"/></svg>`;
  }
  if (key === '화') {
    return `<svg viewBox="0 0 80 80" aria-hidden="true"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><path d="M40 12 C48 22 52 30 52 40 C52 52 44 64 40 68 C36 64 28 52 28 40 C28 30 32 22 40 12 Z" fill="url(#g)"/><circle cx="40" cy="44" r="10" fill="${c2}" opacity="0.6"/></svg>`;
  }
  if (key === '토') {
    return `<svg viewBox="0 0 80 80" aria-hidden="true"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><path d="M14 56 L40 20 L66 56 Z" fill="url(#g)"/><rect x="20" y="56" width="40" height="10" rx="5" fill="${c2}" opacity="0.7"/></svg>`;
  }
  if (key === '금') {
    return `<svg viewBox="0 0 80 80" aria-hidden="true"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect x="20" y="16" width="40" height="48" rx="8" fill="url(#g)"/><path d="M24 30 L56 30" stroke="#fff" stroke-width="3" opacity="0.4"/><path d="M24 42 L56 42" stroke="#fff" stroke-width="3" opacity="0.3"/></svg>`;
  }
  return `<svg viewBox="0 0 80 80" aria-hidden="true"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><path d="M12 50 C20 40 30 40 40 50 C50 60 60 60 68 50" fill="none" stroke="url(#g)" stroke-width="6" stroke-linecap="round"/><path d="M16 60 C24 52 32 52 40 60 C48 68 56 68 64 60" fill="none" stroke="url(#g)" stroke-width="6" stroke-linecap="round" opacity="0.7"/></svg>`;
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
    const photo = elementPhotos[el.key] || elementPhotos['목'];
    const value = counts && typeof counts[el.key] === 'number' ? counts[el.key] : 0;
    const pct = Math.round((value / total) * 100);
    return `
      <div class="element-card ${active}" data-key="${el.key}" style="--el-photo:url('${photo}')">
        <div class="element-photo" aria-hidden="true"></div>
        <div class="element-label">${el.label}</div>
        <div class="element-name">${el.name}</div>
        <div class="element-count">${value} / ${total}</div>
        <div class="element-meter"><span style="width:${pct}%"></span></div>
      </div>
    `;
  }).join('');

  return `
    <div class="section result-shell element-shell">
      <div class="analysis-header">
        <div>
          <p class="analysis-eyebrow">🎨 오행 컬러맵</p>
          <h3 class="analysis-title">당신의 기운을 그림으로</h3>
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

  const sajuData = {
    year: bY.value,
    month: bM.value,
    day: bD.value,
    time: bT.value,
    gender: document.querySelector('input[name="gender"]:checked').value,
    cal: document.querySelector('input[name="cal"]:checked').value,
    place: bP.value,
    b_time_ext: document.querySelector('#bT option:checked').textContent,
  };
  const userQuestion = document.getElementById('bQ').value || '';

  if (!sajuData.year || !sajuData.month || !sajuData.day || !sajuData.time) {
    showError('모든 정보를 입력해주세요.', 'errBox');
    return;
  }

  const resultDiv = document.getElementById('result');
  resultDiv.style.display = 'block';
  resultDiv.innerHTML = `
    <div class="section result-shell fade-in" style="padding:24px;">
      <div class="skeleton" style="height:24px;width:200px;margin-bottom:16px;"></div>
      <div class="skeleton" style="height:14px;width:80%;margin-bottom:10px;"></div>
      <div class="skeleton" style="height:14px;width:60%;margin-bottom:20px;"></div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
        <div class="skeleton" style="height:120px;"></div>
        <div class="skeleton" style="height:120px;"></div>
        <div class="skeleton" style="height:120px;"></div>
        <div class="skeleton" style="height:120px;"></div>
      </div>
      <div class="skeleton" style="height:14px;width:70%;margin-bottom:10px;"></div>
      <div class="skeleton" style="height:200px;margin-bottom:14px;"></div>
      <p class="loading-text">사주를 분석하고 있습니다<span class="loading-dots"></span></p>
    </div>
  `;
  resultDiv.scrollIntoView({ behavior: 'smooth' });

  resetPlayer();

  const aiPayload = {
    type: 'saju',
    sajuData: JSON.stringify(sajuData),
    question: userQuestion
  };

  const aiResponse = await getAiResponse(aiPayload);
  const analysisSummary = parseSummary(aiResponse);
  const sanitized = sanitizeAiResponse(aiResponse);
  const cleanedResponse = injectPillarHanja(sanitized.cleaned);
  const pillars = extractPillars(cleanedResponse);
  const elementCounts = getElementCounts(cleanedResponse, pillars);

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
      <div class="share-actions">
        <button class="share-btn" data-action="share">공유하기</button>
        <button class="share-btn" data-action="copy-link">링크 복사</button>
      </div>
      ${buildSajuHero(sajuElement, elementCounts)}
      <div class="pillar-slot" data-role="pillar-slot"></div>
      <div class="element-slot" data-role="element-slot"></div>
      <div class="analysis-body" data-role="analysis-body"></div>
    </div>
    ${fortuneHtml}
    <div class="section result-shell music-shell">
      <div class="analysis-header">
        <div>
          <p class="analysis-eyebrow">🎧 음악 추천</p>
          <h3 class="analysis-title">오늘의 분위기 맞춤 플레이</h3>
        </div>
        <div class="analysis-badges">
          ${badge(`키워드 ${sajuElement}`, 2)}
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
        <p style="font-size:12px; text-align:center; color: var(--muted); margin-top:10px;">'${sajuElement}' 기운에 어울리는 플레이리스트를 자동으로 재생합니다.</p>
      </div>
    </div>
    <!-- Ad: In-Content -->
    <div class="ad-container">
      <ins class="adsbygoogle" style="display:block" data-ad-client="YOUR_AD_CLIENT_ID" data-ad-slot="AD_SLOT_CONTENT" data-ad-format="auto" data-full-width-responsive="true"></ins>
    </div>
  `;

  const analysisBody = resultDiv.querySelector('[data-role="analysis-body"]');
  if (analysisBody) {
    analysisBody.innerHTML = renderMarkdown(cleanedResponse);
    enhanceCallouts(analysisBody);
    applyAccordion(analysisBody);
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

  trackEvent('saju_analysis_complete', { event_category: 'engagement', element: sajuElement || 'unknown' });

  try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
});

document.getElementById('btnCompat').addEventListener('click', async () => {
  const errBox = document.getElementById('errBox2');
  errBox.style.display = 'none';

  const person1 = {
    year: cY1.value,
    month: cM1.value,
    day: cD1.value,
    time: cT1.value,
  };
  const person2 = {
    year: cY2.value,
    month: cM2.value,
    day: cD2.value,
    time: cT2.value,
  };
  const userQuestion = document.getElementById('cQ').value || '';

  if (!person1.year || !person1.month || !person1.day || !person2.year || !person2.month || !person2.day) {
    showError('두 분의 생년월일을 모두 입력해주세요.', 'errBox2');
    return;
  }

  const resultDiv = document.getElementById('compatResult');
  resultDiv.style.display = 'block';
  resultDiv.innerHTML = `
    <div class="section result-shell fade-in" style="padding:24px;">
      <div class="skeleton" style="height:24px;width:200px;margin-bottom:16px;"></div>
      <div class="skeleton" style="height:14px;width:80%;margin-bottom:10px;"></div>
      <div class="skeleton" style="height:200px;margin-bottom:14px;"></div>
      <div class="skeleton" style="height:14px;width:60%;margin-bottom:10px;"></div>
      <div class="skeleton" style="height:160px;"></div>
      <p class="loading-text">궁합을 분석하고 있습니다<span class="loading-dots"></span></p>
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
  const time1Label = person1.time ? document.querySelector('#cT1 option:checked').textContent : '시간 미입력';
  const time2Label = person2.time ? document.querySelector('#cT2 option:checked').textContent : '시간 미입력';
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
    <!-- Ad: In-Content -->
    <div class="ad-container">
      <ins class="adsbygoogle" style="display:block" data-ad-client="YOUR_AD_CLIENT_ID" data-ad-slot="AD_SLOT_CONTENT" data-ad-format="auto" data-full-width-responsive="true"></ins>
    </div>
  `;

  const analysisBody = resultDiv.querySelector('[data-role="analysis-body"]');
  if (analysisBody) {
    analysisBody.innerHTML = renderMarkdown(cleanedResponse);
    enhanceCallouts(analysisBody);
    applyAccordion(analysisBody);
  }

  trackEvent('compat_analysis_complete', { event_category: 'engagement' });

  try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
});

const lastModified = document.getElementById('lastModified');
if (lastModified) {
  lastModified.textContent = '마지막 업데이트: ' + new Date().toLocaleString();
}
