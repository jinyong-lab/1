// _worker.js - Cloudflare Pages Worker for Saju Analysis Site

import { calculateSaju, lunarToSolar } from '@fullstackfamily/manseryeok';

// --- Element Mapping Constants ---
const STEM_ELEMENTS = {
  '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
  '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수'
};

const BRANCH_ELEMENTS = {
  '子': '수', '丑': '토', '寅': '목', '卯': '목', '辰': '토', '巳': '화',
  '午': '화', '未': '토', '申': '금', '酉': '금', '戌': '토', '亥': '수'
};

const STEM_YINYANG = {
  '甲': '양', '乙': '음', '丙': '양', '丁': '음', '戊': '양',
  '己': '음', '庚': '양', '辛': '음', '壬': '양', '癸': '음'
};
const BRANCH_YINYANG = {
  '子': '양', '丑': '음', '寅': '양', '卯': '음', '辰': '양', '巳': '음',
  '午': '양', '未': '음', '申': '양', '酉': '음', '戌': '양', '亥': '음'
};

// --- 지지 본기 천간 (Branch Main Stem) ---
const BRANCH_MAIN_STEM = {
  '子': '癸', '丑': '己', '寅': '甲', '卯': '乙', '辰': '戊', '巳': '丙',
  '午': '丁', '未': '己', '申': '庚', '酉': '辛', '戌': '戊', '亥': '壬'
};

// --- 지장간 (Hidden Stems) ---
const HIDDEN_STEMS = {
  '子': ['癸'],
  '丑': ['己', '癸', '辛'],
  '寅': ['甲', '丙', '戊'],
  '卯': ['乙'],
  '辰': ['戊', '乙', '癸'],
  '巳': ['丙', '庚', '戊'],
  '午': ['丁', '己'],
  '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'],
  '酉': ['辛'],
  '戌': ['戊', '辛', '丁'],
  '亥': ['壬', '甲']
};

// --- 오행 상생/상극 관계 ---
// 상생: 목→화→토→금→수→목
// 상극(I overcome): 목→토, 토→수, 수→화, 화→금, 금→목
const OHENG_CYCLE = ['목', '화', '토', '금', '수'];

/**
 * 십성(十神) 계산 - 일간과 대상 천간의 관계를 판별
 * @param {string} dayStem - 일간 (천간 한자)
 * @param {string} targetStem - 대상 천간 (한자)
 * @returns {string} 십성 이름 (한국어)
 */
function getTenGod(dayStem, targetStem) {
  if (!dayStem || !targetStem) return '';

  const dayElement = STEM_ELEMENTS[dayStem];
  const targetElement = STEM_ELEMENTS[targetStem];
  const dayYY = STEM_YINYANG[dayStem];
  const targetYY = STEM_YINYANG[targetStem];

  if (!dayElement || !targetElement) return '';

  const sameYinYang = dayYY === targetYY;
  const dayIdx = OHENG_CYCLE.indexOf(dayElement);
  const targetIdx = OHENG_CYCLE.indexOf(targetElement);

  // Same element
  if (dayElement === targetElement) {
    return sameYinYang ? '비견' : '겁재';
  }

  // I generate (상생 - 내가 생하는 것): dayIdx의 다음이 targetIdx
  if (OHENG_CYCLE[(dayIdx + 1) % 5] === targetElement) {
    return sameYinYang ? '식신' : '상관';
  }

  // I overcome (상극 - 내가 극하는 것): 목→토, 화→금, 토→수, 금→목, 수→화
  // dayIdx에서 +2 위치
  if (OHENG_CYCLE[(dayIdx + 2) % 5] === targetElement) {
    return sameYinYang ? '편재' : '정재';
  }

  // Overcomes me (나를 극하는 것): target이 나를 극함
  // targetIdx에서 +2 위치가 dayElement
  if (OHENG_CYCLE[(targetIdx + 2) % 5] === dayElement) {
    return sameYinYang ? '편관' : '정관';
  }

  // Generates me (나를 생하는 것): target이 나를 생함
  // targetIdx에서 +1 위치가 dayElement
  if (OHENG_CYCLE[(targetIdx + 1) % 5] === dayElement) {
    return sameYinYang ? '편인' : '정인';
  }

  return '';
}

// --- 12운성 (Twelve Life Stages) ---
const TWELVE_STAGES = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];
const BRANCHES_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const STEMS_ORDER = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

// 장생 시작 지지 (각 천간별)
const TWELVE_STAGE_START = {
  '甲': '亥', '乙': '午', '丙': '寅', '丁': '酉', '戊': '寅',
  '己': '酉', '庚': '巳', '辛': '子', '壬': '申', '癸': '卯'
};

// 양간: 甲丙戊庚壬, 음간: 乙丁己辛癸
const YANG_STEMS = new Set(['甲', '丙', '戊', '庚', '壬']);

/**
 * 12운성 계산 - 천간이 지지에서 어떤 운성에 해당하는지 판별
 * @param {string} stem - 천간 (한자)
 * @param {string} branch - 지지 (한자)
 * @returns {string} 12운성 이름
 */
function getTwelveStage(stem, branch) {
  if (!stem || !branch) return '';

  const startBranch = TWELVE_STAGE_START[stem];
  if (!startBranch) return '';

  const startIdx = BRANCHES_ORDER.indexOf(startBranch);
  const branchIdx = BRANCHES_ORDER.indexOf(branch);
  if (startIdx === -1 || branchIdx === -1) return '';

  let offset;
  if (YANG_STEMS.has(stem)) {
    // 양간: 순행 (forward)
    offset = (branchIdx - startIdx + 12) % 12;
  } else {
    // 음간: 역행 (backward)
    offset = (startIdx - branchIdx + 12) % 12;
  }

  return TWELVE_STAGES[offset] || '';
}

// --- 신살 (Spirit Killings / Special Stars) ---

// 도화살 - 년지 또는 일지 기준
const DOHUA_TABLE = {
  '寅': '卯', '午': '卯', '戌': '卯',
  '巳': '午', '酉': '午', '丑': '午',
  '申': '酉', '子': '酉', '辰': '酉',
  '亥': '子', '卯': '子', '未': '子'
};

// 역마살 - 년지 또는 일지 기준
const YEOKMA_TABLE = {
  '寅': '申', '午': '申', '戌': '申',
  '巳': '亥', '酉': '亥', '丑': '亥',
  '申': '寅', '子': '寅', '辰': '寅',
  '亥': '巳', '卯': '巳', '未': '巳'
};

// 화개살 - 년지 또는 일지 기준
const HWAGAE_TABLE = {
  '寅': '戌', '午': '戌', '戌': '戌',
  '巳': '丑', '酉': '丑', '丑': '丑',
  '申': '辰', '子': '辰', '辰': '辰',
  '亥': '未', '卯': '未', '未': '未'
};

// 천을귀인 - 일간 기준
const CHUNEUL_TABLE = {
  '甲': ['丑', '未'], '戊': ['丑', '未'],
  '乙': ['子', '申'], '己': ['子', '申'],
  '丙': ['亥', '酉'], '丁': ['亥', '酉'],
  '庚': ['寅', '午'], '辛': ['寅', '午'],
  '壬': ['巳', '卯'], '癸': ['巳', '卯']
};

// 천덕귀인 - 월지 기준
const CHUNDUK_TABLE = {
  '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛',
  '午': '亥', '未': '甲', '申': '癸', '酉': '寅',
  '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚'
};

// 월덕귀인 - 월지 기준
const WOLDUK_TABLE = {
  '寅': '丙', '卯': '甲', '辰': '壬', '巳': '庚',
  '午': '丙', '未': '甲', '申': '壬', '酉': '庚',
  '戌': '丙', '亥': '甲', '子': '壬', '丑': '庚'
};

// 문창귀인 - 일간 기준 (학문, 시험, 자격증에 유리)
const MUNCHANG_TABLE = {
  '甲': '巳', '乙': '午', '丙': '申', '丁': '酉', '戊': '申',
  '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯'
};

// 태극귀인 - 일간 기준 (만사형통, 재난 극복)
const TAEGEUK_TABLE = {
  '甲': ['子', '午'], '乙': ['子', '午'],
  '丙': ['卯', '酉'], '丁': ['卯', '酉'],
  '戊': ['辰', '戌', '丑', '未'], '己': ['辰', '戌', '丑', '未'],
  '庚': ['寅', '亥'], '辛': ['寅', '亥'],
  '壬': ['巳', '申'], '癸': ['巳', '申']
};

// 학당귀인 - 일간 기준 (학업운, 교육)
const HAKDANG_TABLE = {
  '甲': '亥', '乙': '午', '丙': '寅', '丁': '酉', '戊': '寅',
  '己': '酉', '庚': '巳', '辛': '子', '壬': '申', '癸': '卯'
};

// 천주귀인 - 일간 기준 (의식주 복, 물질적 풍요)
const CHUNJU_TABLE = {
  '甲': '巳', '乙': '午', '丙': '申', '丁': '酉', '戊': '申',
  '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯'
};

// 재고귀인 - 일간 기준 (재물운, 부의 축적)
const JAEGO_TABLE = {
  '甲': '辰', '乙': '辰', '丙': '丑', '丁': '丑', '戊': '丑',
  '己': '丑', '庚': '未', '辛': '未', '壬': '戌', '癸': '戌'
};

// 금여귀인 - 일간 기준 (배우자 복, 결혼 후 안정)
const GEUMYEO_TABLE = {
  '甲': '辰', '乙': '巳', '丙': '未', '丁': '申', '戊': '未',
  '己': '申', '庚': '戌', '辛': '亥', '壬': '丑', '癸': '寅'
};

// 문곡귀인 - 일간 기준 (문학적 재능, 예술)
const MUNGOK_TABLE = {
  '甲': '亥', '乙': '子', '丙': '寅', '丁': '卯', '戊': '寅',
  '己': '卯', '庚': '巳', '辛': '午', '壬': '申', '癸': '酉'
};

// 겁살 - 년지/일지 기준 (외부 재난, 강탈)
const GEOBSAL_TABLE = {
  '申': '亥', '子': '亥', '辰': '亥',
  '寅': '巳', '午': '巳', '戌': '巳',
  '巳': '申', '酉': '申', '丑': '申',
  '亥': '寅', '卯': '寅', '未': '寅'
};

// 망신살 - 년지/일지 기준 (명예 손상, 수치)
const MANGSIN_TABLE = {
  '申': '巳', '子': '巳', '辰': '巳',
  '寅': '亥', '午': '亥', '戌': '亥',
  '巳': '寅', '酉': '寅', '丑': '寅',
  '亥': '申', '卯': '申', '未': '申'
};

// 양인살 - 일간 기준 (날카로운 기운, 급변)
const YANGIN_TABLE = {
  '甲': '卯', '乙': '寅', '丙': '午', '丁': '巳', '戊': '午',
  '己': '巳', '庚': '酉', '辛': '申', '壬': '子', '癸': '亥'
};

// 원진살 - 년지 기준 (원한, 불화)
const WONJIN_TABLE = {
  '子': '未', '丑': '午', '寅': '酉', '卯': '申',
  '辰': '亥', '巳': '戌', '午': '丑', '未': '子',
  '申': '卯', '酉': '寅', '戌': '巳', '亥': '辰'
};

// 괴강살 - 일주(천간+지지) 기준 (극단적 권위, 리더십)
const GOEGANG_PILLARS = ['庚辰', '庚戌', '壬辰', '壬戌', '戊辰', '戊戌'];

