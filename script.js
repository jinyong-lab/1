
const bY = document.getElementById('bY');
const bM = document.getElementById('bM');
const bD = document.getElementById('bD');
const cY1 = document.getElementById('cY1');
const cM1 = document.getElementById('cM1');
const cD1 = document.getElementById('cD1');
const cY2 = document.getElementById('cY2');
const cM2 = document.getElementById('cM2');
const cD2 = document.getElementById('cD2');

function updateDays(year, month, daySelect) {
    if (!year || !month) {
        daySelect.innerHTML = '<option value="">선택</option>';
        return;
    }
    const daysInMonth = new Date(year, month, 0).getDate();
    const selectedDay = daySelect.value;
    daySelect.innerHTML = '<option value="">선택</option>';
    for (let i = 1; i <= daysInMonth; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i + '일';
        daySelect.appendChild(option);
    }
    if (selectedDay && selectedDay <= daysInMonth) {
        daySelect.value = selectedDay;
    }
}

function setupEventListeners() {
    // Add event listeners to all date fields
    bY.addEventListener('change', () => updateDays(parseInt(bY.value, 10), parseInt(bM.value, 10), bD));
    bM.addEventListener('change', () => updateDays(parseInt(bY.value, 10), parseInt(bM.value, 10), bD));
    cY1.addEventListener('change', () => updateDays(parseInt(cY1.value, 10), parseInt(cM1.value, 10), cD1));
    cM1.addEventListener('change', () => updateDays(parseInt(cY1.value, 10), parseInt(cM1.value, 10), cD1));
    cY2.addEventListener('change', () => updateDays(parseInt(cY2.value, 10), parseInt(cM2.value, 10), cD2));
    cM2.addEventListener('change', () => updateDays(parseInt(cY2.value, 10), parseInt(cM2.value, 10), cD2));

    // --- Let's try the robust default date logic again ---
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
        });
    });

    document.getElementById('themeToggle').addEventListener('click', () => {
        const newTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = newTheme;
        document.getElementById('themeToggle').textContent = newTheme === 'dark' ? '라이트 모드' : '다크 모드';
    });
}

setupEventListeners();

// 오행에 따른 검색어 매핑
const elQueries = {
  "목": "calm acoustic playlist",
  "화": "upbeat pop music playlist",
  "토": "comfortable easy listening playlist",
  "금": "powerful epic music playlist",
  "수": "chill lofi hiphop playlist"
};

// --- YouTube IFrame API 로딩을 위한 준비 ---
let player;
// YouTube API 스크립트가 로드되면 이 Promise가 resolve됩니다.
const ytApiReady = new Promise(resolve => {
  // 이미 API가 로드되었다면 즉시 resolve합니다.
  if (window.YT && window.YT.Player) {
    resolve(window.YT);
  } else {
    // 그렇지 않다면, API가 로드될 때 resolve 하도록 전역 콜백을 설정합니다.
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
  }
});

// 노래 플레이어를 생성하거나 업데이트하는 함수
async function getSongs(sajuElement, resultDiv) {
  const musicBox = resultDiv.querySelector('.music-box');
  const playerContainer = resultDiv.querySelector('#player-container');
  
  if (!musicBox || !playerContainer) {
    console.error("Music box or player container not found");
    return;
  }
  
  playerContainer.style.display = 'block';

  // 사주 결과에서 나온 오행 키워드를 사용합니다.
  const query = elQueries[sajuElement] || "korean ballad playlist";

  try {
    // API가 준비될 때까지 기다립니다.
    const YT = await ytApiReady;

    // 플레이어가 이미 있다면 새 플레이리스트를 로드하고, 없다면 새로 생성합니다.
    if (player && typeof player.loadPlaylist === 'function') {
      player.loadPlaylist({
        listType: 'search',
        list: query
      });
    } else {
      player = new YT.Player('player-container', {
        height: '390',
        width: '100%',
        playerVars: {
          listType: 'search',
          list: query,
          autoplay: 1,
          loop: 1,
        },
        events: {
          'onReady': (event) => event.target.playVideo(),
        }
      });
    }
  } catch (error) {
    console.error("YouTube Player Error:", error);
    playerContainer.innerHTML = "<p>노래 플레이어를 로드하는 중 오류가 발생했습니다.</p>";
  }
}

function showError(message, boxId) {
    const errBox = document.getElementById(boxId);
    errBox.textContent = message;
    errBox.style.display = 'block';
}

// AI 응답을 요청하는 통합 함수
async function getAiResponse(payload) {
  const params = new URLSearchParams(payload);
  const apiPath = `/api/saju?${params.toString()}`;

  try {
    const response = await fetch(apiPath);
    const data = await response.json();

    if (!response.ok) {
      console.error("API Error:", data);
      return `**오류 발생:** ${data.error?.message || 'API로부터 답변을 받아오는 중 오류가 발생했습니다.'}`;
    }
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling worker function:', error);
    if (error instanceof SyntaxError) {
      return "**오류 발생:** 서버 응답 형식이 잘못되었습니다. API가 올바르게 배포되었는지 확인해주세요.";
    }
    return '**오류 발생:** 서버와 통신하는 중 오류가 발생했습니다.';
  }
}

