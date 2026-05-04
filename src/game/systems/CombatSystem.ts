/**
 * CombatSystem — 전투 산식 (1차 분리, mutation-free 부분만)
 *
 * 비목표:
 *   - this.monsters 배열 직접 mutation은 GameEngine에 남는다.
 *   - 시너지 active set 결정 + 단위 mul 계산만 분리.
 */

import { SYNERGIES, type Synergy } from '../data/synergies';

/* =====================================================================
 *  태그 카운트 → 활성 시너지 set
 * ===================================================================== */

/**
 * 살아있는 몬스터의 태그 카운트로부터 활성 시너지 id 집합 산출.
 * GameEngine.recalcSynergies의 첫 단계와 동일.
 */
export function activeSynergyIdsFor(
  tagCounts: Record<string, number>,
  synergies: Synergy[] = SYNERGIES,
): Set<string> {
  const active = new Set<string>();
  for (const s of synergies) {
    if (s.test(tagCounts)) active.add(s.id);
  }
  return active;
}

/* =====================================================================
 *  단위 atk/hp/spd mul 산출 (mutation-free)
 *      monster mutation은 GameEngine 측에서 적용. 여기서는 입력 → 결과 mul만.
 * ===================================================================== */

export interface UnitMulInput {
  /** 단위 태그 */
  tags: string[];
  /** 활성 시너지 id 집합 */
  activeSynergyIds: ReadonlySet<string>;
  /** 'mask' relic 보유 — 모든 단위 atk ×1.3 */
  hasMaskRelic: boolean;
  /** 칙령 darkSynergyMul + fulldark 시너지 활성 시 dark 태그 단위에 적용 */
  edictDarkSynergyMul: number | undefined;
  /** 분기 카드 정보 — tagBoost 매칭 시 buff 적용 */
  activeBranch?: {
    tagBoost: string;
    buff: { atkMul?: number; hpMul?: number; spdMul?: number };
  };
  /** 영혼 강화 monAtk 단계 (단계당 +5%) */
  monAtkSkillLevel: number;
  /** 영혼 강화 monHp 단계 */
  monHpSkillLevel: number;
  /** Rally 활성 — atk×1.2 / spd×1.5 */
  rallyActive: boolean;
  /** 시너지 정의 — 기본 SYNERGIES */
  synergies?: Synergy[];
  /** 빌드 보너스 — 태그별 atk 곱 (예: dark_mystic → dark:1.2) */
  buildTagAtkMul?: Record<string, number>;
  /** 빌드 보너스 — 태그별 hp 곱 */
  buildTagHpMul?: Record<string, number>;
  /** 빌드 보너스 — 태그별 spd 곱 */
  buildTagSpdMul?: Record<string, number>;
  /** tyrant_strike T2 — 필살기 사용 후 6초 윈도우 동안 모든 단위 atk×1.4 */
  ultiBuffAtkMul?: number;
  /** dark_mystic T2 — dark 처치 발동 시 0.8초간 dark 단위 atk×1.5 */
  darkKillProcAtkMul?: number;
}

export interface UnitMulResult {
  atkMul: number;
  hpMul: number;
  spdMul: number;
}

/**
 * 한 단위의 최종 atk/hp/spd 곱셈 인자 산출.
 *   1) 시너지 apply (각 활성 시너지의 apply 호출)
 *   2) mask relic ×1.3 atk
 *   3) edict darkSynergyMul + fulldark + dark 태그 → atk/hp ×N
 *   4) 분기 카드 buff (tagBoost 매칭)
 *   5) 영혼 강화 monAtk/monHp
 *   6) Rally — atk×1.2 / spd×1.5
 * GameEngine.recalcSynergies와 산식 동일.
 */
export function calculateUnitMul(input: UnitMulInput): UnitMulResult {
  let atk = 1, hp = 1, spd = 1;
  const synergies = input.synergies ?? SYNERGIES;
  // 1) 시너지 apply
  for (const s of synergies) {
    if (!input.activeSynergyIds.has(s.id)) continue;
    const [a, h, sp] = s.apply(atk, hp, spd, input.tags);
    atk = a; hp = h; spd = sp;
  }
  // 2) mask
  if (input.hasMaskRelic) atk *= 1.3;
  // 3) 어둠의 시간 칙령
  if (input.edictDarkSynergyMul && input.activeSynergyIds.has('fulldark') && input.tags.includes('dark')) {
    atk *= input.edictDarkSynergyMul;
    hp *= input.edictDarkSynergyMul;
  }
  // 4) 분기 카드 buff
  if (input.activeBranch && input.tags.includes(input.activeBranch.tagBoost)) {
    const b = input.activeBranch.buff;
    if (b.atkMul) atk *= b.atkMul;
    if (b.hpMul) hp *= b.hpMul;
    if (b.spdMul) spd *= b.spdMul;
  }
  // 5) 영혼 강화
  atk *= 1 + input.monAtkSkillLevel * 0.05;
  hp *= 1 + input.monHpSkillLevel * 0.05;
  // 6) Rally
  if (input.rallyActive) {
    atk *= 1.2;
    spd *= 1.5;
  }
  // 7) 빌드 보너스 — 태그별 곱
  if (input.buildTagAtkMul) {
    for (const tag of input.tags) {
      const m = input.buildTagAtkMul[tag];
      if (m) atk *= m;
    }
  }
  if (input.buildTagHpMul) {
    for (const tag of input.tags) {
      const m = input.buildTagHpMul[tag];
      if (m) hp *= m;
    }
  }
  if (input.buildTagSpdMul) {
    for (const tag of input.tags) {
      const m = input.buildTagSpdMul[tag];
      if (m) spd *= m;
    }
  }
  // 8) tyrant_strike T2 — 필살기 후 윈도우 내 모든 단위 atk
  if (input.ultiBuffAtkMul && input.ultiBuffAtkMul > 1) atk *= input.ultiBuffAtkMul;
  // 9) dark_mystic T2 — dark 처치 직후 0.8초 윈도우 (dark 태그만)
  if (input.darkKillProcAtkMul && input.darkKillProcAtkMul > 1 && input.tags.includes('dark')) {
    atk *= input.darkKillProcAtkMul;
  }
  return { atkMul: atk, hpMul: hp, spdMul: spd };
}