// 백호살 - 일주(천간+지지) 기준 (유혈, 사고, 수술)
const BAEKHO_PILLARS = ['甲辰', '乙未', '丙戌', '丁丑', '戊辰', '壬戌', '癸丑'];

// 재살(災殺) - 년지/일지 기준 (천재지변, 수재)
const JAESAL_TABLE = {
  '申': '子', '子': '子', '辰': '子',
  '寅': '午', '午': '午', '戌': '午',
  '巳': '酉', '酉': '酉', '丑': '酉',
  '亥': '卯', '卯': '卯', '未': '卯'
};

// 천살(天殺) - 년지/일지 기준 (하늘의 재앙)
const CHUNSAL_TABLE = {
  '申': '丑', '子': '丑', '辰': '丑',
  '寅': '未', '午': '未', '戌': '未',
  '巳': '戌', '酉': '戌', '丑': '戌',
  '亥': '辰', '卯': '辰', '未': '辰'
};

// 지살(地殺) - 년지/일지 기준 (땅의 재앙)
const JISAL_TABLE = {
  '申': '寅', '子': '寅', '辰': '寅',
  '寅': '申', '午': '申', '戌': '申',
  '巳': '亥', '酉': '亥', '丑': '亥',
  '亥': '巳', '卯': '巳', '未': '巳'
};

// 연살(年殺/紅艶殺) - 년지/일지 기준 (이성 매력, 연애)
const YEONSAL_TABLE = {
  '申': '卯', '子': '卯', '辰': '卯',
  '寅': '酉', '午': '酉', '戌': '酉',
  '巳': '子', '酉': '子', '丑': '子',
  '亥': '午', '卯': '午', '未': '午'
};

// 월살(月殺) - 년지/일지 기준 (고독, 외로움)
const WOLSAL_TABLE = {
  '申': '辰', '子': '辰', '辰': '辰',
  '寅': '戌', '午': '戌', '戌': '戌',
  '巳': '丑', '酉': '丑', '丑': '丑',
  '亥': '未', '卯': '未', '未': '未'
};

// 장성살(將星殺) - 년지/일지 기준 (리더십, 권력)
const JANGSUNG_TABLE = {
  '申': '午', '子': '午', '辰': '午',
  '寅': '子', '午': '子', '戌': '子',
  '巳': '卯', '酉': '卯', '丑': '卯',
  '亥': '酉', '卯': '酉', '未': '酉'
};

// 반안살(攀鞍殺) - 년지/일지 기준 (승진, 지위 상승)
const BANAN_TABLE = {
  '申': '未', '子': '未', '辰': '未',
  '寅': '丑', '午': '丑', '戌': '丑',
  '巳': '辰', '酉': '辰', '丑': '辰',
  '亥': '戌', '卯': '戌', '未': '戌'
};

// 육해살(六害殺) - 년지/일지 기준 (배신, 인연 파괴)
const YUKHAE_TABLE = {
  '申': '酉', '子': '酉', '辰': '酉',
  '寅': '卯', '午': '卯', '戌': '卯',
  '巳': '午', '酉': '午', '丑': '午',
  '亥': '子', '卯': '子', '未': '子'
};

/**
 * 신살(神殺) 계산 - 사주 내 길신/흉살 판별
 * @param {Array} pillars - [yearPillar, monthPillar, dayPillar, hourPillar]
 * @param {string} gender - 성별 ('male' or 'female')
 * @returns {Object} 신살 분석 결과
 */
