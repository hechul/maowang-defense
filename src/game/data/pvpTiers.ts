/**
 * PvP 등급 시스템 — 시즌 점수 → 등급.
 *
 * 시즌 종료 시 등급별 보상 (영혼석 + 칭호 + 한정 인테리어).
 * 무과금 친화 — 시즌 점수만으로 도달.
 */

export type PvpTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'grandmaster';

export interface PvpTierDef {
  tier: PvpTier;
  name: string;
  /** 도달 점수 (이상) */
  minScore: number;
  /** 등급 색 */
  color: string;
  /** 시즌 종료 보상 */
  endSeasonReward: { stones: number; titleId?: string; interiorId?: string };
  /** 등급 아이콘 (이모지 fallback) */
  icon: string;
  /** PNG sprite id */
  spriteId?: string;
}

export const PVP_TIERS: PvpTierDef[] = [
  { tier: 'bronze',      name: '청동',     minScore: 0,    color: '#CD7F32', icon: '🥉', spriteId: 'pvp_tier_bronze',      endSeasonReward: { stones: 100 } },
  { tier: 'silver',      name: '은',       minScore: 100,  color: '#C0C0C0', icon: '🥈', spriteId: 'pvp_tier_silver',      endSeasonReward: { stones: 300 } },
  { tier: 'gold',        name: '금',       minScore: 300,  color: '#FDCB6E', icon: '🥇', spriteId: 'pvp_tier_gold',        endSeasonReward: { stones: 700, titleId: 't_pvp_gold' } },
  { tier: 'platinum',    name: '백금',     minScore: 600,  color: '#74B9FF', icon: '💎', spriteId: 'pvp_tier_platinum',    endSeasonReward: { stones: 1500, titleId: 't_pvp_platinum' } },
  { tier: 'diamond',     name: '다이아',   minScore: 1000, color: '#a55eea', icon: '💠', spriteId: 'pvp_tier_diamond',     endSeasonReward: { stones: 3000, titleId: 't_pvp_diamond' } },
  { tier: 'master',      name: '마스터',   minScore: 1500, color: '#FF6B6B', icon: '🎖', spriteId: 'pvp_tier_master',      endSeasonReward: { stones: 6000, titleId: 't_pvp_master', interiorId: 'aura_amber' } },
  { tier: 'grandmaster', name: '【진왕】',   minScore: 2500, color: '#FDCB6E', icon: '👑', spriteId: 'pvp_tier_grandmaster', endSeasonReward: { stones: 12000, titleId: 't_pvp_grandmaster', interiorId: 'flag_blackpurple' } },
];

export function tierForScore(score: number): PvpTierDef {
  let result = PVP_TIERS[0];
  for (const t of PVP_TIERS) {
    if (score >= t.minScore) result = t;
  }
  return result;
}

export function nextTier(currentScore: number): PvpTierDef | null {
  for (const t of PVP_TIERS) {
    if (currentScore < t.minScore) return t;
  }
  return null;
}
