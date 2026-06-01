/**
 * 모집 시스템 — 마왕성 모집소에서 잠금 해제할 수 있는 몬스터 목록.
 *
 * 핵심 방향:
 *   - 몬스터는 스테이지 클리어 후 마왕성에서 모집 가능해진다.
 *   - 모집한 monsterId만 전투 카드풀에 등장 (CardSystem.recruitedPool 참조).
 *   - 모집은 카드풀 확장/덱빌딩 역할 — 입장 제한 재화 X, 영혼석만 사용.
 *
 * MONSTERS는 정적 정의(스탯/스프라이트), 이 메타 레이어는 모집 비용/잠금/UI 라벨.
 */

export type RecruitRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface RecruitDefinition {
  /** monsterId — MONSTERS의 키와 동일 */
  monsterId: string;
  /** 표시명 */
  name: string;
  /** 한 줄 칭호 / 별명 */
  title: string;
  /** 한 줄 스토리 / 설명 */
  description: string;
  /** UI 라벨 — '탱커' / '물량' / '마력' / '화염' / '광역' / '부활' / '보스딜' 등 */
  roleLabel: string;
  /** UI 등급 표기 — MONSTERS.rarity와 일치하지만 모집소 UI 정렬/필터용으로 별도 보유 */
  rarity: RecruitRarity;
  /** 태그 — 시너지/빌드 매칭 힌트 (UI 표기용) */
  tags: string[];
  /** 모집 비용 (영혼석만 사용 — 다른 재화 도입 금지 원칙) */
  cost: {
    soulstones: number;
  };
  /** UI에 표시할 잠금 해제 조건 한 줄 */
  unlockHint: string;
  /** 잠금 해제 스테이지 ID (없으면 starter 또는 즉시 모집 가능) */
  unlockStageId?: string;
  /** 추천 빌드 ID 목록 (builds.ts) — 빌드 가이드에서 역참조 가능 */
  recommendedForBuilds?: string[];
  /** 스타터 여부 — true면 가입 즉시 보유 */
  starter?: boolean;
  /** UI 정렬 순서 */
  order: number;
}

/** 옛 RecruitDef 호환 alias */
export type RecruitDef = RecruitDefinition;