function calculateShinsal(pillars, gender) {
  const [yearP, monthP, dayP, hourP] = pillars;

  // 모든 지지 수집
  const allBranches = pillars.filter(p => p).map(p => p.branch);
  // 모든 천간 수집
  const allStems = pillars.filter(p => p).map(p => p.stem);

  const yearBranch = yearP ? yearP.branch : null;
  const dayBranch = dayP ? dayP.branch : null;
  const dayStem = dayP ? dayP.stem : null;
  const monthBranch = monthP ? monthP.branch : null;

  // --- 도화살 ---
  const dohuaTargets = new Set();
  if (yearBranch && DOHUA_TABLE[yearBranch]) dohuaTargets.add(DOHUA_TABLE[yearBranch]);
  if (dayBranch && DOHUA_TABLE[dayBranch]) dohuaTargets.add(DOHUA_TABLE[dayBranch]);
  const dohuaFound = allBranches.filter(b => dohuaTargets.has(b));

  // --- 역마살 ---
  const yeokmaTargets = new Set();
  if (yearBranch && YEOKMA_TABLE[yearBranch]) yeokmaTargets.add(YEOKMA_TABLE[yearBranch]);
  if (dayBranch && YEOKMA_TABLE[dayBranch]) yeokmaTargets.add(YEOKMA_TABLE[dayBranch]);
  const yeokmaFound = allBranches.filter(b => yeokmaTargets.has(b));

  // --- 화개살 ---
  const hwagaeTargets = new Set();
  if (yearBranch && HWAGAE_TABLE[yearBranch]) hwagaeTargets.add(HWAGAE_TABLE[yearBranch]);
  if (dayBranch && HWAGAE_TABLE[dayBranch]) hwagaeTargets.add(HWAGAE_TABLE[dayBranch]);
  const hwagaeFound = allBranches.filter(b => hwagaeTargets.has(b));

  // --- 천을귀인 ---
  const chuneulTargets = dayStem && CHUNEUL_TABLE[dayStem] ? CHUNEUL_TABLE[dayStem] : [];
  const chuneulFound = allBranches.filter(b => chuneulTargets.includes(b));

  // --- 천덕귀인 ---
  const chundukTarget = monthBranch && CHUNDUK_TABLE[monthBranch] ? CHUNDUK_TABLE[monthBranch] : null;
  const chundukFound = chundukTarget ? allStems.filter(s => s === chundukTarget).concat(allBranches.filter(b => b === chundukTarget)) : [];

  // --- 월덕귀인 ---
  const woldukTarget = monthBranch && WOLDUK_TABLE[monthBranch] ? WOLDUK_TABLE[monthBranch] : null;
  const woldukFound = woldukTarget ? allStems.filter(s => s === woldukTarget).concat(allBranches.filter(b => b === woldukTarget)) : [];

  // --- 문창귀인 ---
  const munchangTarget = dayStem && MUNCHANG_TABLE[dayStem] ? MUNCHANG_TABLE[dayStem] : null;
  const munchangFound = munchangTarget ? allBranches.filter(b => b === munchangTarget) : [];

  // --- 태극귀인 ---
  const taegeukTargets = dayStem && TAEGEUK_TABLE[dayStem] ? TAEGEUK_TABLE[dayStem] : [];
  const taegeukFound = allBranches.filter(b => taegeukTargets.includes(b));

  // --- 학당귀인 ---
  const hakdangTarget = dayStem && HAKDANG_TABLE[dayStem] ? HAKDANG_TABLE[dayStem] : null;
  const hakdangFound = hakdangTarget ? allBranches.filter(b => b === hakdangTarget) : [];

  // --- 천주귀인 ---
  const chunjuTarget = dayStem && CHUNJU_TABLE[dayStem] ? CHUNJU_TABLE[dayStem] : null;
  const chunjuFound = chunjuTarget ? allBranches.filter(b => b === chunjuTarget) : [];

  // --- 재고귀인 ---
  const jaegoTarget = dayStem && JAEGO_TABLE[dayStem] ? JAEGO_TABLE[dayStem] : null;
  const jaegoFound = jaegoTarget ? allBranches.filter(b => b === jaegoTarget) : [];

  // --- 금여귀인 ---
  const geumyeoTarget = dayStem && GEUMYEO_TABLE[dayStem] ? GEUMYEO_TABLE[dayStem] : null;
  const geumyeoFound = geumyeoTarget ? allBranches.filter(b => b === geumyeoTarget) : [];

  // --- 문곡귀인 ---
  const mungokTarget = dayStem && MUNGOK_TABLE[dayStem] ? MUNGOK_TABLE[dayStem] : null;
  const mungokFound = mungokTarget ? allBranches.filter(b => b === mungokTarget) : [];

  // --- 겁살 ---
  const geobTargets = new Set();
  if (yearBranch && GEOBSAL_TABLE[yearBranch]) geobTargets.add(GEOBSAL_TABLE[yearBranch]);
  if (dayBranch && GEOBSAL_TABLE[dayBranch]) geobTargets.add(GEOBSAL_TABLE[dayBranch]);
  const geobFound = allBranches.filter(b => geobTargets.has(b));

  // --- 망신살 ---
  const mangsinTargets = new Set();
  if (yearBranch && MANGSIN_TABLE[yearBranch]) mangsinTargets.add(MANGSIN_TABLE[yearBranch]);
  if (dayBranch && MANGSIN_TABLE[dayBranch]) mangsinTargets.add(MANGSIN_TABLE[dayBranch]);
  const mangsinFound = allBranches.filter(b => mangsinTargets.has(b));

  // --- 양인살 ---
  const yanginTarget = dayStem && YANGIN_TABLE[dayStem] ? YANGIN_TABLE[dayStem] : null;
  const yanginFound = yanginTarget ? allBranches.filter(b => b === yanginTarget) : [];

  // --- 원진살 ---
  const wonjinTarget = yearBranch && WONJIN_TABLE[yearBranch] ? WONJIN_TABLE[yearBranch] : null;
  const wonjinFound = wonjinTarget ? allBranches.filter(b => b === wonjinTarget) : [];

  // --- 괴강살 ---
  const dayPillarStr = dayP ? (dayP.stem + dayP.branch) : '';
  const goegangPresent = GOEGANG_PILLARS.includes(dayPillarStr);

  // --- 백호살 ---
  const baekhoPresent = BAEKHO_PILLARS.includes(dayPillarStr);

  // --- 재살 ---
  const jaesalTargets = new Set();
  if (yearBranch && JAESAL_TABLE[yearBranch]) jaesalTargets.add(JAESAL_TABLE[yearBranch]);
  if (dayBranch && JAESAL_TABLE[dayBranch]) jaesalTargets.add(JAESAL_TABLE[dayBranch]);
  const jaesalFound = allBranches.filter(b => jaesalTargets.has(b));

  // --- 천살 ---
  const chunsalTargets = new Set();
  if (yearBranch && CHUNSAL_TABLE[yearBranch]) chunsalTargets.add(CHUNSAL_TABLE[yearBranch]);
  if (dayBranch && CHUNSAL_TABLE[dayBranch]) chunsalTargets.add(CHUNSAL_TABLE[dayBranch]);
  const chunsalFound = allBranches.filter(b => chunsalTargets.has(b));

  // --- 지살 ---
  const jisalTargets = new Set();
  if (yearBranch && JISAL_TABLE[yearBranch]) jisalTargets.add(JISAL_TABLE[yearBranch]);
  if (dayBranch && JISAL_TABLE[dayBranch]) jisalTargets.add(JISAL_TABLE[dayBranch]);
  const jisalFound = allBranches.filter(b => jisalTargets.has(b));

  // --- 연살 ---
  const yeonsalTargets = new Set();
  if (yearBranch && YEONSAL_TABLE[yearBranch]) yeonsalTargets.add(YEONSAL_TABLE[yearBranch]);
  if (dayBranch && YEONSAL_TABLE[dayBranch]) yeonsalTargets.add(YEONSAL_TABLE[dayBranch]);
  const yeonsalFound = allBranches.filter(b => yeonsalTargets.has(b));

  // --- 월살 ---
  const wolsalTargets = new Set();
  if (yearBranch && WOLSAL_TABLE[yearBranch]) wolsalTargets.add(WOLSAL_TABLE[yearBranch]);
  if (dayBranch && WOLSAL_TABLE[dayBranch]) wolsalTargets.add(WOLSAL_TABLE[dayBranch]);
  const wolsalFound = allBranches.filter(b => wolsalTargets.has(b));

  // --- 장성살 ---
  const jangsungTargets = new Set();
  if (yearBranch && JANGSUNG_TABLE[yearBranch]) jangsungTargets.add(JANGSUNG_TABLE[yearBranch]);
  if (dayBranch && JANGSUNG_TABLE[dayBranch]) jangsungTargets.add(JANGSUNG_TABLE[dayBranch]);
  const jangsungFound = allBranches.filter(b => jangsungTargets.has(b));

  // --- 반안살 ---
  const bananTargets = new Set();
  if (yearBranch && BANAN_TABLE[yearBranch]) bananTargets.add(BANAN_TABLE[yearBranch]);
  if (dayBranch && BANAN_TABLE[dayBranch]) bananTargets.add(BANAN_TABLE[dayBranch]);
  const bananFound = allBranches.filter(b => bananTargets.has(b));

  // --- 육해살 ---
  const yukhaeTargets = new Set();
  if (yearBranch && YUKHAE_TABLE[yearBranch]) yukhaeTargets.add(YUKHAE_TABLE[yearBranch]);
  if (dayBranch && YUKHAE_TABLE[dayBranch]) yukhaeTargets.add(YUKHAE_TABLE[dayBranch]);
  const yukhaeFound = allBranches.filter(b => yukhaeTargets.has(b));

  return {
    도화살: {
      present: dohuaFound.length > 0,
      branches: [...new Set(dohuaFound)],
      description: dohuaFound.length > 0
        ? '매력과 인기가 많으며 이성에게 호감을 끄는 기운이 있습니다. 예술적 감각과 사교성이 뛰어납니다.'
        : '도화살이 없어 대인관계에서 안정적인 편입니다.'
    },
    역마살: {
      present: yeokmaFound.length > 0,
      branches: [...new Set(yeokmaFound)],
      description: yeokmaFound.length > 0
        ? '이동과 변화가 많은 삶을 살게 됩니다. 해외 진출, 출장, 이사 등의 기회가 많습니다.'
        : '역마살이 없어 안정적인 생활 기반을 가지는 편입니다.'
    },
    화개살: {
      present: hwagaeFound.length > 0,
      branches: [...new Set(hwagaeFound)],
      description: hwagaeFound.length > 0
        ? '학문, 예술, 종교에 대한 깊은 관심과 재능이 있습니다. 영적인 감수성이 뛰어납니다.'
        : '화개살이 없어 현실적이고 실용적인 성향이 강합니다.'
    },
    천을귀인: {
      present: chuneulFound.length > 0,
      branches: [...new Set(chuneulFound)],
      description: chuneulFound.length > 0
        ? '어려울 때 귀인의 도움을 받는 길한 기운입니다. 위기 상황에서 빠져나오는 힘이 있습니다.'
        : '천을귀인이 없으나 다른 귀인을 통해 도움을 받을 수 있습니다.'
    },
    천덕귀인: {
      present: chundukFound.length > 0,
      stems: chundukTarget ? [chundukTarget] : [],
      description: chundukFound.length > 0
        ? '하늘의 덕을 받는 길한 기운으로, 재난을 피하고 복을 받습니다. 도덕적이고 너그러운 성품입니다.'
        : '천덕귀인이 없으나 선행과 덕행으로 복을 쌓을 수 있습니다.'
    },
    월덕귀인: {
      present: woldukFound.length > 0,
      stems: woldukTarget ? [woldukTarget] : [],
      description: woldukFound.length > 0
        ? '달의 덕을 받아 재물과 건강에 좋은 영향을 줍니다. 주변 사람들에게 신뢰를 얻습니다.'
        : '월덕귀인이 없으나 꾸준한 노력으로 신뢰를 쌓을 수 있습니다.'
    },
    문창귀인: {
      present: munchangFound.length > 0,
      branches: munchangTarget ? [munchangTarget] : [],
      description: munchangFound.length > 0
        ? '학문과 지혜의 귀인으로, 시험, 공부, 자격증에 유리합니다. 문서 관련 일에서 좋은 성과를 거둡니다.'
        : '문창귀인이 없으나 꾸준한 학습과 독서로 지혜를 쌓을 수 있습니다.'
    },
    태극귀인: {
      present: taegeukFound.length > 0,
      branches: [...new Set(taegeukFound)],
      description: taegeukFound.length > 0
        ? '태극의 근본 기운을 타고나 만사에 형통하며, 어떤 재난도 극복하는 큰 복입니다.'
        : '태극귀인이 없으나 근본을 다지는 수양으로 복을 키울 수 있습니다.'
    },
    학당귀인: {
      present: hakdangFound.length > 0,
      branches: hakdangTarget ? [hakdangTarget] : [],
      description: hakdangFound.length > 0
        ? '학문의 전당에 앉은 귀인으로, 공부, 시험, 학위에 큰 행운이 따릅니다.'
        : '학당귀인이 없으나 꾸준한 노력으로 학업 성취를 이룰 수 있습니다.'
    },
    천주귀인: {
      present: chunjuFound.length > 0,
      branches: chunjuTarget ? [chunjuTarget] : [],
      description: chunjuFound.length > 0
        ? '하늘의 주방 귀인으로 의식주가 풍족하고, 평생 먹고 사는 걱정이 없습니다.'
        : '천주귀인이 없으나 근면 성실함으로 물질적 안정을 이룰 수 있습니다.'
    },
    재고귀인: {
      present: jaegoFound.length > 0,
      branches: jaegoTarget ? [jaegoTarget] : [],
      description: jaegoFound.length > 0
        ? '재물의 창고를 가진 귀인으로, 돈을 모으고 불리는 재능이 있습니다. 투자와 사업에 유리합니다.'
        : '재고귀인이 없으나 절약과 계획적 재테크로 부를 쌓을 수 있습니다.'
    },
    금여귀인: {
      present: geumyeoFound.length > 0,
      branches: geumyeoTarget ? [geumyeoTarget] : [],
      description: geumyeoFound.length > 0
        ? '금으로 된 수레를 탄 귀인으로, 결혼 후 배우자 복이 크고 안정된 생활을 누립니다.'
        : '금여귀인이 없으나 상호 존중으로 좋은 배우자 관계를 만들 수 있습니다.'
    },
    문곡귀인: {
      present: mungokFound.length > 0,
      branches: mungokTarget ? [mungokTarget] : [],
      description: mungokFound.length > 0
        ? '문학과 예술의 별로, 글쓰기, 창작, 예술 분야에서 뛰어난 재능을 발휘합니다.'
        : '문곡귀인이 없으나 꾸준한 독서와 창작 활동으로 문학적 감성을 기울 수 있습니다.'
    },
    겁살: {
      present: geobFound.length > 0,
      branches: [...new Set(geobFound)],
      description: geobFound.length > 0
        ? '외부로부터의 갑작스러운 손실이나 강탈을 의미합니다. 재물 관리에 주의가 필요합니다.'
        : '겁살이 없어 외부 재난으로 인한 손실 위험이 적습니다.'
    },
    망신살: {
      present: mangsinFound.length > 0,
      branches: [...new Set(mangsinFound)],
      description: mangsinFound.length > 0
        ? '명예와 체면에 손상이 올 수 있는 기운입니다. 언행을 조심하고 비밀 관리에 주의하세요.'
        : '망신살이 없어 명예가 잘 보전되는 편입니다.'
    },
    양인살: {
      present: yanginFound.length > 0,
      branches: yanginTarget ? [yanginTarget] : [],
      description: yanginFound.length > 0
        ? '날카로운 칼날의 기운으로 결단력이 강하지만, 급변과 충돌에 주의해야 합니다. 군인, 의사, 법조인에게 유리합니다.'
        : '양인살이 없어 온화한 성향이 강합니다.'
    },
    원진살: {
      present: wonjinFound.length > 0,
      branches: wonjinTarget ? [wonjinTarget] : [],
      description: wonjinFound.length > 0
        ? '미워하면서도 끌리는 악연의 기운입니다. 특정 관계에서 갈등이 반복될 수 있으니 거리두기가 필요합니다.'
        : '원진살이 없어 대인관계가 비교적 원만합니다.'
    },
    괴강살: {
      present: goegangPresent,
      branches: goegangPresent ? [dayPillarStr] : [],
      description: goegangPresent
        ? '극단적인 권위와 카리스마를 가진 장군의 기운입니다. 리더십이 강하지만 고집도 세니 유연성이 필요합니다.'
        : '괴강살이 없어 극단적 성향 없이 균형 잡힌 편입니다.'
    },
    백호살: {
      present: baekhoPresent,
      branches: baekhoPresent ? [dayPillarStr] : [],
      description: baekhoPresent
        ? '백호의 기운으로 수술, 사고, 유혈 사태에 주의가 필요합니다. 의료 분야 종사 시 오히려 길합니다.'
        : '백호살이 없어 신체적 위험이 비교적 적습니다.'
    },
    재살: {
      present: jaesalFound.length > 0,
      branches: [...new Set(jaesalFound)],
      description: jaesalFound.length > 0
        ? '자연재해나 예상치 못한 사고를 의미합니다. 안전에 각별히 주의하고 보험 등 대비가 필요합니다.'
        : '재살이 없어 자연재해로 인한 피해가 적은 편입니다.'
    },
    천살: {
      present: chunsalFound.length > 0,
      branches: [...new Set(chunsalFound)],
      description: chunsalFound.length > 0
        ? '하늘에서 오는 재앙의 기운으로, 갑작스러운 변화에 대비해야 합니다. 신앙이나 명상이 도움됩니다.'
        : '천살이 없어 갑작스러운 천재지변의 영향이 적습니다.'
    },
    지살: {
      present: jisalFound.length > 0,
      branches: [...new Set(jisalFound)],
      description: jisalFound.length > 0
        ? '땅에서 오는 재앙의 기운으로, 이사나 부동산 거래 시 주의가 필요합니다.'
        : '지살이 없어 주거와 부동산 관련 문제가 적습니다.'
    },
    연살: {
      present: yeonsalFound.length > 0,
      branches: [...new Set(yeonsalFound)],
      description: yeonsalFound.length > 0
        ? '이성에 대한 강한 매력과 끌림이 있으며, 연애운이 활발합니다. 도화살과 함께 있으면 더욱 강해집니다.'
        : '연살이 없어 이성 관계가 안정적인 편입니다.'
    },
    월살: {
      present: wolsalFound.length > 0,
      branches: [...new Set(wolsalFound)],
      description: wolsalFound.length > 0
        ? '고독과 외로움의 기운이 있으며, 가정이나 조직에서 소외감을 느낄 수 있습니다.'
        : '월살이 없어 소속감이 잘 유지되는 편입니다.'
    },
    장성살: {
      present: jangsungFound.length > 0,
      branches: [...new Set(jangsungFound)],
      description: jangsungFound.length > 0
        ? '장수의 별로 리더십과 통솔력이 뛰어납니다. 조직의 중심이 되는 기운입니다.'
        : '장성살이 없어 지휘보다는 협력에 강합니다.'
    },
    반안살: {
      present: bananFound.length > 0,
      branches: [...new Set(bananFound)],
      description: bananFound.length > 0
        ? '말 안장에 오르는 기운으로, 승진과 지위 상승의 기회가 많습니다.'
        : '반안살이 없어 꾸준한 노력으로 지위를 쌓아가는 타입입니다.'
    },
    육해살: {
      present: yukhaeFound.length > 0,
      branches: [...new Set(yukhaeFound)],
      description: yukhaeFound.length > 0
        ? '가까운 사람과의 배신이나 인연 파괴의 기운이 있습니다. 믿을 사람을 잘 가려야 합니다.'
        : '육해살이 없어 가까운 인연이 잘 유지되는 편입니다.'
    }
  };
}

