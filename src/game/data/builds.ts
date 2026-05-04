/**
 * 빌드 컨셉 9종 — 사용자가 "이번 런은 X 빌드" 명확한 목표
 * GAME_DESIGN_OVERHAUL §3.3
 *
 * 각 빌드는 (a) 진행도 측정 기준 (b) 달성 시 보상 (c) 칭호
 * 진행도는 한 런 내 누적 — 50% 도달 시 ResultScreen에 hint, 100% 시 칭호 적립.
 */

export interface BuildDef {
  id: string;
  icon: string;
  name: string;
  desc: string;                 // 컨셉 한 줄
  /**
   * 진행도 측정. metrics 합산 / target 도달 시 100%.
   * - tagPicks[T]: 픽한 카드의 태그 T 누적
   * - relicHas[R]: 유물 R 보유 (1=가지면, 0)
   * - synergyActiveTurns[S]: 시너지 S 활성 시 처치당 1
   * - ultiUses: 필살기 사용 횟수
   */
  goal: {
    tagPicks?: Record<string, number>;
    relicAny?: string[];          // 둘 중 1개 이상
    synergyActiveProcs?: { id: string; need: number };
    ultiUses?: number;
    bossKills?: number;
  };
  /** 칭호 영구 적립 시 영혼석 보너스 */
  reward: number;
}

export const BUILDS: BuildDef[] = [
  {
    id: 'zombie_legion',
    icon: '🧟',
    name: '좀비 군단',
    desc: '죽지 않는 물량으로 압살',
    goal: {
      tagPicks: { undead: 8, zombie: 4 },
      relicAny: ['tomb', 'serpent'],
    },
    reward: 300,
  },
  {
    id: 'flame_rampage',
    icon: '🔥',
    name: '화염 폭주',
    desc: '광역 화염으로 모두 태우기',
    goal: {
      tagPicks: { fire: 6, magic: 4 },
      relicAny: ['inferno', 'crown'],
      ultiUses: 3,
    },
    reward: 300,
  },
  {
    id: 'magic_school',
    icon: '🔮',
    name: '마법 학파',
    desc: '원거리 폭딜 빌드',
    goal: {
      tagPicks: { magic: 10 },
      synergyActiveProcs: { id: 'magic', need: 30 },
    },
    reward: 300,
  },
  {
    id: 'slime_kingdom',
    icon: '🟣',
    name: '슬라임 왕국',
    desc: '탱킹 + 끝없는 수량',
    goal: {
      tagPicks: { tank: 8 },
      relicAny: ['swarm', 'iron'],
      synergyActiveProcs: { id: 'tank', need: 20 },
    },
    reward: 300,
  },
  {
    id: 'undead_lord',
    icon: '☠',
    name: '언데드 군주',
    desc: '부활과 시너지의 절정',
    goal: {
      tagPicks: { undead: 10 },
      relicAny: ['bloodmoon', 'tomb'],
      bossKills: 2,
    },
    reward: 350,
  },
  {
    id: 'beast_wrath',
    icon: '🐺',
    name: '야수의 분노',
    desc: '빠른 처치, 더 빠른 다음',
    goal: {
      tagPicks: { beast: 4, orc: 4 },
      relicAny: ['wrath', 'sprint'],
    },
    reward: 300,
  },
  {
    id: 'dark_mystic',
    icon: '🌑',
    name: '어둠 신비주의',
    desc: '어둠 속에서 빛난다',
    goal: {
      tagPicks: { dark: 6 },
      relicAny: ['abyss', 'hex'],
      synergyActiveProcs: { id: 'fulldark', need: 15 },
    },
    reward: 350,
  },
  {
    id: 'greedy_path',
    icon: '🪙',
    name: '탐욕의 길',
    desc: '자원이 자원을 부른다',
    goal: {
      tagPicks: { support: 4 },
      relicAny: ['greed', 'vault'],
      bossKills: 1,
    },
    reward: 300,
  },
  {
    id: 'tyrant_strike',
    icon: '💀',
    name: '폭군의 일격',
    desc: '한 방으로 끝낸다',
    goal: {
      ultiUses: 6,
      relicAny: ['crown', 'oracle'],
      bossKills: 2,
    },
    reward: 350,
  },
];

