/**
 * 리스크 카드 / 분기 카드 — 의사결정 깊이 강화
 * GAME_DESIGN_OVERHAUL §3.2
 *
 * 리스크 카드: 강력하지만 페널티 동반. 카드 모달 3장 중 1장으로 등장 (15% 확률).
 * 분기 카드: 5wave마다 1회 강제 등장. 다음 5wave 빌드 방향 결정.
 */

export type RiskEffect =
  | { kind: 'mp_drain'; amount: number }            // 마력 -N
  | { kind: 'castle_hp_drain'; pct: number }        // 마왕성 -N% HP
  | { kind: 'spawn_extra_enemy'; count: number }    // 적 N명 추가 spawn
  | { kind: 'sacrifice_ally'; rarity?: string };    // 살아있는 아군 1마리 죽이고 보상

export interface RiskCardDef {
  id: string;
  name: string;
  desc: string;
  rewardMonsterId: string;        // 픽 시 등장할 몬스터 (보통 epic+)
  risks: RiskEffect[];
}

export const RISK_CARDS: RiskCardDef[] = [
  {
    id: 'risk_legendary_blood',
    name: '피의 계약',
    desc: '마왕성 -10% HP / 전설 카드 1장',
    rewardMonsterId: 'awitch',  // 3성 마법
    risks: [{ kind: 'castle_hp_drain', pct: 0.10 }],
  },
  {
    id: 'risk_undead_pact',
    name: '죽음의 계약',
    desc: '아군 1마리 희생 / epic 언데드 1장',
    rewardMonsterId: 'dlich',
    risks: [{ kind: 'sacrifice_ally' }],
  },
  {
    id: 'risk_invasion',
    name: '침입자 유인',
    desc: '적 3명 즉시 등장 / 강한 카드 1장',
    rewardMonsterId: 'owar',
    risks: [{ kind: 'spawn_extra_enemy', count: 3 }],
  },
  {
    id: 'risk_mana_burn',
    name: '마력 번제',
    desc: '마력 -100 / epic 화염 1장',
    rewardMonsterId: 'devil',
    risks: [{ kind: 'mp_drain', amount: 100 }],
  },
  {
    id: 'risk_chaos',
    name: '혼돈의 부름',
    desc: '마왕성 -15% HP + 마력 -50 / 전설 1장',
    rewardMonsterId: 'slord',
    risks: [
      { kind: 'castle_hp_drain', pct: 0.15 },
      { kind: 'mp_drain', amount: 50 },
    ],
  },
];

export function pickRandomRiskCard(): RiskCardDef {
  return RISK_CARDS[Math.floor(Math.random() * RISK_CARDS.length)];
}

/**
 * 분기 카드 — 5wave마다 강제 등장. 다음 5wave 동안 빌드 방향성 부여.
 * 효과는 활성 동안 카드 풀 가중치 변경 (해당 태그 등장률 ↑).
 */
export interface BranchCardDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
  /** 다음 5wave 동안 가중치 배수 ↑ */
  tagBoost: string;
  /** 활성 동안 추가 buff */
  buff: { atkMul?: number; hpMul?: number; spdMul?: number };
}

export const BRANCH_CARDS: BranchCardDef[] = [
  {
    id: 'branch_flame',
    icon: '🔥',
    name: '화염의 길',
    desc: '5웨이브 동안 화염 카드 등장률 ↑, 화염 공격 +20%',
    tagBoost: 'fire',
    buff: { atkMul: 1.20 },
  },
  {
    id: 'branch_undead',
    icon: '💀',
    name: '언데드의 길',
    desc: '5웨이브 동안 언데드 등장률 ↑, 언데드 HP +30%',
    tagBoost: 'undead',
    buff: { hpMul: 1.30 },
  },
  {
    id: 'branch_tank',
    icon: '🛡',
    name: '방벽의 길',
    desc: '5웨이브 동안 탱커 등장률 ↑, 탱커 HP +50%',
    tagBoost: 'tank',
    buff: { hpMul: 1.50 },
  },
  {
    id: 'branch_magic',
    icon: '🔮',
    name: '마법의 길',
    desc: '5웨이브 동안 마법 등장률 ↑, 마법 공격 +25%',
    tagBoost: 'magic',
    buff: { atkMul: 1.25 },
  },
  {
    id: 'branch_swarm',
    icon: '🐜',
    name: '폭도의 길',
    desc: '5웨이브 동안 mob 등장률 ↑, mob 공속 +30%',
    tagBoost: 'mob',
    buff: { spdMul: 1.30 },
  },
];

export function pickRandomBranchCard(): BranchCardDef {
  return BRANCH_CARDS[Math.floor(Math.random() * BRANCH_CARDS.length)];
}
