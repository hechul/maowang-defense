/**
 * 광고 진입점 데이터 — 무과금 친화 + Lyra 톤.
 *
 * 모든 진입점은 "Lyra가 정보를 가져온다" 톤 — 광고가 NPC 행동의 일부.
 * 광고 종료 후 Lyra가 한 줄 코멘트.
 */

export type AdEntryId =
  | 'revive'              // 부활 (이미 ✓)
  | 'result_double'       // 결과 영혼석 ×2 (이미 ✓)
  | 'daily_bonus'         // 일일 영혼석 보너스 (3회/일)
  | 'season_xp_boost'     // 시즌 XP ×2 (3회/일)
  | 'friend_visit_x2'     // 친구 방문 ×2 (친구당 1/일)
  | 'tablet_preview'      // 서판 1분 미리 보기 (1/일)
  | 'recall_instant'      // 회상 즉시 발동 (1/일)
  | 'interior_preview'    // 인테리어 1분 시뮬 (1/일)
  | 'free_card'           // 무료 카드 1장 (1런 1회)
  | 'demon_exp_boost'     // 다음 1런 마왕 EXP ×2 (1/일)
  | 'enemy_intel'         // 다음 wave 적 라인업 (1/wave)
  | 'boss_weakness'       // 보스 약점 1개 (1/보스)
  | 'side_quest_x2'       // 일일 사이드 퀘 보상 ×2 (퀘당 1)
  | 'tower_extra_floor'   // 봉인의 탑 한 층 더 (탑런 1)
  | 'mini_game_extra'     // 미니 게임 추가 시도 (1/일)
  | 'mail_extra'          // 우편함 추가 보상 메일 1통 (1/일)
  | 'card_enhance_discount'; // 카드 강화 다음 1회 -50% (1/일)

export interface AdEntry {
  id: AdEntryId;
  /** UI 표기명 */
  label: string;
  /** Lyra 사전 멘트 — 광고 시작 직전 */
  lyraPreLine: string;
  /** Lyra 사후 멘트 — 광고 종료 직후 (성공) */
  lyraPostLine: string;
  /** 빈도 캡 — 일일 / 런 / 무한 */
  cap: { kind: 'daily' | 'perRun' | 'perItem' | 'unlimited'; max?: number };
  /** 보상 라벨 */
  rewardLabel: string;
  /** 보상 값 (영혼석/마왕EXP 등 — 처리는 호출자) */
  reward: { stones?: number; demonExp?: number; seasonXp?: number; friendship?: number; misc?: string };
}

