/**
 * 일일 NPC 사이드 퀘 — 매일 NPC 1명이 1개 부탁.
 *
 * 보상: 영혼석 + NPC 호감도. 광고 시청 시 ×2.
 * 무과금 친화 — 강제 X, 매일 자정 갱신.
 */

import type { NpcId } from './npcs';

export interface SideQuestDef {
  id: string;
  npcId: NpcId;
  label: string;
  description: string;
  /** 진행도 트리거 — 'kills' / 'cardPicks' / 'bossKills' / 'evolves' / 'attendance' / 'pvpAttempts' */
  goalKind: 'kills' | 'cardPicks' | 'bossKills' | 'evolves' | 'pvpAttempts' | 'mailClaim' | 'cardEnhance';
  goalValue: number;
  rewardStones: number;
  rewardAffinity: number;
  /** 완료 시 NPC 한 줄 */
  completeLine: string;
}

export const DAILY_SIDE_QUEST_POOL: SideQuestDef[] = [
  // Vael
  { id: 'sq_vael_1', npcId: 'vael', label: '"먼지를 — 털고 — 싶은 자라."',
    description: '용사 50 처치 — Vael이 먼지를 털 시간을 만들기 위해.',
    goalKind: 'kills', goalValue: 50, rewardStones: 80, rewardAffinity: 2,
    completeLine: '"감사합니다. 마왕성이 — 깨끗해졌습니다."' },
  { id: 'sq_vael_2', npcId: 'vael', label: '"창을 — 닫아야 — 합니다."',
    description: '카드 20회 펼치기 — Vael이 창문 정비할 동안.',
    goalKind: 'cardPicks', goalValue: 20, rewardStones: 60, rewardAffinity: 2,
    completeLine: '"창이 — 닫혔습니다. 이제 — 별빛이 — 들지 않아요."' },
  { id: 'sq_vael_3', npcId: 'vael', label: '"우편을 — 정리하고 — 싶습니다."',
    description: '우편함에서 1통 수령.',
    goalKind: 'mailClaim', goalValue: 1, rewardStones: 50, rewardAffinity: 1,
    completeLine: '"우편이 — 정리됐습니다. 깔끔합니다."' },
  // Krug
  { id: 'sq_krug_1', npcId: 'krug', label: '"칼을 — 갈아야 — 한다."',
    description: '진화 3회 — 칼날을 새로 만들 수 있게.',
    goalKind: 'evolves', goalValue: 3, rewardStones: 100, rewardAffinity: 2,
    completeLine: '"... 칼이 — 빛난다. 됐다."' },
  { id: 'sq_krug_2', npcId: 'krug', label: '"부하 — 한 명 더."',
    description: '카드 강화 1회 — 부하가 더 강해지길.',
    goalKind: 'cardEnhance', goalValue: 1, rewardStones: 80, rewardAffinity: 2,
    completeLine: '"부하 — 강해졌다. 좋다."' },
  { id: 'sq_krug_3', npcId: 'krug', label: '"보스 — 한 마리."',
    description: '보스 1 처치.',
    goalKind: 'bossKills', goalValue: 1, rewardStones: 150, rewardAffinity: 3,
    completeLine: '"보스 — 처치 — 봤다. 잘 — 했다."' },
  // Iset
  { id: 'sq_iset_1', npcId: 'iset', label: '"별빛 — 한 번 — 보고 싶습니다."',
    description: '용사 100 처치 — 별빛 시간을 위해.',
    goalKind: 'kills', goalValue: 100, rewardStones: 120, rewardAffinity: 3,
    completeLine: '"별빛이 — 마왕성에 — 내렸습니다. 감사합니다."' },
  { id: 'sq_iset_2', npcId: 'iset', label: '"옛 — 동료를 — 부르고 — 싶습니다."',
    description: '진화 5회 — Iset의 옛 마법 의식을 위해.',
    goalKind: 'evolves', goalValue: 5, rewardStones: 150, rewardAffinity: 3,
    completeLine: '"옛 동료가 — 잠시 — 떠올랐습니다. 그것으로 — 충분합니다."' },
  // Lyra
  { id: 'sq_lyra_1', npcId: 'lyra', label: '"신전 — 정보 — 더 — 가져올 수 있어요."',
    description: '카드 30회 픽 — Lyra가 사절단을 추적할 동안.',
    goalKind: 'cardPicks', goalValue: 30, rewardStones: 100, rewardAffinity: 2,
    completeLine: '"좋은 — 정보예요. 다음 — 침공 — 알려드릴게요."' },
  { id: 'sq_lyra_2', npcId: 'lyra', label: '"PvP — 한 번 — 도전해보세요."',
    description: 'PvP 1회 도전.',
    goalKind: 'pvpAttempts', goalValue: 1, rewardStones: 130, rewardAffinity: 3,
    completeLine: '"좋아요. 다른 — 마왕도 — 봤어요."' },
];

/** 날짜 기반 결정론적 선택 — 모든 유저 같은 날 같은 사이드 퀘 */
export function todaysSideQuests(date = new Date().toISOString().slice(0, 10), count = 3): SideQuestDef[] {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < date.length; i++) h = Math.imul(h ^ date.charCodeAt(i), 16777619);
  const out: SideQuestDef[] = [];
  const used = new Set<number>();
  for (let i = 0; i < count; i++) {
    let attempt = 0;
    let idx = (h + i * 7919) % DAILY_SIDE_QUEST_POOL.length;
    while (used.has(idx) && attempt < DAILY_SIDE_QUEST_POOL.length) {
      idx = (idx + 1) % DAILY_SIDE_QUEST_POOL.length;
      attempt++;
    }
    used.add(idx);
    out.push(DAILY_SIDE_QUEST_POOL[idx]);
  }
  return out;
}
