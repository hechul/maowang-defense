/**
 * P2-1 텍스트 컷씬 — 챕터 클리어 / 마왕 레벨업 / 엔딩 트리거.
 *
 * 정책:
 * - 일러스트는 미정 → 텍스트 + 마왕 이모지 + 색조 그라디언트로 대체.
 * - 한 번 보면 cutscenesSeen에 기록 (다시 안 봄).
 * - panels[] 길이만큼 페이지 넘김. skip 가능.
 */

export interface CutscenePanel {
  /** 큰 이모지 (마왕/보스/풍경) */
  icon: string;
  /** 배경 그라디언트 컬러 (CSS) */
  bg: string;
  /** 화면 중앙 큰 글자 (선택) */
  title?: string;
  /** 본문 (말풍선 또는 묘사) */
  body: string;
  /** 색 (제목/본문) */
  color?: string;
}

export interface CutsceneDef {
  id: string;
  /** 트리거 조건 — 'chapter_clear:ch1' / 'demon_level:5' / 'ending' */
  trigger: string;
  panels: CutscenePanel[];
}

export const CUTSCENES: CutsceneDef[] = [
  // ===== 챕터 시작 컷씬 (W5) =====
  // chapter_start:chN — 챕터 첫 스테이지 진입 시 1회.
  {
    id: 'cs_ch1_start',
    trigger: 'chapter_start:ch1',
    panels: [
      { icon: '🌑', bg: 'radial-gradient(ellipse at 50% 30%,#2D1B4E,#0a0820)', title: '봉인의 입구', body: '강철 발소리. 횃불.\n인간이 마왕성 문 앞에 도착했다.', color: '#FDCB6E' },
      { icon: '🦇', bg: 'radial-gradient(ellipse at 50% 60%,#7B2D8E,#0a0820)', body: '"... 누가 오는 거지?\n그리고 — 나는 누구인가?"', color: '#FFEAA7' },
      { icon: '🖤', bg: 'radial-gradient(ellipse at 50% 50%,#3a2d5c,#0a0820)', body: '본능적으로 손을 들었다.\n어둠이 모여들었다.', color: '#a55eea' },
    ],
  },
  {
    id: 'cs_ch2_start',
    trigger: 'chapter_start:ch2',
    panels: [
      { icon: '⚰', bg: 'radial-gradient(ellipse at 50% 30%,#3a0d0d,#0a0820)', title: '잊혀진 묘지', body: '마왕성 지하의 옛 무덤이 진동한다.\n잊혀진 부하들이 깨어난다.', color: '#FF6B6B' },
      { icon: '💀', bg: 'radial-gradient(ellipse at 50% 60%,#a55eea,#0a0820)', body: '"이들이 — 나를 알고 있다.\n나는 — 그들을 모르는데."', color: '#FFEAA7' },
    ],
  },
  {
    id: 'cs_ch3_start',
    trigger: 'chapter_start:ch3',
    panels: [
      { icon: '🔥', bg: 'radial-gradient(ellipse at 50% 30%,#D63031,#0a0820)', title: '변경의 봉화', body: '인간 왕국이 새로운 세대를 모아\n변경 마을에서 진군한다.', color: '#FF6B6B' },
      { icon: '🦇', bg: 'radial-gradient(ellipse at 50% 50%,#7B2D8E,#0a0820)', body: '"이 깃발... 본 적 있다.\n— 어디서?"', color: '#FFEAA7' },
    ],
  },
  {
    id: 'cs_ch4_start',
    trigger: 'chapter_start:ch4',
    panels: [
      { icon: '❄', bg: 'radial-gradient(ellipse at 50% 30%,#74B9FF,#0a0820)', title: '영원의 겨울', body: '얼음 군단이 차가운 진군을 시작한다.\n빙결의 사도가 직접 이끈다.', color: '#FFEAA7' },
      { icon: '🦇', bg: 'radial-gradient(ellipse at 50% 60%,#3a2d5c,#0a0820)', body: '"빙결의 사도... 너였구나,\n천 년 전 — 나를 봉인한 자."', color: '#74B9FF' },
    ],
  },
  {
    id: 'cs_ch5_start',
    trigger: 'chapter_start:ch5',
    panels: [
      { icon: '⚖', bg: 'radial-gradient(ellipse at 50% 30%,#a55eea,#0a0820)', title: '심연의 법정', body: '심연의 법정이 마왕에게\n마지막 심판을 내린다.', color: '#FDCB6E' },
      { icon: '🌑', bg: 'radial-gradient(ellipse at 50% 50%,#1a0c30,#000)', body: '"이제 — 결정해야 한다.\n진왕이 될 것인가, 봉인을 받아들일 것인가."', color: '#FFEAA7' },
    ],
  },
  // [W6] 챕터 6 — 진왕 시대 (역침공)
  {
    id: 'cs_ch6_start',
    trigger: 'chapter_start:ch6',
    panels: [
      { icon: '☄', bg: 'radial-gradient(ellipse at 50% 30%,#FDCB6E,#0a0820)', title: '【진왕】', body: '대종말을 막아낸 마왕은\n진왕으로 받아들여졌다.', color: '#FDCB6E' },
      { icon: '🦇', bg: 'radial-gradient(ellipse at 50% 60%,#7B2D8E,#0a0820)', body: '"이번엔 — 내가 간다.\n인간이여, 너희가 침공받을 차례다."', color: '#FFEAA7' },
      { icon: '🏰', bg: 'radial-gradient(ellipse at 50% 50%,#3a0d0d,#0a0820)', body: '마왕성 문이 — 처음으로 — 밖으로 열렸다.', color: '#FF6B6B' },
    ],
  },
  {
    id: 'cs_ch6_clear',
    trigger: 'chapter_clear:ch6',
    panels: [
      { icon: '👑', bg: 'radial-gradient(ellipse at 50% 30%,#FDCB6E,#0a0820)', title: '【진왕의 결말】', body: '인간 왕이 무릎을 꿇었다.\n천 년의 부채가 청산되었다.', color: '#FDCB6E' },
      { icon: '🌑', bg: 'radial-gradient(ellipse at 50% 50%,#7B2D8E,#0a0820)', body: '"... 결국, 어둠은 시즌이 아니라 — 계속이다."', color: '#FFEAA7' },
      { icon: '☄', bg: 'linear-gradient(180deg,#1a0c30,#000)', title: '시즌은 계속된다', body: '다음 시즌은 — 또 다른 일화다.\n어둠은 자라난다.', color: '#FD79A8' },
    ],
  },
  // ===== 챕터별 클리어 컷씬 (간결: 3패널) =====
  {
    id: 'cs_ch1_clear',
    trigger: 'chapter_clear:ch1',
    panels: [
      { icon: '🏰', bg: 'radial-gradient(ellipse at 50% 30%,#2D1B4E,#0a0820)', title: '챕터 1 종료', body: '봉인의 입구가 무너졌다.', color: '#FDCB6E' },
      { icon: '👑', bg: 'radial-gradient(ellipse at 30% 60%,#7B2D8E,#0a0820)', body: '"용사들이 막혔다고 안심하지 마라.\n인간의 왕국은 더 강한 군세를 보낼 것이다."', color: '#FFEAA7' },
      { icon: '⚔', bg: 'radial-gradient(ellipse at 70% 40%,#D63031,#0a0820)', body: '잊혀진 묘지의 문이 열린다.', color: '#FF6B6B' },
    ],
  },
  {
    id: 'cs_ch2_clear',
    trigger: 'chapter_clear:ch2',
    panels: [
      { icon: '✨', bg: 'radial-gradient(ellipse at 50% 30%,#FDCB6E,#0a0820)', title: '챕터 2 종료', body: '신화의 종언, 빛의 신관이 봉인되었다.', color: '#FFEAA7' },
      { icon: '🌑', bg: 'radial-gradient(ellipse at 50% 50%,#3a2d5c,#0a0820)', body: '"이제 인간 왕이 직접 군세를 이끈다.\n변경의 봉화가 피어오른다."', color: '#a55eea' },
    ],
  },
  {
    id: 'cs_ch3_clear',
    trigger: 'chapter_clear:ch3',
    panels: [
      { icon: '👑', bg: 'radial-gradient(ellipse at 50% 30%,#D63031,#0a0820)', title: '챕터 3 종료', body: '인간 왕이 마왕성 앞에서 무릎 꿇었다.', color: '#FF6B6B' },
      { icon: '❄', bg: 'radial-gradient(ellipse at 50% 60%,#74B9FF,#0a0820)', body: '"하지만 더 차가운 것이 다가온다.\n영원의 겨울이다."', color: '#FFEAA7' },
    ],
  },
  {
    id: 'cs_ch4_clear',
    trigger: 'chapter_clear:ch4',
    panels: [
      { icon: '🌌', bg: 'radial-gradient(ellipse at 50% 30%,#74B9FF,#0a0820)', title: '챕터 4 종료', body: '겨울 자체가 깨졌다.', color: '#FFEAA7' },
      { icon: '⚖', bg: 'radial-gradient(ellipse at 50% 60%,#a55eea,#0a0820)', body: '"심연의 법정이 마왕을 부른다.\n이제는 운명이다."', color: '#a55eea' },
    ],
  },
  {
    id: 'cs_ch5_clear',
    trigger: 'chapter_clear:ch5',
    panels: [
      { icon: '☄', bg: 'radial-gradient(ellipse at 50% 30%,#FDCB6E,#0a0820)', title: '【진왕】', body: '대종말을 막아낸 자.\n이제 어둠은 두려움이 아닌 질서다.', color: '#FDCB6E' },
      { icon: '👑', bg: 'radial-gradient(ellipse at 50% 50%,#7B2D8E,#0a0820)', body: '"인간이여, 이제는 너희가 침공받을 차례다.\n— 진왕의 선언"', color: '#FF6B6B' },
      { icon: '🌑', bg: 'linear-gradient(180deg,#1a0c30,#000)', title: 'END', body: '시즌이 계속되는 한 어둠도 자라난다.', color: '#FFEAA7' },
    ],
  },
  // 마왕 레벨업 컷씬 (큰 마일스톤만)
  {
    id: 'cs_demon_level_10',
    trigger: 'demon_level:10',
    panels: [
      { icon: '🦇', bg: 'radial-gradient(ellipse at 50% 30%,#7B2D8E,#0a0820)', title: 'LV.10 도달', body: '봉인의 첫 자물쇠가 풀렸다.\n시작 마력 +10, 필살기 충전 +5%.', color: '#FDCB6E' },
    ],
  },
  {
    id: 'cs_demon_level_25',
    trigger: 'demon_level:25',
    panels: [
      { icon: '😈', bg: 'radial-gradient(ellipse at 50% 30%,#D63031,#0a0820)', title: 'LV.25 도달', body: '잊혀진 마왕의 힘이 깨어났다.\n필살기 충전 +10%.', color: '#FF6B6B' },
    ],
  },
  {
    id: 'cs_demon_level_50',
    trigger: 'demon_level:50',
    panels: [
      { icon: '🌑', bg: 'radial-gradient(ellipse at 50% 30%,#FDCB6E,#0a0820)', title: '【진왕 각성】', body: '모든 봉인이 깨졌다.\n시작 마력 +100, 마왕성 +500, 필살기 +20%, 영혼석 +5000.', color: '#FDCB6E' },
      { icon: '☄', bg: 'radial-gradient(ellipse at 50% 60%,#7B2D8E,#0a0820)', body: '"이제 어떤 침공도 두렵지 않다."', color: '#FFEAA7' },
    ],
  },
  // ===== N4 보스 회상 컷씬 — 첫 처치 시 자동 발동 =====
  {
    id: 'cs_boss_recall_captain',
    trigger: 'boss_first_kill:captain',
    panels: [
      { icon: '⚔', bg: 'radial-gradient(ellipse at 50% 30%,#3a0d0d,#0a0820)', title: '— 대장의 회상 —', body: '"명령서를 받은 날, 나는 가족에게 편지를 썼다.\n\'내가 돌아오지 않으면 — 그건 내가 의무를 다했다는 뜻이다.\'"', color: '#FF6B6B' },
      { icon: '✉', bg: 'radial-gradient(ellipse at 50% 60%,#a55eea,#0a0820)', body: '편지는 — 가족에게 — 도착했다.\n그가 죽기 — 사흘 전에.', color: '#FFEAA7' },
    ],
  },
  {
    id: 'cs_boss_recall_archmage',
    trigger: 'boss_first_kill:archmage',
    panels: [
      { icon: '🔮', bg: 'radial-gradient(ellipse at 50% 30%,#a55eea,#0a0820)', title: '— 대마법사의 회상 —', body: '"내가 본 첫 번째 마법은 — 어머니가 손을 대자 차가 식는 마법이었다.\n그 단순한 마법이 — 평생 — 가장 아름다웠다."', color: '#a55eea' },
      { icon: '🦇', bg: 'radial-gradient(ellipse at 50% 60%,#7B2D8E,#0a0820)', body: '그가 마지막으로 본 것은 — 마왕의 미소였다.\n어머니의 미소와 — 닮았다고 — 그는 — 생각했다.', color: '#FFEAA7' },
    ],
  },
  {
    id: 'cs_boss_recall_saint',
    trigger: 'boss_first_kill:saint',
    panels: [
      { icon: '✨', bg: 'radial-gradient(ellipse at 50% 30%,#FDCB6E,#0a0820)', title: '— 성인의 회상 —', body: '"여신은 어디에 계신가?"\n그녀는 평생 그 질문을 했다.\n답은 — 마왕성 앞에서 — 마침내 들었다.', color: '#FDCB6E' },
      { icon: '🦇', bg: 'radial-gradient(ellipse at 50% 60%,#3a2d5c,#0a0820)', body: '"여신은 — 처음부터 — 침묵하셨다.\n다만 — 어둠은 — 답한다."', color: '#FFEAA7' },
    ],
  },
  {
    id: 'cs_boss_recall_king',
    trigger: 'boss_first_kill:king',
    panels: [
      { icon: '👑', bg: 'radial-gradient(ellipse at 50% 30%,#D63031,#0a0820)', title: '— 왕의 회상 —', body: '왕관이 머리에 처음 얹어진 날, 그는 일곱 살이었다.\n무게가 너무 무거워 — 며칠 — 잠을 못 잤다.\n그 무게는 — 평생 — 가벼워지지 않았다.', color: '#FF6B6B' },
      { icon: '🦇', bg: 'radial-gradient(ellipse at 50% 60%,#7B2D8E,#0a0820)', body: '"마왕이여 — 왕관을 — 가져가라.\n나는 — 다음 인간 왕에게 — 가벼움을 — 물려주고 — 싶다."', color: '#FFEAA7' },
    ],
  },
  {
    id: 'cs_boss_recall_priest',
    trigger: 'boss_first_kill:priest',
    panels: [
      { icon: '⛪', bg: 'radial-gradient(ellipse at 50% 30%,#FDCB6E,#0a0820)', title: '— 대신관의 회상 —', body: '"천 년을 — 봉인을 — 지켰다.\n무엇을 지키는지 — 아는 자는 — 나뿐이었다.\n외로웠다 — 매우."', color: '#FDCB6E' },
      { icon: '🦇', bg: 'radial-gradient(ellipse at 50% 50%,#7B2D8E,#0a0820)', body: '"잘 돌아왔다 — 므렐.\n외로움은 — 이제 — 끝이다."', color: '#FFEAA7' },
      { icon: '🌑', bg: 'linear-gradient(180deg,#1a0c30,#000)', body: '대신관은 — 미소지으며 — 무너졌다.\n천 년의 — 외로움이 — 마침내 — 끝났다.', color: '#a55eea' },
    ],
  },
];

export function findCutscene(trigger: string): CutsceneDef | undefined {
  return CUTSCENES.find((c) => c.trigger === trigger);
}
