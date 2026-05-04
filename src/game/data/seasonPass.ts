/**
 * P0-2 시즌 패스 — 30티어 무료/유료 듀얼 트랙. 4주 시즌 사이클.
 *
 * 정책:
 * - 시즌 ID = 'YYYY-W##' (4주 단위 — 한 해 13시즌).
 * - 시즌 변경 감지 → seasonXp/claimed 자동 리셋.
 * - 유료 트랙은 IAP `season_pass` 구매 시 활성.
 */

export const SEASON_PASS_TIER_COUNT = 30;
export const SEASON_PASS_XP_PER_TIER = 200;

export type SeasonPassRewardKind =
  | 'stones'
  | 'recruit'      // monsterId 한정 모집권
  | 'interior'     // 인테리어 ID
  | 'demonSkin'    // 마왕 외형 토큰
  | 'mailLabel';   // 단순 칭호 (mail 메시지)

export interface SeasonPassReward {
  kind: SeasonPassRewardKind;
  amount?: number;
  id?: string;
  label: string;
}

export interface SeasonPassTier {
  tier: number;          // 1 ~ 30
  free: SeasonPassReward;
  premium: SeasonPassReward;
}

const stone = (n: number): SeasonPassReward => ({ kind: 'stones', amount: n, label: `영혼석 +${n}` });
const interior = (id: string, label: string): SeasonPassReward => ({ kind: 'interior', id, label });
const recruit = (id: string, label: string): SeasonPassReward => ({ kind: 'recruit', id, label });
const skin = (id: string, label: string): SeasonPassReward => ({ kind: 'demonSkin', id, label });

/** 30티어 풀 정의 — 무료는 영혼석 위주, 유료는 한정 인테리어/스킨/모집권. */
export const SEASON_PASS_TIERS: SeasonPassTier[] = Array.from({ length: SEASON_PASS_TIER_COUNT }, (_, i) => {
  const tier = i + 1;
  const free: SeasonPassReward =
    tier % 10 === 0 ? stone(500) :
    tier % 5 === 0 ? stone(200) :
    stone(50 + tier * 5);
  // 유료 트랙: 5/10/15/20/25/30 = 한정 보상, 나머지는 영혼석 ×2
  let premium: SeasonPassReward;
  switch (tier) {
    case 5:  premium = interior('flag_blackpurple', '시즌 깃발: 자줏빛'); break;
    case 10: premium = recruit('lich', '한정 모집: 리치'); break;
    case 15: premium = interior('aura_amber', '시즌 오라: 호박'); break;
    case 20: premium = recruit('mimic', '한정 모집: 미믹'); break;
    case 25: premium = skin('demon_crowned', '시즌 외형: 왕관'); break;
    case 30: premium = skin('demon_lord', '【최종 보상】 시즌 마왕 외형'); break;
    default: premium = stone(100 + tier * 8);
  }
  return { tier, free, premium };
});

/** 4주 단위 시즌 ID 계산 — UTC 기준 결정론. */
export function currentSeasonId(date = new Date()): string {
  const y = date.getUTCFullYear();
  const start = new Date(Date.UTC(y, 0, 1));
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  const weekIdx = Math.floor(dayOfYear / 28);  // 4주마다 +1 (1년 13시즌)
  return `${y}-S${String(weekIdx + 1).padStart(2, '0')}`;
}

/** 5차 — 시즌 cycleIndex (0~3) 산출. seasonalBosses / seasonMainStories 매핑용. */
export function currentCycleIndex(date = new Date()): 0 | 1 | 2 | 3 {
  const y = date.getUTCFullYear();
  const start = new Date(Date.UTC(y, 0, 1));
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  const weekIdx = Math.floor(dayOfYear / 28);
  return (weekIdx % 4) as 0 | 1 | 2 | 3;
}

/** 5차 — 시즌 시작 후 경과 주차 (1~4). seasonStoryWeek 자동 결정용. */
export function currentSeasonWeek(date = new Date()): 1 | 2 | 3 | 4 {
  const y = date.getUTCFullYear();
  const start = new Date(Date.UTC(y, 0, 1));
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  const weekInSeason = Math.floor((dayOfYear % 28) / 7) + 1;
  return Math.min(4, Math.max(1, weekInSeason)) as 1 | 2 | 3 | 4;
}

/** 시즌 종료까지 남은 일 수. */
export function daysUntilSeasonEnd(date = new Date()): number {
  const y = date.getUTCFullYear();
  const start = new Date(Date.UTC(y, 0, 1));
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  const inSeason = dayOfYear % 28;
  return 28 - inSeason;
}

/** XP → 현재 티어 (1-base, 0 ~ MAX). */
export function tierFromXp(xp: number): number {
  return Math.min(SEASON_PASS_TIER_COUNT, Math.floor(Math.max(0, xp) / SEASON_PASS_XP_PER_TIER));
}

/** XP를 어떻게 적립하는지 — 호출 지점은 store/recordRun & recordStageClear. */
export interface SeasonXpEvent {
  reason: 'run' | 'boss' | 'stageStar' | 'mission' | 'attendance';
  amount: number;
}

export function calcSeasonXp(e: SeasonXpEvent): number {
  return Math.max(0, Math.floor(e.amount));
}
