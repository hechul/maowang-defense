/**
 * P0-1 마왕 레벨 — 모든 P0/P1 메타 보상의 베이스 통화.
 * 한 런마다 EXP 적립 → 레벨업 시 영구 +스탯 / 카드 풀 해금.
 *
 * 정책: 결정적 EXP 곡선, NaN/음수 방어, 50렙까지 정의 + 이후 cycle.
 */

export const DEMON_LEVEL_MAX = 50;

/** 레벨 N → N+1 까지 필요한 EXP. 1→2: 100, 점진 증가. */
function expToNext(level: number): number {
  // 50렙: 약 12000 EXP / 한 런 평균 200~600 EXP → 30~50런 도달
  if (level >= DEMON_LEVEL_MAX) return Number.MAX_SAFE_INTEGER;
  return Math.floor(80 + level * level * 6 + level * 14);
}

export interface DemonLevelReward {
  level: number;
  /** 영구 +스탯 (start() 시 합산) */
  startMpBonus?: number;
  castleHpBonus?: number;
  ultiChargeBonus?: number;
  /** 모집 후보 자동 해금 (해금 시 availableRecruitIds 에 추가) */
  unlockRecruitIds?: string[];
  /** 영혼석 보너스 */
  stones?: number;
  /** 사용자 노출 라벨 */
  label: string;
}

export const DEMON_LEVEL_REWARDS: DemonLevelReward[] = [
  { level: 2,  stones: 100, label: '영혼석 +100' },
  { level: 3,  startMpBonus: 10, label: '시작 마력 +10' },
  { level: 5,  unlockRecruitIds: ['lich'], label: '리치 모집 해금' },
  { level: 7,  castleHpBonus: 50, label: '마왕성 HP +50' },
  { level: 10, stones: 300, ultiChargeBonus: 5, label: '영혼석 +300 / 필살기 충전 +5%' },
  { level: 12, unlockRecruitIds: ['mimic'], label: '미믹 모집 해금' },
  { level: 15, startMpBonus: 20, label: '시작 마력 +20' },
  { level: 18, castleHpBonus: 100, label: '마왕성 HP +100' },
  { level: 20, stones: 500, label: '영혼석 +500' },
  { level: 22, unlockRecruitIds: ['mino'], label: '미노타우르스 모집 해금' },
  { level: 25, ultiChargeBonus: 10, label: '필살기 충전 +10%' },
  { level: 28, startMpBonus: 30, label: '시작 마력 +30' },
  { level: 30, stones: 1000, castleHpBonus: 200, label: '영혼석 +1000 / 마왕성 +200' },
  { level: 35, ultiChargeBonus: 10, label: '필살기 충전 +10%' },
  { level: 40, startMpBonus: 50, castleHpBonus: 300, label: '시작 마력 +50 / 성 +300' },
  { level: 45, stones: 2000, label: '영혼석 +2000' },
  { level: 50, startMpBonus: 100, castleHpBonus: 500, ultiChargeBonus: 20, stones: 5000, label: '【진왕 각성】 모든 영구 보너스' },
];

/** 누적 영구 보너스 — 현재 레벨까지 받은 모든 보상 합산. */
export interface DemonAggregatedBonus {
  startMpBonus: number;
  castleHpBonus: number;
  ultiChargeBonus: number;
}

export function aggregatedDemonBonus(level: number): DemonAggregatedBonus {
  let startMp = 0, castleHp = 0, ulti = 0;
  for (const r of DEMON_LEVEL_REWARDS) {
    if (level < r.level) break;
    if (r.startMpBonus) startMp += r.startMpBonus;
    if (r.castleHpBonus) castleHp += r.castleHpBonus;
    if (r.ultiChargeBonus) ulti += r.ultiChargeBonus;
  }
  return { startMpBonus: startMp, castleHpBonus: castleHp, ultiChargeBonus: ulti };
}

/** 한 런 종료 → EXP 적립량. 결과 화면 단계에서 한 번 호출. */
export interface RunSummary {
  wave: number;
  bossKills: number;
  buildCompleted: boolean;
  newDiscovered: number;
  isVictory: boolean;
}

export function calcRunExp(s: RunSummary): number {
  const base = Math.max(10, Math.floor(s.wave * 8));
  const bossExp = s.bossKills * 40;
  const buildBonus = s.buildCompleted ? 100 : 0;
  const discoveryBonus = s.newDiscovered * 30;
  const victoryBonus = s.isVictory ? 80 : 0;
  return base + bossExp + buildBonus + discoveryBonus + victoryBonus;
}

/** 현재 레벨 + 누적 EXP → 시각화용 (현재 레벨 진행도 / 다음 레벨까지 남은 EXP) */
export function progressInLevel(totalExp: number): {
  level: number;
  expInLevel: number;
  expForNext: number;
  isMax: boolean;
} {
  let level = 1;
  let remaining = Math.max(0, totalExp);
  while (level < DEMON_LEVEL_MAX) {
    const need = expToNext(level);
    if (remaining < need) return { level, expInLevel: remaining, expForNext: need, isMax: false };
    remaining -= need;
    level += 1;
  }
  return { level: DEMON_LEVEL_MAX, expInLevel: 0, expForNext: 0, isMax: true };
}

/** 적립된 EXP를 추가했을 때 — 레벨업 횟수와 새로 받을 보상 목록 */
export function applyExpGain(currentTotalExp: number, gained: number): {
  newTotalExp: number;
  levelsGained: number;
  newLevel: number;
  newRewards: DemonLevelReward[];
} {
  const before = progressInLevel(currentTotalExp);
  const newTotal = currentTotalExp + Math.max(0, gained);
  const after = progressInLevel(newTotal);
  const newRewards: DemonLevelReward[] = [];
  for (const r of DEMON_LEVEL_REWARDS) {
    if (r.level > before.level && r.level <= after.level) {
      newRewards.push(r);
    }
  }
  return {
    newTotalExp: newTotal,
    levelsGained: Math.max(0, after.level - before.level),
    newLevel: after.level,
    newRewards,
  };
}

export { expToNext };
