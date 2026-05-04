/**
 * 보스 5종 백스토리 + 등장 명대사.
 * 보스는 한 줄 명대사를 banner sub로 띄움 (BossSystem 텔레그래프 강화).
 */

export interface BossLoreEntry {
  id: string;            // bosses.ts typeId
  title: string;         // 도감 표시명
  epithet: string;       // 한 줄 별명
  body: string[];        // 4~6줄 백스토리
  /** 등장 시 화면 중앙 큰 글자 (1줄) */
  entranceLine: string;
  /** 페이즈 2 진입 시 추가 한 줄 (없으면 entranceLine 재사용) */
  phase2Line?: string;
  /** 마왕에게 처치당했을 때 마지막 한 줄 */
  defeatLine: string;
}

export const BOSS_LORE: BossLoreEntry[] = [
  {
    id: 'captain',
    title: '왕국군 대장',
    epithet: '의무를 다하는 자',
    body: [
      '왕에게 충성한 평생. 그는 마왕을 본 적이 없다.',
      '그가 받은 명령서에는 단 한 줄: "마왕성 1차 진입."',
      '그는 이게 마지막 임무가 될 거라고 짐작했다.',
      '죽기 전에 가족에게 편지를 썼다.',
      '"내가 돌아오지 않으면 — 그건 내가 의무를 다했다는 뜻이다."',
    ],
    entranceLine: '"당신은 마왕 흉내만 내고 있을 뿐이다."',
    phase2Line: '"내 뒤에는 진짜 군대가 있다."',
    defeatLine: '"... 진짜였군."',
  },
  {
    id: 'archmage',
    title: '대마법사',
    epithet: '진실을 검증하러 온 자',
    body: [
      '왕립 마법학회의 가장 늙은 자. 견습이 본 글귀를',
      '오류라고 단언했다 — "천 년 전 봉인은 완벽했다."',
      '그러나 자신의 마력 감지가 마왕성에서 진동하자,',
      '그는 직접 와야만 했다.',
      '검증의 대가를 그는 자기 목숨으로 치렀다.',
    ],
    entranceLine: '"이건 학문이 아니다. 이건 — 사실이다."',
    phase2Line: '"내 마지막 주문을 받아라."',
    defeatLine: '"천 년 만에... 다시 봤다, 너를."',
  },
  {
    id: 'saint',
    title: '치유의 성인',
    epithet: '동료를 살리는 자',
    body: [
      '여신의 화신이라 불리는 사제. 죽지 않을 거라 믿어졌다.',
      '그녀는 동료를 회복시키며 마왕성으로 진군했다.',
      '한 명도 죽이지 않고 도착하는 것이 그녀의 목표였다.',
      '그러나 그녀가 회복시킨 모든 동료는 — 마왕성 앞에서 무너졌다.',
      '그녀는 그제서야 의심했다. "여신은 어디에 계신가?"',
    ],
    entranceLine: '"내 동료를 더 이상 죽이지 마라."',
    phase2Line: '"빛이 나를 떠난다... 그래도 나는 회복시킨다."',
    defeatLine: '"여신이여... 왜 침묵하셨습니까."',
  },
  {
    id: 'king',
    title: '인간 왕',
    epithet: '결정을 내린 자',
    body: [
      '신전의 보고를 받고 침공을 결정한 자.',
      '그는 마왕이 깨어나는 것보다, 깨어난 마왕을 두는 것이',
      '왕국에 더 큰 위협이라고 판단했다.',
      '왕관은 그가 천 년 전 1대 마왕전에 패배한 왕의 것이다.',
      '그는 평생 그 무게를 짊어졌다. — 무릎을 꿇기 전까지.',
    ],
    entranceLine: '"천 년의 부채를 갚으러 왔다."',
    phase2Line: '"왕은 무릎을 꿇지 않는다."',
    defeatLine: '"... 결국 내 결정이 옳았다. 너는 깨어나선 안 됐다."',
  },
  {
    id: 'priest',
    title: '대신관',
    epithet: '봉인을 지키던 자',
    body: [
      '신전의 가장 높은 자. 봉인의 서판을 천 년 동안 지켰다.',
      '그는 무엇을 지키는지 알고 있었다 — 그게 그의 비밀이었다.',
      '예언이 실현된 것을 가장 먼저 안 사람도 그였다.',
      '그는 견습이 글귀를 보지 못하도록 가렸어야 했다.',
      '그러나 망설였다. — 마왕이 진짜로 돌아올지 보고 싶었던 것이다.',
    ],
    entranceLine: '"기다렸다, 천 년을."',
    phase2Line: '"이제 진실을 마주할 시간이다 — 너에게도, 나에게도."',
    defeatLine: '"... 잘 돌아왔다, 므렐."',
  },
];

export function getBossLore(id: string): BossLoreEntry | undefined {
  return BOSS_LORE.find((b) => b.id === id);
}
