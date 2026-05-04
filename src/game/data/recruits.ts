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

  // ===== 즉시 모집 가능 (영혼석만 있으면) =====
  {
    monsterId: 'imp', name: '임프', title: '저편의 작은 악마',
    description: '저편에서 건너온 작은 악마. 마법의 불씨를 다룬다.',
    roleLabel: '화염', rarity: 'rare', tags: ['fire', 'magic', 'demon'],
    // 첫 모집 비용 — 1-1 첫 클리어 보상(200)으로 100 잔여 가능 (온보딩 밸런스)
    cost: { soulstones: 100 },
    unlockHint: '즉시 모집 가능',
    recommendedForBuilds: ['flame_rampage', 'magic_school'],
    order: 5,
  },
  {
    monsterId: 'witch', name: '꼬마위치', title: '잊혀진 마녀의 후예',
    description: '잊혀진 마녀. 마력의 흐름을 가속시킨다.',
    roleLabel: '마법', rarity: 'rare', tags: ['magic'],
    cost: { soulstones: 300 },
    unlockHint: '즉시 모집 가능',
    recommendedForBuilds: ['magic_school'],
    order: 6,
  },

  // ===== 스테이지 클리어 후 모집 가능 =====
  {
    monsterId: 'orc', name: '오크 전사', title: '잿더미의 분노',
    description: '잿더미에서 깨어난 오크 전사. 분노가 곧 무기다.',
    roleLabel: '분노', rarity: 'rare', tags: ['orc', 'beast'],
    cost: { soulstones: 400 },
    unlockHint: '잊혀진 묘지 클리어',
    unlockStageId: 'ch1_s2',
    recommendedForBuilds: ['beast_wrath'],
    order: 7,
  },
  {
    monsterId: 'mimic', name: '미믹', title: '보물의 흉내자',
    description: '보물 상자의 형상을 흉내내는 포식자. 마력을 끌어모은다.',
    roleLabel: '마력', rarity: 'epic', tags: ['support'],
    cost: { soulstones: 800 },
    unlockHint: '화염 전당 클리어',
    unlockStageId: 'ch1_s3',
    recommendedForBuilds: ['greedy_path', 'magic_school'],
    order: 8,
  },
  {
    monsterId: 'mino', name: '미노타우로스', title: '미궁의 광폭자',
    description: '미궁의 미노타우로스. 광폭한 일격으로 전선을 흔든다.',
    roleLabel: '보스딜', rarity: 'epic', tags: ['beast', 'tank'],
    cost: { soulstones: 1500 },
    unlockHint: '광기의 미궁 클리어',
    unlockStageId: 'ch1_s4',
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
