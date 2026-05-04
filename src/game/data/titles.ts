/**
 * F1 진왕 칭호 시스템 — 모든 마일스톤마다 칭호 부여.
 *
 * 한 칭호 장착 가능 — 친구/PvP 화면에 표시.
 * 누적 100 칭호 달성 시 "신왕(神王)" 잠금 해제.
 */

export type TitleCategory =
  | 'chapter'      // 챕터 클리어
  | 'season'       // 시즌 종료
  | 'challenge'    // 챌린지 별점
  | 'card'         // 카드 콜렉션
  | 'pvp'          // PvP 점수
  | 'social'       // 친구
  | 'collection'   // 도감 / 봉인서판
  | 'demon'        // 마왕 레벨
  | 'narrative'    // 스토리 진행
  | 'special';     // 한정 / 특별

export interface TitleDef {
  id: string;
  name: string;             // 표시명 — "봉인의 입구를 막은 자"
  category: TitleCategory;
  /** 자동 부여 조건 라벨 (UI) */
  description: string;
  /** 등급 (시각 강조용) */
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  /** 자동 부여 트리거 — store에서 조회 */
  unlock: { kind: string; param?: string | number };
}

export const TITLES: TitleDef[] = [
  // ─── 챕터 클리어 ───
  { id: 't_ch1_clear', name: '봉인의 입구를 — 막은 자', category: 'chapter', description: '챕터 1 클리어', rarity: 'common', unlock: { kind: 'chapter', param: 'ch1' } },
  { id: 't_ch2_clear', name: '잊혀진 자들의 — 동료', category: 'chapter', description: '챕터 2 클리어', rarity: 'common', unlock: { kind: 'chapter', param: 'ch2' } },
  { id: 't_ch3_clear', name: '변경의 봉화를 — 끈 자', category: 'chapter', description: '챕터 3 클리어', rarity: 'rare', unlock: { kind: 'chapter', param: 'ch3' } },
  { id: 't_ch4_clear', name: '겨울을 — 견딘 자', category: 'chapter', description: '챕터 4 클리어', rarity: 'rare', unlock: { kind: 'chapter', param: 'ch4' } },
  { id: 't_ch5_clear', name: '심연 법정의 — 항변자', category: 'chapter', description: '챕터 5 클리어', rarity: 'epic', unlock: { kind: 'chapter', param: 'ch5' } },
  { id: 't_ch6_clear', name: '【진왕】', category: 'chapter', description: '챕터 6 클리어 (역침공 완수)', rarity: 'legendary', unlock: { kind: 'chapter', param: 'ch6' } },

  // ─── 시즌 ───
  { id: 't_season_spring', name: '춘설(春雪)의 — 마왕', category: 'season', description: '봄 시즌 패스 30 티어 도달', rarity: 'rare', unlock: { kind: 'seasonPassMax', param: 'spring' } },
  { id: 't_season_summer', name: '화염을 — 다스린 자', category: 'season', description: '여름 시즌 패스 30 티어 도달', rarity: 'rare', unlock: { kind: 'seasonPassMax', param: 'summer' } },
  { id: 't_season_autumn', name: '추수의 — 항변자', category: 'season', description: '가을 시즌 패스 30 티어 도달', rarity: 'rare', unlock: { kind: 'seasonPassMax', param: 'autumn' } },
  { id: 't_season_winter', name: '겨울 — 진왕의 — 기억자', category: 'season', description: '겨울 시즌 패스 30 티어 도달', rarity: 'epic', unlock: { kind: 'seasonPassMax', param: 'winter' } },

  // ─── 챌린지 별점 ───
  { id: 't_challenge_star_3', name: '도전의 — 별을 — 모은 자', category: 'challenge', description: '한 챌린지 ★★★ 달성', rarity: 'rare', unlock: { kind: 'challengeStar3', param: 1 } },
  { id: 't_challenge_all_3', name: '모든 도전의 — 별을 — 모은 자', category: 'challenge', description: '6 챌린지 모두 ★★★', rarity: 'legendary', unlock: { kind: 'challengeStar3', param: 6 } },

  // ─── 카드 콜렉션 ───
  { id: 't_card_recruit_10', name: '부하의 — 첫 — 친구', category: 'card', description: '10 카드 모집', rarity: 'common', unlock: { kind: 'recruitCount', param: 10 } },
  { id: 't_card_recruit_all', name: '모든 부하의 — 마왕', category: 'card', description: '24 카드 모두 모집', rarity: 'epic', unlock: { kind: 'recruitCount', param: 24 } },
  { id: 't_card_max_1', name: '카드 — 강화의 — 시작', category: 'card', description: '카드 1종 LV 5 도달', rarity: 'common', unlock: { kind: 'cardMax', param: 1 } },
  { id: 't_card_max_10', name: '강화의 — 장인', category: 'card', description: '카드 10종 LV 5 도달', rarity: 'rare', unlock: { kind: 'cardMax', param: 10 } },
  { id: 't_card_max_all', name: '모든 부하의 — 강화자', category: 'card', description: '24 카드 모두 LV 5', rarity: 'legendary', unlock: { kind: 'cardMax', param: 24 } },

  // ─── PvP ───
  { id: 't_pvp_first_win', name: '첫 — 거울을 — 든 자', category: 'pvp', description: 'PvP 첫 승리', rarity: 'common', unlock: { kind: 'pvpWins', param: 1 } },
  { id: 't_pvp_10_wins', name: '거울의 — 정복자', category: 'pvp', description: 'PvP 10 승', rarity: 'rare', unlock: { kind: 'pvpWins', param: 10 } },
  { id: 't_pvp_50_wins', name: '거울의 — 황제', category: 'pvp', description: 'PvP 50 승', rarity: 'epic', unlock: { kind: 'pvpWins', param: 50 } },

  // ─── 친구 ───
  { id: 't_friend_first', name: '외롭지 — 않은 — 마왕', category: 'social', description: '첫 친구 추가', rarity: 'common', unlock: { kind: 'friendCount', param: 1 } },
  { id: 't_friend_10', name: '마왕성의 — 호스트', category: 'social', description: '친구 10명', rarity: 'rare', unlock: { kind: 'friendCount', param: 10 } },

  // ─── 도감 / 봉인서판 ───
  { id: 't_tablet_25', name: '서판의 — 첫 — 독자', category: 'collection', description: '봉인의 서판 25개', rarity: 'common', unlock: { kind: 'tablets', param: 25 } },
  { id: 't_tablet_50', name: '서판의 — 학자', category: 'collection', description: '봉인의 서판 50개', rarity: 'rare', unlock: { kind: 'tablets', param: 50 } },
  { id: 't_tablet_80', name: '진명을 — 들은 자', category: 'collection', description: '봉인의 서판 80개 (진명 해금)', rarity: 'epic', unlock: { kind: 'tablets', param: 80 } },
  { id: 't_tablet_all', name: '모든 — 진실을 — 본 자', category: 'collection', description: '봉인의 서판 100개', rarity: 'legendary', unlock: { kind: 'tablets', param: 100 } },
  { id: 't_recall_complete', name: '천 년의 — 회상자', category: 'collection', description: '회상 30개 모두 본 자', rarity: 'legendary', unlock: { kind: 'recalls', param: 30 } },

  // ─── 마왕 레벨 ───
  { id: 't_demon_lv_10', name: '봉인의 — 첫 자물쇠를 — 푼 자', category: 'demon', description: '마왕 LV 10', rarity: 'common', unlock: { kind: 'demonLv', param: 10 } },
  { id: 't_demon_lv_25', name: '잊혀진 — 마왕', category: 'demon', description: '마왕 LV 25', rarity: 'rare', unlock: { kind: 'demonLv', param: 25 } },
  { id: 't_demon_lv_50', name: '【진왕 — 각성】', category: 'demon', description: '마왕 LV 50', rarity: 'legendary', unlock: { kind: 'demonLv', param: 50 } },

  // ─── 내러티브 / 스토리 ───
  { id: 't_npc_max_one', name: '한 — NPC의 — 친구', category: 'narrative', description: 'NPC 1명 호감도 30', rarity: 'rare', unlock: { kind: 'npcAffinityMax', param: 1 } },
  { id: 't_npc_max_all', name: '왕좌실의 — 가족', category: 'narrative', description: 'NPC 4명 모두 호감도 30', rarity: 'legendary', unlock: { kind: 'npcAffinityMax', param: 4 } },
  { id: 't_named_minion_5', name: '이름을 — 받은 자', category: 'narrative', description: '이름 있는 부하 5종 해금', rarity: 'epic', unlock: { kind: 'namedMinions', param: 5 } },
  { id: 't_named_minion_all', name: '모든 — 이름의 — 마왕', category: 'narrative', description: '이름 있는 부하 8종 모두', rarity: 'legendary', unlock: { kind: 'namedMinions', param: 8 } },

  // ─── 도덕성 ───
  { id: 't_morality_mercy', name: '자비의 — 마왕', category: 'narrative', description: '도덕 게이지 자비 100', rarity: 'epic', unlock: { kind: 'morality', param: 'mercy' } },
  { id: 't_morality_ruthless', name: '잔혹의 — 마왕', category: 'narrative', description: '도덕 게이지 잔혹 -100', rarity: 'epic', unlock: { kind: 'morality', param: 'ruthless' } },
  { id: 't_morality_balanced', name: '균형의 — 마왕', category: 'narrative', description: '도덕 게이지 ±10 안에서 결정 30회', rarity: 'epic', unlock: { kind: 'morality', param: 'balanced' } },

  // ─── 한정 / 특별 ───
  { id: 't_first_run', name: '첫 — 깨어남', category: 'special', description: '게임 시작', rarity: 'common', unlock: { kind: 'auto', param: 'first_run' } },
  { id: 't_runs_100', name: '천 년의 — 인내자', category: 'special', description: '런 100회', rarity: 'epic', unlock: { kind: 'runs', param: 100 } },
  { id: 't_runs_500', name: '영원의 — 마왕', category: 'special', description: '런 500회', rarity: 'legendary', unlock: { kind: 'runs', param: 500 } },
  { id: 't_god_king', name: '【신왕(神王)】', category: 'special', description: '칭호 30개 누적 (모든 영역의 정점)', rarity: 'legendary', unlock: { kind: 'titlesCount', param: 30 } },
];

