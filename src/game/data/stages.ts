/**
 * 스테이지 정의 — 챕터/스테이지 단위 진행
 *
 * 무한 웨이브와 별개의 메인 진행 트랙. 클리어형 + 재도전 가능.
 * 스테이지마다 waveLimit + bossId + 첫 클리어 보상 + 모집 잠금 해제.
 *
 * 1차 작업 범위 (이번 단계):
 *   - 데이터/타입만 추가/확장. GameEngine 동작 변경 0.
 *   - 마력핵/에너지/입장 제한 재화 절대 도입 X.
 *   - 스테이지는 계속 도전 가능 (입장 제한 없음).
 *   - 스테이지 클리어 시 모집 가능 목록이 열리는 구조 (firstClearReward.unlockRecruitIds).
 */

export type StageId = string;
export type ChapterId = string;

/** 스테이지 보상 모디파이어 — 추후 챕터/스테이지별 난이도 미세 조정용 (미사용 시 무시) */
export interface StageModifier {
  /** hero HP 곱셈 */
  heroHpMul?: number;
  /** hero 공격력 곱셈 */
  heroAtkMul?: number;
  /** hero 이동/공속 곱셈 */
  heroSpdMul?: number;
  /** 마력 자연 회복 곱셈 */
  mpRegenMul?: number;
  /** 마왕성 시작 HP 곱셈 */
  castleHpMul?: number;
  /** 영혼석 보상 곱셈 */
  rewardMul?: number;
}

/** 잠금 해제 조건 — 모두 OR 결합 (하나라도 만족하면 잠금 해제) */
export interface StageUnlockCondition {
  /** 직전 스테이지 ID 클리어 — 가장 일반적 */
  clearedStageId?: StageId;
  /** 무한 모드 bestWave 기준 (기존 v5 유저 진행도 인정) */
  bestWaveAtLeast?: number;
  /** 누적 보스 처치 (마왕 강화 조건과 연동) */
  totalBossKillsAtLeast?: number;
}

/** 첫 클리어 시 1회 지급되는 보상 */
export interface StageFirstClearReward {
  /** 영혼석 보너스 */
  soulstones?: number;
  /** 모집 잠금 해제할 monsterId 목록 — 모집소에 카드로 추가됨 */
  unlockRecruitIds?: string[];
  /** 기능/메뉴 잠금 해제 (예: 'endless', 'challenges') */
  unlockFeatureIds?: string[];
}

/** 반복 클리어 시 매번 지급되는 보상 */
export interface StageRepeatReward {
  /** 영혼석 보너스 (반복 클리어용 — 첫 클리어보다 작게 권장) */
  soulstones?: number;
  /** heroId → 도감 조각 수량 */
  heroFragments?: Record<string, number>;
}

/** 스테이지 정의 (메인 타입) */
export interface StageDefinition {
  id: StageId;
  chapterId: ChapterId;
  /** 챕터 내 순서 (1~N) */
  index: number;
  /** 표시명 */
  name: string;
  /** 한 줄 부제 */
  subtitle: string;
  /** 진입 시 마왕 대사 / 상황 묘사 */
  description: string;

  /** 클리어에 필요한 마지막 wave 번호 (5/10/15...) — 보스 wave와 동일하면 보스 처치 = 클리어 */
  waveLimit: number;
  /** 이 스테이지에서 등장할 hero typeId 풀 (heroes.ts 기준) — 빈 배열이면 기본 풀 */
  heroPool: string[];
  /** 스테이지 보스 typeId — bosses.ts의 키. 미지정 시 보스 wave 없음 (예외적) */
  bossId?: string;
  /** strata.ts의 stratum id — 배경/BGM 매핑용 */
  stratumId?: string;

  /** 추천 태그 (UI 힌트용) */
  recommendedTags?: string[];
  /** 스테이지 난이도 미세 조정 (선택) */
  stageModifier?: StageModifier;

  /** 잠금 해제 조건. 미지정 시 처음부터 열림. */
  unlockCondition?: StageUnlockCondition;

  /** 첫 클리어 보상 (1회) */
  firstClearReward: StageFirstClearReward;
  /** 반복 클리어 보상 (매번) */
  repeatReward: StageRepeatReward;

  /** UI 첫 진입 학습 힌트 */
  tutorialHint?: string;
  /** 작전 지도 표시용 아이콘 */
  icon?: string;
}

/** 호환 — 기존 코드의 StageDef는 새 StageDefinition의 alias */
export type StageDef = StageDefinition;

/* =====================================================================
 *  Chapter 1 — 봉인의 입구 (5스테이지)
 * ===================================================================== */
