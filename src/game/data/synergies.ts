/**
 * 시너지 데이터 (GDD §4-3) — 8종
 * 적용: GameEngine이 살아있는 몬스터 태그 카운트로 test() 평가, 매칭 시 apply()로 스탯 변환
 */
export interface Synergy {
  id: string;
  name: string;
  desc: string;
  test: (counts: Record<string, number>) => boolean;
  apply: (atkMul: number, hpMul: number, spdMul: number, tags: string[]) => [number, number, number];
}

export const SYNERGIES: Synergy[] = [
  {
    id: 'magic', name: '마법진', desc: '마법 공격 ×1.4',
    test: (c) => (c.magic || 0) >= 2,
    apply: (a, h, s, tags) => tags.includes('magic') ? [a * 1.4, h, s] : [a, h, s],
  },
  {
    id: 'undead', name: '언데드 군단', desc: '언데드 공격 ×1.3',
    test: (c) => (c.undead || 0) >= 2,
    apply: (a, h, s, tags) => tags.includes('undead') ? [a * 1.3, h, s] : [a, h, s],
  },
  {
    id: 'tank', name: '탱커 라인', desc: '탱커 HP ×1.4',
    test: (c) => (c.tank || 0) >= 2,
    apply: (a, h, s, tags) => tags.includes('tank') ? [a, h * 1.4, s] : [a, h, s],
  },
  {
    id: 'mob', name: '폭도 군단', desc: '몹 공속 ×1.3',
    test: (c) => (c.mob || 0) >= 3,
    apply: (a, h, s, tags) => tags.includes('mob') ? [a, h, s * 1.3] : [a, h, s],
  },
  // === GDD 추가 4종 ===
  {
    id: 'rage', name: '분노', desc: '오크 / 야수 공격 ×1.5',
    test: (c) => (c.beast || 0) + (c.orc || 0) >= 2,
    apply: (a, h, s, tags) =>
      (tags.includes('beast') || tags.includes('orc')) ? [a * 1.5, h, s] : [a, h, s],
  },
  {
    id: 'inferno', name: '지옥화염', desc: '화염 속성 공격 ×1.6',
    test: (c) => (c.fire || 0) >= 2,
    apply: (a, h, s, tags) => tags.includes('fire') ? [a * 1.6, h, s] : [a, h, s],
  },
  {
    id: 'fulldark', name: '풀어둠', desc: '어둠 속성 모든 능력치 ×1.25',
    test: (c) => (c.dark || 0) >= 3,
    apply: (a, h, s, tags) =>
      tags.includes('dark') ? [a * 1.25, h * 1.25, s * 1.25] : [a, h, s],
  },
  {
    id: 'lifescream', name: '생명비명', desc: '언데드 / 좀비 HP ×1.4 / 공속 ×1.2',
    test: (c) => (c.undead || 0) + (c.zombie || 0) >= 3,
    apply: (a, h, s, tags) =>
      (tags.includes('undead') || tags.includes('zombie')) ? [a, h * 1.4, s * 1.2] : [a, h, s],
  },
];