export const AD_ENTRIES: AdEntry[] = [
  {
    id: 'daily_bonus',
    label: '🎬 정보 거래소 — 영혼석',
    lyraPreLine: '"신전 — 정보 — 가져올게요. 잠시만요."',
    lyraPostLine: '"오늘 — 신전이 — 부대를 — 또 — 편성 중이에요. 정보값이에요."',
    cap: { kind: 'daily', max: 3 },
    rewardLabel: '영혼석 +50',
    reward: { stones: 50 },
  },
  {
    id: 'season_xp_boost',
    label: '🎬 시즌 XP — 부스트',
    lyraPreLine: '"시즌 — 진척표를 — 빠르게 — 갱신할게요."',
    lyraPostLine: '"다음 — 1런 — 시즌 XP가 — 두 배예요."',
    cap: { kind: 'daily', max: 3 },
    rewardLabel: '다음 1런 시즌 XP ×2',
    reward: { misc: 'season_xp_x2_next' },
  },
  {
    id: 'friend_visit_x2',
    label: '🎬 우정 — 두 배',
    lyraPreLine: '"친구의 — 마왕성 — 살펴볼게요."',
    lyraPostLine: '"우정 포인트 — 두 배예요. 좋은 — 친구네요."',
    cap: { kind: 'perItem' },
    rewardLabel: '우정 ×2',
    reward: { friendship: 10 },
  },
  {
    id: 'tablet_preview',
    label: '🎬 봉인 서판 — 1분 미리보기',
    lyraPreLine: '"신전 — 봉인의 서판 — 하나를 — 빌릴게요."',
    lyraPostLine: '"1분 — 보세요. 그 후엔 — 돌려드려야 해요."',
    cap: { kind: 'daily', max: 1 },
    rewardLabel: '잠긴 서판 1개 1분 미리보기',
    reward: { misc: 'tablet_preview' },
  },
  {
    id: 'recall_instant',
    label: '🎬 회상 — 즉시',
    lyraPreLine: '"신전 — 마법서 — 한 장을 — 펼칠게요."',
    lyraPostLine: '"기억이 — 한 조각 — 더 — 돌아왔네요."',
    cap: { kind: 'daily', max: 1 },
    rewardLabel: '안 본 회상 1개 즉시',
    reward: { misc: 'recall_instant' },
  },
  {
    id: 'interior_preview',
    label: '🎬 인테리어 — 1분 시뮬',
    lyraPreLine: '"인테리어 — 카탈로그 — 한 장 — 가져올게요."',
    lyraPostLine: '"마음에 들면 — 영혼석으로 — 사세요."',
    cap: { kind: 'daily', max: 1 },
    rewardLabel: '미보유 인테리어 1분 장착 시뮬',
    reward: { misc: 'interior_preview' },
  },
  {
    id: 'free_card',
    label: '🎬 무료 — 부하 — 1장',
    lyraPreLine: '"부하 — 한 명 — 보내드릴게요."',
    lyraPostLine: '"덤으로 — 마력도 — 조금 — 채웠어요."',
    cap: { kind: 'perRun' },
    rewardLabel: '카드 1장 무료 즉시 + 마력 +30',
    reward: { misc: 'free_card' },
  },
  {
    id: 'demon_exp_boost',
    label: '🎬 마왕 EXP — 두 배',
    lyraPreLine: '"이 — 다음 런 — 정보를 — 풍부하게 — 흘릴게요."',
    lyraPostLine: '"다음 1런 — 마왕 EXP — 두 배예요."',
    cap: { kind: 'daily', max: 1 },
    rewardLabel: '다음 1런 마왕 EXP ×2',
    reward: { misc: 'demon_exp_x2_next' },
  },
  {
    id: 'enemy_intel',
    label: '🎬 다음 — wave — 정보',
    lyraPreLine: '"신전 — 명령서를 — 빨리 — 가져올게요."',
    lyraPostLine: '"다음 — wave 적 — 알려드려요."',
    cap: { kind: 'unlimited' },
    rewardLabel: '다음 wave 적 라인업',
    reward: { misc: 'enemy_intel' },
  },
  {
    id: 'boss_weakness',
    label: '🎬 보스 약점 — 정보',
    lyraPreLine: '"보스 — 약점 — 한 가지 — 알려드릴게요."',
    lyraPostLine: '"이 보스는 — 화염이 — 약점이에요. 알아두세요."',
    cap: { kind: 'perItem' },
    rewardLabel: '보스 약점 1개',
    reward: { misc: 'boss_weakness' },
  },
  {
    id: 'side_quest_x2',
    label: '🎬 사이드 퀘 — 보상 ×2',
    lyraPreLine: '"사이드 퀘 — 보상 — 두 배로 — 받아주세요."',
    lyraPostLine: '"NPC도 — 좋아할 — 거예요."',
    cap: { kind: 'perItem' },
    rewardLabel: '사이드 퀘 보상 ×2',
    reward: { misc: 'side_quest_x2' },
  },
  {
    id: 'tower_extra_floor',
    label: '🎬 탑 — 한 층 — 더',
    lyraPreLine: '"탑의 다음 층 — 봉인을 — 잠시 — 풀어드릴게요."',
    lyraPostLine: '"한 층 — 더 — 도전하세요. 추가 — 보상 있어요."',
    cap: { kind: 'perRun' },
    rewardLabel: '봉인의 탑 1층 추가 도전 + 보상 ×1.5',
    reward: { misc: 'tower_extra_floor' },
  },
  {
    id: 'mini_game_extra',
    label: '🎬 미니 게임 — 추가 시도',
    lyraPreLine: '"미니 게임 — 한 번 — 더 — 가능하게 — 해드릴게요."',
    lyraPostLine: '"또 — 도전하세요."',
    cap: { kind: 'daily', max: 1 },
    rewardLabel: '미니 게임 추가 시도 1회',
    reward: { misc: 'mini_game_extra' },
  },
  {
    id: 'mail_extra',
    label: '🎬 추가 — 우편',
    lyraPreLine: '"우편함에 — 한 통 — 더 — 넣어드릴게요."',
    lyraPostLine: '"확인하세요."',
    cap: { kind: 'daily', max: 1 },
    rewardLabel: '추가 우편 1통 (영혼석 +30)',
    reward: { stones: 30 },
  },
  {
    id: 'card_enhance_discount',
    label: '🎬 강화 — 다음 1회 — 50% 할인',
    lyraPreLine: '"강화 — 비용을 — 깎아드릴게요."',
    lyraPostLine: '"다음 — 카드 강화 — 영혼석 — 절반이에요."',
    cap: { kind: 'daily', max: 1 },
    rewardLabel: '다음 카드 강화 -50%',
    reward: { misc: 'card_enhance_discount' },
  },
];

export function getAdEntry(id: AdEntryId): AdEntry | undefined {
  return AD_ENTRIES.find((a) => a.id === id);
}
