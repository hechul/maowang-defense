/**
 * 마왕의 일기 — 매 런 종료 시 자동 생성 1줄.
 *
 * 30일 누적 = 한 시즌 회상록.
 * 도감의 "마왕의 — 서고" 탭에서 열람.
 * 공유 가능 (외부 유입 트래픽).
 */

export interface DiaryEntry {
  date: string;          // YYYY-MM-DD
  /** 자동 생성된 한 줄 */
  body: string;
  /** 그날 — 핵심 통계 */
  wave: number;
  kills: number;
  isVictory: boolean;
  topMonsterId: string | null;
  /** 마왕의 — 감상 (랜덤 + 컨텍스트) */
  feeling: string;
}

/** 일기 자동 생성 — 통계 + 결정론적 랜덤 톤 */
export function generateDiaryEntry(input: {
  date: string;
  wave: number;
  kills: number;
  isVictory: boolean;
  topMonsterId: string | null;
}): DiaryEntry {
  const { date, wave, kills, isVictory, topMonsterId } = input;
  // 일자 결정론적 시드
  let seed = 2166136261 >>> 0;
  for (let i = 0; i < date.length; i++) {
    seed = Math.imul(seed ^ date.charCodeAt(i), 16777619);
  }
  // 톤 풀 (승리 / 패배 / 일반)
  const victoryFeelings = [
    '오늘은 — 좋은 날이었다.',
    '부하들이 — 자랑스럽다.',
    '인간이 — 또 — 한 발 — 물러섰다.',
    '잠시 — 평화롭다. 잠시만.',
  ];
  const defeatFeelings = [
    '봉인됐다. 다시 — 깨어난다.',
    '오늘의 — 패배는 — 내일의 — 정보다.',
    '부하들에게 — 미안하다.',
    '쉬어야 한다. 다시 — 일어나기 위해.',
  ];
  const generalFeelings = [
    '오늘은 — 그저 — 하루였다.',
    '바람이 — 마왕성 — 외벽을 — 쳤다.',
    '횃불이 — 한 번 — 흔들렸다.',
    'Vael이 — 나를 — 바라봤다. 한참을.',
  ];

  const pool = isVictory ? victoryFeelings : (wave < 5 ? defeatFeelings : generalFeelings);
  const feeling = pool[seed % pool.length];

  const topMon = topMonsterId ? `${topMonsterId} 부하가 — 잘 싸웠다.` : '';
  const body = `오늘 — W${wave}에서 — ${isVictory ? '클리어' : '봉인'}됐다. 용사 ${kills}명을 — 보냈다. ${topMon}`.trim();

  return { date, wave, kills, isVictory, topMonsterId, body, feeling };
}

/** 30일 누적 → 한 시즌 회상록 */
export function makeMonthlyChronicle(entries: DiaryEntry[]): string {
  if (entries.length === 0) return '— 일기가 — 비어 있다 —';
  const totalWaves = entries.reduce((s, e) => s + e.wave, 0);
  const totalKills = entries.reduce((s, e) => s + e.kills, 0);
  const victories = entries.filter((e) => e.isVictory).length;
  return [
    `— ${entries.length}일의 — 회상록 —`,
    ``,
    `누적 — wave: ${totalWaves}`,
    `누적 — 처치: ${totalKills}`,
    `클리어: ${victories}회`,
    ``,
    `... 그리고 — 무수한 — 작은 — 기억들.`,
  ].join('\n');
}
