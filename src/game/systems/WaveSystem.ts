/**
 * WaveSystem — 웨이브 진행 순수 산식 모음 (1차 분리)
 *
 * 목표:
 *   - GameEngine.updateWave 등에서 인라인으로 흩어진 wave 진행 산식만 분리.
 *   - 입력은 필요한 최소 필드만, 출력은 숫자/플래그만 — side effect 없음.
 *
 * 비목표:
 *   - 적 spawn / 배너 / 사운드 / 시너지 적용은 GameEngine에 남음.
 */

/**
 * 웨이브 내 spawn 간격(초). 웨이브가 진행될수록 짧아지며, 0.6초로 하한.
 * 기존: Math.max(0.6, 1.6 - wave * 0.035)
 */
export function calculateWaveSpawnInterval(wave: number): number {
  return Math.max(0.6, 1.6 - wave * 0.035);
}

/**
 * 동시에 살아있을 수 있는 hero 수 cap. 웨이브가 높을수록 커지며,
 * cap 도달 시 spawn 일시 보류.
 * 기존: wave >= 20 ? 18 : wave >= 10 ? 14 : 99
 */
export function calculateLiveHeroCap(wave: number): number {
  if (wave >= 20) return 18;
  if (wave >= 10) return 14;
  return 99;
}

/** 5웨이브마다 보스. 1, 6, 11, ... wave는 보스 웨이브가 아님. */
export function isBossWave(wave: number): boolean {
  return wave > 0 && wave % 5 === 0;
}

export interface EliteSpawnInput {
  wave: number;
  alreadySpawnedThisWave: boolean;
  waveSpawned: number;        // 이번 웨이브에 이미 등장한 일반 hero 수
}

/**
 * 5웨이브마다 엘리트 hero 1마리 등장 조건.
 * 기존: wave>0 && wave%5===0 && !eliteSpawnedThisWave && waveSpawned >= 1
 */
export function shouldSpawnElite(input: EliteSpawnInput): boolean {
  if (!isBossWave(input.wave)) return false;
  if (input.alreadySpawnedThisWave) return false;
  return input.waveSpawned >= 1;
}

/**
 * 웨이브 클리어 시 별점 (마왕성 HP 비율 기반).
 *   ≥90% → 3
 *   ≥60% → 2
 *   else → 1
 */
export function calculateClearStars(castleHpPct: number): 1 | 2 | 3 {
  if (castleHpPct >= 0.9) return 3;
  if (castleHpPct >= 0.6) return 2;
  return 1;
}

export interface HeroPickInput {
  /** heroPoolForWave(wave) 결과 */
  basePool: string[];
  /** 현재 던전 층의 boost 풀 (있을 시 50% 확률로 boost 풀에서만 뽑음) */
  stratumBoost?: string[];
}

/**
 * 다음에 spawn할 hero typeId 결정. 층 boost 풀이 있으면 50% 확률로 그쪽에서.
 * 기존 GameEngine.updateWave 인라인 로직과 산식 동일.
 */
export function pickHeroForSpawn(input: HeroPickInput): string {
  let pool = input.basePool;
  const boost = input.stratumBoost;
  if (boost && boost.length > 0 && Math.random() < 0.5) {
    const validBoost = boost.filter((h) => pool.includes(h));
    if (validBoost.length > 0) pool = validBoost;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 마일스톤 정의 — 챕터 클리어 + 중간 보상. GameEngine에서 import해 사용. */
export interface MilestoneDef {
  title: string;
  sub: string;
  bonus: number;
  achievementId?: string;
}

export const WAVE_MILESTONES: Record<number, MilestoneDef> = {
  10: { title: '⚔ 10웨이브 돌파', sub: '+100 영혼석', bonus: 100 },
  15: { title: '⚔ 15웨이브 돌파', sub: '+200 영혼석', bonus: 200 },
  20: { title: '⚔ 20웨이브 돌파', sub: '+300 영혼석', bonus: 300 },
  25: { title: '✨ 챕터 1 클리어 ✨', sub: '어둠의 군림자 — 영혼석 +500', bonus: 500, achievementId: 'chapter1' },
  50: { title: '👑 챕터 2 클리어 👑', sub: '깊어진 어둠 — 영혼석 +1500', bonus: 1500, achievementId: 'chapter2' },
  100: { title: '🌑 신화 등급 도달 🌑', sub: '전설이 된 마왕 — 영혼석 +5000', bonus: 5000, achievementId: 'chapter3' },
};

export function getMilestoneForWave(wave: number): MilestoneDef | undefined {
  return WAVE_MILESTONES[wave];
}