export const STAGES: StageDefinition[] = [
  {
    id: 'ch1_s1', chapterId: 'ch1', index: 1,
    name: '첫 침입',
    subtitle: '천 년 만의 침입자',
    description: '인간 정찰병들이 봉인을 깨려 한다.',
    waveLimit: 5,
    heroPool: ['apprentice', 'swordsman', 'spear'],
    bossId: 'captain',
    stratumId: 'sealed_gate',
    recommendedTags: ['undead'],
    unlockCondition: undefined,  // 처음부터 열림
    firstClearReward: {
      // 첫 클리어 보상 — imp 모집 비용(100)보다 큼 → 100 잔여로 다음 진행 가능 (온보딩)
      soulstones: 200,
      unlockRecruitIds: ['imp'],
    },
    repeatReward: {
      soulstones: 30,
    },
    tutorialHint: '5웨이브 안에 보스 기사단장을 처치하라.',
    icon: '⚔',
  },
  {
    id: 'ch1_s2', chapterId: 'ch1', index: 2,
    name: '잊혀진 묘지',
    subtitle: '죽음 위에 죽음',
    description: '묘지 위에 적진이 형성됐다.',
    waveLimit: 10,
    heroPool: ['apprentice', 'swordsman', 'archer', 'spear', 'mage'],
    bossId: 'archmage',
    stratumId: 'forgotten_grave',
    recommendedTags: ['undead', 'zombie'],
    unlockCondition: { clearedStageId: 'ch1_s1', bestWaveAtLeast: 5 },
    firstClearReward: {
      soulstones: 200,
      unlockRecruitIds: ['witch'],
    },
    repeatReward: {
      soulstones: 60,
      heroFragments: { archer: 3 },
    },
    icon: '🪦',
  },
  {
    id: 'ch1_s3', chapterId: 'ch1', index: 3,
    name: '화염 전당',
    subtitle: '재로 돌아가리라',
    description: '화염 전당에서 대마법사가 진군해온다.',
    waveLimit: 15,
    heroPool: ['swordsman', 'archer', 'mage', 'rogue', 'spear'],
    bossId: 'saint',
    stratumId: 'flame_hall',
    recommendedTags: ['fire', 'magic'],
    unlockCondition: { clearedStageId: 'ch1_s2', bestWaveAtLeast: 10 },
    firstClearReward: {
      soulstones: 300,
      unlockRecruitIds: ['orc'],
    },
    repeatReward: {
      soulstones: 100,
      heroFragments: { mage: 3 },
    },
    icon: '🔥',
  },
  {
    id: 'ch1_s4', chapterId: 'ch1', index: 4,
    name: '광기의 미궁',
    subtitle: '운명이 길을 잃는다',
    description: '미궁의 균열이 열렸다.',
    waveLimit: 20,
    heroPool: ['swordsman', 'archer', 'mage', 'rogue', 'shield', 'spear'],
    bossId: 'king',
    stratumId: 'mad_labyrinth',
    recommendedTags: ['tank', 'dark'],
    unlockCondition: { clearedStageId: 'ch1_s3', bestWaveAtLeast: 15 },
    firstClearReward: {
      soulstones: 500,
      unlockRecruitIds: ['mimic'],
    },
    repeatReward: {
      soulstones: 150,
      heroFragments: { rogue: 4, shield: 2 },
    },
    icon: '🎲',
  },
  {
    id: 'ch1_s5', chapterId: 'ch1', index: 5,
    name: '신의 영역',
    subtitle: '챕터 1의 끝',
    description: '빛의 신관이 마지막 봉인을 깨려 한다.',
    waveLimit: 25,
    heroPool: ['swordsman', 'archer', 'mage', 'rogue', 'shield', 'healer', 'spear'],
    bossId: 'priest',
    stratumId: 'divine_realm',
    recommendedTags: ['dark', 'magic', 'undead'],
    unlockCondition: { clearedStageId: 'ch1_s4', bestWaveAtLeast: 20 },
    firstClearReward: {
      soulstones: 1000,
      unlockRecruitIds: ['mino', 'lich'],
      unlockFeatureIds: ['endless'],  // 심연 방어전 잠금 해제
    },
    repeatReward: {
      soulstones: 300,
      heroFragments: { healer: 5, priest: 3 },
    },
    tutorialHint: '챕터 1 종결 보스. 처치 시 심연 방어전 잠금 해제.',
    icon: '✨',
  },

  // ===== Chapter 2 — 영원의 겨울 + 심연 (강화 재대결) =====
  // 챕터 2는 보스 재대결 + stageModifier로 난이도 스케일링.
  // 새 보스 자산 없이 데이터만으로 차별화 — heroPool 추가 + hero/castle modifier.
  {
    id: 'ch2_s1', chapterId: 'ch2', index: 1,
    name: '얼어붙은 침공',
    subtitle: '추위가 살을 깎는다',
    description: '얼음 평원에서 새로운 군대가 진군한다.',
    waveLimit: 30,
    heroPool: ['swordsman', 'archer', 'mage', 'rogue', 'shield', 'spear'],
    bossId: 'captain',
    stratumId: 'eternal_winter',
    recommendedTags: ['undead', 'dark'],
    stageModifier: { heroHpMul: 1.30, heroAtkMul: 1.20, mpRegenMul: 0.85 },
    unlockCondition: { clearedStageId: 'ch1_s5', bestWaveAtLeast: 25 },
    firstClearReward: { soulstones: 1500, unlockRecruitIds: [] },
    repeatReward: { soulstones: 400, heroFragments: { swordsman: 3, archer: 2 } },
    tutorialHint: 'Chapter 2 시작 — 적이 강해졌다.',
    icon: '❄',
  },
  {
    id: 'ch2_s2', chapterId: 'ch2', index: 2,
    name: '심연의 도서관',
    subtitle: '책장 사이의 그림자',
    description: '심연의 도서관에서 대마법사 다시 나타난다.',
    waveLimit: 35,
    heroPool: ['swordsman', 'archer', 'mage', 'rogue', 'shield', 'spear', 'apprentice'],
    bossId: 'archmage',
    stratumId: 'abyss_court',
    recommendedTags: ['magic', 'fire'],
    stageModifier: { heroHpMul: 1.40, heroAtkMul: 1.25, castleHpMul: 1.10 },
    unlockCondition: { clearedStageId: 'ch2_s1' },
    firstClearReward: { soulstones: 1800 },
    repeatReward: { soulstones: 500, heroFragments: { mage: 4 } },
    icon: '📖',
  },
  {
    id: 'ch2_s3', chapterId: 'ch2', index: 3,
    name: '잊혀진 성당',
    subtitle: '빛의 잔재',
    description: '성녀의 흔적이 여전히 빛난다.',
    waveLimit: 40,
    heroPool: ['swordsman', 'archer', 'mage', 'rogue', 'shield', 'healer', 'spear'],
    bossId: 'saint',
    stratumId: 'divine_realm',
    recommendedTags: ['dark', 'undead'],
    stageModifier: { heroHpMul: 1.50, heroAtkMul: 1.30, mpRegenMul: 0.90, rewardMul: 1.20 },
    unlockCondition: { clearedStageId: 'ch2_s2' },
    firstClearReward: { soulstones: 2200 },
    repeatReward: { soulstones: 600, heroFragments: { healer: 5, shield: 2 } },
    icon: '⛪',
  },
  {
    id: 'ch2_s4', chapterId: 'ch2', index: 4,
    name: '왕의 그림자',
    subtitle: '두 번째 왕좌',
    description: '용사왕의 그림자가 다시 무대에 오른다.',
    waveLimit: 45,
    heroPool: ['swordsman', 'archer', 'mage', 'rogue', 'shield', 'healer', 'spear'],
    bossId: 'king',
    stratumId: 'mad_labyrinth',
    recommendedTags: ['tank', 'magic'],
    stageModifier: { heroHpMul: 1.60, heroAtkMul: 1.35, heroSpdMul: 1.10, castleHpMul: 1.20 },
    unlockCondition: { clearedStageId: 'ch2_s3' },
    firstClearReward: { soulstones: 2800 },
    repeatReward: { soulstones: 800, heroFragments: { rogue: 4, shield: 4 } },
    icon: '👑',
  },
  {
    id: 'ch2_s5', chapterId: 'ch2', index: 5,
    name: '신화의 종언',
    subtitle: '챕터 2의 끝',
    description: '빛의 신관이 모든 군세를 모아 마지막 침공을 시도한다.',
    waveLimit: 50,
    heroPool: ['swordsman', 'archer', 'mage', 'rogue', 'shield', 'healer', 'spear'],
    bossId: 'priest',
    stratumId: 'divine_realm',
    recommendedTags: ['dark', 'undead', 'magic'],
    stageModifier: { heroHpMul: 1.70, heroAtkMul: 1.40, mpRegenMul: 0.85, castleHpMul: 1.30, rewardMul: 1.50 },
    unlockCondition: { clearedStageId: 'ch2_s4' },
    firstClearReward: { soulstones: 5000, unlockFeatureIds: ['challenges'] },
    repeatReward: { soulstones: 1500, heroFragments: { priest: 5, healer: 3 } },
    tutorialHint: '챕터 2 종결 보스 — 도전 모드 잠금 해제.',
    icon: '🌌',
  },
  // ===== 챕터 3: 폭동의 변경 (P1-1) =====
  {
    id: 'ch3_s1', chapterId: 'ch3', index: 1,
    name: '변경의 봉화',
    subtitle: '챕터 3 시작',
    description: '용사들이 새로운 세대를 모집하여 변경 마을에서 진군한다.',
    waveLimit: 12,
    heroPool: ['apprentice', 'swordsman', 'spear', 'archer'],
    bossId: 'captain',
    stratumId: 'forgotten_grave',
    recommendedTags: ['undead', 'mob'],
    stageModifier: { heroHpMul: 1.85, heroAtkMul: 1.45, rewardMul: 1.25 },
    unlockCondition: { clearedStageId: 'ch2_s5' },
    firstClearReward: { soulstones: 600 },
    repeatReward: { soulstones: 200, heroFragments: { swordsman: 2 } },
    tutorialHint: '챕터 3 — 적의 평균 HP가 한 단계 올라간다.',
    icon: '🔥',
  },
  {
    id: 'ch3_s2', chapterId: 'ch3', index: 2,
    name: '봉우리의 매복',
    subtitle: '저격수 등장',
    description: '용사들이 산악 지형을 활용해 원거리 포격을 가한다.',
    waveLimit: 15,
    heroPool: ['archer', 'mage', 'spear', 'apprentice'],
    bossId: 'archmage',
    stratumId: 'flame_hall',
    recommendedTags: ['tank', 'fire'],
    stageModifier: { heroHpMul: 1.90, heroAtkMul: 1.55, rewardMul: 1.30 },
    unlockCondition: { clearedStageId: 'ch3_s1' },
    firstClearReward: { soulstones: 800, unlockRecruitIds: ['orcb'] },
    repeatReward: { soulstones: 250 },
    tutorialHint: '원거리 적 비중↑ — 탱커가 핵심.',
    icon: '🏹',
  },
  {
    id: 'ch3_s3', chapterId: 'ch3', index: 3,
    name: '협곡의 외침',
    subtitle: '광폭 미궁',
    description: '용사들이 광기에 빠져 마구잡이로 돌격해온다.',
    waveLimit: 20,
    heroPool: ['rogue', 'swordsman', 'spear', 'apprentice', 'shield'],
    bossId: 'captain',
    stratumId: 'mad_labyrinth',
    recommendedTags: ['aoe', 'magic'],
    stageModifier: { heroHpMul: 2.00, heroAtkMul: 1.65, mpRegenMul: 0.95, rewardMul: 1.35 },
    unlockCondition: { clearedStageId: 'ch3_s2' },
    firstClearReward: { soulstones: 1200, unlockRecruitIds: ['minok'] },
    repeatReward: { soulstones: 400, heroFragments: { rogue: 3 } },
    tutorialHint: '광역기 빌드 추천.',
    icon: '🌀',
  },
  {
    id: 'ch3_s4', chapterId: 'ch3', index: 4,
    name: '신성의 그림자',
    subtitle: '치유사의 압박',
    description: '신관 부대가 끊임없이 회복하며 진군한다.',
    waveLimit: 30,
    heroPool: ['healer', 'shield', 'mage', 'archer', 'swordsman'],
    bossId: 'saint',
    stratumId: 'divine_realm',
    recommendedTags: ['dark', 'fire', 'magic'],
    stageModifier: { heroHpMul: 2.10, heroAtkMul: 1.70, castleHpMul: 1.20, rewardMul: 1.40 },
    unlockCondition: { clearedStageId: 'ch3_s3' },
    firstClearReward: { soulstones: 2000, unlockRecruitIds: ['dlich'] },
    repeatReward: { soulstones: 600, heroFragments: { healer: 4, shield: 2 } },
    tutorialHint: '힐러 우선 처치 — 다크/마법 빌드 우세.',
    icon: '✨',
  },
  {
    id: 'ch3_s5', chapterId: 'ch3', index: 5,
    name: '왕의 분노',
    subtitle: '챕터 3 종결',
    description: '인간 왕 본인이 군세를 이끌고 마왕성 앞에 도착한다.',
    waveLimit: 50,
    heroPool: ['shield', 'swordsman', 'spear', 'archer', 'mage', 'healer', 'rogue'],
    bossId: 'king',
    stratumId: 'divine_realm',
    recommendedTags: ['dark', 'beast', 'fire'],
    stageModifier: { heroHpMul: 2.30, heroAtkMul: 1.85, castleHpMul: 1.40, rewardMul: 1.60 },
    unlockCondition: { clearedStageId: 'ch3_s4' },
    firstClearReward: { soulstones: 8000, unlockFeatureIds: ['endless'], unlockRecruitIds: ['gmimic'] },
    repeatReward: { soulstones: 2000, heroFragments: { king: 5 } },
    tutorialHint: '챕터 3 종결 — 무한 모드 추가 강화.',
    icon: '👑',
  },
  // ===== 챕터 4: 영원의 겨울 =====
  {
    id: 'ch4_s1', chapterId: 'ch4', index: 1,
    name: '얼어붙은 길',
    subtitle: '챕터 4 시작',
    description: '겨울 군단이 차가운 진군을 시작한다.',
    waveLimit: 15,
    heroPool: ['swordsman', 'archer', 'mage', 'shield'],
    bossId: 'archmage',
    stratumId: 'eternal_winter',
    recommendedTags: ['fire', 'magic'],
    stageModifier: { heroHpMul: 2.40, heroAtkMul: 1.90, mpRegenMul: 0.90, rewardMul: 1.50 },
    unlockCondition: { clearedStageId: 'ch3_s5' },
    firstClearReward: { soulstones: 1500 },
    repeatReward: { soulstones: 500, heroFragments: { mage: 3 } },
    tutorialHint: '얼음 면역이 없으니 화염 빌드 권장.',
    icon: '❄',
  },
  {
    id: 'ch4_s2', chapterId: 'ch4', index: 2,
    name: '서리의 사도',
    subtitle: '치유사의 빙벽',
    description: '얼음 신관이 군세를 보호하며 전진한다.',
    waveLimit: 25,
    heroPool: ['healer', 'shield', 'mage', 'swordsman', 'spear'],
    bossId: 'saint',
    stratumId: 'eternal_winter',
    recommendedTags: ['fire', 'dark'],
    stageModifier: { heroHpMul: 2.55, heroAtkMul: 2.00, castleHpMul: 1.30, rewardMul: 1.55 },
    unlockCondition: { clearedStageId: 'ch4_s1' },
    firstClearReward: { soulstones: 2500, unlockRecruitIds: ['awitch'] },
    repeatReward: { soulstones: 700 },
    tutorialHint: '치유 텔레그래프 직후 화력 집중.',
    icon: '🧊',
  },
  {
    id: 'ch4_s3', chapterId: 'ch4', index: 3,
    name: '얼음 왕좌',
    subtitle: '겨울 왕의 강림',
    description: '얼음 왕이 무적의 갑옷을 두르고 진군한다.',
    waveLimit: 35,
    heroPool: ['shield', 'swordsman', 'spear', 'archer', 'rogue', 'healer'],
    bossId: 'king',
    stratumId: 'eternal_winter',
    recommendedTags: ['fire', 'dark', 'magic'],
    stageModifier: { heroHpMul: 2.70, heroAtkMul: 2.15, castleHpMul: 1.50, rewardMul: 1.65 },
    unlockCondition: { clearedStageId: 'ch4_s2' },
    firstClearReward: { soulstones: 4500, unlockRecruitIds: ['owar'] },
    repeatReward: { soulstones: 1200, heroFragments: { king: 4 } },
    tutorialHint: '왕의 무적 페이즈 차단 — 페이즈 2 진입 금지.',
    icon: '🏔',
  },
  {
    id: 'ch4_s4', chapterId: 'ch4', index: 4,
    name: '겨울의 적막',
    subtitle: '폭풍 속 진군',
    description: '눈보라가 시야를 가린 채 군세가 들이친다.',
    waveLimit: 45,
    heroPool: ['swordsman', 'archer', 'mage', 'spear', 'rogue', 'shield', 'healer'],
    bossId: 'priest',
    stratumId: 'eternal_winter',
    recommendedTags: ['fire', 'undead'],
    stageModifier: { heroHpMul: 2.90, heroAtkMul: 2.30, mpRegenMul: 0.85, rewardMul: 1.70 },
    unlockCondition: { clearedStageId: 'ch4_s3' },
    firstClearReward: { soulstones: 6500 },
    repeatReward: { soulstones: 1600, heroFragments: { priest: 4, archer: 3 } },
    tutorialHint: '회복 빈도 ↑ — 다크/언데드 시너지 권장.',
    icon: '🌨',
  },
  {
    id: 'ch4_s5', chapterId: 'ch4', index: 5,
    name: '겨울의 종말',
    subtitle: '챕터 4 종결',
    description: '겨울 자체가 의식이 되어 마왕성을 덮친다.',
    waveLimit: 60,
    heroPool: ['swordsman', 'archer', 'mage', 'spear', 'rogue', 'shield', 'healer'],
    bossId: 'king',
    stratumId: 'eternal_winter',
    recommendedTags: ['fire', 'dark', 'magic'],
    stageModifier: { heroHpMul: 3.10, heroAtkMul: 2.45, castleHpMul: 1.60, rewardMul: 1.80 },
    unlockCondition: { clearedStageId: 'ch4_s4' },
    firstClearReward: { soulstones: 10000, unlockRecruitIds: ['ggen'] },
    repeatReward: { soulstones: 2500, heroFragments: { king: 6 } },
    tutorialHint: '챕터 4 종결 — 모든 화력 동원.',
    icon: '🌌',
  },
  // ===== 챕터 5: 심연의 법정 =====
  {
    id: 'ch5_s1', chapterId: 'ch5', index: 1,
    name: '법정의 부름',
    subtitle: '챕터 5 시작',
    description: '심연 법정이 마왕에게 마지막 심판을 내린다.',
    waveLimit: 20,
    heroPool: ['mage', 'priest', 'apprentice', 'archer'],
    bossId: 'priest',
    stratumId: 'abyss_court',
    recommendedTags: ['dark', 'magic'],
    stageModifier: { heroHpMul: 3.20, heroAtkMul: 2.55, castleHpMul: 1.50, rewardMul: 1.85 },
    unlockCondition: { clearedStageId: 'ch4_s5' },
    firstClearReward: { soulstones: 3000 },
    repeatReward: { soulstones: 800 },
    tutorialHint: '심연부터는 적·마왕성 동시 -10% 페널티.',
    icon: '⚖',
  },
  {
    id: 'ch5_s2', chapterId: 'ch5', index: 2,
    name: '심연의 사도',
    subtitle: '회복의 연쇄',
    description: '신관단이 끊임없는 회복 사슬로 군세를 보호한다.',
    waveLimit: 30,
    heroPool: ['healer', 'shield', 'mage', 'archer', 'swordsman', 'spear'],
    bossId: 'saint',
    stratumId: 'abyss_court',
    recommendedTags: ['dark', 'fire'],
    stageModifier: { heroHpMul: 3.40, heroAtkMul: 2.70, mpRegenMul: 0.90, rewardMul: 1.90 },
    unlockCondition: { clearedStageId: 'ch5_s1' },
    firstClearReward: { soulstones: 5000, unlockRecruitIds: ['slord'] },
    repeatReward: { soulstones: 1300 },
    tutorialHint: '힐러 다수 — 부활/즉시처치 빌드.',
    icon: '🩸',
  },
  {
    id: 'ch5_s3', chapterId: 'ch5', index: 3,
    name: '심연의 왕',
    subtitle: '심연 왕의 등극',
    description: '심연의 왕이 끝없는 군세와 함께 진군한다.',
    waveLimit: 45,
    heroPool: ['shield', 'swordsman', 'spear', 'archer', 'rogue', 'mage', 'healer'],
    bossId: 'king',
    stratumId: 'abyss_court',
    recommendedTags: ['dark', 'magic', 'fire'],
    stageModifier: { heroHpMul: 3.60, heroAtkMul: 2.90, castleHpMul: 1.65, rewardMul: 2.00 },
    unlockCondition: { clearedStageId: 'ch5_s2' },
    firstClearReward: { soulstones: 8000 },
    repeatReward: { soulstones: 2000, heroFragments: { king: 5 } },
    tutorialHint: '왕의 무적 페이즈 차단 + 마왕성 보호.',
    icon: '👁',
  },
  {
    id: 'ch5_s4', chapterId: 'ch5', index: 4,
    name: '운명의 재판',
    subtitle: '심판의 새벽',
    description: '운명의 재판관이 마왕의 죄를 심판하기 위해 강림한다.',
    waveLimit: 60,
    heroPool: ['swordsman', 'archer', 'mage', 'spear', 'rogue', 'shield', 'healer'],
    bossId: 'priest',
    stratumId: 'abyss_court',
    recommendedTags: ['dark', 'undead'],
    stageModifier: { heroHpMul: 3.85, heroAtkMul: 3.10, castleHpMul: 1.75, rewardMul: 2.10 },
    unlockCondition: { clearedStageId: 'ch5_s3' },
    firstClearReward: { soulstones: 12000 },
    repeatReward: { soulstones: 3000, heroFragments: { priest: 6, healer: 4 } },
    tutorialHint: '풀 다크 빌드 + 챌린지 별점 도전.',
    icon: '🌑',
  },
  {
    id: 'ch5_s5', chapterId: 'ch5', index: 5,
    name: '대종말',
    subtitle: '【최종 스테이지】',
    description: '용사단 전부가 마지막 침공을 위해 모인다. 마왕의 운명이 결정되는 순간.',
    waveLimit: 80,
    heroPool: ['swordsman', 'archer', 'mage', 'spear', 'rogue', 'shield', 'healer'],
    bossId: 'king',
    stratumId: 'abyss_court',
    recommendedTags: ['dark', 'fire', 'magic', 'undead'],
    stageModifier: { heroHpMul: 4.10, heroAtkMul: 3.30, castleHpMul: 1.85, rewardMul: 2.30 },
    unlockCondition: { clearedStageId: 'ch5_s4' },
    firstClearReward: { soulstones: 25000, unlockRecruitIds: ['kslime', 'gobw', 'dwitch'] },
    repeatReward: { soulstones: 5000, heroFragments: { king: 8 } },
    tutorialHint: '대종말 — 모든 자원 동원. 클리어 시 진왕 칭호.',
    icon: '☄',
  },
  // ===== 챕터 6 (W6): 진왕 시대 — 역침공 =====
  // 메커니즘은 동일 (디펜스). 내러티브: "이번엔 마왕이 인간 왕국을 침공"
  // 적은 인간 왕국 정예/근위/마법사단/사도/왕도 신관 — 더 강한 변형.
  // 보상은 영혼석 + 시즌 인테리어/스킨 한정.
  {
    id: 'ch6_s1', chapterId: 'ch6', index: 1,
    name: '진왕의 진군',
    subtitle: '챕터 6 시작 — 역침공',
    description: '마왕이 처음으로 마왕성 밖으로 진군한다. 인간 왕국의 변경이 무너진다.',
    waveLimit: 25,
    heroPool: ['swordsman', 'archer', 'mage', 'spear'],
    bossId: 'captain',
    stratumId: 'abyss_court',
    recommendedTags: ['dark', 'fire'],
    stageModifier: { heroHpMul: 4.30, heroAtkMul: 3.50, castleHpMul: 2.00, rewardMul: 2.40 },
    unlockCondition: { clearedStageId: 'ch5_s5' },
    firstClearReward: { soulstones: 5000 },
    repeatReward: { soulstones: 1500 },
    tutorialHint: '【챕터 6】 마왕이 침공한다. 적은 변경 수비대.',
    icon: '☄',
  },
  {
    id: 'ch6_s2', chapterId: 'ch6', index: 2,
    name: '왕도의 외곽',
    subtitle: '근위대의 방어선',
    description: '왕도 외곽에 인간 왕국 정예 근위대가 마지막 방어선을 친다.',
    waveLimit: 35,
    heroPool: ['swordsman', 'archer', 'mage', 'spear', 'shield'],
    bossId: 'archmage',
    stratumId: 'abyss_court',
    recommendedTags: ['dark', 'magic'],
    stageModifier: { heroHpMul: 4.60, heroAtkMul: 3.75, castleHpMul: 2.10, rewardMul: 2.50 },
    unlockCondition: { clearedStageId: 'ch6_s1' },
    firstClearReward: { soulstones: 8000 },
    repeatReward: { soulstones: 2000 },
    tutorialHint: '근위대 — 방패병 비중 ↑.',
    icon: '🛡',
  },
  {
    id: 'ch6_s3', chapterId: 'ch6', index: 3,
    name: '왕립 마법학회',
    subtitle: '학회의 최후 저항',
    description: '왕립 마법사들이 학회 안에 결계를 치고 마왕에게 마지막 저항을 한다.',
    waveLimit: 45,
    heroPool: ['mage', 'apprentice', 'archer', 'healer', 'rogue'],
    bossId: 'archmage',
    stratumId: 'abyss_court',
    recommendedTags: ['dark', 'fire'],
    stageModifier: { heroHpMul: 4.90, heroAtkMul: 4.00, mpRegenMul: 0.80, rewardMul: 2.60 },
    unlockCondition: { clearedStageId: 'ch6_s2' },
    firstClearReward: { soulstones: 12000 },
    repeatReward: { soulstones: 3000, heroFragments: { mage: 5, archmage: 4 } },
    tutorialHint: '마력 가뭄 ↑ — 효율 카드 위주.',
    icon: '🔮',
  },
  {
    id: 'ch6_s4', chapterId: 'ch6', index: 4,
    name: '왕도 대신전',
    subtitle: '신전의 최후',
    description: '봉인의 서판을 지키던 신전이 마왕 앞에서 마지막 의식을 시작한다.',
    waveLimit: 60,
    heroPool: ['healer', 'priest', 'shield', 'swordsman', 'mage', 'archer'],
    bossId: 'priest',
    stratumId: 'abyss_court',
    recommendedTags: ['dark', 'undead', 'fire'],
    stageModifier: { heroHpMul: 5.30, heroAtkMul: 4.30, castleHpMul: 2.20, rewardMul: 2.80 },
    unlockCondition: { clearedStageId: 'ch6_s3' },
    firstClearReward: { soulstones: 18000 },
    repeatReward: { soulstones: 4500, heroFragments: { priest: 6, healer: 5 } },
    tutorialHint: '신전의 봉인 의식 — 마왕성 HP 보호.',
    icon: '⛪',
  },
  {
    id: 'ch6_s5', chapterId: 'ch6', index: 5,
    name: '왕좌의 대결',
    subtitle: '【진왕의 결말】',
    description: '인간 왕좌 앞에서 인간 왕과 마왕이 마지막으로 마주선다.',
    waveLimit: 100,
    heroPool: ['shield', 'swordsman', 'spear', 'archer', 'mage', 'rogue', 'healer'],
    bossId: 'king',
    stratumId: 'abyss_court',
    recommendedTags: ['dark', 'fire', 'magic', 'undead'],
    stageModifier: { heroHpMul: 5.80, heroAtkMul: 4.70, castleHpMul: 2.40, rewardMul: 3.00 },
    unlockCondition: { clearedStageId: 'ch6_s4' },
    firstClearReward: { soulstones: 50000, unlockRecruitIds: ['slord', 'ggen', 'awitch', 'owar'] },
    repeatReward: { soulstones: 10000, heroFragments: { king: 10 } },
    tutorialHint: '【진왕의 결말】 인간 왕과 직접 대결.',
    icon: '👑',
  },
  // ===== 챕터 7: 심해의 부름 =====
  {
    id: 'ch7_s1', chapterId: 'ch7', index: 1,
    name: '바닷가의 — 그림자',
    subtitle: '챕터 7 시작',
    description: '심해에서 — 새로운 적이 — 솟아오른다.\n천 년 전 — 1대 마왕이 — 봉인한 — 또 다른 — 봉인이다.',
    waveLimit: 30,
    heroPool: ['swordsman', 'archer', 'mage', 'spear', 'shield'],
    bossId: 'archmage',
    stratumId: 'abyss_court',
    recommendedTags: ['dark', 'fire'],
    stageModifier: { heroHpMul: 6.20, heroAtkMul: 5.00, castleHpMul: 2.50, rewardMul: 3.20 },
    unlockCondition: { clearedStageId: 'ch6_s5' },
    firstClearReward: { soulstones: 8000 },
    repeatReward: { soulstones: 2500 },
    tutorialHint: '챕터 7 — 심해의 적이 — 등장. 더 — 무겁다.',
    icon: '🌊',
  },
  {
    id: 'ch7_s2', chapterId: 'ch7', index: 2,
    name: '심해의 — 사도',
    subtitle: '바다 신관의 등장',
    description: '심해 신관이 — 거대한 — 의식을 — 시작한다. 마왕성 외벽이 — 흔들린다.',
    waveLimit: 40,
    heroPool: ['healer', 'mage', 'shield', 'archer', 'priest'],
    bossId: 'saint',
    stratumId: 'abyss_court',
    recommendedTags: ['dark', 'fire', 'undead'],
    stageModifier: { heroHpMul: 6.50, heroAtkMul: 5.30, castleHpMul: 2.60, rewardMul: 3.30 },
    unlockCondition: { clearedStageId: 'ch7_s1' },
    firstClearReward: { soulstones: 12000 },
    repeatReward: { soulstones: 3500 },
    tutorialHint: '심해 신관 — 회복 빈도 ↑.',
    icon: '🌀',
  },
  {
    id: 'ch7_s3', chapterId: 'ch7', index: 3,
    name: '심해의 — 왕',
    subtitle: '심해 왕의 — 침공',
    description: '심해 왕이 — 마왕성을 — 가라앉히려 — 한다.',
    waveLimit: 55,
    heroPool: ['shield', 'swordsman', 'spear', 'archer', 'mage', 'healer'],
    bossId: 'king',
    stratumId: 'abyss_court',
    recommendedTags: ['dark', 'fire', 'magic'],
    stageModifier: { heroHpMul: 6.80, heroAtkMul: 5.60, castleHpMul: 2.80, rewardMul: 3.40 },
    unlockCondition: { clearedStageId: 'ch7_s2' },
    firstClearReward: { soulstones: 18000 },
    repeatReward: { soulstones: 5000 },
    tutorialHint: '심해 왕 — 거대한 — 무게.',
    icon: '🐙',
  },
  {
    id: 'ch7_s4', chapterId: 'ch7', index: 4,
    name: '바다의 — 외침',
    subtitle: '폭풍 속',
    description: '바다 자체가 — 침공한다.\n마왕성이 — 흔들린다.',
    waveLimit: 70,
    heroPool: ['swordsman', 'archer', 'mage', 'spear', 'rogue', 'shield', 'healer'],
    bossId: 'priest',
    stratumId: 'abyss_court',
    recommendedTags: ['dark', 'undead', 'fire'],
    stageModifier: { heroHpMul: 7.20, heroAtkMul: 5.90, mpRegenMul: 0.85, rewardMul: 3.60 },
    unlockCondition: { clearedStageId: 'ch7_s3' },
    firstClearReward: { soulstones: 25000 },
    repeatReward: { soulstones: 7000 },
    tutorialHint: '폭풍 — 마력 회복 ↓.',
    icon: '🌪',
  },
  {
    id: 'ch7_s5', chapterId: 'ch7', index: 5,
    name: '심해의 — 봉인',
    subtitle: '【챕터 7 종결】',
    description: '심해의 봉인이 — 풀리는가, 다시 — 닫히는가.',
    waveLimit: 90,
    heroPool: ['swordsman', 'archer', 'mage', 'spear', 'rogue', 'shield', 'healer'],
    bossId: 'king',
    stratumId: 'abyss_court',
    recommendedTags: ['dark', 'fire', 'magic', 'undead'],
    stageModifier: { heroHpMul: 7.60, heroAtkMul: 6.30, castleHpMul: 3.00, rewardMul: 3.80 },
    unlockCondition: { clearedStageId: 'ch7_s4' },
    firstClearReward: { soulstones: 60000, unlockRecruitIds: ['mimic', 'lich'] },
    repeatReward: { soulstones: 12000, heroFragments: { king: 12 } },
    tutorialHint: '【챕터 7 종결】 심해 봉인의 — 끝.',
    icon: '🌊',
  },
];

