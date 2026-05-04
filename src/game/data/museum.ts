/**
 * 마왕성 박물관 — 모든 "처음"을 보존.
 *
 * 박물관 항목은 자동으로 — 처음 발생한 사건마다 — 추가됨.
 * 100개 누적 = "박물관장" 칭호.
 */

export type MuseumKind =
  | 'first_kill'        // 첫 hero 처치
  | 'first_boss_kill'   // 첫 보스 처치
  | 'first_evolve'      // 첫 진화
  | 'first_synergy'     // 첫 시너지
  | 'first_chapter'     // 첫 챕터 클리어
  | 'first_card_max'    // 첫 카드 LV 5
  | 'first_friend'      // 첫 친구
  | 'first_pvp_win'     // 첫 PvP 승
  | 'first_recall'      // 첫 회상
  | 'first_npc_max'     // 첫 NPC 호감 30
  | 'first_named'       // 첫 이름 부하
  | 'first_seasonal'    // 첫 시즌 한정 보스
  | 'first_tower_floor';// 첫 탑 10층

export interface MuseumEntry {
  id: string;
  kind: MuseumKind;
  /** 항목 표시명 */
  title: string;
  /** 한 줄 묘사 */
  body: string;
  /** 발생 일시 (ms) */
  ts: number;
  /** 연관 ID (예: heroId, bossId, monsterId) */
  refId?: string;
}

/** 새 항목 생성 헬퍼 */
export function makeMuseumEntry(
  kind: MuseumKind, title: string, body: string, refId?: string,
): MuseumEntry {
  return {
    id: `${kind}_${refId || ''}_${Date.now()}`,
    kind, title, body, ts: Date.now(), refId,
  };
}

export const MUSEUM_KIND_LABELS: Record<MuseumKind, string> = {
  first_kill:        '첫 — 적 처치',
  first_boss_kill:   '첫 — 보스 처치',
  first_evolve:      '첫 — 진화',
  first_synergy:     '첫 — 시너지',
  first_chapter:     '첫 — 챕터',
  first_card_max:    '첫 — 카드 강화 MAX',
  first_friend:      '첫 — 친구',
  first_pvp_win:     '첫 — PvP 승',
  first_recall:      '첫 — 회상',
  first_npc_max:     '첫 — NPC 친구',
  first_named:       '첫 — 이름 있는 부하',
  first_seasonal:    '첫 — 시즌 한정 보스',
  first_tower_floor: '첫 — 탑 10층',
};
