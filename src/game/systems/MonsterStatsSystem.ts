/**
 * MonsterStatsSystem — 몬스터 spawn 시 wave 스케일링 / relic 멀티 산식 (1차 분리)
 *
 * 비목표:
 *   - Unit 인스턴스 생성, 라인 배치, 소환 이펙트, 도감 등록은 GameEngine에 남는다.
 */

export interface MonsterMaxInput {
  /** 챌린지 modifiers.maxMonsters (기본 14) */
  challengeMaxMonsters?: number;
  /** 'swarm' relic 보유 — +2 */
  hasSwarmRelic: boolean;
}

/** 동시 배치 가능한 최대 몬스터 수. */
export function calculateMonsterMax(input: MonsterMaxInput): number {
  const base = input.challengeMaxMonsters ?? 12;
  return base + (input.hasSwarmRelic ? 2 : 0);
}

export interface MonsterStatsInput {
  /** 현재 웨이브 (난이도 곡선용) */
  wave: number;
  /** 챌린지 monsterHpMul */
  challengeHpMul: number;
  /** 'iron' relic — HP ×1.15 */
  hasIronRelic: boolean;
  /** 'wrath' relic — atk ×1.20 */
  hasWrathRelic: boolean;
  /** 'sprint' relic — spd ×1.20 */
  hasSprintRelic: boolean;
  /** 'razor' relic — atkCd ÷ 1.15 */
  hasRazorRelic: boolean;
}

export interface MonsterStatsResult {
  hpMul: number;
  atkMul: number;
  spdMul: number;
  /** atkCd에 나눠 적용 (역수). 호출자: `def.atkCd / atkSpdDivisor` */
  atkSpdDivisor: number;
}

/**
 * 몬스터 spawn 시 스탯 멀티 산출.
 *   hpMul  = challengeHpMul × waveHpScale × (iron ? 1.15 : 1)
 *   atkMul = waveAtkScale × (wrath ? 1.20 : 1)
 *   spdMul = waveSpdScale × (sprint ? 1.20 : 1)
 *   waveHpScale = 1 + min(0.42, (wave - 1) × 0.018)
 *   waveAtkScale= 1 + min(0.28, (wave - 1) × 0.012)
 *   waveSpdScale= 1 + min(0.22, (wave - 1) × 0.008)
 *   atkSpdDivisor = razor ? 1.15 : 1
 */
export function calculateMonsterStats(input: MonsterStatsInput): MonsterStatsResult {
  const wave = Math.max(1, input.wave || 1);
  const waveHpScale = 1 + Math.min(0.5, (wave - 1) * 0.018);
  const waveAtkScale = 1 + Math.min(0.36, (wave - 1) * 0.012);
  const waveSpdScale = 1 + Math.min(0.22, (wave - 1) * 0.007);
  const hpMul = input.challengeHpMul * waveHpScale * (input.hasIronRelic ? 1.15 : 1);
  const atkMul = waveAtkScale * (input.hasWrathRelic ? 1.20 : 1);
  const spdMul = waveSpdScale * (input.hasSprintRelic ? 1.20 : 1);
  const atkSpdDivisor = input.hasRazorRelic ? 1.15 : 1;
  return { hpMul, atkMul, spdMul, atkSpdDivisor };
}

export interface MonsterDotInput {
  /** 'serpent' relic 보유 — 몬스터 공격에 독 DoT 부여 */
  hasSerpentRelic: boolean;
  /** 몬스터에 이미 dot가 있으면 serpent 미적용 */
  hasInherentDot: boolean;
  /** 몬스터 baseAtk — DoT dmg 산출에 사용 */
  baseAtk: number;
}

export interface MonsterDotResult {
  /** 적용할 dot (없으면 undefined) */
  dot?: { dmg: number; dur: number };
}

/**
 * serpent relic 기반 DoT 산출.
 *   dot.dmg = max(2, floor(baseAtk × 0.15)), dur = 2
 *   inherentDot가 있으면 미적용.
 */
export function computeMonsterDot(input: MonsterDotInput): MonsterDotResult {
  if (!input.hasSerpentRelic || input.hasInherentDot) return {};
  return {
    dot: { dmg: Math.max(2, Math.floor(input.baseAtk * 0.15)), dur: 2 },
  };
}