/* =====================================================================
 *  헬퍼
 * ===================================================================== */

export function getStageById(id: StageId): StageDefinition | undefined {
  return STAGES.find((s) => s.id === id);
}

export function nextStageId(id: StageId): StageId | null {
  const idx = STAGES.findIndex((s) => s.id === id);
  if (idx < 0 || idx >= STAGES.length - 1) return null;
  return STAGES[idx + 1].id;
}

/** 처음부터 열려 있는 스테이지 (unlockCondition 없거나 비어있음) */
export function firstUnlockedStage(): StageDefinition {
  return STAGES.find((s) => !s.unlockCondition || isUnlockConditionEmpty(s.unlockCondition))
    ?? STAGES[0];
}

function isUnlockConditionEmpty(c: StageUnlockCondition): boolean {
  return c.clearedStageId === undefined
    && c.bestWaveAtLeast === undefined
    && c.totalBossKillsAtLeast === undefined;
}

/**
 * 잠금 해제 여부. 조건 필드들은 OR 결합 — 하나라도 만족하면 해제.
 *
 * @param stageId 검사할 스테이지
 * @param ctx 잠금 해제 평가 컨텍스트 (cleared / bestWave / totalBossKills)
 *            - clearedStages만 넘기는 기존 호출은 호환을 위해 string[] 도 허용.
 */
