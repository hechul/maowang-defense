/**
 * NG+ 모드 — 챕터 6 클리어 후 잠금 해제.
 *
 * 챕터 1~6 다시 도전. 다만:
 * - 적 +50% HP / +30% atk
 * - 보상 영혼석 +100%
 * - 마왕 대사가 "이미 알고 있는" 톤으로 변경 (NPC 한 줄도 변경)
 * - NG+ 전용 칭호 / 영구 강화 트리 (파멸+) 잠금 해제
 *
 * NG+ 클리어 시 → NG++ 진입 가능 (적 +100% / 보상 +200%).
 */

export interface NgPlusModifiers {
  enemyHpMul: number;
  enemyAtkMul: number;
  rewardMul: number;
  /** 마왕 대사 톤 ("이미 안다" 강조) */
  toneOverride: 'aware' | 'tired' | 'transcendent';
  /** NG+ 차수 (1, 2, 3, ...) */
  cycle: number;
}

export const NG_PLUS_LEVELS: NgPlusModifiers[] = [
  { cycle: 1, enemyHpMul: 1.50, enemyAtkMul: 1.30, rewardMul: 2.00, toneOverride: 'aware' },
  { cycle: 2, enemyHpMul: 2.00, enemyAtkMul: 1.60, rewardMul: 3.00, toneOverride: 'tired' },
  { cycle: 3, enemyHpMul: 2.80, enemyAtkMul: 2.00, rewardMul: 5.00, toneOverride: 'transcendent' },
  { cycle: 4, enemyHpMul: 4.00, enemyAtkMul: 2.50, rewardMul: 8.00, toneOverride: 'transcendent' },
  { cycle: 5, enemyHpMul: 6.00, enemyAtkMul: 3.00, rewardMul: 12.0, toneOverride: 'transcendent' },
];

/** NG+ 톤별 마왕 한 줄 — 챕터 진입 시 */
export const NG_PLUS_LINES: Record<NgPlusModifiers['toneOverride'], string[]> = {
  aware: [
    '"이 챕터는 — 알고 있다. 다시 — 가자."',
    '"같은 풍경 — 다른 마음."',
    '"이미 본 적이지만 — 이번엔 — 더 강하다."',
  ],
  tired: [
    '"또 — 같은 적인가. 그러나 — 새로운 인내다."',
    '"세 번째 — 봉인이다. 더 — 깊다."',
    '"피곤하다. 그러나 — 멈추지 않는다."',
  ],
  transcendent: [
    '"적은 — 이제 — 적이 아니다. 다만 — 시간의 — 일부다."',
    '"몇 차 — 지났는지 — 잊었다. 그게 — 자유다."',
    '"천 년의 — 천 년 — 위에 — 새로운 — 천 년."',
  ],
};

/** 차수별 NG+ 칭호 */
export const NG_PLUS_TITLES: Record<number, { id: string; name: string }> = {
  1: { id: 't_ngplus_1', name: '두 번째 — 천 년의 — 마왕' },
  2: { id: 't_ngplus_2', name: '세 번째 — 봉인을 — 푼 자' },
  3: { id: 't_ngplus_3', name: '시간 너머의 — 마왕' },
  4: { id: 't_ngplus_4', name: '【초월자】' },
  5: { id: 't_ngplus_5', name: '【시간 — 자체】' },
};

export function getNgPlusMods(cycle: number): NgPlusModifiers {
  return NG_PLUS_LEVELS[Math.min(NG_PLUS_LEVELS.length - 1, Math.max(0, cycle - 1))];
}
