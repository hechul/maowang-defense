/**
 * 부하 카드(monsterId) 백스토리 — 24종 라인.
 * 카드 강화/도감 진입 시 노출. 강화가 "감정적 레벨업"이 되도록.
 */

export interface CardLoreEntry {
  id: string;
  /** 한 줄 별명 */
  epithet: string;
  /** 1~2줄 본문 (짧게 — 카드 자리 공간 작음) */
  body: string;
  /** 진화 시 마왕 한 줄 */
  evolveLine?: string;
}

export const CARD_LORE: CardLoreEntry[] = [
  // 슬라임 라인
  { id: 'slime',  epithet: '첫 부하',
    body: '천 년 전 마왕성 식료품 창고에서 흘러나온 끈끈이가 의식을 갖게 된 것.',
    evolveLine: '"슬라임 — 너도 자라는구나."' },
  { id: 'kslime', epithet: '왕관 슬라임',
    body: '인간 왕족의 잔재 왕관을 주워 자기 머리에 얹은 슬라임. 이제 자기를 왕이라 칭한다.',
    evolveLine: '"왕관이 어울린다, 왕(王)슬라임."' },
  { id: 'slord',  epithet: '슬라임 군주',
    body: '슬라임 사회의 무언의 통치자. 모든 슬라임이 그를 따른다 — 이유는 아무도 모른다.',
    evolveLine: '"슬라임 군주... 너의 신하가 될 자가 한 명 있다."' },

  // 고블린 라인
  { id: 'goblin', epithet: '척후',
    body: '마왕성 외곽을 순찰하던 고블린. 노래를 부르며 정찰한다 — 듣는 자가 없으니 자유롭게.',
    evolveLine: '"고블린, 노래를 잠시 멈춰라."' },
  { id: 'gobw',   epithet: '전사 고블린',
    body: '두 자루의 단도를 다룬다. 고블린 부족에서 가장 먼저 무기를 배운 자.',
    evolveLine: '"단도가 둘이라 두 배로 빠르다."' },
  { id: 'ggen',   epithet: '고블린 장군',
    body: '고블린 부족 전체를 통솔하는 자. 그의 명령이면 슬라임도 따른다.',
    evolveLine: '"장군, 부하들을 잘 부탁한다."' },

  // 해골 라인
  { id: 'skel',   epithet: '뼈 병사',
    body: '천 년 전 마왕전에서 죽은 인간 군인의 잔해. 이름을 잊었지만 충성심은 잊지 않았다.',
    evolveLine: '"네 이름은 — 잊혔지만 너는 잊지 않았다."' },
  { id: 'sknt',   epithet: '뼈 기사',
    body: '갑옷이 살에 박힌 채 죽은 기사의 뼈. 이제 살은 없고 갑옷과 의지만 남았다.',
    evolveLine: '"기사, 이번엔 죽지 마라."' },

  // 좀비 라인
  { id: 'zombie', epithet: '잊혀진 자',
    body: '마왕성 지하 묘지에서 나온 자. 자신이 누구였는지 모른다 — 마왕도 모른다.',
    evolveLine: '"잊혀진 자여, 함께 가자."' },
  { id: 'zomk',   epithet: '광기 좀비',
    body: '죽음 후에도 해소되지 않은 분노가 그를 끌어올렸다. 누구를 향한 분노인지 — 모른다.',
    evolveLine: '"분노가 너를 강하게 한다."' },

  // 마녀 라인
  { id: 'witch',  epithet: '숲의 마녀',
    body: '신전이 박해한 자. 살기 위해 마왕성에 도망쳤다 — 살아남았더니, 깨어남을 보았다.',
    evolveLine: '"마녀, 신전의 두려움을 너는 잘 알지."' },
  { id: 'dwitch', epithet: '암흑 마녀',
    body: '한때 빛의 마법을 썼다. 신전에서 추방되어 어둠을 배웠다.',
    evolveLine: '"빛에서 어둠으로 — 그 길을 나는 안다."' },
  { id: 'awitch', epithet: '대마녀',
    body: '모든 마녀의 스승. 마왕의 깨어남을 — 천 년 전부터 점쳤다.',
    evolveLine: '"대마녀여, 점이 맞았다."' },

  // 오크 라인
  { id: 'orc',    epithet: '오크 전사',
    body: '오크 부족의 평범한 전사. 마왕에게 "큰 싸움"을 약속받고 모였다.',
    evolveLine: '"오크여, 큰 싸움이 곧 온다."' },
  { id: 'orcb',   epithet: '오크 영주',
    body: '오크 한 부족을 통솔하는 자. 마왕에게 직접 충성을 맹세했다.',
    evolveLine: '"영주여, 너의 부족을 자랑스럽게 만들자."' },
  { id: 'owar',   epithet: '오크 대장',
    body: '오크 모든 부족을 통합한 영웅. 마왕의 깨어남을 — 자기 시대로 받아들였다.',
    evolveLine: '"오크 대장, 이게 네 시대다."' },

  // 임프 / 데빌 라인
  { id: 'imp',    epithet: '말썽쟁이',
    body: '마왕성 굴뚝에서 나오는 작은 악마. 불을 좋아하고, 시끄럽다.',
    evolveLine: '"임프, 조용히 — 그래도 빠르긴 하다."' },
  { id: 'devil',  epithet: '진홍 데빌',
    body: '한때 인간이었으나, 분노가 그를 이런 모습으로 만들었다. 분노의 이유는 — 잊었다.',
    evolveLine: '"데빌, 너의 분노를 — 이제 인간에게 돌려줘라."' },

  // 미노타우르스 라인
  { id: 'mino',   epithet: '미궁의 짐승',
    body: '천 년 전 마왕성 미궁에 갇힌 채 봉인되었다. 이제 미궁에서 풀려났다.',
    evolveLine: '"미궁의 짐승 — 자유다."' },
  { id: 'minok',  epithet: '미궁의 왕',
    body: '미궁 안에서 다른 짐승을 모두 잡아먹은 자. 이제 그가 미궁이다.',
    evolveLine: '"이 미궁의 왕 — 마왕성 밖을 봐라."' },

  // 리치 라인
  { id: 'lich',   epithet: '옛 마법사',
    body: '1대 마왕의 마법사 동료. 죽어서도 충성을 지키며 마왕성 지하에서 깨어남을 기다렸다.',
    evolveLine: '"리치여 — 천 년 만에 다시 명령한다."' },
  { id: 'dlich',  epithet: '암흑 리치',
    body: '리치가 더 깊은 어둠을 배운 모습. 자기 영혼을 — 마왕에게 넘겼다.',
    evolveLine: '"네 영혼을 받아두마. 함부로 못 잃는다."' },

  // 미믹 라인
  { id: 'mimic',  epithet: '보물 흉내',
    body: '천 년 전 마왕성 보물을 지키던 함정. 마왕이 깨어남과 함께 — 다시 함정으로 돌아왔다.',
    evolveLine: '"미믹, 인간을 또 속여라."' },
  { id: 'gmimic', epithet: '대미믹',
    body: '여러 미믹이 합쳐진 거대한 함정. 더 이상 흉내가 아니라 — 그 자체로 보물이다.',
    evolveLine: '"대미믹 — 너야말로 마왕성의 보물이다."' },
];

export function getCardLore(id: string): CardLoreEntry | undefined {
  return CARD_LORE.find((c) => c.id === id);
}
