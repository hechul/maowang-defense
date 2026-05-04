/**
 * W4 마이크로 내러티브 — 게임 안 트리거별 짧은 마왕 한 줄.
 *
 * 게임 안에서 무작위로 등장 (확률 30~50%) — 같은 트리거라도 매번 다른 줄.
 * GameEngine 큰 변경 없이 banner/showBanner 호출만 추가하면 됨.
 */

export const MICRO_LINES = {
  /** 첫 카드 픽 직후 — 너무 자주 X (한 런 첫 픽만) */
  firstPick: [
    '"이 부하부터인가. — 좋은 출발이다."',
    '"천 년 만의 첫 명령이군."',
    '"손이 — 기억하고 있다."',
  ],

  /** 카드 픽 — 30% 확률 */
  cardPick: [
    '"가라."',
    '"막아라."',
    '"네 차례다."',
    '"다음."',
    '"좋다."',
  ],

  /** 진화 발생 시 — 카드 진화 */
  onEvolve: [
    '"진화 — 1대의 기억이 한 조각 더."',
    '"네가 — 강해지고 있다."',
    '"부하의 성장이 곧 마왕의 성장이다."',
  ],

  /** 첫 시너지 발동 시 */
  firstSynergy: [
    '"군세가 — 하나로 움직인다."',
    '"이게 — 마왕의 군대다."',
  ],

  /** 보스 등장 (보스 명대사 후 추가) — 마왕의 반응 */
  bossArrived: [
    '"드디어 — 진짜가 왔다."',
    '"기다렸다."',
    '"이름은 모르지만 — 무게는 안다."',
  ],

  /** 페이즈 2 진입 시 마왕 반응 */
  bossPhase2: [
    '"아직 끝이 아니군."',
    '"좋다 — 더 보여줘라."',
  ],

  /** 마왕 HP < 20% — 위급 */
  lowHp: [
    '"... 아직, 봉인되지 않는다."',
    '"여기서 끝낼 수는 없다."',
    '"버텨라 — 기억은 더 있다."',
  ],

  /** 첫 영혼석 100 돌파 */
  firstWealth: [
    '"보물고가 — 채워진다."',
    '"인간의 흔적이 — 어둠의 자원이 된다."',
  ],

  /** 일일 시드 시작 시 — 결정론적 1줄 (날짜 해시로 고정) */
  dailySeedDaily: [
    '"오늘은 — 평소와 다른 날이다."',
    '"같은 운명을 — 모두가 마주한다."',
    '"결정론은 — 나의 영역이다."',
    '"시간이 — 한 번만 흐른다, 오늘은."',
    '"같은 시작에서 — 다른 끝이 나오겠지."',
    '"오늘의 시드를 — 잘 다뤄라."',
    '"이 하루는 — 모든 마왕이 기억할 것이다."',
  ],

  /** 클리어 직후 마왕 한 줄 (ResultScreen) */
  clearEcho: [
    '"한 번 더 — 침공이 실패했다."',
    '"인간들은 — 다시 회의를 열겠지."',
    '"이번 부하들 — 자랑스럽다."',
  ],

  /** 패배 직후 (ResultScreen) */
  defeatEcho: [
    '"... 봉인은 짧다. 곧 깨어난다."',
    '"이 패배는 — 다음의 정보다."',
    '"부하들에게는 — 미안하다."',
  ],
};

/** 결정론적 picker (날짜·시드 기반) */
export function pickMicroLine(pool: string[], seed = Date.now()): string {
  if (!pool || pool.length === 0) return '';
  return pool[Math.floor(Math.abs(seed) % pool.length)];
}

/** 날짜 → 결정론적 picker (오늘은 모든 유저 같은 줄) */
export function pickDailyMicroLine(pool: string[], dateStr: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return pickMicroLine(pool, h >>> 0);
}
