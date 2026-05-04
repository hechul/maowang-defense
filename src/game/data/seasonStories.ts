/**
 * W7 시즌 일화 — 4주 시즌마다 짧은 이야기 한 편.
 *
 * 각 시즌은 컨셉 + 한정 색조 + 한정 보상을 가진다.
 * seasonPass.ts와 별개로, "이번 시즌의 색"을 정의하는 라이브 운영 데이터.
 *
 * 시즌 ID = 'YYYY-S##' (4주 단위, 한 해 13시즌). seasonStories.ts에는 4편을
 * 사이클로 정의 → 자동으로 해당 시즌 인덱스에 매핑.
 */

export interface SeasonStory {
  /** 시즌 인덱스 mod 4 (0~3) */
  cycleIndex: 0 | 1 | 2 | 3;
  /** 시즌 컨셉명 */
  name: string;
  /** 한 줄 부제 */
  subtitle: string;
  /** 시즌 themed 색상 (CSS) */
  themeColor: string;
  /** 마왕 인트로 한 줄 (시즌 시작 시 우편함 환영) */
  greeting: string;
  /** 챕터별 한 줄 — 마왕 일기 (NPC가 인용) */
  diary: string;
  /** 한정 모집 카드 ID */
  limitedRecruitId?: string;
  /** 한정 인테리어 ID */
  limitedInteriorId?: string;
  /** 시즌 한정 적 변형 (HP/ATK 멀티) */
  enemyMod?: { hpMul?: number; atkMul?: number };
  /** 시즌 한정 보너스 (영혼석 보상 멀티) */
  rewardMul?: number;
  /** 컷씬 패널 (시즌 시작 시 1회) */
  panels: { icon: string; bg: string; title?: string; body: string; color?: string }[];
}

export const SEASON_STORIES: SeasonStory[] = [
  {
    cycleIndex: 0,
    name: '벚꽃 침공',
    subtitle: '봄 — 인간이 가장 게으른 시즌',
    themeColor: '#FFB7C5',
    greeting: '"봄에는 인간도 — 칼끝이 무뎌진다."',
    diary: '"벚꽃 아래 진군해오는 자들 — 그들도 한때는 누구의 자식이었지."',
    limitedRecruitId: 'witch',
    limitedInteriorId: 'flag_blackpurple',
    enemyMod: { atkMul: 0.85 },
    rewardMul: 1.10,
    panels: [
      { icon: '🌸', bg: 'radial-gradient(ellipse at 50% 30%,#FFB7C5,#0a0820)', title: '벚꽃 침공', body: '봄이 왔다.\n인간 왕국에서 벚꽃 축제가 열린다.', color: '#FFB7C5' },
      { icon: '🦇', bg: 'radial-gradient(ellipse at 50% 60%,#7B2D8E,#0a0820)', body: '"그들이 술잔을 들 때 —\n나는 부하를 든다."', color: '#FFEAA7' },
    ],
  },
  {
    cycleIndex: 1,
    name: '화염 진군',
    subtitle: '여름 — 광기가 자라는 시즌',
    themeColor: '#FF6B6B',
    greeting: '"더위가 — 광기를 키운다. 좋은 계절이군."',
    diary: '"불꽃 속에서 진군하는 자들의 눈은 — 이미 나를 안 본다."',
    limitedRecruitId: 'devil',
    limitedInteriorId: 'aura_amber',
    enemyMod: { atkMul: 1.15 },
    rewardMul: 1.20,
    panels: [
      { icon: '🔥', bg: 'radial-gradient(ellipse at 50% 30%,#FF6B6B,#0a0820)', title: '화염 진군', body: '한여름. 화염 군단이 강화된다.\n인간들도 광기로 전진한다.', color: '#FF6B6B' },
      { icon: '🦇', bg: 'radial-gradient(ellipse at 50% 60%,#D63031,#0a0820)', body: '"광기는 — 무뎌진 칼보다 위험하다."', color: '#FFEAA7' },
    ],
  },
  {
    cycleIndex: 2,
    name: '추수의 분노',
    subtitle: '가을 — 칼끝이 마왕성을 향한 시즌',
    themeColor: '#FDCB6E',
    greeting: '"추수가 끝나면 — 인간의 칼이 비어 있다. 채울 곳을 찾는다."',
    diary: '"수확의 노래 뒤에 — 진군의 북소리가 따라온다."',
    limitedRecruitId: 'lich',
    limitedInteriorId: 'circle_default',
    enemyMod: { hpMul: 1.10 },
    rewardMul: 1.25,
    panels: [
      { icon: '🌾', bg: 'radial-gradient(ellipse at 50% 30%,#FDCB6E,#0a0820)', title: '추수의 분노', body: '가을. 추수가 끝나고\n인간 왕국이 군대를 모은다.', color: '#FDCB6E' },
      { icon: '🦇', bg: 'radial-gradient(ellipse at 50% 60%,#7B2D8E,#0a0820)', body: '"수확이 끝나면 — 다음은 정복이지.\n인간은 늘 그렇게 살아왔다."', color: '#FFEAA7' },
    ],
  },
  {
    cycleIndex: 3,
    name: '진왕의 기억',
    subtitle: '겨울 — 1대 마왕의 회상이 짙어지는 시즌',
    themeColor: '#74B9FF',
    greeting: '"겨울 별빛은 — 천 년 전과 같다. 옛 기억이 돌아온다."',
    diary: '"눈이 모든 것을 덮는다. 다만 — 옛 동료의 얼굴은 덮이지 않는다."',
    limitedRecruitId: 'mimic',
    limitedInteriorId: 'flag_blackpurple',
    enemyMod: { hpMul: 1.05, atkMul: 1.05 },
    rewardMul: 1.30,
    panels: [
      { icon: '❄', bg: 'radial-gradient(ellipse at 50% 30%,#74B9FF,#0a0820)', title: '진왕의 기억', body: '겨울. 1대 마왕의 회상이\n점점 짙어진다.', color: '#74B9FF' },
      { icon: '🦇', bg: 'radial-gradient(ellipse at 50% 60%,#3a2d5c,#0a0820)', body: '"기억이 무거워질수록 —\n나는 점점 그가 되어간다."', color: '#FFEAA7' },
    ],
  },
];

/** 시즌 ID에서 인덱스 추출 → cycle 매핑 */
export function getSeasonStory(seasonId: string): SeasonStory {
  // 'YYYY-S##' → ## 추출
  const m = /S(\d+)$/.exec(seasonId);
  const idx = m ? parseInt(m[1], 10) - 1 : 0;
  return SEASON_STORIES[idx % 4];
}
