/**
 * HeroStatsSystem — hero/boss spawn 시 wave 스케일링 산식 (1차 분리)
 *
 * 비목표:
 *   - Unit 생성 / spawn 위치 / 튜토리얼 큐 / 도감 등록은 GameEngine에 남는다.
 *   - 여기서는 wave/엘리트/relic/edict로부터 hp/atk/spd/atkCd/mpReward 멀티만 산출.
 */

export interface HeroStatsInput {
  wave: number;
  /** 보스인지 — 스케일링은 동일하지만 호출자 필드 차별화에 활용 */
  isBoss: boolean;
  /** 엘리트 hero (BAL-9) — HP/ATK ×1.5 */
  isElite: boolean;
  /** 신규 유저(runs<3) + wave≤3이면 0.85배로 약화 */
  isNewbieEarlyWave: boolean;
  /** 'hourglass' relic — spd ×0.8 */
  hasHourglassRelic: boolean;
  /** 'hex' relic — hero atk ×0.9 */
  hasHexRelic: boolean;
  /** 'reaper' relic — mpReward ×1.2 */
  hasReaperRelic: boolean;
  /** 챌린지 modifiers.heroSpdMul */
  challengeHeroSpdMul: number;
  /** 챌린지 modifiers.heroAtkSpdMul (atkCd는 역수) */
  challengeHeroAtkSpdMul: number;
  /** 칙령 modifiers.enemyHpMul */
  edictEnemyHpMul: number;
  /** 칙령 modifiers.enemyAtkMul */
  edictEnemyAtkMul: number;
  /** 도감 조각 100 도달 → 해당 hero에 영구 ×0.9 (HP/ATK) */
  hasBaneAgainstThisHero: boolean;
}

export interface HeroStatsResult {
  /** wave 스케일 (HP/ATK 공통 베이스) */
  scale: number;
  hpMul: number;
  atkMul: number;
  spdMul: number;
  /** atkCd에 나눠 적용 (역수) — 호출자: `def.atkCd / atkSpdDivisor` */
  atkSpdDivisor: number;
  /** mpReward 스케일 ((1 + (wave-1)*0.05) × reaper × elite) */
  mpRewardMul: number;
}

/**
 * hero/boss spawn 시 스탯 멀티 산출.
 *   scale     = 1 + (wave-1)×0.085 (+ wave>25면 ×(1 + (wave-25)×0.04))
 *   hpMul     = scale × elite × newbie × edictHp × bane
 *   atkMul    = scale × hex × elite × newbie × edictAtk × bane
 *   spdMul    = hourglass × challengeHeroSpd
 *   atkSpdDiv = challengeHeroAtkSpd
 *   mpRewardMul = (0.75 + (wave-1)×0.035) × reaper × elite
 * GameEngine.spawnHero 인라인 산식과 동일.
 */
export function calculateHeroStats(input: HeroStatsInput): HeroStatsResult {
  let scale = 1 + (input.wave - 1) * 0.085;
  if (input.wave > 25) scale *= 1 + (input.wave - 25) * 0.04;
  const eliteMul = input.isElite ? 1.5 : 1;
  const newbieMul = input.isNewbieEarlyWave ? 0.85 : 1;
  const baneMul = input.hasBaneAgainstThisHero ? 0.9 : 1;
  const hexMul = input.hasHexRelic ? 0.9 : 1;
  const slowMul = input.hasHourglassRelic ? 0.8 : 1;
  const reaperMul = input.hasReaperRelic ? 1.2 : 1;

  const hpMul = scale * eliteMul * newbieMul * input.edictEnemyHpMul * baneMul;
  const atkMul = scale * hexMul * eliteMul * newbieMul * input.edictEnemyAtkMul * baneMul;
  const spdMul = slowMul * input.challengeHeroSpdMul;
  const atkSpdDivisor = input.challengeHeroAtkSpdMul;
  const mpRewardMul = (0.75 + (input.wave - 1) * 0.035) * reaperMul * eliteMul;

  return { scale, hpMul, atkMul, spdMul, atkSpdDivisor, mpRewardMul };
}
