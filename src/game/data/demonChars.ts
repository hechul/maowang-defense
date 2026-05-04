/**
 * P1-3 마왕 캐릭터 4종 — 각자 패시브/시작 카드/대사 다름.
 *
 * GameEngine은 selectedDemonId 만 알면 됨.
 * - aggregatedDemonCharBonus(id) → 시작 시 합산 적용.
 * - starterCardIds(id) → 모집 풀에 추가될 시작 카드.
 */

export type DemonCharId = 'shadow' | 'crimson' | 'azure' | 'verdant';

export interface DemonCharDef {
  id: DemonCharId;
  name: string;
  title: string;
  desc: string;
  /** 영구 패시브 — start() 시 합산. */
  passive: {
    startMpBonus?: number;
    castleHpBonus?: number;
    cardCostMul?: number;        // 0.9 = -10%
    bossDmgMul?: number;          // 1.2 = +20%
    rallyCdSubSec?: number;
  };
  /** 시작 카드 풀에 강제 포함될 monsterId */
  starterCardIds: string[];
  /** 첫 대사 (마왕 말풍선) */
  introLine: string;
  /** 잠금 해제 조건 라벨 (UI 표시) */
  unlockLabel: string;
  /** 잠금 해제 조건 — { type, value }. 'level' = 마왕 레벨, 'bossKills' = 누적 보스 처치 */
  unlock: { type: 'default' | 'level' | 'bossKills' | 'iap'; value?: number; sku?: string };
}

export const DEMON_CHARS: DemonCharDef[] = [
  {
    id: 'shadow',
    name: '어둠의 마왕',
    title: '봉인을 푼 자',
    desc: '균형 — 모든 면에서 평균. 첫 마왕.',
    passive: { startMpBonus: 0 },
    starterCardIds: ['slime', 'goblin', 'skel', 'zombie'],
    introLine: '운명의 카드를 펼쳐라.',
    unlockLabel: '기본 마왕 (즉시)',
    unlock: { type: 'default' },
  },
  {
    id: 'crimson',
    name: '진홍의 마왕',
    title: '분노의 화염을 두른 자',
    desc: '공격 — 보스 데미지 +20%, 시작 마력 -20.',
    passive: { startMpBonus: -20, bossDmgMul: 1.2, rallyCdSubSec: 0.5 },
    starterCardIds: ['imp', 'orc', 'mino', 'devil'],
    introLine: '용사들을 불태워 재로 만들어라.',
    unlockLabel: '마왕 레벨 5 도달',
    unlock: { type: 'level', value: 5 },
  },
  {
    id: 'azure',
    name: '창공의 마왕',
    title: '주문을 짠 자',
    desc: '마법 — 시작 마력 +30, 카드 비용 -10%.',
    passive: { startMpBonus: 30, cardCostMul: 0.9 },
    starterCardIds: ['witch', 'lich', 'mimic', 'apprentice'],
    introLine: '마력의 흐름이 곧 운명이다.',
    unlockLabel: '마왕 레벨 12 도달',
    unlock: { type: 'level', value: 12 },
  },
  {
    id: 'verdant',
    name: '녹빛의 마왕',
    title: '뼈와 시체를 지배하는 자',
    desc: '언데드 — 마왕성 HP +200, 부활 빈도 ↑.',
    passive: { castleHpBonus: 200 },
    starterCardIds: ['skel', 'sknt', 'zombie', 'zomk'],
    introLine: '죽음은 끝이 아니다. 시작이다.',
    unlockLabel: '누적 보스 30 처치',
    unlock: { type: 'bossKills', value: 30 },
  },
];

export function getDemonChar(id: string | null | undefined): DemonCharDef {
  return DEMON_CHARS.find((d) => d.id === id) ?? DEMON_CHARS[0];
}

export function isDemonUnlocked(
  d: DemonCharDef,
  ctx: { demonLevel: number; totalBossKills: number; purchasedSkus: string[] },
): boolean {
  switch (d.unlock.type) {
    case 'default': return true;
    case 'level': return ctx.demonLevel >= (d.unlock.value ?? 0);
    case 'bossKills': return ctx.totalBossKills >= (d.unlock.value ?? 0);
    case 'iap': return ctx.purchasedSkus.includes(d.unlock.sku ?? '');
  }
}