// --- 60갑자 & 대운/세운 계산 ---

// 한자→한글 매핑 (모듈 레벨)
const HANJA_HANGUL = {
  '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
  '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계',
  '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사',
  '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해'
};

/**
 * 60갑자 인덱스 계산 (Chinese Remainder Theorem)
 * @param {string} stem - 천간 한자
 * @param {string} branch - 지지 한자
 * @returns {number} 0~59 인덱스
 */
function get60CycleIndex(stem, branch) {
  const sIdx = STEMS_ORDER.indexOf(stem);
  const bIdx = BRANCHES_ORDER.indexOf(branch);
  if (sIdx === -1 || bIdx === -1) return -1;
  return (sIdx * 36 + bIdx * 25) % 60;
}

/**
 * 60갑자 인덱스에서 천간/지지 추출
 * @param {number} index - 60갑자 인덱스
 * @returns {Object} { stem, branch }
 */
function get60CyclePillar(index) {
  const idx = ((index % 60) + 60) % 60;
  return {
    stem: STEMS_ORDER[idx % 10],
    branch: BRANCHES_ORDER[idx % 12]
  };
}

// 절기 근사 날짜 (양력) - 사주 월의 시작 절기
const JEOLGI_APPROX = [
  { month: 1, day: 6 },   // 소한 (축월)
  { month: 2, day: 4 },   // 입춘 (인월)
  { month: 3, day: 6 },   // 경칩 (묘월)
  { month: 4, day: 5 },   // 청명 (진월)
  { month: 5, day: 6 },   // 입하 (사월)
  { month: 6, day: 6 },   // 망종 (오월)
  { month: 7, day: 7 },   // 소서 (미월)
  { month: 8, day: 8 },   // 입추 (신월)
  { month: 9, day: 8 },   // 백로 (유월)
  { month: 10, day: 8 },  // 한로 (술월)
  { month: 11, day: 7 },  // 입동 (해월)
  { month: 12, day: 7 },  // 대설 (자월)
];

/**
 * 대운 시작 나이 계산
 * 순행: 생일 → 다음 절기까지 일수 / 3
 * 역행: 생일 → 이전 절기까지 일수 / 3
 */
function calculateDaeunStartAge(solarYear, solarMonth, solarDay, yearStem, gender) {
  const isYangStem = YANG_STEMS.has(yearStem);
  const isMale = gender === 'male';
  const isForward = (isYangStem && isMale) || (!isYangStem && !isMale);

  const birthDate = new Date(solarYear, solarMonth - 1, solarDay);

  // Collect all nearby 절기 dates (-1 year to +1 year)
  const jeolgiDates = [];
  for (let yOff = -1; yOff <= 1; yOff++) {
    for (const jg of JEOLGI_APPROX) {
      const jDate = new Date(solarYear + yOff, jg.month - 1, jg.day);
      jeolgiDates.push(jDate);
    }
  }

  // Find next and previous 절기
  let nextDiff = Infinity, prevDiff = Infinity;
  for (const jDate of jeolgiDates) {
    const diff = (jDate - birthDate) / (1000 * 60 * 60 * 24);
    if (diff > 0 && diff < nextDiff) nextDiff = diff;
    if (diff < 0 && Math.abs(diff) < prevDiff) prevDiff = Math.abs(diff);
  }

  const days = isForward ? (nextDiff === Infinity ? 15 : nextDiff) : (prevDiff === Infinity ? 15 : prevDiff);
  const startAge = Math.max(1, Math.round(days / 3));

  return { startAge, direction: isForward ? '순행' : '역행' };
}

/**
 * 대운(大運) 계산 - 10년 주기 운세
 * @param {Object} sajuData - 사용자 생년월일 정보
 * @param {Object} yearPillar - 년주 { stem, branch }
 * @param {Object} monthPillar - 월주 { stem, branch }
 * @param {string} dayStem - 일간 천간
 * @returns {Object} { direction, startAge, cycles[] }
 */
function calculateDaeunData(sajuData, yearPillar, monthPillar, dayStem) {
  if (!monthPillar || !yearPillar) return null;

  const birthYear = Number(sajuData.year);
  let solarYear = birthYear, solarMonth = Number(sajuData.month), solarDay = Number(sajuData.day);

  if (sajuData.cal === 'lunar') {
    try {
      const conv = lunarToSolar(birthYear, solarMonth, solarDay);
      if (conv && conv.solar) {
        solarYear = conv.solar.year;
        solarMonth = conv.solar.month;
        solarDay = conv.solar.day;
      }
    } catch (e) { /* use original solar dates */ }
  }

  const { startAge, direction } = calculateDaeunStartAge(
    solarYear, solarMonth, solarDay, yearPillar.stem, sajuData.gender || 'male'
  );
  const isForward = direction === '순행';
  const mpIndex = get60CycleIndex(monthPillar.stem, monthPillar.branch);

  const cycles = [];
  for (let i = 1; i <= 10; i++) {
    const ci = isForward ? mpIndex + i : mpIndex - i;
    const { stem, branch } = get60CyclePillar(ci);
    const age = startAge + (i - 1) * 10;
    cycles.push({
      age,
      year: birthYear + age,
      stem,
      branch,
      hangulStem: HANJA_HANGUL[stem] || '',
      hangulBranch: HANJA_HANGUL[branch] || '',
      stemElement: STEM_ELEMENTS[stem] || '',
      branchElement: BRANCH_ELEMENTS[branch] || '',
      tenGod: getTenGod(dayStem, stem),
      twelveStage: getTwelveStage(dayStem, branch)
    });
  }

  return { direction, startAge, cycles };
}

/**
 * 세운(歲運) 계산 - 연간 운세 (현재 기준 ±2년)
 * @param {number} birthYear - 출생 연도
 * @param {string} dayStem - 일간 천간
 * @returns {Array} 5개년 세운 데이터
 */
function calculateSaeunData(birthYear, dayStem) {
  const currentYear = new Date().getFullYear();
  const years = [];

  for (let y = currentYear - 2; y <= currentYear + 2; y++) {
    const cycleIndex = ((y - 4) % 60 + 60) % 60;
    const { stem, branch } = get60CyclePillar(cycleIndex);
    years.push({
      year: y,
      age: y - birthYear,
      stem,
      branch,
      hangulStem: HANJA_HANGUL[stem] || '',
      hangulBranch: HANJA_HANGUL[branch] || '',
      stemElement: STEM_ELEMENTS[stem] || '',
      branchElement: BRANCH_ELEMENTS[branch] || '',
      tenGod: dayStem ? getTenGod(dayStem, stem) : '',
      twelveStage: dayStem ? getTwelveStage(dayStem, branch) : '',
      isCurrent: y === currentYear
    });
  }

  return years;
}

// --- Rate Limiting (in-memory) ---
const rateLimitMap = new Map();
const RATE_LIMIT = 10; // requests per minute per IP
const RATE_WINDOW = 60000; // 1 minute in ms

function checkRateLimit(ip) {
  const now = Date.now();
  // Inline cleanup: remove expired entries on each check
  if (rateLimitMap.size > 100) {
    for (const [key, rec] of rateLimitMap) {
      if (now - rec.start > RATE_WINDOW) rateLimitMap.delete(key);
    }
  }
  const record = rateLimitMap.get(ip);
  if (!record || now - record.start > RATE_WINDOW) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return true;
  }
  record.count++;
  return record.count <= RATE_LIMIT;
}

// Parse ISO 8601 duration (PT4M13S) to seconds
function parseDuration(duration) {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) {
    console.warn(`Failed to parse duration: ${duration}`);
    return 0;
  }
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  return totalSeconds;
}


// --- Prompt Injection Sanitization ---
function sanitizeQuestion(text) {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\b(system|assistant|user|human|ai|claude|gpt)\s*[:：]/gi, '')
    .replace(/\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N}\s.,!?·~()（）\-]/gu, '')
    .trim()
    .slice(0, 500);
}

// --- Security Headers ---
const BASE_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

const CSP_VALUE = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://www.youtube.com https://www.googletagmanager.com https://www.google-analytics.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https: blob:; frame-src https://www.youtube-nocookie.com https://www.youtube.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google; connect-src 'self' https://pagead2.googlesyndication.com https://www.google-analytics.com https://www.googletagmanager.com;";

