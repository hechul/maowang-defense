/**
 * 시즌 한정 보스 — 시즌마다 등장하는 특별 보스.
 *
 * 시즌 인덱스 (cycleIndex 0~3) 마다 1마리.
 * 처치 시 한정 보상. 시즌이 지나면 박물관에 — 빈자리로 — 남음.
 */

export interface SeasonalBoss {
  id: string;
  cycleIndex: 0 | 1 | 2 | 3;
  name: string;
  epithet: string;
  /** 베이스 보스 ID (스탯/스프라이트 계승) */
  baseBossId: string;
  /** 시즌 한정 PNG sprite id (있으면 baseBossId sprite 대신 사용) */
  spriteId?: string;
  /** 등장 wave (시즌 챌린지 모드에서만) */
  spawnWave: number;
  /** 한정 보상 */
  reward: { stones: number; recruitId?: string; interiorId?: string; titleId: string };
  /** 첫 만남 한 줄 */
  entranceLine: string;
  /** 처치 후 한 줄 */
  defeatLine: string;
  /** 백스토리 */
  body: string[];
}

export const SEASONAL_BOSSES: SeasonalBoss[] = [
  {
    id: 'sb_sakura_envoy',
    cycleIndex: 0,
    name: '벚꽃의 — 사절',
    epithet: '꽃잎으로 — 무장한 자',
    baseBossId: 'archmage',
    spriteId: 'sb_sakura_envoy',
    spawnWave: 12,
    reward: { stones: 5000, recruitId: 'witch', titleId: 't_seasonal_spring', interiorId: 'flag_blackpurple' },
    entranceLine: '"꽃잎이 — 칼이 — 됩니다. 마왕이여."',
    defeatLine: '"이번 봄도 — 끝났습니다... 다음 봄에 — 다시 오겠지요."',
    body: [
      '벚꽃의 사절은 — 인간 왕국의 봄 축제 — 마지막 날 — 마왕성에 도착한다.',
      '그녀는 꽃잎으로 — 칼을 만든다. 가벼운 — 그러나 — 베이는.',
      '천 년 동안 — 매 봄 — 마왕성을 — 방문했다. 1대 마왕은 — 그녀에게 — 차를 — 내준 적도 있다.',
      '"꽃은 — 곧 떨어지기 때문에 — 아름답습니다." — 그녀가 자주 — 하는 말.',
    ],
  },
  {
    id: 'sb_flame_priest',
    cycleIndex: 1,
    name: '불꽃 — 신관',
    epithet: '광기를 — 신성으로 — 부른 자',
    baseBossId: 'priest',
    spriteId: 'sb_flame_priest',
    spawnWave: 12,
    reward: { stones: 6000, recruitId: 'devil', titleId: 't_seasonal_summer', interiorId: 'aura_amber' },
    entranceLine: '"불꽃은 — 정화입니다. 마왕이여, 정화받으십시오."',
    defeatLine: '"불꽃이 — 꺼졌네요... 광기는 — 영원하지 않은가."',
    body: [
      '불꽃 신관은 — 불꽃을 — 신성으로 — 받든다.',
      '그녀에게 광기는 — 약함이 아니라 — 강함이다.',
      '한때 — 평범한 신관이었다. 신전이 — 그녀를 — 추방한 후 — 불꽃 사이에서 — 새로운 신을 — 발견했다.',
      '"신은 — 어디에나 있어요. 다만 — 불꽃이 — 가장 — 자유롭지요."',
    ],
  },
  {
    id: 'sb_harvest_envoy',
    cycleIndex: 2,
    name: '추수의 — 사절',
    epithet: '낫을 — 든 자',
    baseBossId: 'king',
    spriteId: 'sb_harvest_envoy',
    spawnWave: 14,
    reward: { stones: 7000, recruitId: 'lich', titleId: 't_seasonal_autumn' },
    entranceLine: '"추수의 — 마지막 — 작물은 — 너겠지, 마왕이여."',
    defeatLine: '"이번 — 추수는 — 인간이 — 거뒀군요. 다음 — 가을은 — 다를지도."',
    body: [
      '추수의 사절은 — 인간 왕국의 — 가을 축제 — 마지막 날 — 마왕성에 도착한다.',
      '그가 든 낫은 — 추수용이 아니다. 마왕성을 — 베러 — 왔다.',
      '천 년 전 — 1대 마왕전에서 — 패배한 — 농부의 후손이다.',
      '"내 조부의 — 조부의 — 조부가 — 마왕에게 — 추수를 — 빼앗겼다. — 갚으러 왔다."',
    ],
  },
  {
    id: 'sb_first_demon_shadow',
    cycleIndex: 3,
    name: '1대 마왕의 — 그림자',
    epithet: '거울 — 너머의 자',
    baseBossId: 'king',
    spriteId: 'sb_first_demon_shadow',
    spawnWave: 15,
    reward: { stones: 10000, recruitId: 'mimic', titleId: 't_seasonal_winter', interiorId: 'flag_blackpurple' },
    entranceLine: '"... 천 년 전 — 나(므렐)인가."',
    defeatLine: '"잘 — 이겼다. 너는 — 나보다 — 강하다. 다음 — 천 년이 — 너의 것이다."',
    body: [
      '겨울 별빛 아래 — 마왕성 거울에서 — 1대 마왕의 그림자가 — 솟아오른다.',
      '그것은 — 천 년 전 — 봉인되기 직전의 — 1대 마왕 본인이다. 시간 너머에서 — 잠시 — 새 마왕을 — 만나러 왔다.',
      '그는 — 새 마왕을 — 시험한다. 진왕이 될 자격이 있는지.',
      '처치하면 — 1대 마왕은 — 미소짓는다. "잘 — 이겼다."',
    ],
  },
];

export function getSeasonalBoss(cycleIndex: 0 | 1 | 2 | 3): SeasonalBoss {
  return SEASONAL_BOSSES.find((b) => b.cycleIndex === cycleIndex) ?? SEASONAL_BOSSES[0];
}
