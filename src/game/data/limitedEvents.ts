/**
 * P1-7 한정 이벤트 — 4주 시즌 안에서 주별 로테이션.
 *
 * 정책:
 * - 진행도 기반 누적 (보스 처치 / 카드 픽 / wave 도달).
 * - 각 이벤트는 4티어 보상.
 * - 이벤트 운영은 데이터만 확장하면 됨 (운영 도구).
 */

export type EventGoalKind =
  | 'bossKills'      // 한 시즌 누적 보스 처치
  | 'wavesCleared'   // 한 시즌 누적 wave 도달
  | 'tagPicks'       // 특정 태그 카드 픽 횟수
  | 'monstersSummoned';

export interface EventTier {
  tier: number;            // 1~4
  goal: number;            // 누적 진행도
  rewardLabel: string;
  rewardStones?: number;
  rewardRecruitId?: string;
  rewardInteriorId?: string;
}

export interface LimitedEventDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  goalKind: EventGoalKind;
  /** tagPicks 일 때 어떤 태그 */
  tag?: string;
  /** 시작/종료 — 시즌 안 주차 (1~4). 둘 다 미지정이면 전체 시즌 */
  weekStart?: number;
  weekEnd?: number;
  tiers: EventTier[];
}

export const LIMITED_EVENTS: LimitedEventDef[] = [
  {
    id: 'boss_hunter',
    name: '보스 사냥꾼',
    desc: '시즌 안에 보스를 누적 처치하라.',
    icon: '👑',
    goalKind: 'bossKills',
    tiers: [
      { tier: 1, goal: 5,  rewardLabel: '영혼석 +200',           rewardStones: 200 },
      { tier: 2, goal: 15, rewardLabel: '영혼석 +500',           rewardStones: 500 },
      { tier: 3, goal: 30, rewardLabel: '한정 모집: 영주(orcb)', rewardRecruitId: 'orcb' },
      { tier: 4, goal: 50, rewardLabel: '시즌 인테리어: 호박오라', rewardInteriorId: 'aura_amber' },
    ],
  },
  {
    id: 'flame_brigade',
    name: '화염 군단',
    desc: '화염(fire) 태그 카드를 많이 픽하라.',
    icon: '🔥',
    goalKind: 'tagPicks',
    tag: 'fire',
    tiers: [
      { tier: 1, goal: 10, rewardLabel: '영혼석 +150',          rewardStones: 150 },
      { tier: 2, goal: 30, rewardLabel: '영혼석 +400',          rewardStones: 400 },
      { tier: 3, goal: 60, rewardLabel: '한정 모집: 데빌(devil)', rewardRecruitId: 'devil' },
      { tier: 4, goal: 100, rewardLabel: '시즌 깃발: 핏빛',      rewardInteriorId: 'flag_blackpurple' },
    ],
  },
  {
    id: 'undead_legion',
    name: '언데드 군단',
    desc: '언데드(undead) 태그 카드를 많이 픽하라.',
    icon: '💀',
    goalKind: 'tagPicks',
    tag: 'undead',
    tiers: [
      { tier: 1, goal: 10, rewardLabel: '영혼석 +150',          rewardStones: 150 },
      { tier: 2, goal: 30, rewardLabel: '영혼석 +400',          rewardStones: 400 },
      { tier: 3, goal: 60, rewardLabel: '한정 모집: 다크리치(dlich)', rewardRecruitId: 'dlich' },
      { tier: 4, goal: 100, rewardLabel: '영혼석 +1000',         rewardStones: 1000 },
    ],
  },
  {
    id: 'wave_master',
    name: '웨이브 정복자',
    desc: '시즌 안에 누적 wave 도달.',
    icon: '🌊',
    goalKind: 'wavesCleared',
    tiers: [
      { tier: 1, goal: 30,  rewardLabel: '영혼석 +200', rewardStones: 200 },
      { tier: 2, goal: 100, rewardLabel: '영혼석 +500', rewardStones: 500 },
      { tier: 3, goal: 250, rewardLabel: '영혼석 +1000', rewardStones: 1000 },
      { tier: 4, goal: 500, rewardLabel: '시즌 외형: 왕관', rewardInteriorId: 'demon_crowned' },
    ],
  },
];

export function activeEvents(weekIdx?: number): LimitedEventDef[] {
  if (!weekIdx) return LIMITED_EVENTS;
  return LIMITED_EVENTS.filter((e) =>
    (e.weekStart === undefined || e.weekStart <= weekIdx)
    && (e.weekEnd === undefined || e.weekEnd >= weekIdx)
  );
}

export function tierFromProgress(e: LimitedEventDef, points: number): number {
  let reached = 0;
  for (const t of e.tiers) {
    if (points >= t.goal) reached = t.tier;
  }
  return reached;
}

export function nextTierGoal(e: LimitedEventDef, points: number): { tier: number; goal: number } | null {
  for (const t of e.tiers) {
    if (points < t.goal) return { tier: t.tier, goal: t.goal };
  }
  return null;
}
