/**
 * CardSystem — 카드 후보 생성 / 잠금 / 리롤 / 선택 판정 (1차 분리)
 *
 * 목표:
 *   - GameEngine에 흩어진 카드 의사결정 순수 로직만 분리.
 *   - 입력은 필요한 최소 필드만 받고, 출력은 GameEngine이 적용할 수 있는
 *     command/result 형태로 돌려준다 (side effect 없음).
 *
 * 비목표:
 *   - 몬스터 실제 소환 / 전투 배열 push / 사운드 / 햅틱 / 배너 / DamageText
 *   - 위 항목은 모두 GameEngine 측에 남는다.
 *
 * 명명 정책:
 *   - 새 함수 명에서 spin/jackpot/slot 같은 정책 리스크 단어를 피하고
 *     ritual / reveal / cardChoice / triple 등으로 표현.
 *   - GameEngine 식별자(cardChoices / cardRevealCount / tripleReveal 필드)는
 *     2차 정책 리스크 정리 패스에서 모두 안전한 게임 세계관 용어로 통일 완료.
 */

import { MONSTERS } from '../data/monsters';
import { RISK_CARDS, type RiskCardDef } from '../data/riskCards';
import { SYNERGIES, type Synergy } from '../data/synergies';

/**
 * 모집된 풀이 비어있거나 손상된 경우 사용할 최소 starter 풀.
 * "최소 3종 보장" 안전장치 — 카드 후보가 무한 반복되지 않도록.
 * 4단계 명시 요구사항.
 */
export const STARTER_FALLBACK_POOL: string[] = ['slime', 'goblin', 'skel'];

/**
 * 활성 카드풀 산출 — challenge > recruited > starter fallback.
 * recruitedPool 안에 MONSTERS에 없는 ID는 자동 필터링 (손상 방어).
 * 결과가 빈 배열이면 STARTER_FALLBACK_POOL 반환.
 *
 * 규칙:
 *   1) challengePool이 비어있지 않으면 그것만 사용 (challenge 풀 강제)
 *   2) recruitedPool이 있으면 MONSTERS 알려진 것만 필터, 빈 배열이면 starter fallback
 *   3) 둘 다 없으면 null 반환 → 호출자가 fallbackPick (전체 CARD_POOL) 사용 호환
 */
export function resolveActivePool(
  challengePool: string[] | undefined,
  recruitedPool: string[] | null | undefined,
): string[] | null {
  if (challengePool && challengePool.length > 0) return challengePool;
  if (recruitedPool === undefined || recruitedPool === null) return null;
  // 손상 방어: 알려진 monsterId만 통과
  const filtered = recruitedPool.filter((id) => !!MONSTERS[id]);
  if (filtered.length > 0) return filtered;
  // recruitedPool은 명시됐지만 모두 invalid → starter fallback
  return STARTER_FALLBACK_POOL.slice();
}

/* =====================================================================
 *  1) 카드 비용 계산  (calculateCardCost)
 * ===================================================================== */

export interface CardCostInput {
  /** 기본 비용 (현재 100) */
  baseCost: number;
  /** 이번 런에서 카드 펼치기 횟수 — 초반 2회 온보딩 할인 트리거 */
  cardCount: number;
  /** 'pact' relic 보유 여부 — 30% 할인 */
  hasPactRelic: boolean;
  /** useSaveStore.skills.cardCost (영혼 강화 단계) — 단계당 5% 할인 */
  costSkillLevel: number;
  /** demonPower.cardCostReduction (마왕 강화) — 0~1 */
  demonPowerCostReduction: number;
  /** 챌린지 modifiers.cardCostMul */
  challengeCostMul?: number;
}

/** 카드 펼치기 1회 비용. GameEngine.currentCardCost()에서 호출. */
export function calculateCardCost(input: CardCostInput): number {
  let c = input.baseCost;
  if (input.cardCount < 2) c *= 0.65;
  else if (input.cardCount === 2) c *= 0.9;
  else if (input.cardCount >= 3) {
    c *= 1 + Math.min(0.7, (input.cardCount - 3) * 0.08);
  }
  if (input.hasPactRelic) c *= 0.7;
  c *= 1 - input.costSkillLevel * 0.05;
  c *= 1 - input.demonPowerCostReduction;
  if (input.challengeCostMul !== undefined) c *= input.challengeCostMul;
  return Math.ceil(c - 1e-6);
}

