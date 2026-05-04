/**
 * 5차 — 마왕 비밀 능력 (GAME_DESIGN_OVERHAUL §2.2)
 *
 * 특정 런-내 숨은 조건을 달성하면 영구 해금되는 마왕 능력.
 * demonPowers (보스 처치 카운트)와 별개. 도전 행동 보상.
 *
 * 효과는 시작 시 자동 적용 (GameEngine.applyDemonSecrets).
 */

export interface DemonSecretDef {
  id: string;
  icon: string;
  name: string;
  /** 해금 조건 한 줄 */
  condition: string;
  /** 영구 효과 한 줄 */
  effectDesc: string;
  /** PNG sprite id (public/sprites/<spriteId>.png) — fallback: icon 이모지 */
  spriteId?: string;
  /** 시작 마력 +N */
  startMpBonus?: number;
  /** mp regen 영구 추가 */
  mpRegenAdd?: number;
  /** 카드 비용 추가 곱 */
  cardCostMul?: number;
  /** 모든 단위 atk 추가 곱 */
  globalAtkMul?: number;
  /** 마왕성 시작 HP 비율 추가 */
  castleHpRatioAdd?: number;
}

export const DEMON_SECRETS: DemonSecretDef[] = [
  {
    id: 'secret_combo_master',
    icon: '🔥',
    name: '연쇄의 군주',
    condition: '한 런에 50콤보 달성',
    effectDesc: '마력 회복 +0.5/s 영구',
    spriteId: 'secret_combo_master',
    mpRegenAdd: 0.5,
  },
  {
    id: 'secret_full_magic',
    icon: '🔮',
    name: '마법 학파의 정점',
    condition: '한 런에 마법 빌드 100% 달성',
    effectDesc: '시작 마력 +50 영구',
    spriteId: 'secret_full_magic',
    startMpBonus: 50,
  },
  {
    id: 'secret_jackpot_legend',
    icon: '🎴',
    name: '운명의 손길',
    condition: '한 런에 트리플 카드 5회',
    effectDesc: '카드 비용 ×0.95 영구',
    spriteId: 'secret_jackpot_legend',
    cardCostMul: 0.95,
  },
  {
    id: 'secret_undying',
    icon: '☠',
    name: '죽음의 너머',
    condition: '한 런에 50체 부활',
    effectDesc: '시작 마력 +30 + 마왕성 +5%',
    spriteId: 'secret_undying',
    startMpBonus: 30,
    castleHpRatioAdd: 0.05,
  },
  {
    id: 'secret_centurion',
    icon: '⚔',
    name: '백 명의 손',
    condition: '한 런에 100명 처치',
    effectDesc: '모든 단위 atk +3% 영구',
    spriteId: 'secret_centurion',
    globalAtkMul: 1.03,
  },
  {
    id: 'secret_genesis',
    icon: '🌌',
    name: '창세의 발견자',
    condition: '숨겨진 시너지 6종 모두 발견',
    effectDesc: '모든 단위 atk +5% 영구',
    spriteId: 'secret_genesis',
    globalAtkMul: 1.05,
  },
];

export function getDemonSecret(id: string): DemonSecretDef | undefined {
  return DEMON_SECRETS.find((s) => s.id === id);
}

/** 활성 시 영구 효과 합산 */
export interface DemonSecretsAggregate {
  startMpBonus: number;
  mpRegenAdd: number;
  cardCostMul: number;
  globalAtkMul: number;
  castleHpRatioAdd: number;
}

export function aggregateDemonSecrets(unlocked: ReadonlyArray<string>): DemonSecretsAggregate {
  let startMpBonus = 0;
  let mpRegenAdd = 0;
  let cardCostMul = 1;
  let globalAtkMul = 1;
  let castleHpRatioAdd = 0;
  for (const id of unlocked) {
    const s = getDemonSecret(id);
    if (!s) continue;
    if (s.startMpBonus) startMpBonus += s.startMpBonus;
    if (s.mpRegenAdd) mpRegenAdd += s.mpRegenAdd;
    if (s.cardCostMul) cardCostMul *= s.cardCostMul;
    if (s.globalAtkMul) globalAtkMul *= s.globalAtkMul;
    if (s.castleHpRatioAdd) castleHpRatioAdd += s.castleHpRatioAdd;
  }
  return { startMpBonus, mpRegenAdd, cardCostMul, globalAtkMul, castleHpRatioAdd };
}
