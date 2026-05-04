/**
 * C1 시즌 메인 스토리 — 4시즌 × 4주차 = 16편 짧은 컷씬.
 *
 * 시즌이 시작되면 → 1주차 컷씬 → 1주 후 자동 2주차 → ... → 4주차 종결.
 * 진행도는 store.seasonStoryWeek 으로 관리.
 *
 * 각 주차 = 짧은 컷씬 1편 (2~3패널) + 미션 3개 + 한정 보상 (시즌 패스에 통합).
 */

export interface SeasonMainEpisode {
  /** 시즌 cycleIndex (0~3) — seasonStories.ts와 매핑 */
  seasonCycle: 0 | 1 | 2 | 3;
  /** 주차 (1~4) */
  week: 1 | 2 | 3 | 4;
  title: string;
  /** 컷씬 패널 (2~3개) */
  panels: { icon: string; bg: string; title?: string; body: string; color?: string }[];
  /** 그 주차 미션 3개 (id + 라벨 + 목표값 + 보상 영혼석) */
  missions: { id: string; label: string; target: number; rewardStones: number }[];
  /** 그 주차 종결 시 부여될 보상 라벨 */
  weekClearReward: string;
}

export const SEASON_MAIN_STORIES: SeasonMainEpisode[] = [
  // ============ 시즌 0: 벚꽃 침공 ============
  {
    seasonCycle: 0, week: 1, title: '벚꽃의 — 첫 잎',
    panels: [
      { icon: '🌸', bg: 'radial-gradient(ellipse at 50% 30%,#FFB7C5,#0a0820)', title: '— 1주차 —', body: '벚꽃이 — 마왕성 외벽에 — 한 송이 — 피었다.', color: '#FFB7C5' },
      { icon: '🦇', bg: 'radial-gradient(ellipse at 50% 60%,#7B2D8E,#0a0820)', body: '"... 봄이군. — 천 년 만이다."', color: '#FFEAA7' },
    ],
    missions: [
      { id: 'm_spring_w1_kills', label: '용사 100 처치', target: 100, rewardStones: 100 },
      { id: 'm_spring_w1_pick', label: '카드 30회 펼치기', target: 30, rewardStones: 80 },
      { id: 'm_spring_w1_combo', label: '20 콤보 1회', target: 20, rewardStones: 120 },
    ],
    weekClearReward: '한정 인테리어: 벚꽃 깃발',
  },
  {
    seasonCycle: 0, week: 2, title: '인간의 — 봄 축제',
    panels: [
      { icon: '🌸', bg: 'radial-gradient(ellipse at 50% 30%,#FFB7C5,#0a0820)', title: '— 2주차 —', body: '인간 왕국에서 — 봄 축제가 열린다.\n그러나 — 침공은 멈추지 않는다.', color: '#FFB7C5' },
      { icon: '✉', bg: 'radial-gradient(ellipse at 50% 60%,#FDCB6E,#0a0820)', body: 'Lyra: "축제 중에도 — 사절단은 — 떠난다.\n오히려 — 더 많이."', color: '#FDCB6E' },
    ],
    missions: [
      { id: 'm_spring_w2_bosses', label: '보스 3 처치', target: 3, rewardStones: 200 },
      { id: 'm_spring_w2_evolves', label: '진화 5회', target: 5, rewardStones: 150 },
      { id: 'm_spring_w2_chapters', label: '챕터 1개 클리어', target: 1, rewardStones: 250 },
    ],
    weekClearReward: '한정 모집: 위치(witch) 봄 변형',
  },
  {
    seasonCycle: 0, week: 3, title: '벚꽃 — 사도의 — 도착',
    panels: [
      { icon: '🌸', bg: 'radial-gradient(ellipse at 50% 30%,#FFB7C5,#0a0820)', title: '— 3주차 —', body: '시즌 한정 보스 — "벚꽃의 사도"가 — 마왕성 앞에 도착했다.', color: '#FF6B6B' },
      { icon: '🦇', bg: 'radial-gradient(ellipse at 50% 60%,#7B2D8E,#0a0820)', body: '"꽃잎으로 — 무장한 자라. — 흥미롭다."', color: '#FFEAA7' },
    ],
    missions: [
      { id: 'm_spring_w3_seasonal_boss', label: '벚꽃의 사도 처치', target: 1, rewardStones: 500 },
      { id: 'm_spring_w3_runs', label: '5 런 완료', target: 5, rewardStones: 200 },
      { id: 'm_spring_w3_synergy', label: '시너지 2 동시 활성', target: 1, rewardStones: 200 },
    ],
    weekClearReward: '한정 칭호: 벚꽃의 — 항변자',
  },
  {
    seasonCycle: 0, week: 4, title: '봄의 — 끝, 다음 시즌의 — 시작',
    panels: [
      { icon: '🌸', bg: 'radial-gradient(ellipse at 50% 30%,#FFB7C5,#0a0820)', title: '— 4주차 (종결) —', body: '벚꽃이 — 모두 떨어졌다.\n인간 왕국의 — 봄 축제도 — 끝났다.', color: '#FFB7C5' },
      { icon: '🦇', bg: 'radial-gradient(ellipse at 50% 50%,#7B2D8E,#0a0820)', body: '"꽃은 — 곧 떨어지기 때문에 — 아름답다.\n— 1대 마왕의 — 말이었다."', color: '#FFEAA7' },
      { icon: '☄', bg: 'radial-gradient(ellipse at 50% 60%,#D63031,#0a0820)', body: '다음 시즌이 — 다가온다. 더 — 뜨거운.', color: '#FF6B6B' },
    ],
    missions: [
      { id: 'm_spring_w4_clearall', label: '시즌 미션 모두 클리어', target: 9, rewardStones: 800 },
      { id: 'm_spring_w4_attendance', label: '주간 출석 7회', target: 7, rewardStones: 300 },
      { id: 'm_spring_w4_pvp', label: 'PvP 3 승', target: 3, rewardStones: 400 },
    ],
    weekClearReward: '시즌 종결 보상: 영혼석 + 봉인의 서판 t046+t047',
  },

  // ============ 시즌 1: 화염 진군 ============
  {
    seasonCycle: 1, week: 1, title: '여름의 — 첫 — 불꽃',
    panels: [
      { icon: '🔥', bg: 'radial-gradient(ellipse at 50% 30%,#FF6B6B,#0a0820)', title: '— 1주차 —', body: '여름이다. 인간들도 — 광기로 — 진군한다.', color: '#FF6B6B' },
      { icon: '🦇', bg: 'radial-gradient(ellipse at 50% 60%,#7B2D8E,#0a0820)', body: '"광기는 — 무뎌진 칼보다 — 위험하다."', color: '#FFEAA7' },
    ],
    missions: [
      { id: 'm_summer_w1_fire_picks', label: '화염 태그 카드 30회 픽', target: 30, rewardStones: 150 },
      { id: 'm_summer_w1_kills', label: '용사 200 처치', target: 200, rewardStones: 150 },
      { id: 'm_summer_w1_runs', label: '3 런 완료', target: 3, rewardStones: 100 },
    ],
    weekClearReward: '한정 인테리어: 호박 오라',
  },
  {
    seasonCycle: 1, week: 2, title: '벨로스의 — 분노',
    panels: [
      { icon: '🔥', bg: 'radial-gradient(ellipse at 50% 30%,#D63031,#0a0820)', title: '— 2주차 —', body: '벨로스(이름 있는 데빌)가 — 마왕성에 도착했다.\n그의 옛 가족 — 신전에서 처형됐다는 사실이 — 밝혀졌다.', color: '#FF6B6B' },
      { icon: '😈', bg: 'radial-gradient(ellipse at 50% 60%,#7B2D8E,#0a0820)', body: '벨로스: "기억하라."', color: '#FFEAA7' },
    ],
    missions: [
      { id: 'm_summer_w2_devil_use', label: 'devil 카드 10회 픽', target: 10, rewardStones: 200 },
      { id: 'm_summer_w2_bosses', label: '보스 5 처치', target: 5, rewardStones: 250 },
      { id: 'm_summer_w2_friend', label: '친구 1명 추가', target: 1, rewardStones: 100 },
    ],
    weekClearReward: '한정 모집권: 벨로스(이름 있는 데빌)',
  },
  {
    seasonCycle: 1, week: 3, title: '불꽃 — 신관의 — 도착',
    panels: [
      { icon: '🔥', bg: 'radial-gradient(ellipse at 50% 30%,#D63031,#0a0820)', title: '— 3주차 —', body: '시즌 한정 보스 — "불꽃 신관"이 — 마왕성 앞에 도착했다.', color: '#FF6B6B' },
      { icon: '🦇', bg: 'radial-gradient(ellipse at 50% 60%,#7B2D8E,#0a0820)', body: '"불꽃을 — 신성으로 — 부른 자라. — 들어보자."', color: '#FFEAA7' },
    ],
    missions: [
      { id: 'm_summer_w3_seasonal_boss', label: '불꽃 신관 처치', target: 1, rewardStones: 600 },
      { id: 'm_summer_w3_inferno', label: 'inferno 시너지 5회 활성', target: 5, rewardStones: 250 },
      { id: 'm_summer_w3_chapters', label: '챕터 1개 클리어', target: 1, rewardStones: 250 },
    ],
    weekClearReward: '한정 칭호: 화염을 — 다스린 자',
  },
  {
    seasonCycle: 1, week: 4, title: '여름의 — 끝, 가을의 — 그림자',
    panels: [
      { icon: '🔥', bg: 'radial-gradient(ellipse at 50% 30%,#FF6B6B,#0a0820)', title: '— 4주차 (종결) —', body: '여름이 — 가라앉는다.\n광기도 — 가라앉는다.\n그러나 — 다음 시즌의 — 칼끝이 — 보인다.', color: '#FF6B6B' },
      { icon: '🌾', bg: 'radial-gradient(ellipse at 50% 60%,#FDCB6E,#0a0820)', body: '"수확이 끝나면 — 다음은 — 정복이지."', color: '#FDCB6E' },
    ],
    missions: [
      { id: 'm_summer_w4_clearall', label: '시즌 미션 모두', target: 9, rewardStones: 800 },
      { id: 'm_summer_w4_attendance', label: '주간 출석 7회', target: 7, rewardStones: 300 },
      { id: 'm_summer_w4_evolves', label: '진화 10회', target: 10, rewardStones: 400 },
    ],
    weekClearReward: '시즌 종결 보상 + 봉인의 서판 t048+t049',
  },

  // ============ 시즌 2: 추수의 분노 ============
  {
    seasonCycle: 2, week: 1, title: '추수의 — 첫 — 노래',
    panels: [
      { icon: '🌾', bg: 'radial-gradient(ellipse at 50% 30%,#FDCB6E,#0a0820)', title: '— 1주차 —', body: '가을이 — 마왕성 외벽 — 풀에 내려앉았다.\n인간 왕국의 — 추수가 — 끝났다.', color: '#FDCB6E' },
      { icon: '🦇', bg: 'radial-gradient(ellipse at 50% 60%,#7B2D8E,#0a0820)', body: '"수확의 노래 뒤에 — 진군의 — 북소리가 따라온다."', color: '#FFEAA7' },
    ],
    missions: [
      { id: 'm_autumn_w1_undead', label: '언데드 카드 20회 픽', target: 20, rewardStones: 150 },
      { id: 'm_autumn_w1_kills', label: '용사 200 처치', target: 200, rewardStones: 150 },
      { id: 'm_autumn_w1_pvp', label: 'PvP 1 승', target: 1, rewardStones: 100 },
    ],
    weekClearReward: '한정 인테리어: 추수의 마법진',
  },
  {
    seasonCycle: 2, week: 2, title: '두루크의 — 노래가 — 들린다',
    panels: [
      { icon: '🌾', bg: 'radial-gradient(ellipse at 50% 30%,#FDCB6E,#0a0820)', title: '— 2주차 —', body: '두루크(이름 있는 오크 노래꾼)가 — 마왕성에 — 잠시 머문다.\n그의 노래가 — 가을 바람에 — 흐른다.', color: '#FDCB6E' },
      { icon: '🎵', bg: 'radial-gradient(ellipse at 50% 60%,#7B2D8E,#0a0820)', body: 'Krug: "옛 친구의 — 노래다. 들어라."', color: '#26de81' },
    ],
    missions: [
      { id: 'm_autumn_w2_orc_use', label: 'orc 카드 15회 픽', target: 15, rewardStones: 200 },
      { id: 'm_autumn_w2_synergy', label: 'rage 시너지 5회 활성', target: 5, rewardStones: 250 },
      { id: 'm_autumn_w2_friend_visit', label: '친구 방문 5회', target: 5, rewardStones: 150 },
    ],
    weekClearReward: '한정 모집권: 두루크(이름 있는 오크)',
  },
  {
    seasonCycle: 2, week: 3, title: '추수의 — 사절의 — 도착',
    panels: [
      { icon: '🌾', bg: 'radial-gradient(ellipse at 50% 30%,#FDCB6E,#0a0820)', title: '— 3주차 —', body: '시즌 한정 보스 — "추수의 사절"이 — 마왕성 앞에 도착했다.', color: '#FDCB6E' },
      { icon: '🦇', bg: 'radial-gradient(ellipse at 50% 60%,#7B2D8E,#0a0820)', body: '"낫을 — 든 자라. — 추수의 — 마지막 — 작물은 — 너겠지."', color: '#FFEAA7' },
    ],
    missions: [
      { id: 'm_autumn_w3_seasonal_boss', label: '추수의 사절 처치', target: 1, rewardStones: 600 },
      { id: 'm_autumn_w3_combo', label: '50 콤보 1회', target: 50, rewardStones: 300 },
      { id: 'm_autumn_w3_chapters', label: '챕터 1개 클리어', target: 1, rewardStones: 250 },
    ],
    weekClearReward: '한정 칭호: 추수의 — 항변자',
  },
  {
    seasonCycle: 2, week: 4, title: '가을의 — 끝, 겨울의 — 시작',
    panels: [
      { icon: '🌾', bg: 'radial-gradient(ellipse at 50% 30%,#FDCB6E,#0a0820)', title: '— 4주차 (종결) —', body: '가을이 — 끝났다.\n첫 — 눈송이가 — 마왕성 외벽에 — 내려앉았다.', color: '#FDCB6E' },
      { icon: '❄', bg: 'radial-gradient(ellipse at 50% 60%,#74B9FF,#0a0820)', body: '"겨울이 온다. 옛 동료의 — 얼굴이 — 떠오를 시즌이다."', color: '#74B9FF' },
    ],
    missions: [
      { id: 'm_autumn_w4_clearall', label: '시즌 미션 모두', target: 9, rewardStones: 800 },
      { id: 'm_autumn_w4_attendance', label: '주간 출석 7회', target: 7, rewardStones: 300 },
      { id: 'm_autumn_w4_card_max', label: '카드 1종 LV 5 도달', target: 1, rewardStones: 500 },
    ],
    weekClearReward: '시즌 종결 보상 + 봉인의 서판 t050+t051',
  },

  // ============ 시즌 3: 진왕의 기억 ============
  {
    seasonCycle: 3, week: 1, title: '겨울 별빛의 — 첫 — 회상',
    panels: [
      { icon: '❄', bg: 'radial-gradient(ellipse at 50% 30%,#74B9FF,#0a0820)', title: '— 1주차 —', body: '겨울 별빛이 — 마왕성에 — 내린다.\n천 년 전과 — 같은 별빛이다.', color: '#74B9FF' },
      { icon: '🦇', bg: 'radial-gradient(ellipse at 50% 60%,#3a2d5c,#0a0820)', body: '"옛 — 기억이 — 짙어진다."', color: '#FFEAA7' },
    ],
    missions: [
      { id: 'm_winter_w1_recall', label: '회상 3회 보기', target: 3, rewardStones: 300 },
      { id: 'm_winter_w1_iset_visit', label: 'Iset과 5회 대화', target: 5, rewardStones: 200 },
      { id: 'm_winter_w1_kills', label: '용사 200 처치', target: 200, rewardStones: 150 },
    ],
    weekClearReward: '한정 인테리어: 진왕의 — 깃발',
  },
  {
    seasonCycle: 3, week: 2, title: '노로스가 — 깨어난다',
    panels: [
      { icon: '❄', bg: 'radial-gradient(ellipse at 50% 30%,#74B9FF,#0a0820)', title: '— 2주차 —', body: '노로스(1대 마왕의 마법사 동료)가 — 마왕성 지하에서 — 깨어난다.\n그의 한 손에 — 봉인의 — 마지막 자물쇠가 — 남아 있다.', color: '#74B9FF' },
      { icon: '🔮', bg: 'radial-gradient(ellipse at 50% 60%,#a55eea,#0a0820)', body: '노로스: "마지막 자물쇠는 — 당신이 — 풀어야 합니다."', color: '#a55eea' },
    ],
    missions: [
      { id: 'm_winter_w2_lich_use', label: 'lich 카드 15회 픽', target: 15, rewardStones: 250 },
      { id: 'm_winter_w2_recall', label: '회상 누적 10개 도달', target: 10, rewardStones: 350 },
      { id: 'm_winter_w2_chapters', label: '챕터 1개 클리어', target: 1, rewardStones: 250 },
    ],
    weekClearReward: '한정 모집권: 노로스(이름 있는 리치)',
  },
  {
    seasonCycle: 3, week: 3, title: '거울 앞에서 —',
    panels: [
      { icon: '🪞', bg: 'radial-gradient(ellipse at 50% 30%,#3a2d5c,#0a0820)', title: '— 3주차 —', body: '시즌 한정 보스 — "1대 마왕의 — 그림자"가 — 마왕성 앞에 도착했다.\n그것은 — 당신의 — 그림자다.', color: '#a55eea' },
      { icon: '🦇', bg: 'radial-gradient(ellipse at 50% 60%,#7B2D8E,#0a0820)', body: '"... 천 년 전의 나(므렐)인가."', color: '#FFEAA7' },
    ],
    missions: [
      { id: 'm_winter_w3_seasonal_boss', label: '1대 마왕의 그림자 처치', target: 1, rewardStones: 800 },
      { id: 'm_winter_w3_demon_lv', label: '마왕 LV 25 도달', target: 25, rewardStones: 500 },
      { id: 'm_winter_w3_npc_max', label: 'NPC 1명 호감 30 도달', target: 1, rewardStones: 400 },
    ],
    weekClearReward: '한정 칭호: 거울 앞에 — 선 자',
  },
  {
    seasonCycle: 3, week: 4, title: '진명을 — 받아들이는가',
    panels: [
      { icon: '🌑', bg: 'radial-gradient(ellipse at 50% 30%,#1a0c30,#000)', title: '— 4주차 (종결, 진명 해금) —', body: 'Vael: "이제 — 진명을 — 들으실 — 때입니다."', color: '#FFEAA7' },
      { icon: '☄', bg: 'radial-gradient(ellipse at 50% 50%,#FDCB6E,#0a0820)', body: '"므렐(Mrel) — 그것이 — 1대 마왕의 진명입니다.\n당신은 — 므렐이지만 — 므렐만은 — 아닙니다."', color: '#FDCB6E' },
      { icon: '🦇', bg: 'radial-gradient(ellipse at 50% 60%,#7B2D8E,#0a0820)', body: '"... 받아들인다.\n그러나 — 새로운 이름도 — 짓는다."', color: '#FFEAA7' },
    ],
    missions: [
      { id: 'm_winter_w4_clearall', label: '시즌 미션 모두', target: 9, rewardStones: 1000 },
      { id: 'm_winter_w4_recall_complete', label: '회상 30개 모두', target: 30, rewardStones: 1500 },
      { id: 'm_winter_w4_attendance', label: '주간 출석 7회', target: 7, rewardStones: 300 },
    ],
    weekClearReward: '시즌 종결 보상 + 봉인의 서판 t052+t053 + 진명 해금',
  },
];

export function getSeasonEpisode(cycle: 0 | 1 | 2 | 3, week: 1 | 2 | 3 | 4): SeasonMainEpisode | undefined {
  return SEASON_MAIN_STORIES.find((e) => e.seasonCycle === cycle && e.week === week);
}

export function currentWeekOfSeason(seasonStartIso: string): 1 | 2 | 3 | 4 {
  const start = new Date(seasonStartIso).getTime();
  const days = Math.floor((Date.now() - start) / 86400000);
  if (days < 7) return 1;
  if (days < 14) return 2;
  if (days < 21) return 3;
  return 4;
}