/* =====================================================================
 *  2) 카드 후보 1장 뽑기  (pickCardCandidate — 내부용)
 * ===================================================================== */

export interface PickCandidateInput {
  /** 챌린지 풀이 있을 때 — 풀에서만 뽑음 (다른 분기 무시). 가장 우선. */
  challengePool?: string[];
  /**
   * 모집된 몬스터 풀 — 마왕성 모집소에서 합류시킨 ID 목록.
   * challengePool이 없을 때 적용. null/undefined면 무시 → 기존 fallback 사용.
   */
  recruitedPool?: string[] | null;
  /** 다음 카드에 강제 가산할 태그 (1회용 — magic 픽 효과 등) */
  bonusTag: string | null;
  /** 활성 분기 카드 태그 (5웨이브 동안 등장률 ↑) */
  activeBranchTag: string | null;
  /** 풀에 해당 안 될 때 fallback — pickRandomMonster() */
  fallbackPick: () => string;
}

/** 카드 후보 1장 뽑는 결정. challenge → recruited → bonusTag → branch → fallback 순. */
export function pickCardCandidate(input: PickCandidateInput): string {
  // 활성 풀 결정 (challenge > recruited > starter fallback / null=전체)
  const pool = resolveActivePool(input.challengePool, input.recruitedPool);

  // 풀이 명시된 경우 — bonusTag/branchTag도 풀 안에서만 매칭
  if (pool) {
    if (input.bonusTag && Math.random() < 0.3) {
      const tag = input.bonusTag;
      const tagged = pool.filter((id) => MONSTERS[id]?.tags.includes(tag));
      if (tagged.length > 0) return tagged[Math.floor(Math.random() * tagged.length)];
      // 풀에 해당 태그 없음 → 풀 안에서 일반 픽 (모집 안 한 몬스터로 유출 금지)
    }
    if (input.activeBranchTag && Math.random() < 0.5) {
      const tag = input.activeBranchTag;
      const tagged = pool.filter((id) => MONSTERS[id]?.tags.includes(tag));
      if (tagged.length > 0) return tagged[Math.floor(Math.random() * tagged.length)];
      // 분기 카드 태그 미보유 → 풀 일반 픽 (안전망: 카드가 안 나오는 상황 방지)
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // 풀 미지정 (recruitedPool이 undefined로 명시 안 됨) — 옛 전체 MONSTERS 호환
  if (input.bonusTag && Math.random() < 0.3) {
    const tag = input.bonusTag;
    const tagged = Object.values(MONSTERS).filter((m) => m.tags.includes(tag));
    if (tagged.length > 0) return tagged[Math.floor(Math.random() * tagged.length)].id;
  }
  if (input.activeBranchTag && Math.random() < 0.5) {
    const tag = input.activeBranchTag;
    const tagged = Object.values(MONSTERS).filter((m) => m.tags.includes(tag));
    if (tagged.length > 0) return tagged[Math.floor(Math.random() * tagged.length)].id;
  }
  return input.fallbackPick();
}

/* =====================================================================
 *  3) 카드 후보 3장 생성  (createCardChoices)
 * ===================================================================== */

export interface CreateChoicesInput {
  /** 후보 한 장씩 뽑는 함수 — 호출자가 pickCardCandidate를 부분적용해서 전달 */
  pickFn: () => string;
  /** 잠긴 카드 (다음 spin에 첫 칸 유지). null이면 잠금 없음. */
  lockedCardId: string | null;
  /** 챌린지 monsterPool — 잠긴 카드가 풀에 없으면 잠금 폐기 (최우선) */
  challengePool?: string[];
  /** 모집 풀 — challengePool 없을 때 잠긴 카드 + dominantTag 슬롯 교체에 적용 */
  recruitedPool?: string[] | null;
  /** 이번 런 내 태그별 누적 픽 카운트 — 3회 이상이면 50% 확률로 1슬롯 강제 교체 */
  tagPickCount: Record<string, number>;
  /** 현재 wave — 특수 카드 연출/리스크 카드의 초반 노출을 늦추는 기준 */
  wave: number;
}

export interface CreateChoicesResult {
  /** 카드 결과 3장 (tripleReveal / risk 적용 후) */
  results: [string, string, string];
  /** 같은 카드 3장 (4% 확률) */
  tripleReveal: boolean;
  /** 리스크 카드가 들어간 슬롯 / 정의. 없으면 null. */
  riskCardSlot: { idx: number; def: RiskCardDef } | null;
  /**
   * 잠긴 카드를 1회 사용했는지 — 호출자는 lockedCardId를 항상 null로 설정하되,
   * `lockApplied=true`면 첫 칸이 잠긴 카드로 채워졌음을 의미.
   */
  lockApplied: boolean;
}

/** 카드 후보 3장 생성. 기존 beginSpin 내 후보 생성 블록과 산식 동일. */
export function createCardChoices(input: CreateChoicesInput): CreateChoicesResult {
  // 활성 풀: challenge > recruited(필터링) > starter fallback / null(전체)
  const activePool = resolveActivePool(input.challengePool, input.recruitedPool);
  const lockedValid = !!input.lockedCardId
    && !!MONSTERS[input.lockedCardId]
    && (!activePool || activePool.includes(input.lockedCardId));

  let results: [string, string, string];
  let lockApplied = false;
  if (lockedValid && input.lockedCardId) {
    results = [input.lockedCardId, input.pickFn(), input.pickFn()];
    lockApplied = true;
  } else {
    results = [input.pickFn(), input.pickFn(), input.pickFn()];
  }

  // 동적 가중치 — 3회 이상 픽한 태그가 있으면 50% 확률로 슬롯 1/2 중 하나 교체
  // 활성 풀이 있으면 풀 안에서만 매칭
  const dominantTags = Object.entries(input.tagPickCount)
    .filter(([, n]) => n >= 3).map(([t]) => t);
  if (dominantTags.length > 0 && Math.random() < 0.5) {
    const tag = dominantTags[Math.floor(Math.random() * dominantTags.length)];
    const taggedSource: string[] = activePool
      ? activePool.filter((id) => MONSTERS[id]?.tags.includes(tag))
      : Object.values(MONSTERS).filter((m) => m.tags.includes(tag)).map((m) => m.id);
    if (taggedSource.length > 0) {
      const newId = taggedSource[Math.floor(Math.random() * taggedSource.length)];
      const slot = 1 + Math.floor(Math.random() * 2);  // 1 or 2
      results[slot] = newId;
    }
  }

  // 같은 카드 3장 4% 확률 — 초반 학습 구간에서는 일반 3택지만 보여준다.
  let tripleReveal = false;
  if (input.wave >= 4 && Math.random() < 0.04) {
    const t = results[0];
    results[1] = t;
    results[2] = t;
    tripleReveal = true;
  }

  // 리스크 카드 — MVP 초반에는 고성능 후반 카드를 우회 지급하지 않도록 늦게 연다.
  let riskCardSlot: { idx: number; def: RiskCardDef } | null = null;
  if (!tripleReveal && input.wave >= 10 && Math.random() < 0.10) {
    const eligibleRiskCards = input.wave < 15
      ? RISK_CARDS.filter((def) => (MONSTERS[def.rewardMonsterId]?.star ?? 1) <= 2)
      : RISK_CARDS;
    if (eligibleRiskCards.length === 0) return { results, tripleReveal, riskCardSlot, lockApplied };
    const slot = Math.floor(Math.random() * 3);
    const riskDef = eligibleRiskCards[Math.floor(Math.random() * eligibleRiskCards.length)];
    results[slot] = riskDef.rewardMonsterId;
    riskCardSlot = { idx: slot, def: riskDef };
  }

  return { results, tripleReveal, riskCardSlot, lockApplied };
}

/* =====================================================================
 *  4) 카드 잠금  (applyCardLock)
 * ===================================================================== */

export interface CardLockInput {
  cardChoices: string[] | null;
  idx: number;
  mp: number;
  /** 잠금 1회 비용 — 현재 50 */
  lockCost: number;
}

export type CardLockReason = 'noChoices' | 'invalidIdx' | 'insufficientMp';

export interface CardLockResult {
  ok: boolean;
  reason?: CardLockReason;
  /** 잠금 성공 시 — 호출자가 mp에 더할 값 (음수) */
  mpDelta?: number;
  /** 잠긴 카드 typeId */
  lockedCardId?: string;
}

/** 카드 잠금 결정. side effect 없음 — 호출자가 mpDelta/lockedCardId를 적용. */
export function applyCardLock(input: CardLockInput): CardLockResult {
  if (!input.cardChoices) return { ok: false, reason: 'noChoices' };
  const t = input.cardChoices[input.idx];
  if (!t) return { ok: false, reason: 'invalidIdx' };
  if (input.mp < input.lockCost) return { ok: false, reason: 'insufficientMp' };
  return { ok: true, mpDelta: -input.lockCost, lockedCardId: t };
}

/* =====================================================================
 *  5) 리롤  (rerollCardChoices)
 * ===================================================================== */

export interface RerollInput {
  /** 운명/신규런/칙령으로 reroll이 가능한 상태인지 */
  rerollAvailable: boolean;
  cardChoices: string[] | null;
  /** 챌린지 풀 */
  challengePool?: string[];
  /** 모집 풀 — challengePool 없을 때 적용 */
  recruitedPool?: string[] | null;
  /** pickRandomMonster() */
  fallbackPick: () => string;
  /** 칙령 — true면 reroll 후에도 다시 사용 가능 */
  unlimitedReroll: boolean;
}

export interface RerollResult {
  ok: boolean;
  /** reroll 통과 시 새 후보 — 길이는 기존 cardChoices와 동일 */
  newChoices?: string[];
  /** 리롤 후 새 rerollAvailable 값 — 호출자는 그대로 set */
  newRerollAvailable: boolean;
}

/** 리롤 결정. 후보 길이를 보존한 채로 모든 칸 새로 뽑음. */
export function rerollCardChoices(input: RerollInput): RerollResult {
  if (!input.rerollAvailable || !input.cardChoices) {
    return { ok: false, newRerollAvailable: input.rerollAvailable };
  }
  // 활성 풀: challenge > recruited(필터링) > starter fallback / null(전체)
  const activePool = resolveActivePool(input.challengePool, input.recruitedPool);
  const pick = (): string => {
    if (activePool) return activePool[Math.floor(Math.random() * activePool.length)];
    return input.fallbackPick();
  };
  const newChoices = input.cardChoices.map(() => pick());
  return {
    ok: true,
    newChoices,
    newRerollAvailable: input.unlimitedReroll,
  };
}

/* =====================================================================
 *  6) 카드 선택 검증  (chooseCardResult)
 * ===================================================================== */

export interface ChooseCardInput {
  cardChoices: string[] | null;
  idx: number;
  /** 살아있는 아군 몬스터 수 */
  aliveMonsterCount: number;
  /** 필드 최대 몬스터 수 (현재 14) */
  maxMonsters: number;
  riskCardSlot: { idx: number; def: RiskCardDef } | null;
}

export type ChooseCardReason =
  | 'noChoices' | 'invalidIdx' | 'unknownMonster' | 'fieldFull';

export interface ChooseCardResultPayload {
  ok: boolean;
  reason?: ChooseCardReason;
  /** 선택된 몬스터 typeId — 호출자가 spawnMonster() */
  pickedMonsterId?: string;
  /** 트리거된 리스크 카드 (있을 시 호출자가 페널티 적용) */
  triggeredRiskCard?: RiskCardDef | null;
}

/** 카드 선택 검증 + 트리거 결정. side effect 없음. */
export function chooseCardResult(input: ChooseCardInput): ChooseCardResultPayload {
  if (!input.cardChoices) return { ok: false, reason: 'noChoices' };
  if (input.idx < 0 || input.idx >= input.cardChoices.length) {
    return { ok: false, reason: 'invalidIdx' };
  }
  const t = input.cardChoices[input.idx];
  if (!t || !MONSTERS[t]) return { ok: false, reason: 'unknownMonster' };
  if (input.aliveMonsterCount >= input.maxMonsters) {
    return { ok: false, reason: 'fieldFull' };
  }
  const triggeredRiskCard = (input.riskCardSlot && input.riskCardSlot.idx === input.idx)
    ? input.riskCardSlot.def
    : null;
  return { ok: true, pickedMonsterId: t, triggeredRiskCard };
}

/* =====================================================================
 *  7) 카드 픽 효과 계산  (computeCardPickEffects)
 *      등급/태그별 즉시 효과 — legendary -50 마력, tank 비용 할인 등.
 * ===================================================================== */

export interface PickEffectsInput {
  pickedMonsterId: string;
}

export interface PickEffectsResult {
  /** 마력 변화량 (legendary: -50) */
  mpDelta: number;
  /** cardRevealCount 변화량 (tank: -1 → 다음 카드 비용 할인) */
  cardRevealCountDelta: number;
  /** 다음 카드 보너스 태그 (magic 픽 시 'magic') */
  nextRevealBonusTag: string | null;
  /** 마왕성 회복량 (epic + undead: +30) */
  castleHpHeal: number;
  isLegendary: boolean;
  isTank: boolean;
  isMagic: boolean;
  isEpicUndead: boolean;
}

/** 카드 픽 직후 적용할 부수 효과 산출. side effect 없음. */
export function computeCardPickEffects(input: PickEffectsInput): PickEffectsResult {
  const def = MONSTERS[input.pickedMonsterId];
  if (!def) {
    return {
      mpDelta: 0, cardRevealCountDelta: 0, nextRevealBonusTag: null, castleHpHeal: 0,
      isLegendary: false, isTank: false, isMagic: false, isEpicUndead: false,
    };
  }
  const isLegendary = def.rarity === 'legendary';
  const isTank = def.tags.includes('tank');
  const isMagic = def.tags.includes('magic');
  const isEpicUndead = def.rarity === 'epic' && def.tags.includes('undead');
  return {
    mpDelta: isLegendary ? -50 : 0,
    cardRevealCountDelta: isTank ? -1 : 0,
    nextRevealBonusTag: isMagic ? 'magic' : null,
    castleHpHeal: isEpicUndead ? 30 : 0,
    isLegendary, isTank, isMagic, isEpicUndead,
  };
}

/* =====================================================================
 *  8) 리롤 가능 여부  (shouldHaveRerollAvailable)
 * ===================================================================== */

export interface RerollAvailableInput {
  hasFateRelic: boolean;
  /** runs <= 5 (신규 5런 보호) */
  isNewbie: boolean;
  /** 칙령 modifiers.unlimitedReroll */
  unlimitedRerollEdict: boolean;
}

/** 카드 펼치기 직후 reroll 사용 가능 여부 결정. */
export function shouldHaveRerollAvailable(input: RerollAvailableInput): boolean {
  return input.hasFateRelic || input.isNewbie || input.unlimitedRerollEdict;
}

/* =====================================================================
 *  진화 필요 수  (calculateEvoNeed)
 *      칙령 override > wisdom relic > 기본 3.
 *      GameEngine 내 chooseCard / autoPickCard / snapshot 3곳에서 중복되던 산식 통합.
 * ===================================================================== */

export interface EvoNeedInput {
  /** 칙령 modifiers.evoNeedOverride */
  edictOverride: number | undefined;
  /** 'wisdom' relic 보유 여부 — 진화 조건 3→2 */
  hasWisdomRelic: boolean;
}

export function calculateEvoNeed(input: EvoNeedInput): number {
  if (input.edictOverride !== undefined) return input.edictOverride;
  return input.hasWisdomRelic ? 2 : 3;
}

/* =====================================================================
 *  10) AUTO 카드 점수화  (scoreCardChoices)
 *      자동 선택 모드에서 후보 카드 중 최적 슬롯 인덱스를 결정.
 * ===================================================================== */

/** 시너지 id → 카운트 대상 태그 (GameEngine 사본 그대로 이식). */
const SYNERGY_TAGS_BY_ID: Record<string, string[]> = {
  magic: ['magic'], undead: ['undead'], tank: ['tank'], mob: ['mob'],
  rage: ['beast', 'orc'], inferno: ['fire'], fulldark: ['dark'],
  lifescream: ['undead', 'zombie'],
};

const RARITY_SCORE: Record<string, number> = {
  common: 1, uncommon: 2, rare: 3, epic: 5, legendary: 8,
};

export interface ScoreChoicesInput {
  cardChoices: string[] | null;
  /** 진화에 필요한 같은 종류 수 (3 / wisdom 2 / 칙령 override) */
  evoNeed: number;
  /** typeId → 살아있는 수 */
  aliveCounts: Record<string, number>;
  /** 태그 → 살아있는 카운트 */
  tagCounts: Record<string, number>;
  /** 이미 활성된 시너지 id 집합 */
  activeSynergyIds: ReadonlySet<string>;
  /** 시너지 정의 — 기본 SYNERGIES, 테스트에서 주입 가능 */
  synergies?: Synergy[];
}

export interface ScoreChoicesResult {
  bestIdx: number;
  bestScore: number;
  /** 디버그 — 각 슬롯 점수 */
  perSlot: number[];
}

/**
 * 후보 카드 점수 매겨 최적 슬롯 결정.
 * 우선순위: 진화 발동(+100) > 시너지 임박(+60) > 등급/별 베이스 + 진화 진행/시너지 진행 가산.
 * GameEngine.autoPickCard의 scoring 블록과 산식 동일.
 */
export function scoreCardChoices(input: ScoreChoicesInput): ScoreChoicesResult {
  const synergies = input.synergies ?? SYNERGIES;
  const choices = input.cardChoices ?? [];
  const perSlot: number[] = [];
  let bestIdx = 0;
  let bestScore = -1;

  for (let i = 0; i < choices.length; i++) {
    const id = choices[i];
    const def = MONSTERS[id];
    if (!def) { perSlot.push(0); continue; }
    let score = 0;
    // 등급 베이스
    score += RARITY_SCORE[def.rarity] || 1;
    score += (def.star || 1) * 2;
    // 진화 발동
    const aliveSame = input.aliveCounts[id] || 0;
    if (def.evolveTo && aliveSame >= input.evoNeed - 1) score += 100;
    else if (def.evolveTo && aliveSame > 0) score += 8;
    // 시너지 트리거 가산
    for (const s of synergies) {
      if (input.activeSynergyIds.has(s.id)) continue;
      const tags = SYNERGY_TAGS_BY_ID[s.id] || [];
      const cur = tags.reduce((sum, t) => sum + (input.tagCounts[t] || 0), 0);
      if (!def.tags.some((t) => tags.includes(t))) continue;
      // 시너지 트리거에 필요한 최소 카운트 추정 — n을 1~8로 올리며 test 통과 시점
      let need = 0;
      for (let n = 1; n <= 8; n++) {
        const probe: Record<string, number> = {};
        for (const k in input.tagCounts) probe[k] = n;
        if (s.test(probe)) { need = n; break; }
      }
      if (need && cur === need - 1) score += 60;
      else if (need && cur < need) score += 4;
    }
    perSlot.push(score);
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  }
  return { bestIdx, bestScore, perSlot };
}

/* =====================================================================
 *  9) 위급 무료 카드 펼치기 결정  (shouldGrantEmergencyReveal)
 *      mp < cost일 때 자동 발동 여부 판정 (HP%, 적 수, 사용 카운트 기반).
 * ===================================================================== */

export interface EmergencyRevealInput {
  mp: number;
  cost: number;
  castleHpPct: number;          // castleHp / castleMaxHp
  aliveMonsterCount: number;
  emergencyUsedCount: number;
  /** 1 + demonPower.emergencyRevealExtra */
  emergencyMaxUses: number;
}

export interface EmergencyRevealResult {
  /** mp 충분 → 그냥 일반 진행 */
  hasEnoughMp: boolean;
  /** 위급 무료 펼치기 발동 가능 여부 */
  emergencyAllowed: boolean;
}

/**
 * 위급 무료 펼치기 판정. 호출자는:
 *   - hasEnoughMp=true → 정상 차감
 *   - hasEnoughMp=false && emergencyAllowed=true → 무료 진행, 카운터 +1
 *   - 둘 다 아님 → 실패
 */
export function shouldGrantEmergencyReveal(input: EmergencyRevealInput): EmergencyRevealResult {
  if (input.mp >= input.cost) return { hasEnoughMp: true, emergencyAllowed: false };
  const hpLow = input.castleHpPct < 0.2;
  const hpModerateAndFewEnemies = input.castleHpPct < 0.3 && input.aliveMonsterCount < 4;
  const conditionOK = hpLow || hpModerateAndFewEnemies;
  const usesAvailable = input.emergencyUsedCount < input.emergencyMaxUses;
  return {
    hasEnoughMp: false,
    emergencyAllowed: conditionOK && usesAvailable,
  };
}
