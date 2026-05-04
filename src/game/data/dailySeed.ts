/**
 * P0-4 일일 시드 챌린지 — 모든 유저가 같은 시드로 1일 1회 도전.
 *
 * 정책:
 * - 시드 = 'YYYY-MM-DD' 결정론적 해시 → 모든 유저 동일.
 * - 1일 1회 + 부활 비활성 + 보상은 영혼석 +500 / 빈 클리어 무.
 * - 점수 = 도달 wave * 100 + 처치수.
 */

export interface DailySeedRun {
  date: string;          // YYYY-MM-DD
  seed: number;          // mulberry32 시드
  modifier: string;      // 오늘의 변형 ID (visual cue)
  modifierLabel: string;
}

const MODIFIERS: { id: string; label: string }[] = [
  { id: 'standard',   label: '표준 — 변형 없음' },
  { id: 'fastSpawn',  label: '빠른 침공 — 적 출현 ×1.3' },
  { id: 'lowMp',      label: '마력 가뭄 — 시작 마력 ½' },
  { id: 'noLegend',   label: '영광 봉인 — 전설 카드 미등장' },
  { id: 'doubleBoss', label: '쌍둥이 보스 — 보스 2마리' },
  { id: 'mageOnly',   label: '마법 봉기 — 적 마법 ×1.5' },
  { id: 'frozenStart',label: '얼어붙은 시작 — 5초 정지' },
];

/** 'YYYY-MM-DD' → 32bit hash. */
export function hashDate(dateStr: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function todayString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function getDailySeedRun(d = new Date()): DailySeedRun {
  const date = todayString(d);
  const seed = hashDate(date);
  const mod = MODIFIERS[seed % MODIFIERS.length];
  return { date, seed, modifier: mod.id, modifierLabel: mod.label };
}

/** mulberry32 — 결정론적 PRNG. */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 점수 계산 — 리더보드 정렬 키. */
export function dailyScore(wave: number, kills: number): number {
  return Math.max(0, wave) * 100 + Math.max(0, kills);
}
