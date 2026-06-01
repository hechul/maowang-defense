/**
 * 인테리어 — 마왕성 꾸미기 (영혼석 sink)
 * GAME_DESIGN_OVERHAUL §4.5
 *
 * 카테고리별로 1개씩 장착. 시각 효과 + 작은 보너스.
 */

export type InteriorCategory = 'sign' | 'flag' | 'aura' | 'magic_circle';

export interface InteriorDef {
  id: string;
  category: InteriorCategory;
  icon: string;
  name: string;
  desc: string;
  cost: number;          // 영혼석
  /** 적용 시 영구 buff (모든 런) */
  bonus?: { castleHpRatio?: number; startMpBonus?: number; stoneMul?: number };
  /** drawCastle/drawDemonLord 시각 변경용 토큰 */
  visual: { color?: string; pattern?: string };
}

export const INTERIORS: InteriorDef[] = [
  // 간판 (sign)
  { id: 'sign_default',  category: 'sign', icon: '🪧', name: '나무 간판',     desc: '기본', cost: 0, visual: { color: '#8B5A2B' } },
  { id: 'sign_silver',   category: 'sign', icon: '🪧', name: '은빛 간판',     desc: '영혼석 보상 +2%', cost: 300, bonus: { stoneMul: 1.02 }, visual: { color: '#BDC3C7' } },
  { id: 'sign_golden',   category: 'sign', icon: '🪧', name: '황금 간판',     desc: '영혼석 보상 +5%', cost: 1000, bonus: { stoneMul: 1.05 }, visual: { color: '#F5A623' } },
  { id: 'sign_dragon',   category: 'sign', icon: '🐉', name: '용 간판',       desc: '영혼석 보상 +10%', cost: 3000, bonus: { stoneMul: 1.10 }, visual: { color: '#D63031' } },

  // 깃발 (flag)
  { id: 'flag_default',  category: 'flag', icon: '🚩', name: '검은 깃발',     desc: '기본', cost: 0, visual: { color: '#1A1A2E' } },
  { id: 'flag_purple',   category: 'flag', icon: '🟣', name: '자줏빛 깃발',   desc: '시작 마력 +10', cost: 500, bonus: { startMpBonus: 10 }, visual: { color: '#7B2D8E' } },
  { id: 'flag_phoenix',  category: 'flag', icon: '🔥', name: '불사조 깃발',   desc: '시작 마력 +25', cost: 2000, bonus: { startMpBonus: 25 }, visual: { color: '#E88840' } },
  { id: 'flag_blackpurple', category: 'flag', icon: '🏴', name: '흑자색 깃발', desc: '시즌 보상 / 시작 마력 +20', cost: 3500, bonus: { startMpBonus: 20 }, visual: { color: '#4A2068' } },

  // 오라 (aura)
  { id: 'aura_default',  category: 'aura', icon: '🌫', name: '기본 오라',     desc: '기본', cost: 0, visual: { color: '#a55eea' } },
  { id: 'aura_crimson',  category: 'aura', icon: '🩸', name: '핏빛 오라',     desc: '마왕성 HP +2%', cost: 600, bonus: { castleHpRatio: 1.02 }, visual: { color: '#D63031' } },
  { id: 'aura_amber',    category: 'aura', icon: '🌟', name: '호박 오라',     desc: '마왕성 HP +5%', cost: 1500, bonus: { castleHpRatio: 1.05 }, visual: { color: '#F5A623' } },
  { id: 'aura_void',     category: 'aura', icon: '🌌', name: '심연 오라',     desc: '마왕성 HP +10%', cost: 4000, bonus: { castleHpRatio: 1.10 }, visual: { color: '#0a3a2a' } },
  { id: 'demon_crowned', category: 'aura', icon: '👑', name: '왕관의 오라',   desc: '시즌 외형 보상 / 마왕성 HP +8%', cost: 6000, bonus: { castleHpRatio: 1.08 }, visual: { color: '#FDCB6E' } },
  { id: 'demon_lord',    category: 'aura', icon: '🦇', name: '진왕의 오라',   desc: '최종 시즌 외형 보상 / 마왕성 HP +12%', cost: 9000, bonus: { castleHpRatio: 1.12 }, visual: { color: '#7B2D8E' } },

  // 마법진 (magic_circle)
  { id: 'circle_default', category: 'magic_circle', icon: '⭕', name: '기본 마법진', desc: '기본', cost: 0, visual: { pattern: 'default' } },
  { id: 'circle_runic',   category: 'magic_circle', icon: '🔯', name: '룬 마법진',   desc: '영혼석 +3% / 시작 마력 +5', cost: 800, bonus: { stoneMul: 1.03, startMpBonus: 5 }, visual: { pattern: 'runic' } },
  { id: 'circle_void',    category: 'magic_circle', icon: '🕳', name: '공허 마법진', desc: '시작 마력 +30', cost: 2500, bonus: { startMpBonus: 30 }, visual: { pattern: 'void' } },
];

export function aggregatedInteriorBonus(equipped: Record<string, string>) {
  const out = { castleHpRatio: 1, startMpBonus: 0, stoneMul: 1 };
  for (const id of Object.values(equipped)) {
    const def = INTERIORS.find((i) => i.id === id);
    if (!def?.bonus) continue;
    if (def.bonus.castleHpRatio) out.castleHpRatio *= def.bonus.castleHpRatio;
    if (def.bonus.startMpBonus) out.startMpBonus += def.bonus.startMpBonus;
    if (def.bonus.stoneMul) out.stoneMul *= def.bonus.stoneMul;
  }
  return out;
}
