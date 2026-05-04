/**
 * 적 hero 8종 백스토리.
 *
 * 톤 — 인간이 사람으로 보이게. "왜 침공하는가"의 동기 부여.
 */

export interface HeroLoreEntry {
  /** heroes.ts의 typeId */
  id: string;
  /** 표시명 (도감) */
  title: string;
  /** 한 줄 별명 */
  epithet: string;
  /** 4~6줄 백스토리 */
  body: string[];
  /** 첫 등장 시 banner sub 라인 (등장 텔레그래프) */
  firstEncounterLine: string;
}

export const HERO_LORE: HeroLoreEntry[] = [
  {
    id: 'apprentice',
    title: '견습 마법사',
    epithet: '예언을 본 자',
    body: [
      '신전에서 가장 어린 견습. 봉인의 서판에서',
      '사라진 글귀를 처음으로 본 사람.',
      '왕에게 보고할 때 그녀의 손은 떨고 있었다.',
      '"지팡이가 무거워." — 첫 침공 직전의 말.',
    ],
    firstEncounterLine: '"... 정말 깨어있다."',
  },
  {
    id: 'swordsman',
    title: '왕국 검사',
    epithet: '명령을 따르는 자',
    body: [
      '직업 군인. 왕에게 충성하지만,',
      '신전 봉인에 대해서는 들은 적이 없다.',
      '그는 명령서를 받았을 뿐이다.',
      '"마왕성을 탈환하라." — 그게 전부였다.',
    ],
    firstEncounterLine: '"명령은 명령이다."',
  },
  {
    id: 'archer',
    title: '숲의 사수',
    epithet: '거리를 두는 자',
    body: [
      '변경의 사냥꾼 출신. 인간의 사절단이',
      '그의 마을을 들렀을 때, 그는 활을 들고',
      '따라나섰다 — 보상이 가족을 먹일 수 있었다.',
      '"활은 거짓말을 하지 않는다." — 그가 자주 하는 말.',
    ],
    firstEncounterLine: '"먼 거리에서 끝낸다."',
  },
  {
    id: 'mage',
    title: '왕립 마법사',
    epithet: '의심하는 자',
    body: [
      '왕립 마법학회의 상위 멤버. 견습이 본 글귀가',
      '진짜인지 검증하기 위해 동행했다.',
      '그가 마왕성에 도착해 본 것은 — 검증이 필요 없었다.',
      '"이건... 진짜다." — 첫 마주침의 침묵.',
    ],
    firstEncounterLine: '"그렇다면 진짜였군."',
  },
  {
    id: 'spear',
    title: '창병',
    epithet: '대열을 지키는 자',
    body: [
      '왕국 정규군의 척추. 한 번도 마왕을 본 적 없지만,',
      '아버지의 아버지의 아버지가 마왕을 봤다고 들었다.',
      '대대로 전해진 창은 그 시대의 것이다.',
      '"창은 무겁지만, 손에 익었다."',
    ],
    firstEncounterLine: '"대열을 유지하라!"',
  },
  {
    id: 'shield',
    title: '방패병',
    epithet: '먼저 죽는 자',
    body: [
      '동료를 지키기 위해 가장 앞에 선다.',
      '그의 방패는 천 년 전 1대 마왕전에서 살아남은 것.',
      '"이 방패는 어둠을 본 적이 있다." — 그의 자부심.',
      '그는 모른다 — 어둠이 다시 와서 자신을 본다는 것을.',
    ],
    firstEncounterLine: '"방패 뒤에서 들어와라."',
  },
  {
    id: 'rogue',
    title: '도적',
    epithet: '어둠을 노리는 자',
    body: [
      '왕국 정규군이 아니다. 신전이 비밀리에 고용한',
      '어둠 사냥꾼. 그림자 속에서 마왕에게 다가가도록 훈련받았다.',
      '"어둠은 어둠으로 막는다." — 신전이 그에게 가르친 첫 문장.',
      '그는 자신이 누구를 위해 일하는지 모른다.',
    ],
    firstEncounterLine: '"보이지 않는다고 안전하지 않다."',
  },
  {
    id: 'healer',
    title: '신전 사제',
    epithet: '회복하는 자',
    body: [
      '신전의 정규 사제. 봉인의 서판을 가장 자주 본 사람이지만,',
      '아무것도 의심하지 않았다. — 그것이 그녀의 죄.',
      '이제 그녀는 동료를 회복시키며 자신의 과거를 회복시키려 한다.',
      '"내가 더 일찍 봤더라면..." — 들리지 않는 그녀의 기도.',
    ],
    firstEncounterLine: '"빛이 함께하기를."',
  },
];

export function getHeroLore(id: string): HeroLoreEntry | undefined {
  return HERO_LORE.find((h) => h.id === id);
}