export const RARITY_COLOR: Record<TitleDef['rarity'], string> = {
  common:    '#9aa0a8',
  rare:      '#0984E3',
  epic:      '#a55eea',
  legendary: '#FDCB6E',
};

export function getTitle(id: string): TitleDef | undefined {
  return TITLES.find((t) => t.id === id);
}

/** 사용자의 store 스냅샷에서 새로 부여될 칭호 목록 평가 */
export function evaluateNewTitles(ctx: {
  clearedStages: string[];
  cardLevels: Record<string, number>;
  recruitedMonsterIds: string[];
  challengeStars: Record<string, number>;
  pvpRecord: Record<string, { wins: number; losses: number; draws: number }>;
  friendsCount: number;
  tabletsSeen: string[];
  recallSeen: string[];
  demonLevel: number;
  npcAffinity: Record<string, number>;
  namedMinionsOwned: string[];
  moralityCounts: { mercy: number; ruthless: number; balanced: number };
  runs: number;
  earnedTitles: string[];
  seasonPassMaxedSeasons: string[];
}): string[] {
  const out: string[] = [];
  const has = (id: string) => ctx.earnedTitles.includes(id);
  const add = (id: string) => { if (!has(id) && !out.includes(id)) out.push(id); };

  for (const t of TITLES) {
    if (has(t.id)) continue;
    const u = t.unlock;
    switch (u.kind) {
      case 'chapter': {
        const ch = String(u.param);
        if (ctx.clearedStages.includes(`${ch}_s5`)) add(t.id);
        break;
      }
      case 'seasonPassMax':
        if (ctx.seasonPassMaxedSeasons.includes(String(u.param))) add(t.id);
        break;
      case 'challengeStar3': {
        const need = Number(u.param);
        const got = Object.values(ctx.challengeStars).filter((v) => v >= 3).length;
        if (got >= need) add(t.id);
        break;
      }
      case 'recruitCount':
        if (ctx.recruitedMonsterIds.length >= Number(u.param)) add(t.id);
        break;
      case 'cardMax': {
        const got = Object.values(ctx.cardLevels).filter((v) => v >= 5).length;
        if (got >= Number(u.param)) add(t.id);
        break;
      }
      case 'pvpWins': {
        const total = Object.values(ctx.pvpRecord).reduce((s, r) => s + r.wins, 0);
        if (total >= Number(u.param)) add(t.id);
        break;
      }
      case 'friendCount':
        if (ctx.friendsCount >= Number(u.param)) add(t.id);
        break;
      case 'tablets':
        if (ctx.tabletsSeen.length >= Number(u.param)) add(t.id);
        break;
      case 'recalls':
        if (ctx.recallSeen.length >= Number(u.param)) add(t.id);
        break;
      case 'demonLv':
        if (ctx.demonLevel >= Number(u.param)) add(t.id);
        break;
      case 'npcAffinityMax': {
        const need = Number(u.param);
        const got = Object.values(ctx.npcAffinity).filter((v) => v >= 30).length;
        if (got >= need) add(t.id);
        break;
      }
      case 'namedMinions':
        if (ctx.namedMinionsOwned.length >= Number(u.param)) add(t.id);
        break;
      case 'morality': {
        const which = String(u.param) as 'mercy' | 'ruthless' | 'balanced';
        if (ctx.moralityCounts[which] >= 30) add(t.id);
        break;
      }
      case 'runs':
        if (ctx.runs >= Number(u.param)) add(t.id);
        break;
      case 'auto':
        if (u.param === 'first_run' && ctx.runs >= 1) add(t.id);
        break;
      case 'titlesCount':
        if (ctx.earnedTitles.length >= Number(u.param)) add(t.id);
        break;
    }
  }
  return out;
}
