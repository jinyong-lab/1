
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

// Saju logic from the clean file...

// ...
// ...

// 오행에 따른 검색어 매핑
const elQueries = {
  0: "calm acoustic playlist", // 목
  1: "upbeat pop music playlist", // 화
  2: "comfortable easy listening playlist", // 토
  3: "powerful epic music playlist", // 금
  4: "chill lofi hiphop playlist" // 수
};

async function getSongs(el, resultDiv) {
  const musicBox = resultDiv.querySelector('.music-box');
  if (!musicBox) {
    console.error("Music box element not found");
    return;
  }
  const songList = musicBox.querySelector('.song-list');
  if (!songList) {
    console.error("Song list element not found");
    return;
  }
  
  songList.innerHTML = '<li>노래를 검색 중...</li>';
  
  const query = elQueries[el] || "korean ballad";
  const url = `/functions/youtube-proxy?q=${encodeURIComponent(query)}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Proxy error:', errorText);
      songList.innerHTML = `<li>노래 추천 서버에 문제가 발생했습니다.</li>`;
      return;
    }
    const data = await response.json();
    
    if (data.error || !data.items || data.items.length === 0) {
       songList.innerHTML = `<li>추천할 노래를 찾지 못했습니다. (서버 메시지: ${data.error?.message || '없음'})</li>`;
       return;
    }

    const songs = data.items.slice(0, 5).map(item => ({
      t: item.snippet.title,
      id: item.id.videoId
    }));
    
    songList.innerHTML = ''; // Clear loading message
    songs.forEach(song => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="https://youtu.be/${song.id}" target="_blank">${song.t}</a> <button class="play-btn" data-videoid="${song.id}">재생</button>`;
      songList.appendChild(li);
    });

    resultDiv.querySelectorAll('.play-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const videoId = btn.dataset.videoid;
        const playerWrap = resultDiv.querySelector('.player-wrap');
        const player = resultDiv.querySelector('#youtubePlayer');
        if (player && playerWrap) {
            player.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
            playerWrap.style.display = 'block';
            player.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });

  } catch (error) {
    console.error("Error fetching songs from proxy:", error);
    songList.innerHTML = `<li>노래를 가져오는 중 오류가 발생했습니다.</li>`;
  }
}

function showError(message, boxId) {
    const errBox = document.getElementById(boxId);
    errBox.textContent = message;
    errBox.style.display = 'block';
}


async function getGptAnswer(sajuData, question) {
  // 이 함수는 GPT API를 호출하는 예시입니다.
  // 실제 구현을 위해서는 서버 측에 API 요청을 처리하는 로직이 필요합니다.
  console.log("GPT API에 전달될 데이터:", { sajuData, question });

  // 임시 반환값
  await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
  return `"${question}"에 대한 답변을 생성하는 중... (실제 API 연동 필요)`;
}


