/**
 * G1+G3 — 카드 사이의 관계 + hero 첫 처치 마왕 코멘트.
 *
 * 동시 소환 시 마왕 한 줄 / hero 첫 처치 시 한 줄.
 * 게임 안 마이크로 내러티브의 핵심 — 매번 같은 픽도 다르게 느껴짐.
 */

/** 카드 페어 — 두 monsterId가 같은 필드에 있을 때 마왕 한 줄. */
export interface CardPairLine {
  ids: [string, string];      // 두 monsterId
  line: string;
  /** 한 런에 한 번만 — true 권장 (스팸 방지) */
  oncePerRun: boolean;
}

export const CARD_PAIR_LINES: CardPairLine[] = [
  // 슬라임 가족
  { ids: ['slime', 'kslime'],   oncePerRun: true, line: '"두 슬라임이 — 부자(父子) 사이군."' },
  { ids: ['slime', 'slord'],    oncePerRun: true, line: '"가장 작은 슬라임과 — 가장 큰 슬라임. 같은 줄기다."' },
  { ids: ['kslime', 'slord'],   oncePerRun: true, line: '"왕관과 군주 — 슬라임의 — 두 통치자가 — 함께 선다."' },
  // 고블린 가족
  { ids: ['goblin', 'gobw'],    oncePerRun: true, line: '"고블린이 — 단도를 배운 자에게 — 노래를 가르친다."' },
  { ids: ['gobw', 'ggen'],      oncePerRun: true, line: '"전사와 장군 — 부족의 — 두 손."' },
  { ids: ['goblin', 'ggen'],    oncePerRun: true, line: '"노래꾼과 장군 — 둘 다 — 부족이다."' },
  // 옛 학회 동료
  { ids: ['lich', 'witch'],     oncePerRun: true, line: '"옛 마법학회 동료들 — 다시 — 만나는군."' },
  { ids: ['lich', 'awitch'],    oncePerRun: true, line: '"리치와 대마녀 — 천 년 만의 — 학회 회동이다."' },
  { ids: ['dwitch', 'witch'],   oncePerRun: true, line: '"빛에서 — 어둠으로 — 두 자매가 — 같은 길에 섰다."' },
  // 미궁의 짐승들
  { ids: ['mino', 'minok'],     oncePerRun: true, line: '"미궁의 — 두 왕이 — 함께 — 풀려났다."' },
  // 죽은 자들
  { ids: ['skel', 'zombie'],    oncePerRun: true, line: '"뼈와 — 살이 — 같은 편이 됐다. 이상한 광경이군."' },
  { ids: ['skel', 'sknt'],      oncePerRun: true, line: '"뼈 병사가 — 뼈 기사 옆에 선다. 천 년 전 같은 군대였을 수도 있다."' },
  { ids: ['lich', 'skel'],      oncePerRun: true, line: '"리치가 — 뼈 병사를 — 자기 부하라 부른다. 그도 한때 — 사람이었다."' },
  // 화염의 자손
  { ids: ['imp', 'devil'],      oncePerRun: true, line: '"임프와 데빌 — 모든 악마는 — 한때 — 사람이었거나 — 불꽃이었다."' },
  // 보물 흉내
  { ids: ['mimic', 'gmimic'],   oncePerRun: true, line: '"흉내쟁이와 — 흉내가 끝난 자. 둘 다 — 보물이다."' },
  // 오크 부족
  { ids: ['orc', 'orcb'],       oncePerRun: true, line: '"오크 전사와 영주 — 부족의 — 위계가 — 살아 있다."' },
  { ids: ['orcb', 'owar'],      oncePerRun: true, line: '"영주와 — 대장 — 둘이 함께 — 부족 전체를 든다."' },
  // 진화 라인 만나기 (매우 드문 경우)
  { ids: ['slime', 'goblin'],   oncePerRun: true, line: '"슬라임과 — 고블린 — 가장 흔한 둘이 — 마왕성의 — 기둥이다."' },
  { ids: ['mimic', 'lich'],     oncePerRun: true, line: '"보물과 — 마법사 — 마왕성 — 가장 깊은 방의 — 두 거주자."' },
  // 시너지 강화 페어
  { ids: ['witch', 'imp'],      oncePerRun: true, line: '"마녀와 임프 — 마법진의 — 두 축이다."' },
];

/** 두 monsterId의 페어 라인 찾기 (순서 무관) */
export function findPairLine(idA: string, idB: string): CardPairLine | undefined {
  return CARD_PAIR_LINES.find((p) =>
    (p.ids[0] === idA && p.ids[1] === idB) ||
    (p.ids[0] === idB && p.ids[1] === idA)
  );
}

