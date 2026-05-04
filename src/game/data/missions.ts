/**
 * 일일 미션 풀 (3개 매일 갱신)
 * AIT §전략3 D1 리텐션 — "오늘 다시 와야 할 이유"
 */
export type MissionType = 'kill' | 'evolve' | 'combo' | 'luckySummon' | 'boss' | 'synergy' | 'wave' | 'cardReveal';

export interface MissionDef {
  id: string;
  icon: string;
  name: string;
  desc: (target: number) => string;
  target: number;
  type: MissionType;
  reward: number;
}

export const MISSION_POOL: MissionDef[] = [
  { id: 'kill100',  icon: '⚔', name: '학살자',     desc: (n) => `용사 ${n}명 처치`,    target: 100, type: 'kill',    reward: 50 },
  { id: 'evolve3',  icon: '⭐', name: '진화의 길',  desc: (n) => `${n}회 진화`,         target: 3,   type: 'evolve',  reward: 75 },
  { id: 'combo30',  icon: '🔥', name: '콤보왕',     desc: (n) => `${n} 콤보 달성`,     target: 30,  type: 'combo',   reward: 100 },
  { id: 'luckySummon1', icon: '✨', name: '희귀 발견',   desc: (n) => `희귀 카드 발견 ${n}회`, target: 1,   type: 'luckySummon', reward: 75 },
  { id: 'boss2',    icon: '👑', name: '보스 사냥꾼', desc: (n) => `보스 ${n}체 처치`,    target: 2,   type: 'boss',    reward: 100 },
  { id: 'syn3',     icon: '🌀', name: '시너지 마스터',desc: (n) => `시너지 ${n}종 동시`, target: 3,   type: 'synergy', reward: 75 },
  { id: 'wave10',   icon: '🏰', name: '전선 사수',  desc: (n) => `웨이브 ${n} 도달`,    target: 10,  type: 'wave',    reward: 75 },
  { id: 'cardReveal20', icon: '🎴', name: '카드 마스터', desc: (n) => `카드 펼치기 ${n}회`,  target: 20,  type: 'cardReveal', reward: 50 },
];

/** 날짜 기준 결정론적 셔플 (같은 날은 같은 미션) */
export function pickDailyMissions(date: string, count = 3): typeof MISSION_POOL {
  const seed = date.split('-').reduce((a, b) => a + parseInt(b), 0);
  const pool = [...MISSION_POOL];
  const picked: typeof MISSION_POOL = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = (seed * (i + 7) + 13) % pool.length;
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}
