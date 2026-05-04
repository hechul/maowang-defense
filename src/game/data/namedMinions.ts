/**
 * A3 이름 있는 부하 — 일반 카드 풀 외, 이벤트/스토리에서만 등장.
 *
 * 기존 monsterId를 base로 하되, 이름과 색조와 백스토리가 다른 "특별판" 부하.
 * 도감/덱에 ★ 표시. 잠금 해제는 여러 트리거에서.
 */

export interface NamedMinion {
  id: string;                // 'erb', 'grk', ...
  baseMonsterId: string;     // 기본 카드 ID — 능력 계승
  name: string;              // 표시명
  epithet: string;           // 별명
  /** 잠금 해제 조건 라벨 (UI) */
  unlockLabel: string;
  /** 백스토리 — 5쪽 */
  pages: string[];
  /** 한정 색조 (CSS) — 외형 변형 표시 */
  accent: string;
  /** 자동 해금 트리거 */
  unlock: { kind: 'bossKill' | 'cardEnhance' | 'tabletsCount' | 'recallsCount' | 'event' | 'pvpRank'; param?: string | number };
}

export const NAMED_MINIONS: NamedMinion[] = [
  {
    id: 'erb',
    baseMonsterId: 'slime',
    name: '에르브',
    epithet: '천 년의 — 첫 슬라임',
    unlockLabel: '슬라임 카드 강화 LV 5 도달',
    pages: [
      '에르브는 — 천 년 전 1대 마왕이 처음 만난 슬라임이다. 모든 슬라임은 그의 후손이다.',
      '천 년 동안 마왕성 식료품 창고 한구석에서 — 가장 작은 흐름으로 — 살아남았다.',
      '당신이 깨어난 후 — 그는 더 이상 숨지 않는다. 다만 — 자신의 자손들 옆에 — 자랑스럽게 — 흐른다.',
      '그의 색깔은 — 다른 슬라임보다 — 약간 더 — 깊은 보랏빛이다. 천 년의 — 깊이가 — 그의 색이다.',
      '"나는 — 첫 — 부하다. 당신은 — 두 번째 — 마왕이다." — 그가 마왕에게 한 첫 말.',
    ],
    accent: '#7B2D8E',
    unlock: { kind: 'cardEnhance', param: 'slime:5' },
  },
  {
    id: 'grk',
    baseMonsterId: 'goblin',
    name: '그르크',
    epithet: '한쪽 눈 — 고블린',
    unlockLabel: 'Krug 호감도 15 도달',
    pages: [
      '그르크는 — Krug의 옛 친구다. 천 년 전 1대 마왕전에서 — 죽었다고 알려졌다.',
      '그러나 — 사실 그는 죽지 않았다. 한쪽 눈을 잃고, 의식이 끊긴 채 — 마왕성 지하에 떨어져 — 천 년을 잠들었다.',
      '당신이 마왕성 지하의 봉인 일부를 풀자 — 그가 깨어났다. 잃은 한쪽 눈은 — 영영 — 돌아오지 않는다.',
      'Krug는 그를 보자마자 — 칼을 떨어뜨렸다. 두 고블린은 — 한참을 — 말없이 — 마주봤다.',
      '"옛 노래 — 가사가 — 떠올랐다." — Krug가 — 울먹이며 — 한 첫 말.',
    ],
    accent: '#26de81',
    unlock: { kind: 'tabletsCount', param: 30 },
  },
  {
    id: 'sera',
    baseMonsterId: 'witch',
    name: '세라',
    epithet: 'Iset의 — 옛 동료',
    unlockLabel: 'Iset 호감도 25 도달',
    pages: [
      '세라는 — Iset이 신전에서 추방되기 전 — 가장 친한 동료였다. 빛의 마법사.',
      'Iset이 추방될 때 그녀가 한 마지막 말은 — "잘 가". 그것이 — 인사인지 — 작별인지 — Iset은 모른다.',
      '천 년 후, 세라는 — Iset을 따라 — 어둠의 길로 들어왔다. 늦었지만, 따라왔다.',
      '"잘 가"가 아니라 — "잘 와"였어야 했다고 — 그녀는 — 천 년 동안 — 후회했다.',
      '두 마녀가 다시 만난 첫 밤, 마왕성에 — 보라색 별이 — 한 번 떴다.',
    ],
    accent: '#a55eea',
    unlock: { kind: 'cardEnhance', param: 'witch:5' },
  },
  {
    id: 'duruk',
    baseMonsterId: 'orc',
    name: '두루크',
    epithet: '오크 — 노래꾼',
    unlockLabel: '시즌 패스 티어 20 도달',
    pages: [
      '두루크는 — 오크 부족 중 — 유일하게 — 노래를 부르는 자였다. 다른 오크들은 — 그를 비웃었다.',
      '천 년 전 — 1대 마왕전에서 — 그는 노래로 — 죽어가는 부족원들을 — 위로했다.',
      '그 후 — 오크 부족은 — 그의 노래를 — 잊지 않았다. 노래는 — 부족의 — 정체성이 됐다.',
      '"오크는 — 싸움뿐이 아니다. 우리는 — 노래도 — 부른다." — Owar가 — 두루크의 — 묘비에 — 새긴 말.',
      '시즌 마다 — 그가 다시 깨어난다. 그의 노래가 — 마왕성에 — 잠시 머물고 — 사라진다.',
    ],
    accent: '#FDCB6E',
    unlock: { kind: 'event', param: 'season_pass:20' },
  },
  {
    id: 'noros',
    baseMonsterId: 'lich',
    name: '노로스',
    epithet: '1대 마왕의 — 마법사 동료',
    unlockLabel: '마왕 레벨 25 도달',
    pages: [
      '노로스는 — 1대 마왕 므렐의 — 가장 가까운 마법사 동료였다. 이름 있는 리치 중 — 가장 강한 자.',
      '천 년 전 — 봉인 의식 중 — 그는 마지막까지 — 1대 마왕을 보호했다. 마지막에 — 자신을 — 봉인의 일부로 — 바쳤다.',
      '봉인의 일부였던 그는 — 봉인이 풀리자 — 깨어났다. 다만 — 봉인의 — 잔재가 — 그의 한 손에 — 남아 있다.',
      '그 잔재는 — 봉인의 — 마지막 자물쇠다. 풀리지 않았다. 그가 — 풀지 않는다.',
      '"마지막 자물쇠는 — 당신이 — 풀어야 합니다." — 그가 마왕에게 한 첫 말.',
    ],
    accent: '#74B9FF',
    unlock: { kind: 'recallsCount', param: 15 },
  },
  {
    id: 'belos',
    baseMonsterId: 'devil',
    name: '벨로스',
    epithet: '복수의 — 화신',
    unlockLabel: '챕터 4 클리어',
    pages: [
      '벨로스는 — 천 년 전 — 인간이었다. 그의 가족이 — 신전에 끌려가 — 처형됐다.',
      '그 분노가 — 그를 — 데빌로 만들었다. 1대 마왕은 — 그를 받아들였다.',
      '천 년 후 — 그가 다시 깨어난 첫 밤, 그는 — 신전을 향해 — 단 한 마디만 했다. "기억하라."',
      '그의 분노는 — 천 년이 지나도 — 식지 않는다. 다만 — 마왕 옆에서는 — 잠시 — 가라앉는다.',
      '"마왕은 — 내 분노를 — 이해하는 — 유일한 자다."',
    ],
    accent: '#D63031',
    unlock: { kind: 'bossKill', param: 'priest' },
  },
  {
    id: 'mira',
    baseMonsterId: 'mimic',
    name: '미라',
    epithet: '보물 — 흉내가 — 끝난 자',
    unlockLabel: 'PvP 시즌 점수 100 달성',
    pages: [
      '미라는 — 모든 미믹 중 — 가장 오래된 자. 1대 마왕의 — 보석함을 — 흉내냈던 미믹.',
      '천 년이 지나, 미라는 — 흉내가 — 더 이상 흉내가 아니라 — 자기 자신이 됐다.',
      '그녀가 흉내낸 보석함은 — 어느 순간부터 — 진짜 보석함보다 — 더 가치 있어졌다. 그것이 — 그녀의 — 자존심이다.',
      '"흉내는 — 진심이 들어가면 — 흉내가 아니다." — 그녀가 자주 하는 말.',
      '마왕이 그녀에게 — 새 보물을 — 흉내내달라고 부탁했다. 그녀는 — 마왕의 — 미소를 흉내냈다. 마왕은 — 그제서야 — 자기 미소를 — 봤다.',
    ],
    accent: '#FDCB6E',
    unlock: { kind: 'pvpRank', param: 100 },
  },
  {
    id: 'sol',
    baseMonsterId: 'witch',
    name: '솔',
    epithet: '예언을 본 자 (전향)',
    unlockLabel: '챕터 6 클리어 (역침공 완수)',
    pages: [
      '솔은 — 신전 견습이었다. 봉인의 서판에서 — 사라진 글귀를 — 처음 본 자.',
      '왕에게 보고한 후 — 그녀는 — 자기 말이 — 침공의 시작이 됐다는 사실에 — 후회했다.',
      '챕터 6 — 인간 왕국의 — 신전이 무너진 날, 그녀는 — 마왕성에 — 도망쳐 왔다.',
      '"제 말이 — 모든 것의 — 시작이었습니다. 책임을 — 지러 — 왔습니다."',
      '마왕은 그녀를 — 받아들였다. 그녀는 — 이제 — 어둠의 마법사다. 다만 — 빛의 마법도 — 잊지 않았다.',
    ],
    accent: '#FFEAA7',
    unlock: { kind: 'bossKill', param: 'king_ch6' },  // ch6 king
  },
];

export function getNamedMinion(id: string): NamedMinion | undefined {
  return NAMED_MINIONS.find((m) => m.id === id);
}
