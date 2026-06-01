/**
 * CastleSystem — 마왕성 / 마력 / 필살기 산식 (1차 분리)
 *
 * 목표:
 *   - GameEngine.resetState / castUlti / 필살기 게이지 등에서 인라인이던
 *     수치 계산만 분리. 실제 데미지 적용 / takeDamage 호출 / 사운드는 GameEngine에 남음.
 */

/* =====================================================================
 *  마왕성 최대 HP
 * ===================================================================== */

export interface CastleMaxHpInput {
  /** 베이스 (현재 1000) */
  base: number;
  /** 영혼 강화 단계 (단계당 +10%) */
  hpSkillLevel: number;
  /** 마왕 강화 ratio */
  demonPowerRatio: number;
  /** 인테리어 ratio */
  interiorRatio: number;
  /** 칙령 castleHpMul (없으면 미적용 — 1) */
  edictMul?: number;
}

/**
 * 마왕성 최대 HP 산출.
 *   base × (1 + skill×0.10) × demonPower × interior × edict?
 * 칙령 적용 시 floor.
 */
export function calculateCastleMaxHp(input: CastleMaxHpInput): number {
  const raw = input.base
    * (1 + input.hpSkillLevel * 0.10)
    * input.demonPowerRatio
    * input.interiorRatio;
  if (input.edictMul !== undefined) return Math.floor(raw * input.edictMul);
  return raw;
}

/* =====================================================================
 *  시작 마력
 * ===================================================================== */

export interface StartMpInput {
  /** 베이스 (현재 100 — 첫 카드 1회 보장, 이후 처치/회복으로 연결) */
  base: number;
  /** mpMax 상한 (현재 300) */
  mpMax: number;
  /** 영혼 강화 startMp 단계 (단계당 +50) */
  startMpSkillLevel: number;
  /** 마왕 강화 startMpBonus */
  demonPowerBonus: number;
  /** 인테리어 startMpBonus */
  interiorBonus: number;
}

/** 런 시작 시 마력. mpMax로 상한 클램프. */
export function calculateStartMp(input: StartMpInput): number {
  const raw = input.base
    + input.startMpSkillLevel * 50
    + input.demonPowerBonus
    + input.interiorBonus;
  return Math.min(input.mpMax, raw);
}

/* =====================================================================
 *  필살기 게이지 가산량
 * ===================================================================== */

export interface UltiChargeInput {
  /** 처치 단위당 베이스 게이지 (보스 30 / 일반 4) */
  isBoss: boolean;
  /** 'oracle' relic 보유 — ×1.3 */
  hasOracleRelic: boolean;
  /** 마왕 강화 어둠의 흐름 ultiChargeRate */
  demonPowerChargeRate: number;
}

/** 처치 시 필살기 게이지에 더할 양. */
export function calculateUltiChargeGain(input: UltiChargeInput): number {
  const base = input.isBoss ? 30 : 4;
  const oracle = input.hasOracleRelic ? 1.3 : 1;
  return base * oracle * input.demonPowerChargeRate;
}

/* =====================================================================
 *  필살기 변형별 데미지 산출
 *    variant 0: 어둠의 파동 — 모든 hero에 maxHp × dmgMul
 *    variant 1: 지옥 소환진 — flat dmg + DOT
 *    variant 2: 암흑 멸망 — 즉사 + 자해 120
 * ===================================================================== */

export interface UltiVariantInput {
  /** 0/1/2 */
  variant: number;
  /** skills.ultiDmg 단계 */
  ultiDmgSkillLevel: number;
  /** 'crown' relic 보유 */
  hasCrownRelic: boolean;
}

export interface UltiVariantPayload {
  variant: 0 | 1 | 2;
  /** v0 — hero maxHp에 곱할 ratio */
  pulseDmgMul: number;
  /** v1 — flat dmg (heroDirect) */
  flatDmg: number;
  /** v1 — DOT dmg per tick (3초간) */
  dotDmgPerTick: number;
  /** v2 — 마왕성 자해 dmg */
  selfHarm: number;
}

/**
 * 필살기 변형별 데미지 페이로드 산출.
 *   variant 0: dmgMul = 0.30 + ultiDmg×0.03 (+0.15 if crown)
 *   variant 1: flatDmg = 25 + ultiDmg×5 (×1.5 if crown), dot = flat×0.2
 *   variant 2: selfHarm = 120 (고정)
 */
export function computeUltiVariantPayload(input: UltiVariantInput): UltiVariantPayload {
  const v = (input.variant % 3) as 0 | 1 | 2;
  if (v === 0) {
    let dmgMul = 0.30 + input.ultiDmgSkillLevel * 0.03;
    if (input.hasCrownRelic) dmgMul += 0.15;
    return { variant: v, pulseDmgMul: dmgMul, flatDmg: 0, dotDmgPerTick: 0, selfHarm: 0 };
  }
  if (v === 1) {
    let flatDmg = 25 + input.ultiDmgSkillLevel * 5;
    if (input.hasCrownRelic) flatDmg *= 1.5;
    return {
      variant: v, pulseDmgMul: 0, flatDmg,
      dotDmgPerTick: flatDmg * 0.2, selfHarm: 0,
    };
  }
  // v === 2
  return { variant: v, pulseDmgMul: 0, flatDmg: 0, dotDmgPerTick: 0, selfHarm: 120 };
}