/* ============================================================
   G3 — hero 첫 처치 마왕 코멘트
   ============================================================ */

export const HERO_FIRST_KILL_LINES: Record<string, string> = {
  apprentice: '"신전 견습 — 봉인의 서판을 — 본 자였군. 첫 처치다."',
  swordsman:  '"왕국 검사 — 명령서만 — 받았던 자다. 그를 — 명령서 너머로 — 보내준다."',
  archer:     '"숲의 사수 — 가족을 위해 — 활을 든 자다. 그의 가족이 — 듣지 않기를 바란다."',
  mage:       '"왕립 마법사 — 검증하러 왔다더니 — 검증당했군."',
  spear:      '"창병 — 대대로 이어진 창. 그 무게가 — 나에게도 — 느껴진다."',
  shield:     '"방패병 — 천 년 전 마왕전의 — 방패였다. 어둠을 — 두 번 만났다."',
  rogue:      '"도적 — 신전이 비밀히 고용한 자. 그도 — 진실을 모르고 — 죽었다."',
  healer:     '"신전 사제 — 회복하던 손이 — 멈췄다. 회복의 끝은 — 침묵이다."',
};

export function getHeroFirstKillLine(typeId: string): string | undefined {
  return HERO_FIRST_KILL_LINES[typeId];
}

/**
 * 5차 — 단골 적 시스템 (GAME_DESIGN_OVERHAUL §2.3 — "친숙한 얼굴")
 * 누적 N번 처치 시 sympathetic 대사. 임계: 5 / 15 / 30.
 * heroFragments(SaveStore) 카운트를 활용. 임계당 1회만 표시 (런 단위).
 */
export const HERO_FAMILIAR_THRESHOLDS = [5, 15, 30] as const;

export const HERO_FAMILIAR_LINES: Record<string, Record<number, string>> = {
  apprentice: {
    5:  '"같은 얼굴이군. 또 — 봉인의 서판에 기록될 것이다."',
    15: '"열다섯 번째다. 신전은 — 후임을 — 너무 — 빨리 — 보낸다."',
    30: '"서른 번. 신전은 — 너의 이름을 — 더는 — 기록하지 않는다."',
  },
  swordsman: {
    5:  '"왕국의 검사 — 다섯 번째 명령서다."',
    15: '"열다섯. 왕국은 — 검사를 — 부리는 데에 — 망설임이 없다."',
    30: '"서른 명. 같은 — 얼굴 — 다른 갑옷."',
  },
  archer: {
    5:  '"숲의 사수가 — 다시 — 활을 들었다."',
    15: '"가족이 — 또 한 명 — 잃을 차례다. 미안하다."',
    30: '"서른 번 — 같은 활시위가 — 끊어졌다."',
  },
  mage: {
    5:  '"왕립 마법사 — 다섯 번째 검증이다."',
    15: '"마법학회는 — 열다섯 번 — 검증에 실패했다."',
    30: '"서른의 마법사 — 같은 결론으로 — 사라진다."',
  },
  spear: {
    5:  '"창병 — 같은 창대가 — 다섯 번 부러졌다."',
    15: '"열다섯의 — 대대 손녀들. 이젠 — 누가 — 누구의 후손인지 — 모르겠다."',
    30: '"서른 — 너의 — 가문이 — 비어간다."',
  },
  shield: {
    5:  '"방패 — 다섯 번째다. 어둠은 — 천 년 전과 — 같은 자리다."',
    15: '"방패병 — 너의 — 방패가 — 닳지 않는다는 게 — 신기하다."',
    30: '"서른의 방패 — 모두 — 같은 문장이다. 너희들은 — 같은 — 설계자다."',
  },
  rogue: {
    5:  '"도적 — 다섯 번째 — 비밀 계약이다."',
    15: '"열다섯. 신전은 — 도적을 — 끊임없이 — 사들인다."',
    30: '"서른의 도적 — 모두 — 진실을 — 모른다."',
  },
  healer: {
    5:  '"사제 — 다섯 번째 — 회복의 손."',
    15: '"열다섯. 회복하는 — 손이 — 또 — 멈췄다."',
    30: '"서른의 회복 — 끝은 — 항상 — 침묵이다."',
  },
};

export function getFamiliarLine(typeId: string, threshold: number): string | undefined {
  return HERO_FAMILIAR_LINES[typeId]?.[threshold];
}