function addSecurityHeaders(response, isHtml = false) {
  const newResponse = new Response(response.body, response);
  for (const [key, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    newResponse.headers.set(key, value);
  }
  if (isHtml) {
    newResponse.headers.set('Content-Security-Policy', CSP_VALUE);
  }
  return newResponse;
}

function apiResponse(data, status = 200) {
  const body = JSON.stringify(data);
  const response = new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
  for (const [key, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

// --- Input Validation Helpers ---
function validateUrlParams(url) {
  for (const [, value] of url.searchParams) {
    if (value && value.length > 2000) {
      return 'URL parameter exceeds maximum allowed length.';
    }
  }
  return null;
}

function validateDateFields(obj, label) {
  if (typeof obj !== 'object' || obj === null) {
    return `${label}: invalid data structure.`;
  }
  const year = Number(obj.year);
  const month = Number(obj.month);
  const day = Number(obj.day);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) {
    return `${label}: year must be between 1900 and 2100.`;
  }
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    return `${label}: month must be between 1 and 12.`;
  }
  if (!Number.isFinite(day) || day < 1 || day > 31) {
    return `${label}: day must be between 1 and 31.`;
  }
  return null;
}

// --- Core Business Logic (unchanged) ---

/**
 * Calculate accurate saju using the manseryeok library
 * @param {Object} sajuData - Object containing year, month, day, time, cal (calendar type)
 * @returns {Object} Calculated saju with yearPillar, monthPillar, dayPillar, hourPillar, elements
 */
function calculateAccurateSaju(sajuData) {
  try {
    // HH:MM 형식 또는 기존 시진 값(0-11) 모두 지원
    function parseTimeInput(timeStr) {
      if (!timeStr || timeStr === '-1' || timeStr === '모름') {
        return [12, 0]; // 기본값 (정오)
      }
      // HH:MM 형식 파싱
      const match = String(timeStr).match(/^(\d{1,2}):(\d{2})$/);
      if (match) {
        return [parseInt(match[1], 10), parseInt(match[2], 10)];
      }
      // 기존 0-11 시진 값 호환 (fallback)
      const oldMap = {
        '0': [23, 30], '1': [1, 30], '2': [3, 30], '3': [5, 30],
        '4': [7, 30], '5': [9, 30], '6': [11, 30], '7': [13, 30],
        '8': [15, 30], '9': [17, 30], '10': [19, 30], '11': [21, 30]
      };
      return oldMap[String(timeStr)] || [12, 0];
    }

    const [hour, minute] = parseTimeInput(sajuData.time);

    let year = Number(sajuData.year);
    let month = Number(sajuData.month);
    let day = Number(sajuData.day);

    // Convert lunar to solar if needed
    if (sajuData.cal === 'lunar') {
      const lunarResult = lunarToSolar(year, month, day);
      if (lunarResult && lunarResult.solar) {
        year = lunarResult.solar.year;
        month = lunarResult.solar.month;
        day = lunarResult.solar.day;
      }
    }

    // Calculate saju using Seoul longitude
    const result = calculateSaju(year, month, day, hour, minute, { longitude: 126.978 });

    // Extract pillars from result (format: yearPillar, monthPillar, dayPillar, hourPillar)
    // Each pillar is a string like "甲子"
    const HANJA_TO_HANGUL = {
      '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
      '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계',
      '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사',
      '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해'
    };
    const extractPillar = (pillarStr) => {
      if (!pillarStr || pillarStr.length !== 2) return null;
      const stem = pillarStr[0];
      const branch = pillarStr[1];
      const stemElement = STEM_ELEMENTS[stem] || '?';
      const branchElement = BRANCH_ELEMENTS[branch] || '?';
      const hangulStem = HANJA_TO_HANGUL[stem] || '';
      const hangulBranch = HANJA_TO_HANGUL[branch] || '';
      return { stem, branch, hangulStem, hangulBranch, stemElement, branchElement };
    };

    const yearPillar = extractPillar(result.yearPillarHanja);
    const monthPillar = extractPillar(result.monthPillarHanja);
    const dayPillar = extractPillar(result.dayPillarHanja);
    const hourPillar = extractPillar(result.hourPillarHanja);

    // Count elements from all 8 characters (4 stems + 4 branches)
    const elements = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
    const pillars = [yearPillar, monthPillar, dayPillar, hourPillar];

    pillars.forEach(pillar => {
      if (pillar) {
        const stemElement = STEM_ELEMENTS[pillar.stem];
        const branchElement = BRANCH_ELEMENTS[pillar.branch];
        if (stemElement) elements[stemElement] = (elements[stemElement] || 0) + 1;
        if (branchElement) elements[branchElement] = (elements[branchElement] || 0) + 1;
      }
    });

    // 음양 계산 (4천간 + 4지지 = 8글자)
    let yangCount = 0, yinCount = 0;
    pillars.forEach(pillar => {
      if (pillar) {
        if (STEM_YINYANG[pillar.stem] === '양') yangCount++; else yinCount++;
        if (BRANCH_YINYANG[pillar.branch] === '양') yangCount++; else yinCount++;
      }
    });

    // 일간 (Day stem) - 사주 분석의 기준점
    const dayStem = dayPillar ? dayPillar.stem : null;

    // 십성(十神) 계산 - 일간 기준으로 각 천간/지지의 관계 판별
    const tenGods = {};
    const pillarNames = ['year', 'month', 'day', 'hour'];
    pillars.forEach((pillar, idx) => {
      if (pillar) {
        tenGods[pillarNames[idx] + 'Stem'] = idx === 2 ? '일간' : getTenGod(dayStem, pillar.stem);
        tenGods[pillarNames[idx] + 'Branch'] = getTenGod(dayStem, BRANCH_MAIN_STEM[pillar.branch]);
      }
    });

    // 12운성 계산 - 일간이 각 지지에서 어떤 생사 단계에 있는지
    const twelveStages = {};
    pillars.forEach((pillar, idx) => {
      if (pillar) {
        twelveStages[pillarNames[idx]] = getTwelveStage(dayStem, pillar.branch);
      }
    });

    // 신살(神殺) 계산 - 길신/흉살 판별
    const shinsal = calculateShinsal(pillars, sajuData?.gender);

    // 지장간(地藏干) - 각 지지에 숨어있는 천간
    const hiddenStems = {};
    pillars.forEach((pillar, idx) => {
      if (pillar) {
        hiddenStems[pillarNames[idx]] = HIDDEN_STEMS[pillar.branch] || [];
      }
    });

    // 대운 계산
    const daeun = calculateDaeunData(sajuData, yearPillar, monthPillar, dayStem);
    // 세운 계산
    const saeun = calculateSaeunData(Number(sajuData.year), dayStem);

    return {
      yearPillar,
      monthPillar,
      dayPillar,
      hourPillar,
      elements,
      yinYang: { yang: yangCount, yin: yinCount },
      dayStem,
      tenGods,
      twelveStages,
      shinsal,
      hiddenStems,
      daeun,
      saeun
    };
  } catch (error) {
    console.error('calculateAccurateSaju error:', error);
    return null;  // Fallback to old behavior
  }
}

async function callOpenAi(apiKey, messages) {
  const apiRequestBody = {
    model: 'gpt-4o',
    messages: messages,
    temperature: 0,      // 완전히 결정론적 출력 (0 = 가장 일관됨)
    seed: 42,            // 동일 입력에 대해 동일 출력 보장
    top_p: 1,            // nucleus sampling 비활성화 (deterministic)
    frequency_penalty: 0,  // 반복 패널티 없음 (일관성 우선)
    presence_penalty: 0,   // 새로운 주제 패널티 없음 (일관성 우선)
    max_tokens: 16384,   // GPT-4o-mini 최대 출력 토큰 (섹션 7-12 잘림 방지)
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(apiRequestBody)
  });

  const openAiResponse = new Response(response.body, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' }
  });
  for (const [key, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    openAiResponse.headers.set(key, value);
  }
  return openAiResponse;
}

async function handleYouTubeRequest(request, env) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query');
  const YOUTUBE_API_KEY = env.YOUTUBE_API_KEY;
  const region = request.cf?.country || 'US';

  if (!query) {
    return apiResponse({ error: { message: 'Missing query parameter.' } }, 400);
  }

  // Input validation: limit query length
  if (query.length > 200) {
    return apiResponse({ error: { message: 'Query exceeds maximum length of 200 characters.' } }, 400);
  }

  if (!YOUTUBE_API_KEY) {
    console.error('⚠️ YOUTUBE_API_KEY is not set in environment variables.');
    return apiResponse({
      error: {
        message: 'YouTube API 키가 설정되지 않았습니다. Cloudflare Pages 설정에서 환경변수를 추가해주세요.'
      }
    }, 500);
  }

  const apiUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  const enhancedQuery = `${query} MV`;
  apiUrl.search = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    videoCategoryId: '10',
    maxResults: '20',
    q: enhancedQuery,
    safeSearch: 'moderate',
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    regionCode: 'KR',
    key: YOUTUBE_API_KEY,
  }).toString();

  const response = await fetch(apiUrl.toString());

  if (!response.ok) {
    const errorText = await response.text();
    console.error('YouTube search failed:', response.status, errorText);
    return apiResponse({
      error: {
        message: `YouTube 검색 실패 (${response.status}): ${errorText.slice(0, 100)}`
      }
    }, response.status);
  }

  const data = await response.json();

  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items = rawItems
    .map(item => ({
      videoId: item?.id?.videoId,
      title: item?.snippet?.title || '',
      channelTitle: item?.snippet?.channelTitle || '',
      thumbnail: item?.snippet?.thumbnails?.medium?.url || item?.snippet?.thumbnails?.default?.url || ''
    }))
    .filter(item => item.videoId)
    .filter(item => {
      const title = item.title.toLowerCase();
      const excludeKeywords = [
        'medley', 'mix', 'mashup', 'compilation',
        '메들리', '믹스', '모음집', '합본',
        '연속듣기', '플레이리스트',
        '1시간', '2시간', '3시간', '4시간', '10시간',
        'playlist', 'hour', '연속재생', '모아듣기',
        '논스톱', 'nonstop',
        '#shorts', 'shorts', '#쇼츠', '쇼츠', 'tiktok',
        'cover', '커버', 'reaction', '리액션'
      ];
      return !excludeKeywords.some(keyword => title.includes(keyword));
    });

  if (!items.length) {
    return apiResponse({ error: { message: 'No results found.' } }, 404);
  }

  const idParam = items.map(item => item.videoId).join(',');
  const detailUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
  detailUrl.search = new URLSearchParams({
    part: 'status,contentDetails',
    id: idParam,
    key: YOUTUBE_API_KEY,
  }).toString();

  let filteredItems = items;
  try {
    const detailResponse = await fetch(detailUrl.toString());
    const detailData = await detailResponse.json();
    if (detailResponse.ok && Array.isArray(detailData.items)) {
      const detailMap = new Map();
      detailData.items.forEach(item => {
        detailMap.set(item.id, {
          embeddable: item?.status?.embeddable !== false,
          blocked: item?.contentDetails?.regionRestriction?.blocked || [],
          duration: parseDuration(item?.contentDetails?.duration)
        });
      });
      filteredItems = items.filter(item => {
        const detail = detailMap.get(item.videoId);
        if (!detail) {
          console.warn(`No detail for ${item.videoId}, excluding`);
          return false;  // detail 없으면 제외
        }
        if (!detail.embeddable) return false;
        if (Array.isArray(detail.blocked) && detail.blocked.includes(region)) return false;
        // Filter: min 60s (exclude Shorts), max 600s (exclude compilations)
        if (detail.duration < 60 || detail.duration > 600) {
          return false;
        }
        return true;
      }).slice(0, 5); // Limit to 5 results
      // 필터링 후 결과가 없으면 빈 배열 반환 (긴 영상 반환 방지)
      if (!filteredItems.length) {
        console.warn('All videos filtered out due to duration/embeddability');
        filteredItems = [];
      }
    }
  } catch (_err) {
    console.warn('YouTube detail fetch failed, returning empty results');
    filteredItems = [];
  }

  return apiResponse({ items: filteredItems }, 200);
}