export function isStageUnlocked(
  stageId: StageId,
  ctx: string[] | { clearedStages: string[]; bestWave?: number; totalBossKills?: number },
): boolean {
  const def = getStageById(stageId);
  if (!def) return false;
  // 조건 미지정 → 처음부터 열림
  if (!def.unlockCondition || isUnlockConditionEmpty(def.unlockCondition)) return true;

  const cleared = Array.isArray(ctx) ? ctx : ctx.clearedStages;
  const bestWave = Array.isArray(ctx) ? 0 : (ctx.bestWave ?? 0);
  const totalBossKills = Array.isArray(ctx) ? 0 : (ctx.totalBossKills ?? 0);

  const c = def.unlockCondition;
  if (c.clearedStageId && cleared.includes(c.clearedStageId)) return true;
  if (c.bestWaveAtLeast !== undefined && bestWave >= c.bestWaveAtLeast) return true;
  if (c.totalBossKillsAtLeast !== undefined && totalBossKills >= c.totalBossKillsAtLeast) return true;
  return false;
}

/** 다음 도전할 스테이지 추천 (가장 최근 클리어 다음) */
export function recommendedNextStage(clearedStages: string[]): StageDefinition | null {
  for (const s of STAGES) {
    if (clearedStages.includes(s.id)) continue;
    if (isStageUnlocked(s.id, clearedStages)) return s;
  }
  return null;
}

/** 첫 클리어 영혼석 보상 (편의 헬퍼 — UI/엔진에서 자주 사용) */
export function getFirstClearStones(def: StageDefinition): number {
  return def.firstClearReward.soulstones ?? 0;
}

/** 반복 클리어 영혼석 보상 (편의 헬퍼) */
export function getRepeatRewardStones(def: StageDefinition): number {
  return def.repeatReward.soulstones ?? 0;
}

/** 첫 클리어 시 잠금 해제될 모집 ID 목록 (편의 헬퍼) */
export function getUnlockRecruitIds(def: StageDefinition): string[] {
  return def.firstClearReward.unlockRecruitIds ?? [];
}

/** 첫 클리어 시 잠금 해제될 기능 ID 목록 (편의 헬퍼) */
export function getUnlockFeatureIds(def: StageDefinition): string[] {
  return def.firstClearReward.unlockFeatureIds ?? [];
}
