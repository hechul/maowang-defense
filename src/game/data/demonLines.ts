/**
 * 마왕 캐릭터 대사 풀 — 상황별 ~30종
 * GAME_DESIGN_OVERHAUL §3.4
 */

export type DemonMood = 'calm' | 'angry' | 'urgent' | 'triumph';

export interface DemonLine {
  text: string;
  mood: DemonMood;
}

/** 게임 시작 (첫 카드 펴기 직전) */
export const DEMON_LINES_START: DemonLine[] = [
  { text: '"오랜 잠에서 깨어났다..."', mood: 'calm' },
  { text: '"인간의 시대가 끝나리라."', mood: 'calm' },
  { text: '"어둠이 다시 이 땅을 덮을 때다."', mood: 'calm' },
];

/** 첫 카드 픽 직후 */
export const DEMON_LINES_FIRST_PICK: DemonLine[] = [
  { text: '"내 어둠을 받아라."', mood: 'calm' },
  { text: '"이것이 내 군세의 시작이다."', mood: 'calm' },
];

/** 진화 발동 시 */
export const DEMON_LINES_EVOLVE: DemonLine[] = [
  { text: '"성장하라, 내 권속이여!"', mood: 'triumph' },
  { text: '"진정한 어둠이 깨어난다..."', mood: 'triumph' },
  { text: '"진화는 영원하다."', mood: 'triumph' },
];

/** 시너지 첫 발동 */
export const DEMON_LINES_SYNERGY: DemonLine[] = [
  { text: '"군세가 하나로 움직인다!"', mood: 'triumph' },
  { text: '"이것이 어둠의 조화다."', mood: 'calm' },
];

/** 보스 등장 */
export const DEMON_LINES_BOSS_APPEAR: Record<string, DemonLine> = {
  captain:  { text: '"고작 기사단장이라니..."',         mood: 'calm' },
  archmage: { text: '"마법으로 어둠을 막을 수 있을까."', mood: 'calm' },
  saint:    { text: '"빛 따위가 내 어둠을 정화하랴."',   mood: 'angry' },
  king:     { text: '"왕이 직접 왔구나... 좋다."',       mood: 'angry' },
  priest:   { text: '"신의 심판? 내가 신이다."',          mood: 'angry' },
};

/** 보스 페이즈 2 진입 */
export const DEMON_LINES_BOSS_PHASE2: DemonLine[] = [
  { text: '"끈질긴 자... 예의를 갖춰주마."', mood: 'angry' },
  { text: '"마지막 발악은 잘 보았다."',       mood: 'angry' },
];

/** 보스 처치 */
export const DEMON_LINES_BOSS_KILL: DemonLine[] = [
  { text: '"사라지거라."',                  mood: 'triumph' },
  { text: '"또 한 명의 어리석은 자였군."',   mood: 'triumph' },
];

/** HP 위급 (20% 미만 첫 도달) */
export const DEMON_LINES_DANGER: DemonLine[] = [
  { text: '"이 마왕이 흔들릴 줄이야..."',   mood: 'urgent' },
  { text: '"아직, 끝이 아니다!"',          mood: 'urgent' },
];

/** 부활 (광고 시청) */
export const DEMON_LINES_REVIVE: DemonLine[] = [
  { text: '"제물의 힘으로 다시 일어선다!"', mood: 'triumph' },
  { text: '"어둠은 결코 죽지 않는다."',     mood: 'triumph' },
];

/** 챕터 클리어 */
export const DEMON_LINES_CHAPTER_CLEAR: Record<number, DemonLine> = {
  25:  { text: '"이제 시작일 뿐이다..."',       mood: 'triumph' },
  50:  { text: '"세상이 어둠에 잠긴다..."',     mood: 'triumph' },
  100: { text: '"어둠이 곧 질서다."',           mood: 'triumph' },
};

/** 사망 (마왕성 함락) */
export const DEMON_LINES_DEATH: DemonLine[] = [
  { text: '"이대로 끝날 리 없다..."',         mood: 'urgent' },
  { text: '"잠시... 봉인일 뿐이다."',           mood: 'urgent' },
  { text: '"다시 일어나리라."',                 mood: 'urgent' },
];

/** 던전 층 진입 — 각 층 enterDialog가 우선, 없으면 이 풀 */
export const DEMON_LINES_NEW_STRATUM: DemonLine[] = [
  { text: '"새로운 영역이 열린다..."',         mood: 'calm' },
  { text: '"더 깊은 어둠으로."',                mood: 'calm' },
];

/** 랜덤 픽 헬퍼 */
export function pickDemonLine(pool: DemonLine[]): DemonLine {
  return pool[Math.floor(Math.random() * pool.length)];
}