/** 빌드 진행도 측정용 누적 통계 (한 런) */
export interface BuildStats {
  tagPicks: Record<string, number>;
  relics: string[];
  synergyActiveProcs: Record<string, number>;
  ultiUses: number;
  bossKills: number;
}

export function emptyBuildStats(): BuildStats {
  return {
    tagPicks: {},
    relics: [],
    synergyActiveProcs: {},
    ultiUses: 0,
    bossKills: 0,
  };
}

/** 빌드별 0~1 진행도 계산 (런 종료 시 + 결과 화면용) */
export function buildProgress(build: BuildDef, stats: BuildStats): number {
  let totalGoals = 0;
  let achieved = 0;

  if (build.goal.tagPicks) {
    for (const [tag, need] of Object.entries(build.goal.tagPicks)) {
      totalGoals++;
      const got = stats.tagPicks[tag] || 0;
      achieved += Math.min(1, got / need);
    }
  }
  if (build.goal.relicAny) {
    totalGoals++;
    if (build.goal.relicAny.some((r) => stats.relics.includes(r))) achieved += 1;
  }
  if (build.goal.synergyActiveProcs) {
    totalGoals++;
    const need = build.goal.synergyActiveProcs.need;
    const got = stats.synergyActiveProcs[build.goal.synergyActiveProcs.id] || 0;
    achieved += Math.min(1, got / need);
  }
  if (build.goal.ultiUses) {
    totalGoals++;
    achieved += Math.min(1, stats.ultiUses / build.goal.ultiUses);
  }
  if (build.goal.bossKills) {
    totalGoals++;
    achieved += Math.min(1, stats.bossKills / build.goal.bossKills);
  }
  if (totalGoals === 0) return 0;
  return achieved / totalGoals;
}

/** 가장 진행도 높은 빌드 1개 (ResultScreen용) */
export function dominantBuild(stats: BuildStats): { build: BuildDef; progress: number } | null {
  let best: { build: BuildDef; progress: number } | null = null;
  for (const b of BUILDS) {
    const p = buildProgress(b, stats);
    if (p > 0 && (!best || p > best.progress)) best = { build: b, progress: p };
  }
  return best;
}

/* =====================================================================
 *  빌드 체감 보너스 시스템 (5차 — 9종 빌드 모두 인게임 효과 보장)
 *  - 진행도 50% 도달 시 Tier 1, 100% 시 Tier 2 효과 발동.
 *  - 여러 빌드의 보너스가 동시 활성 가능 (혼합 빌드 보상).
 *  - GameEngine.recalcSynergies / 처치 / 부활 / 필살기 / 보스킬 hook 에서 참조.
 * ===================================================================== */

export interface BuildBonusState {
  /** 태그별 atk 곱 (모든 활성 빌드 누적) */
  tagAtkMul: Record<string, number>;
  /** 태그별 hp 곱 */
  tagHpMul: Record<string, number>;
  /** 태그별 spd 곱 */
  tagSpdMul: Record<string, number>;
  /** 처치당 추가 마력 보너스 (greedy_path T1 +1, beast T1 chain ×1.5 multiplier 별도) */
  killMpBonusFlat: number;
  /** 처치 시 마력 보상에 곱하는 배수 (beast_wrath T1 kill-chain 활성 시 1.5) */
  killMpChainMul: number;
  /** 카드 펼치기 비용 추가 곱 (greedy_path T2 0.9) */
  cardCostExtraMul: number;
  /** 필살기 데미지 추가 곱 (tyrant_strike T1 1.25) */
  ultiDmgExtraMul: number;
  /** 필살기 사용 후 6초간 모든 단위 atk 곱 (tyrant_strike T2 1.4) */
  ultiBuffAtkMul: number;
  /** undead/zombie 부활 시 HP 복구 비율 추가 (undead_lord T1 +0.5) */
  reviveHpExtraRatio: number;
  /** 보스 처치 시 영혼석 보너스 곱 (greedy_path T2 1.5) */
  bossSoulstoneMul: number;
  /** 보스 처치 시 죽은 undead/zombie 모두 부활 트리거 (undead_lord T2) */
  fullReviveOnBossKill: boolean;
  /** dark 태그 처치 시 임시 fulldark 강화 트리거 (dark_mystic T2 0.8s) */
  darkKillProc: boolean;
  /** 활성 빌드 라벨 (HUD/배너용) */
  activeLabels: { id: string; name: string; tier: 1 | 2; icon: string }[];
}

