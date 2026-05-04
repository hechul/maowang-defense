/**
 * 5차 — 숨겨진 시너지 (GAME_DESIGN_OVERHAUL §2.2 발견의 즐거움)
 *
 * 특정 카드 조합을 필드에 동시 배치 시 비공개 시너지 발동.
 * 도감/시너지 패널에 표시되지 않음 — 발견 자체가 보상.
 * 일반 시너지(태그 기반)와 달리 "특정 ID 셋"이 키.
 *
 * 동시에 살아있는 monsterId 집합으로 평가.
 */

export interface HiddenSynergyDef {
  id: string;
  name: string;
  desc: string;
  /** 모든 monsterId가 동시에 살아있어야 발동 (AND) */
  requireIds: string[];
  /** PNG sprite id 발견 상태 */
  spriteId?: string;
  /** PNG sprite id 미발견 상태 (회색) */
  spriteIdLocked?: string;
  /** 발동 시 추가 효과 — 단순 수치만 */
  effects: {
    /** 모든 단위 atk 곱 */
    globalAtkMul?: number;
    /** 모든 단위 hp 곱 */
    globalHpMul?: number;
    /** 모든 단위 spd 곱 */
    globalSpdMul?: number;
    /** 처치당 마력 추가 (flat) */
    killMpBonus?: number;
    /** 마력 회복 추가 per second */
    mpRegenAdd?: number;
  };
}

export const HIDDEN_SYNERGIES: HiddenSynergyDef[] = [
  {
    id: 'hidden_arcane_circle',
    name: '비밀 마법진',
    desc: '슬라임·위치·미믹 — 마법진의 세 축',
    requireIds: ['slime', 'witch', 'mimic'],
    spriteId: 'hidden_synergy_arcane_circle',
    spriteIdLocked: 'hidden_synergy_arcane_circle_locked',
    effects: { globalAtkMul: 1.10, mpRegenAdd: 0.5 },
  },
  {
    id: 'hidden_dark_pact',
    name: '어둠의 계약',
    desc: '리치·임프·좀비 — 죽음의 삼각',
    requireIds: ['lich', 'imp', 'zombie'],
    spriteId: 'hidden_synergy_dark_pact',
    spriteIdLocked: 'hidden_synergy_dark_pact_locked',
    effects: { globalHpMul: 1.15, killMpBonus: 1 },
  },
  {
    id: 'hidden_kings_guard',
    name: '왕의 호위대',
    desc: '슬라임 군주·고블린 장군·오크 영주 — 가장 큰 셋',
    requireIds: ['slord', 'ggen', 'orcb'],
    spriteId: 'hidden_synergy_kings_guard',
    spriteIdLocked: 'hidden_synergy_kings_guard_locked',
    effects: { globalAtkMul: 1.15, globalSpdMul: 1.10 },
  },
  {
    id: 'hidden_chaos_lab',
    name: '혼돈의 실험실',
    desc: '대마녀·임프·미믹 — 알 수 없는 결과',
    requireIds: ['awitch', 'imp', 'mimic'],
    spriteId: 'hidden_synergy_chaos_lab',
    spriteIdLocked: 'hidden_synergy_chaos_lab_locked',
    effects: { globalAtkMul: 1.20 },
  },
  {
    id: 'hidden_undying_legion',
    name: '불사의 군단',
    desc: '스켈레톤·좀비·리치 — 절대 죽지 않는다',
    requireIds: ['skel', 'zombie', 'lich'],
    spriteId: 'hidden_synergy_undying_legion',
    spriteIdLocked: 'hidden_synergy_undying_legion_locked',
    effects: { globalHpMul: 1.20, mpRegenAdd: 0.3 },
  },
  {
    id: 'hidden_beast_horde',
    name: '야수의 무리',
    desc: '오크·미노타우로스·고블린 — 짐승의 본능',
    requireIds: ['orc', 'mino', 'goblin'],
    spriteId: 'hidden_synergy_beast_horde',
    spriteIdLocked: 'hidden_synergy_beast_horde_locked',
    effects: { globalSpdMul: 1.20, killMpBonus: 1 },
  },
];

/** 살아있는 monsterId 집합으로 활성 숨겨진 시너지 set 산출 */
export function activeHiddenSynergies(aliveTypeIds: ReadonlySet<string>): HiddenSynergyDef[] {
  const out: HiddenSynergyDef[] = [];
  for (const h of HIDDEN_SYNERGIES) {
    if (h.requireIds.every((id) => aliveTypeIds.has(id))) out.push(h);
  }
  return out;
}
