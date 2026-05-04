/**
 * 유물 진화 시스템 (5차 — GAME_DESIGN_OVERHAUL §2.2 발견의 즐거움)
 *
 * 두 유물을 모두 보유하면 자동으로 진화 유물 1개가 추가 발동.
 * 부모 유물 효과는 유지(중첩) + 진화 유물 추가 효과 부여.
 *
 * 설계:
 *   - 데이터만 정의. 발동/추가 효과는 GameEngine.checkRelicFusions() 와
 *     GameEngine 내부 hook 에서 fused.has(id) 로 조회.
 *   - 진화 유물은 RELICS 테이블에 들어가지 않음 (별도 RELIC_FUSIONS Map).
 *   - 부모 유물은 그대로 — fusion 발생해도 제거 없음. 추가 보상.
 */

export interface RelicFusionDef {
  /** 진화 유물 id (RELICS 와 충돌하지 않는 새 id) */
  id: string;
  icon: string;
  name: string;
  desc: string;
  /** 부모 유물 두 개 (둘 다 보유 시 발동) */
  parents: [string, string];
  /** PNG sprite id (public/sprites/<spriteId>.png) — fallback: icon 이모지 */
  spriteId?: string;
  /** 추가 효과 — 단순 수치만 (GameEngine 에서 직접 참조) */
  effects: {
    /** 모든 단위 atk 추가 곱 */
    globalAtkMul?: number;
    /** 마력 자연회복 추가 (per second) */
    mpRegenAdd?: number;
    /** 보스 처치 시 영혼석 추가 곱 */
    bossSoulstoneMul?: number;
    /** 진화 발동 시 즉시 마력 회복 */
    onFuseInstantMp?: number;
    /** 마왕성 받는 데미지 추가 곱 (감소) */
    castleDmgTakenMul?: number;
    /** 적 이동속도 추가 곱 */
    heroSpdMul?: number;
    /** 필살기 게이지 추가 곱 */
    ultiChargeMul?: number;
    /** 적 첫 등장 시 freeze (초) — nightfall 강화 */
    waveStartFreezeAdd?: number;
    /** 카드 펼치기 비용 추가 곱 */
    cardCostMul?: number;
    /** 모든 처치 시 흡혈 비율 — 마왕성 회복 */
    castleLifestealOnKill?: number;
  };
}

export const RELIC_FUSIONS: RelicFusionDef[] = [
  {
    id: 'fuse_necropolis',
    icon: '🏚',
    name: '망령의 묘원',
    desc: '부활 + 보스 영혼석 — 죽음마저 자원',
    parents: ['tomb', 'bloodmoon'],
    spriteId: 'relic_fuse_necropolis',
    effects: { bossSoulstoneMul: 1.5, mpRegenAdd: 0.5 },
  },
  {
    id: 'fuse_solar_crown',
    icon: '☀',
    name: '불타는 왕관',
    desc: '필살기 데미지 ×1.3 + 충전 ×1.2',
    parents: ['inferno', 'crown'],
    spriteId: 'relic_fuse_solar_crown',
    effects: { ultiChargeMul: 1.2, globalAtkMul: 1.05 },
  },
  {
    id: 'fuse_fortress',
    icon: '🏰',
    name: '강철의 요새',
    desc: '마왕성 받는 피해 ×0.85',
    parents: ['swarm', 'iron'],
    spriteId: 'relic_fuse_fortress',
    effects: { castleDmgTakenMul: 0.85 },
  },
  {
    id: 'fuse_bloodmask',
    icon: '🩸',
    name: '피의 가면',
    desc: '모든 단위 atk +15%',
    parents: ['mask', 'wrath'],
    spriteId: 'relic_fuse_bloodmask',
    effects: { globalAtkMul: 1.15 },
  },
  {
    id: 'fuse_prophecy',
    icon: '🔮',
    name: '예언의 흐름',
    desc: '마력 회복 +1/s + 필살기 충전 ×1.15',
    parents: ['oracle', 'surge'],
    spriteId: 'relic_fuse_prophecy',
    effects: { mpRegenAdd: 1.0, ultiChargeMul: 1.15 },
  },
  {
    id: 'fuse_midas',
    icon: '👑',
    name: '미다스의 손',
    desc: '진화 시 즉시 +200 마력 + 보스 영혼석 ×1.3',
    parents: ['vault', 'greed'],
    spriteId: 'relic_fuse_midas',
    effects: { onFuseInstantMp: 200, bossSoulstoneMul: 1.3 },
  },
  {
    id: 'fuse_eternal_pact',
    icon: '⏳',
    name: '영원의 계약',
    desc: '카드 비용 ×0.85 + 적 이속 ×0.85',
    parents: ['pact', 'hourglass'],
    spriteId: 'relic_fuse_eternal_pact',
    effects: { cardCostMul: 0.85, heroSpdMul: 0.85 },
  },
  {
    id: 'fuse_eternal_winter',
    icon: '❄',
    name: '영원의 겨울',
    desc: '웨이브 시작 +2초 동결',
    parents: ['freeze', 'nightfall'],
    spriteId: 'relic_fuse_eternal_winter',
    effects: { waveStartFreezeAdd: 2.0 },
  },
  {
    id: 'fuse_venomfang',
    icon: '🦷',
    name: '독사의 송곳니',
    desc: '처치 시 마왕성 +1% HP 흡혈',
    parents: ['serpent', 'fang'],
    spriteId: 'relic_fuse_venomfang',
    effects: { castleLifestealOnKill: 0.01 },
  },
  {
    id: 'fuse_karma',
    icon: '🌀',
    name: '운명의 인과',
    desc: '카드 비용 ×0.9 + 마력 회복 +0.5/s',
    spriteId: 'relic_fuse_karma',
    parents: ['dice', 'fate'],
    effects: { cardCostMul: 0.9, mpRegenAdd: 0.5 },
  },
];

/** 두 유물 보유 시 발동되는 진화 (양방향 매칭) */
export function findFusionFor(parentA: string, parentB: string): RelicFusionDef | null {
  for (const f of RELIC_FUSIONS) {
    const [p1, p2] = f.parents;
    if ((p1 === parentA && p2 === parentB) || (p1 === parentB && p2 === parentA)) return f;
  }
  return null;
}

/** 현재 보유 유물 set 기준으로 발동 가능한 진화 유물 목록 (이미 발동된 것 제외) */
export function findReadyFusions(
  ownedRelics: ReadonlySet<string>,
  alreadyFused: ReadonlySet<string>,
): RelicFusionDef[] {
  const out: RelicFusionDef[] = [];
  for (const f of RELIC_FUSIONS) {
    if (alreadyFused.has(f.id)) continue;
    const [p1, p2] = f.parents;
    if (ownedRelics.has(p1) && ownedRelics.has(p2)) out.push(f);
  }
  return out;
}