document.getElementById("btnGo").addEventListener("click", async () => {
    const errBox = document.getElementById('errBox');
    errBox.style.display = 'none';

    const year = document.getElementById('bY').value;
    const month = document.getElementById('bM').value;
    const day = document.getElementById('bD').value;
    const time = document.getElementById('bT').value;
    const gender = document.querySelector('input[name="gender"]:checked').value;
    const question = document.getElementById('bQ').value; // 질문 읽기

    if (!year || !month || !day || !time) {
        showError('모든 정보를 입력해주세요.', 'errBox');
        return;
    }

    const resultDiv = document.getElementById("result");
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `<div class="section"><p>분석 중입니다. 잠시만 기다려주세요...</p></div>`;
    resultDiv.scrollIntoView({ behavior: "smooth" });

    // --- 임시 사주 분석 로직 START ---
    // 실제 로직이 없으므로, 결과와 행운의 오행을 임의로 생성합니다.
    const randomElement = Math.floor(Math.random() * 5); // 0:목, 1:화, 2:토, 3:금, 4:수
    const elements = ['목(木)', '화(火)', '토(土)', '금(金)', '수(水)'];
    const gans = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const jis = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const randomGan = gans[Math.floor(Math.random() * gans.length)];
    const randomJi = jis[Math.floor(Math.random() * jis.length)];
    // --- 임시 사주 분석 로직 END ---

    let gptHtml = '';
    if (question) {
      const gptAnswer = await getGptAnswer({ year, month, day, time, gender }, question);
      gptHtml = `
        <div class="section">
          <h3 class="section-title">궁금한 질문에 대한 답변</h3>
          <div class="info-card" style="white-space: pre-wrap;">${gptAnswer}</div>
        </div>
      `;
    }
    
    // 결과를 표시할 HTML 구조 생성
    resultDiv.innerHTML = `
        <div class="section">
            <h3 class="section-title">사주 분석 결과 (임시)</h3>
            <div class="info-card">
                입력된 정보 기반의 실제 사주 분석 로직이 없어, 결과를 임의로 생성했습니다.<br>
                당신의 일주(日柱)는 <strong>${randomGan}${randomJi}</strong>이며, 행운의 오행은 <strong>${elements[randomElement]}</strong>입니다.
            </div>
        </div>
        <div class="section">
            <h3 class="section-title">행운의 오행에 맞는 노래 추천</h3>
            <div class="music-box">
                <ul class="song-list"></ul>
                <div class="player-wrap" style="display:none;">
                    <iframe id="youtubePlayer" src="" allow="autoplay; encrypted-media" allowfullscreen></iframe>
                </div>
            </div>
        </div>
    ` + gptHtml;

    // 노래 추천 함수 호출
    await getSongs(randomElement, resultDiv);
});

document.getElementById("btnCompat").addEventListener("click", async () => {
    const errBox = document.getElementById('errBox2');
    errBox.style.display = 'none';

    const y1 = document.getElementById('cY1').value;
    const m1 = document.getElementById('cM1').value;
    const d1 = document.getElementById('cD1').value;
    const y2 = document.getElementById('cY2').value;
    const m2 = document.getElementById('cM2').value;
    const d2 = document.getElementById('cD2').value;
    const question = document.getElementById('cQ').value; // 질문 읽기

    if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) {
        showError('나와 상대방의 정보를 모두 입력해주세요.', 'errBox2');
        return;
    }

    const resultDiv = document.getElementById("compatResult");
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `<div class="section"><p>분석 중입니다. 잠시만 기다려주세요...</p></div>`;
    resultDiv.scrollIntoView({ behavior: "smooth" });

    const compatData = {
        person1: { year: y1, month: m1, day: d1 },
        person2: { year: y2, month: m2, day: d2 }
    };
    
    // --- 임시 궁합 분석 로직 ---
    const randomScore = Math.floor(Math.random() * 51) + 50; // 50-100점

    let gptHtml = '';
    if (question) {
      const gptAnswer = await getGptAnswer(compatData, question);
      gptHtml = `
        <div class="section">
          <h3 class="section-title">궁금한 질문에 대한 답변</h3>
          <div class="info-card" style="white-space: pre-wrap;">${gptAnswer}</div>
        </div>
      `;
    }

    // 결과 표시
    resultDiv.innerHTML = `
        <div class="section">
            <h3 class="section-title">궁합 분석 결과 (임시)</h3>
            <div class="compat-score-wrap">
                <div class="compat-big-score">${randomScore}점</div>
                <div class="compat-grade">${randomScore > 85 ? '천생연분' : randomScore > 70 ? '좋은 인연' : '노력 필요'}</div>
            </div>
            <div class="info-card">
                실제 궁합 분석 로직이 없어, 점수를 임의로 생성했습니다. 재미로만 참고해주세요.
            </div>
        </div>
    ` + gptHtml;
});


// ...
document.getElementById('lastModified').textContent = 'Last modified: ' + new Date().toLocaleString();
