/**
 * EconomySystem — 영혼석 보상 산식 (1차 분리)
 *
 * 목표:
 *   - GameEngine.gameOver에서 인라인이던 영혼석 베이스/멀티/보너스 산식만 분리.
 *   - useSaveStore.recordRun / addStones / submitScore 같은 사이드 이펙트는 GameEngine에 남는다.
 */

export interface SoulstoneRewardInput {
  /** 도달 웨이브 */
  wave: number;
  /** 처치 수 */
  killCount: number;
  /** 최고 콤보 */
  comboBest: number;
  /** 시즌 stoneMul */
  seasonMul: number;
  /** 오늘의 칙령 stoneMul (없으면 1) */
  edictStoneMul: number;
  /** 인테리어 stoneMul */
  interiorStoneMul: number;
  /** 큐 누적 보너스 (마일스톤 등) */
  queuedBonusStones: number;
  /** 챌린지 클리어 보너스 */
  challengeBonusStones: number;
  /** 신규 5런 (runs < 5) — true면 +50 */
  isNewbieFirstFiveRuns: boolean;
}

export interface SoulstoneRewardResult {
  /** 멀티 적용 전 베이스 */
  base: number;
  /** 모든 멀티 적용 후 (보너스 합산 전) */
  scaled: number;
  /** 신규 보너스 */
  newbieBonus: number;
  /** 최종 영혼석 (recordRun에 넘길 값) */
  total: number;
}

/**
 * 종료 시 영혼석 산출.
 *
 *   base    = wave×10 + floor(killCount×0.5) + comboBest×2
 *   scaled  = floor(base × season × edict × interior)
 *   total   = scaled + queuedBonus + challengeBonus + newbieBonus
 *
 * GameEngine.gameOver()의 인라인 산식과 동일.
 */
export function computeSoulstoneReward(input: SoulstoneRewardInput): SoulstoneRewardResult {
  const base = input.wave * 10 + Math.floor(input.killCount * 0.5) + input.comboBest * 2;
  const scaled = Math.floor(base * input.seasonMul * input.edictStoneMul * input.interiorStoneMul);
  const newbieBonus = input.isNewbieFirstFiveRuns ? 50 : 0;
  const total = scaled + input.queuedBonusStones + input.challengeBonusStones + newbieBonus;
  return { base, scaled, newbieBonus, total };
}