export function emptyBuildBonusState(): BuildBonusState {
  return {
    tagAtkMul: {},
    tagHpMul: {},
    tagSpdMul: {},
    killMpBonusFlat: 0,
    killMpChainMul: 1,
    cardCostExtraMul: 1,
    ultiDmgExtraMul: 1,
    ultiBuffAtkMul: 1,
    reviveHpExtraRatio: 0,
    bossSoulstoneMul: 1,
    fullReviveOnBossKill: false,
    darkKillProc: false,
    activeLabels: [],
  };
}

/** 두 mul 레코드 합성 — 곱셈 누적 */
function mergeTagMul(target: Record<string, number>, src: Record<string, number>) {
  for (const [k, v] of Object.entries(src)) {
    target[k] = (target[k] || 1) * v;
  }
}

/**
 * 현재 buildStats 기준으로 활성화된 모든 빌드 보너스를 합성한 상태 반환.
 * 진행도 ≥ 0.5 → Tier 1, ≥ 1.0 → Tier 2. (tier 2는 tier 1 효과도 포함)
 */
export function getActiveBuildBonusState(stats: BuildStats): BuildBonusState {
  const out = emptyBuildBonusState();

  for (const b of BUILDS) {
    const p = buildProgress(b, stats);
    if (p < 0.5) continue;
    const tier: 1 | 2 = p >= 1.0 ? 2 : 1;
    out.activeLabels.push({ id: b.id, name: b.name, tier, icon: b.icon });

    switch (b.id) {
      case 'beast_wrath':
        // T1: kill-chain 마력 ×1.5 (GameEngine이 1.5초 윈도우 적용)
        // T2: beast/orc atk +20% / spd +10%
        out.killMpChainMul = Math.max(out.killMpChainMul, 1.5);
        if (tier === 2) {
          mergeTagMul(out.tagAtkMul, { beast: 1.20, orc: 1.20 });
          mergeTagMul(out.tagSpdMul, { beast: 1.10, orc: 1.10 });
        }
        break;
      case 'dark_mystic':
        // T1: dark atk +20% / hp +10% (시너지 무관)
        // T2: 추가로 darkKillProc — dark 처치당 짧은 atk 폭주
        mergeTagMul(out.tagAtkMul, { dark: 1.20 });
        mergeTagMul(out.tagHpMul, { dark: 1.10 });
        if (tier === 2) out.darkKillProc = true;
        break;
      case 'greedy_path':
        // T1: 처치 시 +1 마력
        // T2: 카드 비용 ×0.9 추가, 보스 영혼석 ×1.5
        out.killMpBonusFlat += 1;
        if (tier === 2) {
          out.cardCostExtraMul = Math.min(out.cardCostExtraMul, 0.9);
          out.bossSoulstoneMul = Math.max(out.bossSoulstoneMul, 1.5);
        }
        break;
      case 'tyrant_strike':
        // T1: 필살기 데미지 ×1.25
        // T2: 필살기 사용 후 6초간 atk×1.4 (전 단위)
        out.ultiDmgExtraMul = Math.max(out.ultiDmgExtraMul, 1.25);
        if (tier === 2) out.ultiBuffAtkMul = Math.max(out.ultiBuffAtkMul, 1.4);
        break;
      case 'undead_lord':
        // T1: undead/zombie 부활 시 +50% HP (총 maxHp×1.0)
        // T2: 보스 처치 시 죽은 undead/zombie 모두 부활
        out.reviveHpExtraRatio = Math.max(out.reviveHpExtraRatio, 0.5);
        if (tier === 2) out.fullReviveOnBossKill = true;
        break;
      // 기존 4종(zombie/flame/magic/slime)은 별도 hook에서 이미 강화됨 — 여기선 라벨만
    }
  }
  return out;
}
