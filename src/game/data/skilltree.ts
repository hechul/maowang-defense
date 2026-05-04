/**
 * 스킬트리 (GDD §7-2 — 영혼석 영구 강화)
 */
import type { SkillId } from '../../store/useSaveStore';

export type SkillTree = 'rule' | 'summon' | 'doom';

export interface SkillDef {
  id: SkillId;
  tree: SkillTree;
  icon: string;
  name: string;
  desc: (rank: number) => string;
  max: number;
  baseCost: number;
  costMul?: number;
}

export const SKILLS: Record<SkillId, SkillDef> = {
  // 지배 트리
  castleHp:  { id: 'castleHp',  tree: 'rule', icon: '🏰', name: '견고한 성벽', desc: (r) => `마왕성 HP +${r * 10}%`, max: 10, baseCost: 100, costMul: 1.4 },
  startMp:   { id: 'startMp',   tree: 'rule', icon: '⚡', name: '마력 비축',   desc: (r) => `시작 마력 +${r * 50}`,  max: 5,  baseCost: 120, costMul: 1.5 },
  cardCost:  { id: 'cardCost',  tree: 'rule', icon: '🪄', name: '어둠의 제의', desc: (r) => `카드 펼치기 비용 -${r * 5}%`,   max: 10, baseCost: 60,  costMul: 1.4 },
  // 소환 트리
  monAtk:    { id: 'monAtk',    tree: 'summon', icon: '⚔', name: '사악한 인도', desc: (r) => `몬스터 공격 +${r * 5}%`, max: 10, baseCost: 130, costMul: 1.45 },
  monHp:     { id: 'monHp',     tree: 'summon', icon: '🛡', name: '어둠의 가호', desc: (r) => `몬스터 HP +${r * 5}%`,   max: 10, baseCost: 130, costMul: 1.45 },
  startMon:  { id: 'startMon',  tree: 'summon', icon: '👶', name: '시작 군단',   desc: (r) => `시작 시 슬라임 ${r}체 무료`, max: 3, baseCost: 200, costMul: 1.5 },
  // 파멸 트리
  ultiDmg:   { id: 'ultiDmg',   tree: 'doom', icon: '💀', name: '파멸의 의지', desc: (r) => `필살기 데미지 +${r * 10}%`, max: 10, baseCost: 160, costMul: 1.5 },
  ultiCharge:{ id: 'ultiCharge',tree: 'doom', icon: '🔮', name: '분노의 흐름', desc: (r) => `필살기 충전 +${r * 5}%`,   max: 10, baseCost: 120, costMul: 1.45 },
  aura:      { id: 'aura',      tree: 'doom', icon: '☠',  name: '마왕의 오라', desc: (r) => `주변 몬스터 공격 +${r * 3}%`, max: 5, baseCost: 150, costMul: 1.5 },
};

export const TREE_INFO: Record<SkillTree, { name: string; color: string }> = {
  rule:   { name: '지 배', color: '#74b9ff' },
  summon: { name: '소 환', color: '#7bed9f' },
  doom:   { name: '파 멸', color: '#FF7675' },
};

export function skillCost(id: SkillId, rank: number, runs: number = 999): number {
  const s = SKILLS[id];
  if (rank >= s.max) return Infinity;
  // E-3: 후반 rank 비용 곡선 완화 — rank 4+ 부터 multiplier 0.85 적용 (ECON E-2: 6→4)
  let mul = s.costMul || 1;
  let c = s.baseCost;
  for (let r = 0; r < rank; r++) {
    const stepMul = r >= 4 ? mul * 0.85 : mul;
    c *= stepMul;
  }
  c = Math.floor(c);
  // 안티-좌절: 첫 5런 신규 유저 — rank 0 50% / rank 1 70% / rank 2 85% 할인 (ECON E-2)
  if (runs < 5) {
    if (rank === 0) c = Math.floor(c * 0.5);
    else if (rank === 1) c = Math.floor(c * 0.7);
    else if (rank === 2) c = Math.floor(c * 0.85);
  }
  return c;
}
