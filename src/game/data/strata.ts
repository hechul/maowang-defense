/**
 * 던전 층 시스템 — 5wave마다 컨셉/배경/적 풀/모디파이어 변화
 * GAME_DESIGN_OVERHAUL §3.1 / §6.1
 */

export interface StratumDef {
  id: string;
  index: number;            // 1~5+
  startWave: number;
  endWave: number;
  name: string;              // UI 표시
  subtitle: string;          // banner sub
  bgGradient: [string, string, string];  // [top, mid, bot]
  heroPoolBoost?: string[];  // 이 층에서 가중치 ↑
  modifierLabel?: string;    // banner에 표시
  enterDialog?: string;      // 마왕 대사
}

export const STRATA: StratumDef[] = [
  {
    id: 'sealed_gate', index: 1,
    startWave: 1, endWave: 5,
    name: '봉인의 입구',
    subtitle: '천 년 만의 첫 침입자들',
    bgGradient: ['#2D1B4E', '#1A0F2E', '#0a0820'],
    enterDialog: '"인간의 시대가 끝나리라..."',
  },
  {
    id: 'forgotten_grave', index: 2,
    startWave: 6, endWave: 10,
    name: '잊혀진 묘지',
    subtitle: '죽음 위에 죽음',
    bgGradient: ['#1f3a2e', '#0f2418', '#05130a'],
    heroPoolBoost: ['archer', 'spear', 'mage'],
    modifierLabel: '🪦 적 처치 30% 부활',
    enterDialog: '"무덤이 깨어났다..."',
  },
  {
    id: 'flame_hall', index: 3,
    startWave: 11, endWave: 15,
    name: '화염 전당',
    subtitle: '재로 돌아가리라',
    bgGradient: ['#3a0d0d', '#1a0606', '#080202'],
    heroPoolBoost: ['mage', 'rogue', 'swordsman'],
    modifierLabel: '🔥 화염 카드 등장률 ↑',
    enterDialog: '"화염이 모든 것을 태운다..."',
  },
  {
    id: 'mad_labyrinth', index: 4,
    startWave: 16, endWave: 20,
    name: '광기의 미궁',
    subtitle: '운명조차 길을 잃는다',
    bgGradient: ['#3a0d4e', '#1a0828', '#0a0420'],
    modifierLabel: '🎲 매 wave 랜덤 모디파이어',
    enterDialog: '"질서는 환상이다..."',
  },
  {
    id: 'divine_realm', index: 5,
    startWave: 21, endWave: 25,
    name: '신의 영역',
    subtitle: '챕터 1의 끝',
    bgGradient: ['#4a3a1a', '#2a1f0a', '#1a1408'],
    heroPoolBoost: ['shield', 'healer', 'mage'],
    modifierLabel: '⚡ 적 강화·보상 ×1.3',
    enterDialog: '"여기까지 왔구나..."',
  },
  // 챕터 2 (W26~50) — 신규 5층
  {
    id: 'eternal_winter', index: 6,
    startWave: 26, endWave: 30,
    name: '영원의 겨울',
    subtitle: '얼어붙은 시간',
    bgGradient: ['#1a3a4e', '#0a1a2a', '#050a14'],
    modifierLabel: '❄ 5초마다 적 1.5초 동결',
    enterDialog: '"추위가 살을 깎는다..."',
  },
  {
    id: 'abyss_court', index: 7,
    startWave: 31, endWave: 35,
    name: '심연의 법정',
    subtitle: '심판이 시작된다',
    bgGradient: ['#2a0d2a', '#1a0414', '#0a020a'],
    modifierLabel: '⚖ 적 / 마왕성 동시 -10% HP',
    enterDialog: '"진정한 어둠을 보여주마..."',
  },
];

export function stratumForWave(wave: number): StratumDef {
  // 챕터 1~2 (W1~35)는 하드코딩, 그 이후는 cycle
  const found = STRATA.find((s) => wave >= s.startWave && wave <= s.endWave);
  if (found) return found;
  // 무한 사이클: W36+ 는 5개 층 cycle
  const cycleStrata = STRATA.slice(0, 5);
  const cycle = Math.floor((wave - 36) / 5) % cycleStrata.length;
  return cycleStrata[cycle];
}

/** wave가 새 층 진입 wave인가 (startWave) */
export function isStratumEnterWave(wave: number): boolean {
  return STRATA.some((s) => s.startWave === wave) || ((wave - 36) % 5 === 0 && wave >= 36);
}