export const RECRUITS: RecruitDefinition[] = [
  // ===== 스타터 4종 (가입 즉시 보유) =====
  {
    monsterId: 'slime', name: '슬라임', title: '진득한 어둠의 결정',
    description: '가장 먼저 마왕에게 충성을 맹세했다. 끈질긴 탱킹이 강점.',
    roleLabel: '탱커', rarity: 'common', tags: ['tank', 'mob'],
    cost: { soulstones: 0 },
    unlockHint: '시작부터 보유',
    starter: true,
    recommendedForBuilds: ['slime_kingdom'],
    order: 1,
  },
  {
    monsterId: 'goblin', name: '고블린', title: '교활한 침입자',
    description: '작지만 빠르다. 물량으로 적의 라인을 흔든다.',
    roleLabel: '물량', rarity: 'common', tags: ['mob', 'beast'],
    cost: { soulstones: 0 },
    unlockHint: '시작부터 보유',
    starter: true,
    recommendedForBuilds: ['beast_wrath'],
    order: 2,
  },
  {
    monsterId: 'skel', name: '해골', title: '죽음 너머의 병사',
    description: '죽음 너머에서 부름받은 해골 병사. 언데드 시너지의 시작.',
    roleLabel: '언데드', rarity: 'common', tags: ['undead'],
    cost: { soulstones: 0 },
    unlockHint: '시작부터 보유',
    starter: true,
    recommendedForBuilds: ['zombie_legion', 'undead_lord'],
    order: 3,
  },
  {
    monsterId: 'zombie', name: '좀비', title: '잊혀진 무덤의 숨결',
    description: '죽지 않는 군세의 시작. 부활로 끊임없이 재공격한다.',
    roleLabel: '언데드 / 부활', rarity: 'uncommon', tags: ['undead', 'zombie'],
    cost: { soulstones: 0 },
    unlockHint: '시작부터 보유',
    starter: true,
    recommendedForBuilds: ['zombie_legion', 'undead_lord'],
    order: 4,
  },

  // ===== 초반 스테이지 클리어 후 모집 가능 =====
  {
    monsterId: 'imp', name: '임프', title: '저편의 작은 악마',
    description: '저편에서 건너온 작은 악마. 마법의 불씨를 다룬다.',
    roleLabel: '화염', rarity: 'rare', tags: ['fire', 'magic', 'demon'],
    // 첫 모집 비용 — 1-1 첫 클리어 보상(200)으로 100 잔여 가능 (온보딩 밸런스)
    cost: { soulstones: 100 },
    unlockHint: '첫 침입 클리어',
    unlockStageId: 'ch1_s1',
    recommendedForBuilds: ['flame_rampage', 'magic_school'],
    order: 5,
  },
  {
    monsterId: 'witch', name: '꼬마위치', title: '잊혀진 마녀의 후예',
    description: '잊혀진 마녀. 마력의 흐름을 가속시킨다.',
    roleLabel: '마법', rarity: 'rare', tags: ['magic'],
    cost: { soulstones: 300 },
    unlockHint: '잊혀진 묘지 클리어',
    unlockStageId: 'ch1_s2',
    recommendedForBuilds: ['magic_school'],
    order: 6,
  },

  // ===== 스테이지 클리어 후 모집 가능 =====
  {
    monsterId: 'orc', name: '오크 전사', title: '잿더미의 분노',
    description: '잿더미에서 깨어난 오크 전사. 분노가 곧 무기다.',
    roleLabel: '분노', rarity: 'rare', tags: ['orc', 'beast'],
    cost: { soulstones: 400 },
    unlockHint: '화염 전당 클리어',
    unlockStageId: 'ch1_s3',
    recommendedForBuilds: ['beast_wrath'],
    order: 7,
  },
  {
    monsterId: 'mimic', name: '미믹', title: '보물의 흉내자',
    description: '보물 상자의 형상을 흉내내는 포식자. 마력을 끌어모은다.',
    roleLabel: '마력', rarity: 'epic', tags: ['support'],
    cost: { soulstones: 800 },
    unlockHint: '광기의 미궁 클리어',
    unlockStageId: 'ch1_s4',
    recommendedForBuilds: ['greedy_path', 'magic_school'],
    order: 8,
  },
  {
    monsterId: 'mino', name: '미노타우로스', title: '미궁의 광폭자',
    description: '미궁의 미노타우로스. 광폭한 일격으로 전선을 흔든다.',
    roleLabel: '보스딜', rarity: 'epic', tags: ['beast', 'tank'],
    cost: { soulstones: 1500 },
    unlockHint: '신의 영역 클리어',
    unlockStageId: 'ch1_s5',
    recommendedForBuilds: ['beast_wrath', 'tyrant_strike'],
    order: 9,
  },
  {
    monsterId: 'lich', name: '리치', title: '죽음의 군주',
    description: '챕터 1의 끝에서 깨어난 리치. 죽은 자의 군세를 부른다.',
    roleLabel: '언데드 / 마법 / 부활', rarity: 'legendary', tags: ['undead', 'magic', 'dark'],
    cost: { soulstones: 2500 },
    unlockHint: '신의 영역 클리어',
    unlockStageId: 'ch1_s5',
    recommendedForBuilds: ['undead_lord', 'magic_school', 'dark_mystic'],
    order: 10,
  },
  {
    monsterId: 'devil', name: '데빌', title: '진홍의 계약자',
    description: '화염 시즌과 심연 보상으로 계약 가능한 임프의 진화체.',
    roleLabel: '화염 / 마법', rarity: 'epic', tags: ['fire', 'magic', 'demon'],
    cost: { soulstones: 1800 },
    unlockHint: '도전의 관문 또는 시즌 화염 보상',
    unlockStageId: 'ch2_s5',
    recommendedForBuilds: ['flame_rampage', 'magic_school'],
    order: 10.5,
  },

  // ===== 중후반 스테이지 보상 — 진화형 직접 모집 =====
  {
    monsterId: 'orcb', name: '오크버서커', title: '붉은 분노의 돌격대장',
    description: '광역 도끼질로 전선을 밀어붙이는 오크 진화체.',
    roleLabel: '광역 / 탱커', rarity: 'epic', tags: ['tank', 'melee', 'brute'],
    cost: { soulstones: 1200 },
    unlockHint: '봉우리의 매복 클리어',
    unlockStageId: 'ch3_s2',
    recommendedForBuilds: ['beast_wrath', 'tyrant_strike'],
    order: 11,
  },
  {
    monsterId: 'minok', name: '미노킹', title: '미궁을 부수는 왕',
    description: '묵직한 넉백과 광역 타격으로 전열을 무너뜨린다.',
    roleLabel: '넉백 / 보스딜', rarity: 'epic', tags: ['tank', 'melee', 'brute'],
    cost: { soulstones: 1800 },
    unlockHint: '협곡의 외침 클리어',
    unlockStageId: 'ch3_s3',
    recommendedForBuilds: ['beast_wrath', 'tyrant_strike'],
    order: 12,
  },
  {
    monsterId: 'dlich', name: '다크리치', title: '그림자의 사령관',
    description: '언데드 군단의 공격을 증폭시키는 강력한 후열 지휘관.',
    roleLabel: '언데드 / 오라', rarity: 'epic', tags: ['undead', 'magic', 'dark'],
    cost: { soulstones: 2500 },
    unlockHint: '신성의 그림자 클리어',
    unlockStageId: 'ch3_s4',
    recommendedForBuilds: ['undead_lord', 'magic_school', 'dark_mystic'],
    order: 13,
  },
  {
    monsterId: 'gmimic', name: '골드미믹', title: '금빛 마력 창고',
    description: '전투 중 마력을 크게 보태는 탐욕의 지원형 몬스터.',
    roleLabel: '마력 지원', rarity: 'epic', tags: ['support'],
    cost: { soulstones: 3200 },
    unlockHint: '왕의 분노 클리어',
    unlockStageId: 'ch3_s5',
    recommendedForBuilds: ['greedy_path', 'magic_school'],
    order: 14,
  },
  {
    monsterId: 'awitch', name: '아크위치', title: '심연을 읽는 마녀',
    description: '먼 거리에서 어둠의 주문을 퍼붓는 마법 빌드의 핵심.',
    roleLabel: '암흑 / 마법', rarity: 'epic', tags: ['magic', 'dark'],
    cost: { soulstones: 4200 },
    unlockHint: '얼어붙은 마녀 클리어',
    unlockStageId: 'ch4_s2',
    recommendedForBuilds: ['magic_school', 'dark_mystic'],
    order: 15,
  },
  {
    monsterId: 'owar', name: '오크워로드', title: '전쟁을 끌고 오는 자',
    description: '강한 체력과 넉백으로 전선을 오래 붙잡는 오크 지휘관.',
    roleLabel: '전선 유지', rarity: 'epic', tags: ['tank', 'melee', 'brute'],
    cost: { soulstones: 5500 },
    unlockHint: '서리 왕의 행군 클리어',
    unlockStageId: 'ch4_s3',
    recommendedForBuilds: ['beast_wrath', 'tyrant_strike'],
    order: 16,
  },
  {
    monsterId: 'ggen', name: '고블린장군', title: '작은 군단의 큰 지휘관',
    description: '빠른 근접 압박으로 원거리 용사의 진형을 깨뜨린다.',
    roleLabel: '물량 / 돌격', rarity: 'epic', tags: ['melee', 'mob'],
    cost: { soulstones: 6000 },
    unlockHint: '겨울의 종말 클리어',
    unlockStageId: 'ch4_s5',
    recommendedForBuilds: ['beast_wrath'],
    order: 17,
  },
  {
    monsterId: 'slord', name: '슬라임로드', title: '진득한 왕국의 군주',
    description: '높은 체력과 광역 압박으로 아군 후열을 보호한다.',
    roleLabel: '광역 / 탱커', rarity: 'epic', tags: ['tank', 'melee'],
    cost: { soulstones: 6500 },
    unlockHint: '심연의 사도 클리어',
    unlockStageId: 'ch5_s2',
    recommendedForBuilds: ['slime_kingdom'],
    order: 18,
  },
  {
    monsterId: 'kslime', name: '킹슬라임', title: '작지만 끈질긴 왕',
    description: '초반 탱커보다 훨씬 오래 버티는 슬라임 진화체.',
    roleLabel: '탱커', rarity: 'rare', tags: ['tank', 'melee'],
    cost: { soulstones: 3000 },
    unlockHint: '대종말 클리어',
    unlockStageId: 'ch5_s5',
    recommendedForBuilds: ['slime_kingdom'],
    order: 19,
  },
  {
    monsterId: 'gobw', name: '고블린전사', title: '앞장서는 녹색 칼날',
    description: '빠른 공격 속도로 얇은 적을 빠르게 정리한다.',
    roleLabel: '물량 / 근접', rarity: 'rare', tags: ['melee', 'mob'],
    cost: { soulstones: 3000 },
    unlockHint: '대종말 클리어',
    unlockStageId: 'ch5_s5',
    recommendedForBuilds: ['beast_wrath'],
    order: 20,
  },
  {
    monsterId: 'dwitch', name: '다크위치', title: '어둠을 두른 주문사',
    description: '후열에서 안정적으로 피해를 누적하는 마법형 몬스터.',
    roleLabel: '마법', rarity: 'epic', tags: ['magic'],
    cost: { soulstones: 3500 },
    unlockHint: '대종말 클리어',
    unlockStageId: 'ch5_s5',
    recommendedForBuilds: ['magic_school', 'dark_mystic'],
    order: 21,
  },
];