// 마크다운을 HTML로 렌더링하는 간단한 유틸리티
function renderMarkdown(md) {
    // Bold, Italic
    md = md.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    md = md.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Headings
    md = md.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    md = md.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    md = md.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    // List items
    md = md.replace(/^\* (.*$)/gim, '<li>$1</li>');
    // Replace newlines with <br> for paragraphs
    md = md.replace(/\n/g, '<br>');
    return md;
}


// --- 이벤트 리스너 ---

document.getElementById("btnGo").addEventListener("click", async () => {
    const errBox = document.getElementById('errBox');
    errBox.style.display = 'none';

    const sajuData = {
      year: document.getElementById('bY').value,
      month: document.getElementById('bM').value,
      day: document.getElementById('bD').value,
      time: document.getElementById('bT').value,
      gender: document.querySelector('input[name="gender"]:checked').value,
      cal: document.querySelector('input[name="cal"]:checked').value,
      b_time_ext: document.querySelector('#bT option:checked').textContent,
    };
    const userQuestion = document.getElementById('bQ').value;

    if (!sajuData.year || !sajuData.month || !sajuData.day || !sajuData.time) {
        showError('모든 정보를 입력해주세요.', 'errBox');
        return;
    }

    const resultDiv = document.getElementById("result");
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `<div class="section"><p>사주를 분석하고 있습니다. 잠시만 기다려주세요...</p></div>`;
    resultDiv.scrollIntoView({ behavior: "smooth" });
    
    // AI에 보낼 요청 데이터를 구성합니다.
    const aiPayload = {
      type: 'saju',
      sajuData: JSON.stringify(sajuData),
      question: userQuestion
    };
    
    const aiResponse = await getAiResponse(aiPayload);

    // AI 응답에서 핵심 오행(키워드)을 추출합니다. (예: "목")
    // 간단한 구현: 응답에서 첫번째로 언급된 오행을 사용합니다.
    const elementMatch = aiResponse.match(/[木火土金水]/);
    const sajuElement = elementMatch ? elementMatch[0] : "목";

    // 결과를 표시할 HTML 구조 생성
    resultDiv.innerHTML = `
        <div class="section">
            <h3 class="section-title" style="font-family: var(--font-serif);">📜 나의 사주 분석 결과</h3>
            <div class="info-card" style="white-space: normal;">${renderMarkdown(aiResponse)}</div>
        </div>
        <div class="section">
            <h3 class="section-title" style="font-family: var(--font-serif);">🎵 행운의 노래 추천</h3>
            <div class="music-box">
                <div class="player-wrap">
                    <div id="player-container"></div>
                </div>
                <p style="font-size:12px; text-align:center; color: var(--muted); margin-top:10px;">'${sajuElement}'의 기운에 맞는 플레이리스트가 자동 재생됩니다.</p>
            </div>
        </div>
    `;

    // 노래 추천 함수 호출
    getSongs(sajuElement, resultDiv);
});

document.getElementById("btnCompat").addEventListener("click", async () => {
    const errBox = document.getElementById('errBox2');
    errBox.style.display = 'none';

    const person1 = {
        year: document.getElementById('cY1').value,
        month: document.getElementById('cM1').value,
        day: document.getElementById('cD1').value,
        time: document.getElementById('cT1').value,
    };
     const person2 = {
        year: document.getElementById('cY2').value,
        month: document.getElementById('cM2').value,
        day: document.getElementById('cD2').value,
        time: document.getElementById('cT2').value,
    };
    const userQuestion = document.getElementById('cQ').value;

    if (!person1.year || !person1.month || !person1.day || !person2.year || !person2.month || !person2.day) {
        showError('나와 상대방의 년, 월, 일을 모두 입력해주세요.', 'errBox2');
        return;
    }

    const resultDiv = document.getElementById("compatResult");
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `<div class="section"><p>궁합을 분석하고 있습니다. 잠시만 기다려주세요...</p></div>`;
    resultDiv.scrollIntoView({ behavior: "smooth" });

    const aiPayload = {
      type: 'compat',
      person1: JSON.stringify(person1),
      person2: JSON.stringify(person2),
      question: userQuestion
    };

    const aiResponse = await getAiResponse(aiPayload);
    
    resultDiv.innerHTML = `
      <div class="section">
        <h3 class="section-title" style="font-family: var(--font-serif);">💌 우리 궁합 분석 결과</h3>
        <div class="info-card" style="white-space: normal;">${renderMarkdown(aiResponse)}</div>
      </div>
    `;
});


// ...
document.getElementById('lastModified').textContent = 'Last modified: ' + new Date().toLocaleString();
