/**
 * 일일 칙령 — 매일 1회 무작위 모디파이어
 * GAME_DESIGN_OVERHAUL §3.6
 *
 * 적용된 런은 결과 화면 영혼석 +20%.
 */

export interface EdictDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
  /** 적용 시 GameEngine 변경 */
  modifiers: {
    /** 어둠 시너지 ×N */
    darkSynergyMul?: number;
    /** 적 HP 배수 */
    enemyHpMul?: number;
    /** 마왕성 HP 배수 */
    castleHpMul?: number;
    /** 영혼석 보상 배수 */
    stoneMul?: number;
    /** 적 ATK 배수 */
    enemyAtkMul?: number;
    /** tomb 유물 자동 보유 */
    autoTomb?: boolean;
    /** 진화 조건 변경 (3 → N) */
    evoNeedOverride?: number;
    /** 카드 reroll 무제한 */
    unlimitedReroll?: boolean;
  };
}

export const EDICTS: EdictDef[] = [
  {
    id: 'dark_hour',
    icon: '🌑',
    name: '어둠의 시간',
    desc: '어둠 시너지 ×2 / 영혼석 +20%',
    modifiers: { darkSynergyMul: 2.0, stoneMul: 1.2 },
  },
  {
    id: 'weak_judgment',
    icon: '⚖',
    name: '약자의 심판',
    desc: '적 HP -20% / 마왕성 HP -30% / 영혼석 +20%',
    modifiers: { enemyHpMul: 0.8, castleHpMul: 0.7, stoneMul: 1.2 },
  },
  {
    id: 'golden_rain',
    icon: '🌟',
    name: '황금의 비',
    desc: '영혼석 +50% / 적 ATK +30%',
    modifiers: { stoneMul: 1.5, enemyAtkMul: 1.3 },
  },
  {
    id: 'rebirth_night',
    icon: '🪦',
    name: '부활의 밤',
    desc: 'tomb 유물 자동 보유 / 진화 조건 4마리 / 영혼석 +20%',
    modifiers: { autoTomb: true, evoNeedOverride: 4, stoneMul: 1.2 },
  },
  {
    id: 'fate_flux',
    icon: '🎲',
    name: '운명의 변동',
    desc: '카드 reroll 무제한 / 영혼석 +20%',
    modifiers: { unlimitedReroll: true, stoneMul: 1.2 },
  },
];

/**
 * 오늘의 칙령 — 날짜 기반 결정론적 셔플 (같은 날은 같은 칙령).
 */
export function todayEdict(date: Date = new Date()): EdictDef {
  const ymd = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const seed = ymd.split('-').reduce((a, b) => a + parseInt(b), 0);
  return EDICTS[seed % EDICTS.length];
}