/* =====================================================================
 *  헬퍼
 * ===================================================================== */

/** 스타터로 자동 부여될 monsterId */
export function starterRecruitIds(): string[] {
  return RECRUITS.filter((r) => r.starter).map((r) => r.monsterId);
}

/** 클리어 스테이지 기준 현재 잠금 해제된 RecruitDefinition 목록 */
export function unlockedRecruits(clearedStages: string[]): RecruitDefinition[] {
  return RECRUITS.filter((r) => {
    if (r.starter) return true;
    if (!r.unlockStageId) return true;  // 즉시 모집 가능
    return clearedStages.includes(r.unlockStageId);
  });
}

/** monsterId로 정의 조회 (옛 getRecruitById alias 호환) */
export function getRecruitByMonsterId(monsterId: string): RecruitDefinition | undefined {
  return RECRUITS.find((r) => r.monsterId === monsterId);
}

/** 호환 — id 기반 조회 (옛 호출자 유지) */
export function getRecruitById(id: string): RecruitDefinition | undefined {
  return getRecruitByMonsterId(id);
}

/** 모집 가능한지 (잠금 해제 + 미보유) */
export function canRecruit(
  recruit: RecruitDefinition,
  clearedStages: string[],
  recruitedMonsterIds: string[],
): boolean {
  if (recruit.starter) return false;  // 이미 보유
  if (recruitedMonsterIds.includes(recruit.monsterId)) return false;
  if (recruit.unlockStageId && !clearedStages.includes(recruit.unlockStageId)) return false;
  return true;
}

/** 빌드 ID로 추천 모집 후보 역참조 (BUILD 가이드에서 사용 가능) */
export function recruitsForBuild(buildId: string): RecruitDefinition[] {
  return RECRUITS.filter((r) => r.recommendedForBuilds?.includes(buildId));
}
