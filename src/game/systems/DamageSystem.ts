/**
 * DamageSystem — 데미지 변형 / 부활 산식 (1차 분리)
 *
 * 비목표:
 *   - DamageText / hitStop / 사운드는 GameEngine에 남는다.
 *   - 여기서는 데미지/플래그 산출만.
 */

/** 방어력 적용 후 실제 들어가는 데미지. defense는 0~1 (감소율). */
export function applyDefense(rawDamage: number, defense: number | undefined): number {
  if (!defense) return rawDamage;
  return rawDamage * (1 - defense);
}

export interface CritInput {
  /** 들어간 최종 데미지 (방어력 적용 후) */
  finalDamage: number;
  /** 대상 maxHp */
  targetMaxHp: number;
  /** 공격자가 aoe 가지면 자동 크리트 */
  attackerHasAoe: boolean;
}

/**
 * 크리티컬 판정.
 *   crit = finalDamage >= maxHp × 0.25 || attackerHasAoe
 */
export function isCriticalHit(input: CritInput): boolean {
  if (input.attackerHasAoe) return true;
  return input.finalDamage >= input.targetMaxHp * 0.25;
}

export interface ReviveInput {
  /** 단위 base revive ratio (없으면 0) */
  baseReviveRatio: number;
  /** 'tomb' relic 보유 — +0.5 */
  hasTombRelic: boolean;
  /** 단위 maxHp */
  maxHp: number;
  /** 단위 hpMul (시너지/relic 곱셈) */
  hpMul: number;
  /** undead_lord T1 — undead/zombie 단위에 +0.5 추가 (호출자가 이미 태그 매칭 후 결정) */
  buildReviveExtraRatio?: number;
}

export interface ReviveResult {
  /** 부활 가능 여부 */
  canRevive: boolean;
  /** 부활 시 회복 HP (canRevive=false면 0) */
  revivedHp: number;
}

/**
 * 몬스터 부활 판정 + HP 산출.
 *   reviveR = baseReviveRatio + (tomb ? 0.5 : 0)
 *   canRevive = reviveR > 0
 *   revivedHp = maxHp × hpMul × reviveR
 */
export function calculateRevive(input: ReviveInput): ReviveResult {
  const reviveR = input.baseReviveRatio
    + (input.hasTombRelic ? 0.5 : 0)
    + (input.buildReviveExtraRatio ?? 0);
  if (reviveR <= 0) return { canRevive: false, revivedHp: 0 };
  // 비율 1.0 초과 시 maxHp 천장 적용 (즉, hpMul 적용한 maxHp 이상은 안 감)
  const cappedR = Math.min(1.0, reviveR);
  return { canRevive: true, revivedHp: input.maxHp * input.hpMul * cappedR };
}
