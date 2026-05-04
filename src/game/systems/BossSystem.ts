/**
 * BossSystem — 보스 페이즈 2 / 최후 일격 파라미터 (1차 분리)
 *
 * 비목표:
 *   - safeTimeout / 데미지 적용 / 배너 / 사운드는 GameEngine에 남는다.
 *   - 첫 보스(captain) 한정 완화 등 BAL B-3 정책만 한 곳에 모음.
 */

export interface BossFinalBlowInput {
  /** 보스 typeId — 'captain'이면 학습 단계 완화 */
  bossTypeId: string;
}

export interface BossFinalBlowParams {
  /** 마왕성 데미지 (캡틴 100, 그 외 200) */
  finalDmg: number;
  /** 카운트다운 ms (캡틴 7000, 그 외 5000) */
  countdownMs: number;
  /** 카운트다운 동안 보스 desperateT (sec). 캡틴만 7.0, 그 외 0 (의도적 — 다른 보스는 외부 desperate 미적용) */
  desperateSec: number;
}

/**
 * 보스 페이즈 2 진입 시 적용할 최후 일격 파라미터.
 * BAL B-3: captain(첫 보스)만 데미지 -100 / 카운트다운 7초 / desperate 7초로 완화.
 */
export function getBossFinalBlowParams(input: BossFinalBlowInput): BossFinalBlowParams {
  const isFirstBoss = input.bossTypeId === 'captain';
  if (isFirstBoss) return { finalDmg: 100, countdownMs: 7000, desperateSec: 7.0 };
  return { finalDmg: 200, countdownMs: 5000, desperateSec: 0 };
}
