/**
 * 봉인의 탑 — 무한 모드 리브랜드.
 *
 * 5wave마다 1층 상승. 매 층 적 +10% / 보상 +15%.
 * 매 10층마다 한 층의 "수호자" (랜덤 보스 변형).
 *
 * 100층 도달 = "탑의 정점" 칭호.
 * 1000층 = "신왕의 탑" (영구 잠금 해제).
 */

export const TOWER_FLOOR_PER_WAVES = 5;
export const TOWER_HP_MUL_PER_FLOOR = 0.10;
export const TOWER_REWARD_MUL_PER_FLOOR = 0.15;

export interface TowerMilestone {
  floor: number;
  label: string;
  reward: { stones?: number; titleId?: string; interiorId?: string; mailLabel?: string };
}

export const TOWER_MILESTONES: TowerMilestone[] = [
  { floor: 5,    label: '봉인 — 첫 자물쇠',         reward: { stones: 200 } },
  { floor: 10,   label: '봉인 — 두 번째 자물쇠',    reward: { stones: 500, mailLabel: '🎁 탑 10층 보상' } },
  { floor: 20,   label: '한 층의 — 첫 — 수호자',    reward: { stones: 1000 } },
  { floor: 30,   label: '깊은 — 봉인',              reward: { stones: 2000 } },
  { floor: 50,   label: '탑 — 중간',                reward: { stones: 5000, interiorId: 'aura_amber' } },
  { floor: 70,   label: '봉인의 — 깊은 곳',         reward: { stones: 8000 } },
  { floor: 100,  label: '【탑의 정점】',              reward: { stones: 20000, titleId: 't_tower_100' } },
  { floor: 150,  label: '봉인 너머',                reward: { stones: 30000 } },
  { floor: 200,  label: '신화의 — 끝',              reward: { stones: 50000 } },
  { floor: 500,  label: '시간 너머',                reward: { stones: 100000 } },
  { floor: 1000, label: '【신왕의 — 탑】',            reward: { stones: 500000, titleId: 't_tower_1000' } },
];

export function floorFromWave(wave: number): number {
  return Math.max(1, Math.floor((wave - 1) / TOWER_FLOOR_PER_WAVES) + 1);
}

export function towerHpMul(floor: number): number {
  return 1 + (floor - 1) * TOWER_HP_MUL_PER_FLOOR;
}

export function towerRewardMul(floor: number): number {
  return 1 + (floor - 1) * TOWER_REWARD_MUL_PER_FLOOR;
}

/** 10층마다 = 수호자(보스 변형) */
export function isGuardianFloor(floor: number): boolean {
  return floor > 0 && floor % 10 === 0;
}

export function nextMilestone(currentFloor: number): TowerMilestone | null {
  for (const m of TOWER_MILESTONES) {
    if (m.floor > currentFloor) return m;
  }
  return null;
}

export function passedMilestones(currentFloor: number): TowerMilestone[] {
  return TOWER_MILESTONES.filter((m) => m.floor <= currentFloor);
}