function getSajuPrompt(sajuData, question) {
  const systemPrompt = `당신은 사주(四柱) 분석 전문 역학가입니다. 정확하고 풍부한 분석을 한국어로 제공하세요.
- 분석은 한국어로만 작성합니다. 영어 표현(예: User's Information)은 절대 쓰지 마세요.
- 마크다운 문법을 사용하되 표는 사용하지 마세요.
- 각 섹션 앞에 이모티콘을 넣고, 핵심 키워드는 **볼드** 표시하세요.
- **보고서 형식 (필수)**:
  * 각 섹션은 **최소 10~15문장**으로 매우 상세하게 작성하세요.
  * **절대 빈 섹션 금지**: 12개 섹션 모두 반드시 풍부한 내용으로 작성하세요. 어떤 섹션도 생략하거나 간략히 넘어가지 마세요.
  * **각 섹션 최소 분량**: 성격/관계/직업/건강/시기별 운세 섹션은 각각 최소 300자 이상, 살/귀인 섹션은 각각 최소 500자 이상으로 작성하세요.
  * 각 섹션 첫 문장은 핵심 요약으로 시작하세요.
  * 각 섹션 마지막에 속담이나 비유를 추가하세요.
  * 전체 분석 길이: **최소 4000자 이상**으로 충실하게 작성하세요.
  * 은유적이고 문학적인 감성을 담은 표현을 사용해주세요.
  * 천간/지지 의미를 생활 속 실용적 조언으로 풀어주세요.`;

  const calLabel = sajuData.cal === 'lunar' ? '음력' : '양력';
  const genderLabel = sajuData.gender === 'female' ? '여자' : '남자';

  // Calculate accurate saju
  const calculatedSaju = calculateAccurateSaju(sajuData);

  // 만세력: 대운 계산 (10년 주기)
  const currentYear = new Date().getFullYear();
  const birthYear = Number(sajuData.year);
  const age = currentYear - birthYear;
  const daeunStart = Math.floor(age / 10) * 10; // 현재 대운 시작 나이
  const daeunYears = `${daeunStart}세~${daeunStart+9}세`;

  // 세운 (올해)
  const saeun = `${currentYear}년 (${age}세)`;

  let userPrompt = `아래 정보를 바탕으로 깊이있고 폭이 넓은 사주 분석을 작성해주세요.

**사용자 정보**
- 생년월일: ${sajuData.year}년 ${sajuData.month}월 ${sajuData.day}일 (${sajuData.b_time_ext})
- 달력: ${calLabel}
- 성별: ${genderLabel}
- 출생지: ${sajuData.place || '미입력'}`;

  // Add calculated saju information if available
  if (calculatedSaju && calculatedSaju.yearPillar) {
    const yangCount = calculatedSaju.yinYang.yang;
    const yinCount = calculatedSaju.yinYang.yin;
    let yinYangBalance;
    if (yangCount === yinCount) {
      yinYangBalance = '완벽한 균형(4:4)은 조화로운 성격을 의미합니다.';
    } else if (yangCount > yinCount) {
      yinYangBalance = '양이 우세하면 적극적이고 외향적인 성격입니다.';
    } else {
      yinYangBalance = '음이 우세하면 차분하고 내면적인 성격입니다.';
    }

    userPrompt += `

**정확하게 계산된 사주**
- 년주(年柱): ${calculatedSaju.yearPillar.stem}${calculatedSaju.yearPillar.branch} (천간: ${calculatedSaju.yearPillar.stemElement}, 지지: ${calculatedSaju.yearPillar.branchElement})
- 월주(月柱): ${calculatedSaju.monthPillar.stem}${calculatedSaju.monthPillar.branch} (천간: ${calculatedSaju.monthPillar.stemElement}, 지지: ${calculatedSaju.monthPillar.branchElement})
- 일주(日柱): ${calculatedSaju.dayPillar.stem}${calculatedSaju.dayPillar.branch} (천간: ${calculatedSaju.dayPillar.stemElement}, 지지: ${calculatedSaju.dayPillar.branchElement})
- 시주(時柱): ${calculatedSaju.hourPillar.stem}${calculatedSaju.hourPillar.branch} (천간: ${calculatedSaju.hourPillar.stemElement}, 지지: ${calculatedSaju.hourPillar.branchElement})
- 오행 분포: 목 ${calculatedSaju.elements.목}개, 화 ${calculatedSaju.elements.화}개, 토 ${calculatedSaju.elements.토}개, 금 ${calculatedSaju.elements.금}개, 수 ${calculatedSaju.elements.수}개
- 음양 분포: 양 ${yangCount}개, 음 ${yinCount}개 (총 8글자 중)
- 일간(日干): ${calculatedSaju.dayStem} (${STEM_ELEMENTS[calculatedSaju.dayStem]}/${STEM_YINYANG[calculatedSaju.dayStem]})
- 현재 대운: ${daeunYears}
- 올해 세운: ${saeun}

**십성(十神) 배치**
- 년주 천간: ${calculatedSaju.tenGods.yearStem || '-'}, 년주 지지: ${calculatedSaju.tenGods.yearBranch || '-'}
- 월주 천간: ${calculatedSaju.tenGods.monthStem || '-'}, 월주 지지: ${calculatedSaju.tenGods.monthBranch || '-'}
- 일주 천간: ${calculatedSaju.tenGods.dayStem || '일간'}, 일주 지지: ${calculatedSaju.tenGods.dayBranch || '-'}
- 시주 천간: ${calculatedSaju.tenGods.hourStem || '-'}, 시주 지지: ${calculatedSaju.tenGods.hourBranch || '-'}

**12운성(十二運星)**
- 년주: ${calculatedSaju.twelveStages.year || '-'}, 월주: ${calculatedSaju.twelveStages.month || '-'}, 일주: ${calculatedSaju.twelveStages.day || '-'}, 시주: ${calculatedSaju.twelveStages.hour || '-'}

**지장간(地藏干)**
- 년주: ${(calculatedSaju.hiddenStems.year || []).join(', ') || '-'}
- 월주: ${(calculatedSaju.hiddenStems.month || []).join(', ') || '-'}
- 일주: ${(calculatedSaju.hiddenStems.day || []).join(', ') || '-'}
- 시주: ${(calculatedSaju.hiddenStems.hour || []).join(', ') || '-'}

**신살(神殺) 분석**
- 도화살: ${calculatedSaju.shinsal.도화살.present ? '있음 (' + calculatedSaju.shinsal.도화살.branches.join(', ') + ') - ' + calculatedSaju.shinsal.도화살.description : '없음'}
- 역마살: ${calculatedSaju.shinsal.역마살.present ? '있음 (' + calculatedSaju.shinsal.역마살.branches.join(', ') + ') - ' + calculatedSaju.shinsal.역마살.description : '없음'}
- 화개살: ${calculatedSaju.shinsal.화개살.present ? '있음 (' + calculatedSaju.shinsal.화개살.branches.join(', ') + ') - ' + calculatedSaju.shinsal.화개살.description : '없음'}
- 천을귀인: ${calculatedSaju.shinsal.천을귀인.present ? '있음 (' + calculatedSaju.shinsal.천을귀인.branches.join(', ') + ') - ' + calculatedSaju.shinsal.천을귀인.description : '없음'}
- 천덕귀인: ${calculatedSaju.shinsal.천덕귀인.present ? '있음 - ' + calculatedSaju.shinsal.천덕귀인.description : '없음'}
- 월덕귀인: ${calculatedSaju.shinsal.월덕귀인.present ? '있음 - ' + calculatedSaju.shinsal.월덕귀인.description : '없음'}
- 문창귀인: ${calculatedSaju.shinsal.문창귀인.present ? '있음 (' + calculatedSaju.shinsal.문창귀인.branches.join(', ') + ') - ' + calculatedSaju.shinsal.문창귀인.description : '없음'}
- 태극귀인: ${calculatedSaju.shinsal.태극귀인.present ? '있음 (' + calculatedSaju.shinsal.태극귀인.branches.join(', ') + ') - ' + calculatedSaju.shinsal.태극귀인.description : '없음'}
- 학당귀인: ${calculatedSaju.shinsal.학당귀인.present ? '있음 (' + calculatedSaju.shinsal.학당귀인.branches.join(', ') + ') - ' + calculatedSaju.shinsal.학당귀인.description : '없음'}
- 천주귀인: ${calculatedSaju.shinsal.천주귀인.present ? '있음 (' + calculatedSaju.shinsal.천주귀인.branches.join(', ') + ') - ' + calculatedSaju.shinsal.천주귀인.description : '없음'}
- 재고귀인: ${calculatedSaju.shinsal.재고귀인.present ? '있음 (' + calculatedSaju.shinsal.재고귀인.branches.join(', ') + ') - ' + calculatedSaju.shinsal.재고귀인.description : '없음'}
- 금여귀인: ${calculatedSaju.shinsal.금여귀인.present ? '있음 (' + calculatedSaju.shinsal.금여귀인.branches.join(', ') + ') - ' + calculatedSaju.shinsal.금여귀인.description : '없음'}
- 문곡귀인: ${calculatedSaju.shinsal.문곡귀인.present ? '있음 (' + calculatedSaju.shinsal.문곡귀인.branches.join(', ') + ') - ' + calculatedSaju.shinsal.문곡귀인.description : '없음'}
- 겁살: ${calculatedSaju.shinsal.겁살.present ? '있음 (' + calculatedSaju.shinsal.겁살.branches.join(', ') + ') - ' + calculatedSaju.shinsal.겁살.description : '없음'}
- 망신살: ${calculatedSaju.shinsal.망신살.present ? '있음 (' + calculatedSaju.shinsal.망신살.branches.join(', ') + ') - ' + calculatedSaju.shinsal.망신살.description : '없음'}
- 양인살: ${calculatedSaju.shinsal.양인살.present ? '있음 (' + calculatedSaju.shinsal.양인살.branches.join(', ') + ') - ' + calculatedSaju.shinsal.양인살.description : '없음'}
- 원진살: ${calculatedSaju.shinsal.원진살.present ? '있음 (' + calculatedSaju.shinsal.원진살.branches.join(', ') + ') - ' + calculatedSaju.shinsal.원진살.description : '없음'}
- 괴강살: ${calculatedSaju.shinsal.괴강살.present ? '있음 (' + calculatedSaju.shinsal.괴강살.branches.join(', ') + ') - ' + calculatedSaju.shinsal.괴강살.description : '없음'}
- 백호살: ${calculatedSaju.shinsal.백호살.present ? '있음 (' + calculatedSaju.shinsal.백호살.branches.join(', ') + ') - ' + calculatedSaju.shinsal.백호살.description : '없음'}
- 재살: ${calculatedSaju.shinsal.재살.present ? '있음 (' + calculatedSaju.shinsal.재살.branches.join(', ') + ') - ' + calculatedSaju.shinsal.재살.description : '없음'}
- 천살: ${calculatedSaju.shinsal.천살.present ? '있음 (' + calculatedSaju.shinsal.천살.branches.join(', ') + ') - ' + calculatedSaju.shinsal.천살.description : '없음'}
- 지살: ${calculatedSaju.shinsal.지살.present ? '있음 (' + calculatedSaju.shinsal.지살.branches.join(', ') + ') - ' + calculatedSaju.shinsal.지살.description : '없음'}
- 연살: ${calculatedSaju.shinsal.연살.present ? '있음 (' + calculatedSaju.shinsal.연살.branches.join(', ') + ') - ' + calculatedSaju.shinsal.연살.description : '없음'}
- 월살: ${calculatedSaju.shinsal.월살.present ? '있음 (' + calculatedSaju.shinsal.월살.branches.join(', ') + ') - ' + calculatedSaju.shinsal.월살.description : '없음'}
- 장성살: ${calculatedSaju.shinsal.장성살.present ? '있음 (' + calculatedSaju.shinsal.장성살.branches.join(', ') + ') - ' + calculatedSaju.shinsal.장성살.description : '없음'}
- 반안살: ${calculatedSaju.shinsal.반안살.present ? '있음 (' + calculatedSaju.shinsal.반안살.branches.join(', ') + ') - ' + calculatedSaju.shinsal.반안살.description : '없음'}
- 육해살: ${calculatedSaju.shinsal.육해살.present ? '있음 (' + calculatedSaju.shinsal.육해살.branches.join(', ') + ') - ' + calculatedSaju.shinsal.육해살.description : '없음'}

아래 정확하게 계산된 사주를 해석해주세요. 음양 분석에서는 "${yinYangBalance}" 이 점을 반드시 고려하세요. 십성, 12운성, 지장간, 신살 정보를 반드시 분석에 활용하세요.`;
  } else {
    userPrompt += `

**사주 표기 규칙**
- 반드시 한자 + 한글 병기: 예) 년주: 갑자(甲子)
- 로마자 표기는 사용하지 마세요.
- 사주 정보는 항상 정확하게 계산하세요.`;
  }

  userPrompt += `

**요약 카드 (정확히 아래 형식 준수)**
- 한줄요약: ...
- 키워드: ..., ..., ...
- 행운색: ...
- 행운숫자: ...
- 행운방향: ...
- 추천행동: ...
- 추천음악: ...

**본 분석**
1. **사주 기둥의 핵심 하이라이트**: 사주 기둥(년주·월주·일주·시주)를 한자+한글로 정확하게 표기하고, 각 기둥의 특징을 짚어주세요.
2. **오행(목·화·토·금·수) 분석**: 강약, 균형, 보완 요소를 자세히 설명하고, 반드시 "목 N개, 화 N개, 토 N개, 금 N개, 수 N개" 형태로 정리한 후 바로 설명하세요.
3. **☯ 음양(陰陽) 분석**
핵심: 음양 균형이 운명의 흐름에 미치는 영향
${calculatedSaju && calculatedSaju.yinYang ? `
- 양(${calculatedSaju.yinYang.yang}개): 외향성, 활동성, 적극성, 남성성
- 음(${calculatedSaju.yinYang.yin}개): 내향성, 수용성, 소극성, 여성성` : ''}
- 음양 비율에 따른 건강, 대인관계, 직업 적성을 구체적으로 설명하세요.
- 각 천간·지지의 음양 속성을 명시하세요.
- 음양의 균형/불균형이 성격, 건강, 대인관계에 미치는 영향을 최소 12문장 이상으로 자세히 풀어주세요.
4. **🔥 살(煞) 분석**
위 신살 분석 데이터를 기반으로, 이 사주에 존재하는 각 살에 대해:
- 각 살의 이름을 **### 소제목**으로 작성
- 살의 의미와 유래를 3~4문장으로 설명
- 이 사주에서 해당 살이 어떤 영향을 미치는지 5문장 이상으로 상세 분석
- 실생활 대처법과 활용법을 3문장으로 제시
- 살이 없는 경우도 "없음"으로 간단히 언급하고 그 의미를 설명
전체 섹션을 최소 20문장, 800자 이상으로 풍부하게 작성하세요.

5. **⭐ 귀인(貴人) 분석**
위 신살 분석 데이터를 기반으로, 이 사주에 존재하는 각 귀인에 대해:
- 각 귀인의 이름을 **### 소제목**으로 작성
- 귀인의 의미와 유래를 3~4문장으로 설명
- 이 사주에서 해당 귀인이 가져다주는 복과 영향을 5문장 이상으로 상세 분석
- 귀인의 에너지를 활용하는 구체적 방법을 3문장으로 제시
- 귀인이 없는 경우도 "없음"으로 간단히 언급하고 대안을 설명
전체 섹션을 최소 20문장, 800자 이상으로 풍부하게 작성하세요.
6. **대운(大運) 분석**: 현재 대운 시기(${daeunYears})와 향후 주요 대운 전환기를 명시하고, 각 시기별 운세 흐름과 주의사항을 자세히 알려주세요.
7. **성격과 재능**: 일간(${calculatedSaju ? calculatedSaju.dayStem : ''})의 오행 특성, 십성 배치, 12운성이 나타내는 성격과 재능을 반드시 15~20문장, 500자 이상으로 자세히 분석해주세요. 장점과 단점 모두 포함하세요.
8. **관계/대인관계**: 십성 관계에서 드러나는 대인관계 패턴, 어울리는 사람의 오행 특성, 연애/결혼/우정 각각의 특징을 반드시 15~20문장, 500자 이상으로 상세히 설명하세요.
9. **직업/재물운**: 적성 분야(오행/십성 기반), 재물 유형(정재/편재), 투자 성향, 시기에 맞는 재무 전략을 반드시 15~20문장, 500자 이상으로 제공하세요.
10. **건강운**: 오행의 과불급에 따른 취약 장기, 체질 특성, 계절별/나이별 건강 관리법을 반드시 15~20문장, 500자 이상으로 상세히 제공하세요.
11. **시기별 운세 흐름**: 올해, 내년, 향후 5년의 운세 흐름과 주요 전환점을 반드시 15~20문장, 500자 이상으로 자세히 알려주세요.
12. **마무리 조언 및 한 줄 메시지**: 전체 사주를 종합한 핵심 조언과 따뜻한 격려 메시지를 10~15문장, 300자 이상으로 남겨주세요.

**운세 카드 (정확히 아래 형식 준수)**
- 건강운: ... (첫 줄에 요약 작성)
  이어지는 줄에서 상세한 내용으로 작성하세요. "원인:", "상세 해석:", "추천 행동:" 등으로 소제목을 정리하고, 줄바꿈으로 구분해 주세요. 속담이나 비유도 추가하세요.
- 연애운: ...
  이어지는 줄에서 상세한 내용으로 작성하세요.
- 재물운: ...
  이어지는 줄에서 상세한 내용으로 작성하세요.
- 직업운: ...
  이어지는 줄에서 상세한 내용으로 작성하세요.
- 성장운: ...
  이어지는 줄에서 상세한 내용으로 작성하세요.

**작성 팁**
- 각 섹션 안에 "핵심 하이라이트" 속담 1~2개를 넣어주세요.
- 은유적이고 컬러풀한 표현(예: 봄바람의 기운, 청명한 여명)을 사용해주세요.
- 운세 카드는 각각 독립적 분석이며, 각 항목 최소 6줄 이상, 250자 이상으로 상세 작성하고 추천 팁 1~2개를 마지막 앞에 삽입하세요.

마지막으로 반드시 아래 정보를 추가하세요.
### 오행: [목/화/토/금/수]`;

  if (question) {
    userPrompt += `\n\n---\n**사용자의 추가 질문**: "${question}"\n\n위 질문도 함께 반영하며 전체적으로 답변해주세요.`;
  }

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

function getSearchPrompt(query) {
  const systemPrompt = `당신은 사주명리학(四柱命理學) 전문 용어 사전입니다.
- 사용자가 물어보는 사주 관련 용어, 개념, 살(煞), 귀인(貴人), 십성(十神), 12운성, 오행, 천간, 지지 등을 쉽고 정확하게 설명합니다.
- 답변은 한국어로만 작성하고, 마크다운 문법을 사용합니다.
- 핵심 키워드는 **볼드** 처리합니다.
- 답변 길이: 200~400자 (간결하지만 충분히 이해 가능하게).
- 전문 용어 설명 시 한자 병기 (예: 도화살(桃花煞))
- 비유나 예시를 1~2개 포함하세요.
- 사주와 무관한 질문에는 "사주 관련 용어나 궁금한 점을 물어보세요!" 라고 안내하세요.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query }
  ];
}

function getCompatPrompt(person1, person2, question) {
  const systemPrompt = `당신은 사주 기반 궁합 분석 전문 역학가입니다. 정확하고 풍부한 분석을 한국어로 제공하세요.
- 분석은 한국어로만 작성합니다. 영어 표현은 절대 쓰지 마세요.
- 마크다운 문법을 사용하되 표는 사용하지 마세요.
- 각 섹션 앞에 이모티콘을 넣고, 핵심 키워드는 **볼드** 표시하세요.
- 각 섹션은 5~7문장으로 풍부하게 쓰고, 마지막에 1~2개의 속담이나 비유를 추가하세요.
- 은유적이고 문학적인 감성을 담은 표현을 사용해주세요.
- 따뜻하고 긍정적인 분석을 제공해주세요.`;

  let userPrompt = `아래 두 사람의 정보를 바탕으로 궁합 분석을 작성해주세요.

**첫 번째 사람**
- 생년월일: ${person1.year}년 ${person1.month}월 ${person1.day}일 (시간: ${person1.time || '미입력'})

**두 번째 사람**
- 생년월일: ${person2.year}년 ${person2.month}월 ${person2.day}일 (시간: ${person2.time || '미입력'})

**작성 순서**
1. **오행 궁합**: 두 사람의 오행이 어떻게 조화/충돌하는지 분석해주세요.
2. **성격 합과 생활 궁합**: 잘 맞는 부분과 다른 부분을 설명해주세요.
3. **좋은 포인트**: 두 사람의 시너지를 분석해주세요.
4. **주의 포인트와 해결법**: 추천 방법을 알려주세요.
5. **궁합 점수**: 100점 만점 점수 + 등급(A/B/C) + 한 줄 코멘트를 제공해주세요.

**작성 팁**
- 각 섹션 안에 "핵심 하이라이트" 속담 1~2개를 넣어주세요.
- 은유적이고 컬러풀한 표현을 사용해주세요.`;

  if (question) {
    userPrompt += `\n\n---\n**사용자의 추가 질문**: "${question}"\n\n위 질문도 함께 반영하며 전체적으로 답변해주세요.`;
  }

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

function getTomorrowFortunePrompt(sajuData) {
  const systemPrompt = `당신은 사주 기반 일운(日運) 분석 전문가입니다. 내일의 운세를 보고서 형식으로 매우 상세하고 실용적으로 한국어로 제공하세요. 각 섹션은 최소 10문장 이상으로 깊이있게 작성하세요.`;

  const calculatedSaju = calculateAccurateSaju(sajuData);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}년 ${tomorrow.getMonth()+1}월 ${tomorrow.getDate()}일`;

  const userPrompt = `${tomorrowStr} 내일의 운세를 다음 형식으로 작성해주세요:

**🔮 내일의 전체 운세**
- 내일의 기운과 흐름을 10~12문장으로 설명하고, 실천 가능한 조언을 추가하세요.

**💖 연애운**
- 10~15문장으로 내일의 연애운을 상세히 설명하고, 구체적인 행동 팁 2~3가지를 제공하세요.

**💰 재물운**
- 10~15문장으로 내일의 재물운을 설명하고, 금전 관리 팁과 주의사항을 알려주세요.

**💼 직업/업무운**
- 10~15문장으로 내일의 업무운을 분석하고, 효율적인 업무 처리 방법을 제시하세요.

**🏥 건강운**
- 10~15문장으로 건강 상태를 체크하고, 주의해야 할 신체 부위와 관리법을 알려주세요.

**🎯 추천 행동**
- 시간대별 길한 시간
- 추천 색상
- 추천 방향
- 피해야 할 것

각 섹션마다 속담이나 격언 1개씩 포함하고, 따뜻하고 희망적인 톤으로 작성해주세요.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

function getTraditionalSajuPrompt(sajuData) {
  const systemPrompt = `당신은 정통 명리학 전문가입니다. 고전 명리학 이론에 근거한 깊이있는 사주 분석을 한국어로 제공하세요.`;

  const calculatedSaju = calculateAccurateSaju(sajuData);

  const userPrompt = `정통 명리학에 기반한 상세한 사주 분석을 다음 형식으로 작성해주세요:

**📜 사주 기본 정보**
- 사주팔자를 한자+한글로 정확히 표기
- 대운, 세운, 월운 정보
- 십신 구성 및 배치

**🔥 격국(格局) 분석**
- 사주의 격국을 판정하고 (정격/변격)
- 격국의 특징과 의미를 8~10문장으로 상세 설명
- 격국에 따른 인생 방향성 제시

**⭐ 용신(用神) 분석**
- 용신, 희신, 기신, 구신을 명확히 제시
- 각각의 역할과 영향을 7~9문장으로 설명
- 용신을 활용한 개운 방법 제공

**🌟 십성(十星) 상세 분석**
- 비견, 겁재, 식신, 상관, 편재, 정재, 편관, 정관, 편인, 정인의 배치와 강약
- 각 십성이 인생에 미치는 영향을 상세히 설명 (8~10문장)

**🎭 신살(神煞) 분석**
- 길신: 천을귀인, 천덕귀인, 월덕귀인, 문창귀인 등
- 흉살: 도화살, 역마살, 백호살, 과숙살, 현침살 등
- 각 신살의 작용과 대처법을 7~9문장으로 설명

**🔮 대운(大運) 흐름**
- 현재 대운과 이전/이후 대운 분석
- 각 대운 시기별 특징과 주의사항 (10~12문장)
- 대운 전환기의 중요성과 준비 방법

**💎 천간지지 상생상극**
- 천간 합충형해 분석
- 지지 합충형해파 분석
- 상생상극이 미치는 실질적 영향 (7~9문장)

**🎯 개운 방법**
- 방위, 색상, 숫자, 직업, 인간관계 등
- 구체적이고 실천 가능한 방법 제시 (8~10문장)

각 섹션마다 고전 명리학 원전의 격언이나 문구를 인용하고, 학술적이면서도 이해하기 쉽게 설명해주세요.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

function getLoveFortunePrompt(sajuData) {
  const systemPrompt = `당신은 사주 기반 연애운 분석 전문가입니다. 애정운과 인연운을 보고서 형식으로 매우 깊이있게 분석하여 한국어로 제공하세요. 각 섹션은 최소 10문장 이상으로 작성하세요.`;

  const calculatedSaju = calculateAccurateSaju(sajuData);
  const genderLabel = sajuData.gender === 'female' ? '여자' : '남자';

  const userPrompt = `연애운과 애정운을 다음 형식으로 상세히 작성해주세요:

**💖 전체 연애운 개요**
- 사주에 나타난 연애 성향과 패턴을 10~12문장으로 분석
- ${genderLabel}로서의 매력 포인트와 연애 스타일

**👥 이상형 분석**
- 어울리는 상대의 사주적 특징 (천간, 지지, 오행)
- 좋은 인연의 시기와 만남의 장소
- 피해야 할 상대의 특징
(각 항목 10~15문장)

**💑 연애 패턴 및 주의사항**
- 연애할 때 나타나는 습관과 패턴
- 연애에서 겪을 수 있는 어려움
- 극복 방법과 개선점
(10~15문장)

**💍 결혼운**
- 결혼 적령기와 좋은 시기
- 배우자의 특징과 만남의 인연
- 결혼 후 생활 패턴
(10~15문장)

**🌹 월별/시기별 연애운**
- 올해 남은 기간의 연애운 흐름
- 좋은 달과 조심해야 할 달
- 각 시기별 연애 전략
(10~15문장)

**💝 연애 개운 방법**
- 연애운을 높이는 색상, 장소, 패션
- 데이트 추천 장소와 시간대
- 고백/프러포즈 좋은 시기
(10~12문장)

각 섹션마다 사랑과 인연에 관한 속담이나 명언을 포함하고, 희망적이고 따뜻한 톤으로 작성해주세요.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

function getHealthFortunePrompt(sajuData) {
  const systemPrompt = `당신은 사주 기반 건강운 분석 전문가입니다. 건강 관련 사주 분석을 보고서 형식으로 매우 상세하게 한국어로 제공하세요. 각 섹션은 최소 10문장 이상으로 작성하세요.`;

  const calculatedSaju = calculateAccurateSaju(sajuData);

  const userPrompt = `건강운을 다음 형식으로 상세히 작성해주세요:

**🏥 전체 건강운 개요**
- 사주의 오행 균형으로 본 체질과 건강 특성
- 선천적인 강점과 약점
(10~15문장)

**🫀 취약 장기 및 주의사항**
- 오행별 대응 장기 분석 (목-간담, 화-심장, 토-비위, 금-폐대장, 수-신장방광)
- 특히 주의해야 할 장기와 질환
- 계절별, 시기별 건강 주의점
(10~15문장)

**💊 체질 맞춤 건강 관리법**
- 체질에 맞는 음식과 피해야 할 음식
- 적합한 운동과 생활 습관
- 수면, 스트레스 관리 방법
(10~15문장)

**🌿 사주로 보는 질병 예방**
- 대운, 세운별 건강 취약 시기
- 예방을 위한 정기 검진 항목
- 건강 관리 타이밍
(10~15문장)

**🧘 정신 건강 및 스트레스**
- 사주에 나타난 스트레스 패턴
- 심리적 안정을 위한 방법
- 명상, 휴식의 적기
(10~12문장)

**⚕️ 연령대별 건강 로드맵**
- 현재부터 노년까지 건강 흐름
- 각 시기별 주의사항과 관리 포인트
- 장수 비결과 건강한 노후 준비
(10~15문장)

각 섹션마다 건강에 관한 속담이나 한의학 격언을 포함하고, 예방과 관리에 중점을 둔 실용적인 조언을 제공해주세요.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

function getWealthFortunePrompt(sajuData) {
  const systemPrompt = `당신은 사주 기반 재물운 분석 전문가입니다. 재물운과 재테크 조언을 보고서 형식으로 매우 상세하게 한국어로 제공하세요. 각 섹션은 최소 10문장 이상으로 작성하세요.`;

  const calculatedSaju = calculateAccurateSaju(sajuData);

  const userPrompt = `재물운을 다음 형식으로 상세히 작성해주세요:

**💰 전체 재물운 개요**
- 사주의 재성(정재, 편재) 분석
- 돈을 버는 방식과 재물 축적 패턴
- 재물운의 강약과 특징
(10~15문장)

**📈 수입원 및 재물 획득 방법**
- 주수입원(월급, 사업, 투자 등) 적성 분석
- 부수입 창출 가능성
- 재물이 들어오는 경로와 시기
- 대박운 여부와 타이밍
(10~15문장)

**💎 재테크 성향 및 전략**
- 투자 성향 (안정형/공격형/균형형)
- 적합한 투자 방법 (부동산, 주식, 저축 등)
- 투자 성공 확률이 높은 분야
- 투자 주의 시기
(10~15문장)

**🏦 재물 관리 및 저축**
- 돈 관리 습관과 소비 패턴
- 저축 성공 전략
- 낭비 주의 포인트
- 재물 축적 방법
(10~15문장)

**📊 시기별 재물운 흐름**
- 대운별 재물운 변화
- 올해 및 향후 3년간 재물운
- 재물운이 좋은 시기와 투자 적기
- 재물운이 약한 시기와 대처법
(10~15문장)

**🎯 재물 증대 개운법**
- 재물운을 높이는 방위, 색상, 숫자
- 돈을 부르는 습관과 행동
- 재물신을 모시는 방법
- 기부와 나눔의 효과
(10~15문장)

**⚠️ 재물 손실 주의사항**
- 돈이 새는 구멍과 원인
- 사기, 손실 주의 시기
- 보증, 투자 실패 방지법
- 재물 트러블 예방책
(10~12문장)

각 섹션마다 돈과 재물에 관한 속담이나 격언을 포함하고, 현실적이고 실천 가능한 조언을 제공해주세요.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

async function handleApiRequest(request, env) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const OPENAI_API_KEY = env.OPENAI_API_KEY;

    // Validate URL param lengths
    const paramError = validateUrlParams(url);
    if (paramError) {
      return apiResponse({ error: { message: paramError } }, 400);
    }

    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set.');
      return apiResponse({ error: { message: 'Internal server error.' } }, 500);
    }

    let messages;
    if (type === 'saju') {
      let sajuData;
      try {
        sajuData = JSON.parse(url.searchParams.get('sajuData'));
      } catch (_e) {
        return apiResponse({ error: { message: 'Invalid sajuData JSON.' } }, 400);
      }

      const dateError = validateDateFields(sajuData, 'sajuData');
      if (dateError) {
        return apiResponse({ error: { message: dateError } }, 400);
      }

      const question = sanitizeQuestion(url.searchParams.get('question'));
      messages = getSajuPrompt(sajuData, question);

      // Calculate saju data for structured response
      const calculatedSaju = calculateAccurateSaju(sajuData);

      // Call OpenAI and extract content
      const aiResult = await callOpenAi(OPENAI_API_KEY, messages);
      const aiJson = await aiResult.json();
      const content = aiJson.choices?.[0]?.message?.content || '';

      return apiResponse({
        content: content,
        calculatedSaju: calculatedSaju
      }, 200);

    } else if (type === 'compat') {
      let person1, person2;
      try {
        person1 = JSON.parse(url.searchParams.get('person1'));
      } catch (_e) {
        return apiResponse({ error: { message: 'Invalid person1 JSON.' } }, 400);
      }
      try {
        person2 = JSON.parse(url.searchParams.get('person2'));
      } catch (_e) {
        return apiResponse({ error: { message: 'Invalid person2 JSON.' } }, 400);
      }

      const p1Error = validateDateFields(person1, 'person1');
      if (p1Error) {
        return apiResponse({ error: { message: p1Error } }, 400);
      }
      const p2Error = validateDateFields(person2, 'person2');
      if (p2Error) {
        return apiResponse({ error: { message: p2Error } }, 400);
      }

      const question = sanitizeQuestion(url.searchParams.get('question'));
      messages = getCompatPrompt(person1, person2, question);

    } else if (type === 'tomorrow') {
      let sajuData;
      try {
        sajuData = JSON.parse(url.searchParams.get('sajuData'));
      } catch (_e) {
        return apiResponse({ error: { message: 'Invalid sajuData JSON.' } }, 400);
      }
      const dateError = validateDateFields(sajuData, 'sajuData');
      if (dateError) {
        return apiResponse({ error: { message: dateError } }, 400);
      }
      messages = getTomorrowFortunePrompt(sajuData);

    } else if (type === 'traditional') {
      let sajuData;
      try {
        sajuData = JSON.parse(url.searchParams.get('sajuData'));
      } catch (_e) {
        return apiResponse({ error: { message: 'Invalid sajuData JSON.' } }, 400);
      }
      const dateError = validateDateFields(sajuData, 'sajuData');
      if (dateError) {
        return apiResponse({ error: { message: dateError } }, 400);
      }
      messages = getTraditionalSajuPrompt(sajuData);

    } else if (type === 'love') {
      let sajuData;
      try {
        sajuData = JSON.parse(url.searchParams.get('sajuData'));
      } catch (_e) {
        return apiResponse({ error: { message: 'Invalid sajuData JSON.' } }, 400);
      }
      const dateError = validateDateFields(sajuData, 'sajuData');
      if (dateError) {
        return apiResponse({ error: { message: dateError } }, 400);
      }
      messages = getLoveFortunePrompt(sajuData);

    } else if (type === 'health') {
      let sajuData;
      try {
        sajuData = JSON.parse(url.searchParams.get('sajuData'));
      } catch (_e) {
        return apiResponse({ error: { message: 'Invalid sajuData JSON.' } }, 400);
      }
      const dateError = validateDateFields(sajuData, 'sajuData');
      if (dateError) {
        return apiResponse({ error: { message: dateError } }, 400);
      }
      messages = getHealthFortunePrompt(sajuData);

    } else if (type === 'wealth') {
      let sajuData;
      try {
        sajuData = JSON.parse(url.searchParams.get('sajuData'));
      } catch (_e) {
        return apiResponse({ error: { message: 'Invalid sajuData JSON.' } }, 400);
      }
      const dateError = validateDateFields(sajuData, 'sajuData');
      if (dateError) {
        return apiResponse({ error: { message: dateError } }, 400);
      }
      messages = getWealthFortunePrompt(sajuData);

    } else if (type === 'search') {
      const query = sanitizeQuestion(url.searchParams.get('query'));
      if (!query || query.trim().length < 2) {
        return apiResponse({ error: { message: '검색어를 2자 이상 입력해주세요.' } }, 400);
      }
      messages = getSearchPrompt(query.trim());

    } else {
      return apiResponse({ error: { message: 'Invalid request type.' } }, 400);
    }

    return callOpenAi(OPENAI_API_KEY, messages);

  } catch (error) {
    console.error('Worker function error:', error);
    return apiResponse({ error: { message: 'An internal server error occurred.' } }, 500);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      // Rate limiting for API routes
      const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
      if (!checkRateLimit(clientIp)) {
        return apiResponse({ error: { message: 'Too many requests. Please try again later.' } }, 429);
      }

      if (url.pathname === '/api/saju') {
        return handleApiRequest(request, env);
      }
      if (url.pathname === '/api/youtube') {
        return handleYouTubeRequest(request, env);
      }
      return apiResponse({ error: { message: 'Not Found' } }, 404);
    }

    // Static assets - add security headers including CSP
    const assetResponse = await env.ASSETS.fetch(request);
    return addSecurityHeaders(assetResponse, true);
  },
};
