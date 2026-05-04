/**
 * StageSystem — 게임 진입 모드 + 옵션 산출
 *
 * GameMode discriminated union으로 stage/endless/challenge 3종 모드 명시.
 * RunOptions는 호환을 위해 옛 평면 필드도 함께 받지만, 내부적으로 GameMode로 정규화된다.
 */

import { type StageId } from '../data/stages';

/* =====================================================================
 *  GameMode — 게임 진입 모드 discriminated union
 * ===================================================================== */

export type GameMode =
  | { kind: 'stage'; stageId: StageId }
  | { kind: 'endless' }
  | { kind: 'challenge'; challengeId: string };

export const ENDLESS_MODE: GameMode = { kind: 'endless' };
export const stageMode = (stageId: StageId): GameMode => ({ kind: 'stage', stageId });
export const challengeMode = (challengeId: string): GameMode => ({ kind: 'challenge', challengeId });

/** 옛 평면 필드 (string|null) 호환 — 'stage' / 'endless' 단순 모드명 */
export type LegacyRunMode = 'stage' | 'endless';

export interface RunOptions {
  /** 신규 GameMode 형식 (우선) */
  mode?: GameMode | LegacyRunMode;
  /** stage 모드일 때만 의미 있음 (mode가 LegacyRunMode일 때 폴백 입력) */
  stageId?: string | null;
  /** challenge 모드 (mode가 LegacyRunMode일 때 폴백 입력) */
  challengeId?: string | null;
  /**
   * 카드 후보 풀 — recruitedMonsterIds (모집한 몬스터만 카드로 등장).
   * null이면 기존 전체 풀(CARD_POOL fallback) 사용 — v1 호환.
   */
  recruitedPool?: string[] | null;
}

/** 옛 코드 호환 alias — 'stage' | 'endless' 평면 표기 */
export type RunMode = LegacyRunMode;

/**
 * 스테이지 진입 시 GameEngine.start에 넘길 RunOptions 산출.
 */
export function buildStageRunOptions(stageId: string, recruitedPool: string[] | null = null): RunOptions {
  return {
    mode: stageMode(stageId),
    recruitedPool,
  };
}

/** 무한 모드 진입 옵션 (challenge 옵션). recruitedPool 적용 가능. */
export function buildEndlessRunOptions(
  challengeId: string | null = null,
  recruitedPool: string[] | null = null,
): RunOptions {
  return {
    mode: challengeId ? challengeMode(challengeId) : ENDLESS_MODE,
    recruitedPool,
  };
}

/* =====================================================================
 *  정규화 — string | RunOptions | GameMode | null/undefined 모두 받음
 * ===================================================================== */

export interface NormalizedRun {
  mode: GameMode;
  recruitedPool: string[] | null;
}

/** 모든 입력을 GameMode 기반 NormalizedRun으로 통일 */
export function normalizeRunOptions(input: RunOptions | string | null | undefined): NormalizedRun {
  // null/undefined → 무한 모드
  if (input == null) return { mode: ENDLESS_MODE, recruitedPool: null };
  // 문자열 → 챌린지 모드 (옛 호출자: start('challenge_id'))
  if (typeof input === 'string') {
    return { mode: challengeMode(input), recruitedPool: null };
  }
  // 객체 — mode 형식 분기
  const { mode, stageId, challengeId, recruitedPool } = input;
  let resolved: GameMode = ENDLESS_MODE;
  if (typeof mode === 'object' && mode !== null && 'kind' in mode) {
    resolved = mode;
  } else if (mode === 'stage' && stageId) {
    resolved = stageMode(stageId);
  } else if (challengeId) {
    resolved = challengeMode(challengeId);
  } else {
    resolved = ENDLESS_MODE;
  }
  return { mode: resolved, recruitedPool: recruitedPool ?? null };
}
