/**
 * P1-4 카드 영구 강화 — 영혼석으로 monsterId 별 +레벨 (HP/ATK 5단).
 *
 * 정책:
 * - 레벨당 + 8% HP / + 8% ATK (선형 합산).
 * - 비용은 등급에 따라 — common 100, ..., legendary 500 영혼석/레벨.
 * - 모집된 카드만 강화 가능.
 */

import type { MonsterRarity } from './monsters';

export const CARD_LEVEL_MAX = 5;

export const CARD_LEVEL_HP_PER = 0.08;
export const CARD_LEVEL_ATK_PER = 0.08;

export function costForLevelUp(rarity: MonsterRarity, currentLevel: number): number {
  if (currentLevel >= CARD_LEVEL_MAX) return Number.MAX_SAFE_INTEGER;
  const base: Record<MonsterRarity, number> = {
    common: 100, uncommon: 160, rare: 250, epic: 400, legendary: 600,
  };
  // 1→2:base, 2→3:1.6x, 3→4:2.4x, 4→5:3.2x
  const mul = 1 + currentLevel * 0.6;
  return Math.floor(base[rarity] * mul);
}

export function statMulForLevel(level: number): { hp: number; atk: number } {
  const lv = Math.max(0, Math.min(CARD_LEVEL_MAX, level));
  return { hp: 1 + lv * CARD_LEVEL_HP_PER, atk: 1 + lv * CARD_LEVEL_ATK_PER };
}
