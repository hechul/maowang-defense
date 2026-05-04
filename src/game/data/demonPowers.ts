/**
 * 마왕 강화 (Demon Powers) — 누적 보스 처치로 영구 해금
 * GAME_DESIGN_OVERHAUL §3.4
 *
 * 영혼강화(스킬트리)와 별개의 메타 진행. 보스 처치만 카운트.
 * 해금 시 모든 런에 자동 적용.
 */

export interface DemonPowerDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
  /** 누적 보스 처치 N마리 */
  unlockBossKills: number;
  /** 적용 효과 */
  effect: {
    startMpBonus?: number;       // 시작 마력 +N
    ultiChargeRate?: number;     // 필살기 충전율 ×N
    castleHpRatio?: number;      // 마왕성 시작 HP 비율 ×N
    cardCostReduction?: number;  // 카드 펼치기 비용 -N% (0~1)
    rallyCdReduction?: number;   // Rally 쿨다운 -N초
    emergencyRevealExtra?: number; // 위급 펼치기 추가 +N회
    revivalHpRatio?: number;     // 부활 시 HP 비율 ×N
  };
}

export const DEMON_POWERS: DemonPowerDef[] = [
  {
    id: 'awakening',
    icon: '🌑',
    name: '각성의 시작',
    desc: '시작 마력 +30',
    unlockBossKills: 1,
    effect: { startMpBonus: 30 },
  },
  {
    id: 'castle_will',
    icon: '🏰',
    name: '성벽의 의지',
    desc: '마왕성 시작 HP +5%',
    unlockBossKills: 5,
    effect: { castleHpRatio: 1.05 },
  },
  {
    id: 'dark_charge',
    icon: '⚡',
    name: '어둠의 흐름',
    desc: '필살기 충전 +10%',
    unlockBossKills: 10,
    effect: { ultiChargeRate: 1.10 },
  },
  {
    id: 'efficient_rite',
    icon: '🪄',
    name: '효율의 제의',
    desc: '카드 펼치기 비용 -3%',
    unlockBossKills: 20,
    effect: { cardCostReduction: 0.03 },
  },
  {
    id: 'swift_command',
    icon: '⚡',
    name: '신속 명령',
    desc: '돌격(Rally) 쿨다운 -0.3초',
    unlockBossKills: 30,
    effect: { rallyCdReduction: 0.3 },
  },
  {
    id: 'desperate_will',
    icon: '🔥',
    name: '절체절명',
    desc: '위급 무료 펼치기 +1회 (런당 2회)',
    unlockBossKills: 50,
    effect: { emergencyRevealExtra: 1 },
  },
  {
    id: 'undying',
    icon: '💀',
    name: '불멸의 어둠',
    desc: '부활 시 HP 60%',
    unlockBossKills: 75,
    effect: { revivalHpRatio: 0.6 },
  },
  {
    id: 'true_demon',
    icon: '👑',
    name: '진정한 마왕',
    desc: '시작 마력 +50, 마왕성 +10%, 필살기 +10%',
    unlockBossKills: 100,
    effect: { startMpBonus: 50, castleHpRatio: 1.10, ultiChargeRate: 1.10 },
  },
];

/** 누적 보스 처치 수 기반으로 해금된 powers 합산 */
export function unlockedDemonPowers(totalBossKills: number): DemonPowerDef[] {
  return DEMON_POWERS.filter((p) => totalBossKills >= p.unlockBossKills);
}

/** 합산된 effect 객체 — GameEngine.start()에서 사용 */
export function aggregatedDemonPower(totalBossKills: number) {
  const unlocked = unlockedDemonPowers(totalBossKills);
  const out = {
    startMpBonus: 0,
    ultiChargeRate: 1,
    castleHpRatio: 1,
    cardCostReduction: 0,
    rallyCdReduction: 0,
    emergencyRevealExtra: 0,
    revivalHpRatio: 0.5,  // 기본 50%
  };
  for (const p of unlocked) {
    if (p.effect.startMpBonus) out.startMpBonus += p.effect.startMpBonus;
    if (p.effect.ultiChargeRate) out.ultiChargeRate *= p.effect.ultiChargeRate;
    if (p.effect.castleHpRatio) out.castleHpRatio *= p.effect.castleHpRatio;
    if (p.effect.cardCostReduction) out.cardCostReduction += p.effect.cardCostReduction;
    if (p.effect.rallyCdReduction) out.rallyCdReduction += p.effect.rallyCdReduction;
    if (p.effect.emergencyRevealExtra) out.emergencyRevealExtra += p.effect.emergencyRevealExtra;
    if (p.effect.revivalHpRatio) out.revivalHpRatio = p.effect.revivalHpRatio;  // 덮어쓰기
  }
  return out;
}

/** 다음 해금 대상 (UI 표시용) */
export function nextDemonPower(totalBossKills: number): DemonPowerDef | null {
  return DEMON_POWERS.find((p) => totalBossKills < p.unlockBossKills) || null;
}
