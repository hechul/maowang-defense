import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applyExpGain, progressInLevel, DEMON_LEVEL_REWARDS } from '../game/data/demonLevel';
import { currentSeasonId, tierFromXp, SEASON_PASS_TIERS } from '../game/data/seasonPass';
import { CARD_LEVEL_MAX, costForLevelUp } from '../game/data/cardEnhance';
import type { MonsterRarity } from '../game/data/monsters';
import type { MailItem, MailReward } from '../game/data/mailbox';
import type { PvpSnapshot } from '../game/data/asyncPvp';
import { evaluateNewTitles } from '../game/data/titles';
import { isTrueNameUnlocked } from '../game/data/sealedTablets';
import { generateDiaryEntry } from '../game/data/dailyDiary';

/**
 * 영구 저장 스토어 — 영혼석, 스킬, 도감, 업적, 일일 출석
 * AIT §전략3 D1~D30 리텐션 콘텐츠 포함
 * v7: P0/P1 추가 — 마왕레벨/덱/시즌패스/일일시드/마왕캐릭/카드강화/챌린지별/우편함
 */

export type SkillId =
  | 'castleHp' | 'startMp' | 'cardCost'
  | 'monAtk' | 'monHp' | 'startMon'
  | 'ultiDmg' | 'ultiCharge' | 'aura';

export interface SaveState {
  // 영혼석
  soulstones: number;
  totalStones: number;

  // 스킬
  skills: Record<SkillId, number>;

  // 통계
  bestWave: number;
  totalKills: number;
  runs: number;
  lastPlayedAt: number;

  // 도감/업적
  discoveredMonsters: string[];
  discoveredHeroes: string[];
  discoveredBosses: string[];
  discoveredRelics: string[];
  achievements: string[];
  bossesKilled: string[];

  // 챌린지
  challengesDone: string[];

  // IAP — 사용자에게 노출되는 결제 상품 추적
  iap: {
    purchasedSkus: string[];      // 구매한 상품 ID
    adsRemoved: boolean;          // 광고 제거 활성
    starterPackShown: boolean;    // 1회 노출 여부
    starterPackPurchased: boolean;
  };

  // 바이럴 — 친구 초대 보상
  social: {
    sharesCount: number;          // 누적 공유 횟수
    lastShareReward: string;      // 보상 받은 마지막 날짜 (1일 1회 제한)
  };

  // 2차 이코노미 — 유물 파편 (P2-10)
  shards: number;                  // 영혼석 ÷ 100 = 1 파편

  // 튜토리얼 진행 — 한 번 본 학습 모달 ID 저장
  tutorialSeen: string[];

  // OVERHAUL §3.3: 빌드 칭호 영구 — 한 번 100% 달성한 빌드 기록
  buildTitles: string[];
  // 5차 — 마왕 비밀 능력 (해금된 secret id 목록)
  unlockedSecrets: string[];
  // 5차 — 발견한 숨겨진 시너지 id 목록 (도감 노출 + secret_genesis 조건)
  discoveredHiddenSynergies: string[];
  // OVERHAUL §3.5: 적 도감 조각 — heroId별 누적, 100 도달 시 영구 약화 적용
  heroFragments: Record<string, number>;
  // OVERHAUL §3.5: 100 채워서 영구 약화 활성된 hero ID 목록
  heroBaneActive: string[];
  // OVERHAUL §3.4: 마왕 강화 — 누적 보스 처치 (모든 런 합산)
  totalBossKills: number;
  // OVERHAUL §4.5: 인테리어 — 카테고리별 보유한 ID 목록
  ownedInteriors: string[];
  // OVERHAUL §4.5: 카테고리별 장착 ID
  equippedInteriors: Record<string, string>;

  // ===== STAGE & RECRUIT (v6) =====
  /** 클리어한 stageId 목록 */
  clearedStages: string[];
  /** stageId → 별점 (최고 별점 보존) */
  stageStars: Record<string, 1 | 2 | 3>;
  /** 첫 클리어 보상 받은 stageId 목록 */
  stageFirstClearClaimed: string[];
  /** 가장 최근 클리어한 stageId — 다음 추천용 */
  lastClearedStageId: string | null;
  /** 진행 중 / 최근 진입한 stageId — 실패 후 재도전 추천용 */
  currentStageId: string | null;
  /** StageSelect 화면에서 마지막 선택한 stageId — UI 자동 스크롤/포커스용 */
  selectedStageId: string | null;
  /** 모집된 monsterId — 카드풀 후보 */
  recruitedMonsterIds: string[];
  /** 모집 가능 (잠금 해제됐지만 아직 안 모집) — 영혼석으로 모집 가능한 ID */
  availableRecruitIds: string[];
  /** RecruitScreen에서 본 ID — NEW 뱃지 제거용 */
  recruitSeenIds: string[];
  /** 모집소 첫 진입 학습 모달 본 적 있는지 */
  recruitTutorialSeen: boolean;
  /** 작전 지도 첫 진입 학습 모달 본 적 있는지 */
  stageSelectTutorialSeen: boolean;
  /** 심연 방어전 (무한 모드) 진입 잠금 해제 */
  endlessUnlocked: boolean;
  /** 도전 모드(challenges) 진입 잠금 해제 — 보스 5마리 누적 처치 시 또는 챕터 1 클리어 시 */
  challengeUnlocked: boolean;

  // ===== v7: P0/P1 신규 필드 =====
  /** P0-1 마왕 레벨 EXP 누적 */
  demonExp: number;
  /** P0-1 직전 런에서 받은 EXP — 결과화면 표시용 (영구 저장 X, 호출 후 reset) */
  lastRunExp: number;
  /** P0-1 신규 잠금해제 보상 큐 — 클레임 안 한 레벨업 보상들 */
  pendingDemonRewards: number[];

  /** P0-6 내 덱 — 시작 카드 풀 ID 목록 (빈 배열이면 '전체') */
  selectedDeck: string[];

  /** P0-2 시즌 패스 */
  seasonPass: {
    seasonId: string;          // 'YYYY-S##' — 변경 시 자동 리셋
    xp: number;
    claimedFreeTiers: number[];
    claimedPremiumTiers: number[];
    premium: boolean;          // IAP 'season_pass' 활성
  };

  /** P0-4 일일 시드 챌린지 — 1일 1회 시도 + 점수 */
  dailySeed: {
    date: string;              // 'YYYY-MM-DD' — 자동 리셋
    attempted: boolean;
    bestScore: number;
    bestWave: number;
  };

  /** P1-3 선택된 마왕 ID */
  selectedDemonId: string;
  /** 잠금 해제된 마왕 ID 목록 (default 'shadow' 자동 포함) */
  unlockedDemons: string[];

  /** P1-4 카드 영구 레벨 — monsterId → level (0~5) */
  cardLevels: Record<string, number>;

  /** P1-5 챌린지 별점 — challengeId → 1/2/3 (W15/20/25) */
  challengeStars: Record<string, 1 | 2 | 3>;

  /** P1-6 우편함 — unread 메일 큐 */
  mailbox: MailItem[];
  mailboxLastDeliveryDate: string;  // 시즌 우편 자동 발송 트리거

  // P0-3 비동기 PvP
  /** 최근 5개 자기 빌드 스냅샷 (FIFO) */
  pvpSnapshots: PvpSnapshot[];
  /** 시즌별 PvP 점수 누적 (seasonId → score) */
  pvpRanks: Record<string, number>;
  /** 시즌별 승/패 카운트 */
  pvpRecord: Record<string, { wins: number; losses: number; draws: number }>;
  /** 일일 PvP 도전 횟수 (자정 리셋) */
  pvpDailyCount: { date: string; count: number };
  /** 5차 — 마지막으로 시즌 종료 보상을 지급한 seasonId. 다음 시즌 진입 시 자동 지급 트리거 */
  lastClaimedPvpSeason: string;
  /** 5차 — 획득한 PVP 칭호 id 목록 (시즌 종료 보상) */
  pvpTitlesEarned: string[];
  /** 5차 — 시즌 메인 스토리 주차별 시청 완료 — `${seasonId}:w${week}` */
  seasonStoryEpisodesSeen: string[];
  /** 5차 — 처치한 시즌 보스 id 목록 (영구) */
  seasonalBossesKilled: string[];

  // P1-2 친구 시스템
  /** 친구 코드 목록 (닉네임은 표시명) */
  friends: { code: string; nickname: string; addedAt: number; bestWave: number; demonLevel: number }[];
  /** 내 친구 코드 (자동 생성) */
  myFriendCode: string;
  /** 우정 포인트 (방문 보상) */
  friendshipPoints: number;
  /** 일일 친구 방문 보상 받은 친구 코드 + 날짜 */
  friendVisitRewards: Record<string, string>;

  // P1-7 한정 이벤트 — 진행 상태
  /** 이벤트별 진행도 */
  eventProgress: Record<string, { points: number; claimedTiers: number[] }>;
  /** 마지막 이벤트 보드 본 날짜 (NEW 뱃지) */
  eventLastSeenDate: string;

  // P2-1 컷씬 — 본 컷씬 ID
  cutscenesSeen: string[];

  // W5 사망 누적 — 챕터별 연속 사망 (클리어 시 리셋)
  deathStreakByChapter: Record<string, number>;

  // ===== v11 — 광고/탑/박물관/일기/사이드퀘/NG+/PvP 등급 =====
  /** 광고 일일 횟수 (entryId → { date, count }) */
  adDailyCounts: Record<string, { date: string; count: number }>;
  /** 광고 부스트 — 다음 1런용 (season_xp_x2_next / demon_exp_x2_next) */
  adBoosts: { seasonXpX2Next: boolean; demonExpX2Next: boolean };
  /** 봉인의 탑 — 최고 도달 층 */
  towerBestFloor: number;
  /** 박물관 항목 (자동 누적) */
  museumEntries: { id: string; kind: string; title: string; body: string; ts: number; refId?: string }[];
  /** 마왕의 일기 (날짜 → 1줄) */
  diaryEntries: { date: string; body: string; wave: number; kills: number; isVictory: boolean; topMonsterId: string | null; feeling: string }[];
  /** 사이드퀘 진행 — 일자 + questId → progress */
  sideQuestProgress: Record<string, { date: string; questId: string; progress: number; claimed: boolean }>;
  /** NG+ 차수 (0 = 일반, 1+ = NG+) */
  ngPlusCycle: number;
  /** PvP 시즌 등급 보상 — 시즌별 클레임 여부 */
  pvpSeasonRewardClaimed: Record<string, boolean>;
  /** 미니 게임 일일 시도 횟수 */
  miniGameAttempts: { date: string; count: number };
  /** 마지막 마왕 일기 자동 생성된 날 — 중복 방지 */
  lastDiaryDate: string;

  // ===== v10 (확장 패스) — 내러티브/콘텐츠 시스템 =====
  /** N1 NPC 호감도 — npcId → 누적 누적 (대화 1회 +1) */
  npcAffinity: Record<string, number>;
  /** N1 NPC 사이드 스토리 본 ID */
  npcStoriesSeen: string[];
  /** B1 도덕성 게이지 (자비/잔혹) — -100 (잔혹) ~ +100 (자비) */
  moralityGauge: number;
  /** B1 도덕성 결정 누계 (자비/잔혹/균형 카운트) */
  moralityCounts: { mercy: number; ruthless: number; balanced: number };
  /** B3 결정 기록 — 연표용 */
  decisionLog: { id: string; ts: number; choice: string; effect: string }[];
  /** A4 마왕 회상 본 ID */
  recallSeen: string[];
  /** D4 봉인의 서판 본 ID */
  tabletsSeen: string[];
  /** A3 이름 있는 부하 보유 ID */
  namedMinionsOwned: string[];
  /** F1 획득한 칭호 ID */
  earnedTitles: string[];
  /** F1 장착한 칭호 ID */
  equippedTitle: string | null;
  /** C1 시즌 메인 스토리 — 시즌별 본 주차 (idx, week) */
  seasonStoryProgress: Record<string, number[]>;  // 'YYYY-S##' → [week...] 본 주차
  /** N4 보스 첫 처치 컷씬 본 보스 ID */
  bossFirstKillSeen: string[];
  /** 처음 처치한 hero 마왕 코멘트 본 ID */
  heroFirstKillCommentSeen: string[];

  // 접근성 옵션
  accessibility: {
    reduceMotion: boolean;     // 화면 흔들림/플래시 감소
    largerText: boolean;       // 텍스트 +20%
    haptic: boolean;           // 햅틱 ON/OFF
  };

  // 일일 미션
  daily: {
    date: string;
    missions: { id: string; progress: number; claimed: boolean }[];
  };

  // 일일 출석 (AIT §전략3)
  attendance: {
    streak: number;
    lastDate: string;
    rewardsClaimed: number;
  };

  // 액션
  addStones: (n: number) => void;
  spendStones: (n: number) => boolean;
  upgradeSkill: (id: SkillId) => boolean;
  resetSkills: () => void;
  recordRun: (wave: number, kills: number, stones: number) => void;
  discover: (kind: 'monsters' | 'heroes' | 'bosses' | 'relics', id: string) => void;
  unlockAchievement: (id: string) => boolean;
  claimAttendance: () => { streak: number; reward: number } | null;
  // 미션 진행 추적 (cumulative=누적, max=최대값 갱신)
  trackMission: (type: string, value: number, mode: 'add' | 'max') => void;
  // 챌린지 완료
  markChallengeDone: (id: string) => void;

  // IAP
  recordPurchase: (sku: string) => void;
  markStarterPackShown: () => void;

  // Social
  rewardShare: () => number;  // 반환: 받은 영혼석 (0이면 이미 받음)

  // 유물 파편 (P2-10)
  convertStonesToShards: (amount: number) => boolean;  // amount 영혼석 → amount/100 파편
  spendShards: (n: number) => boolean;

  // 튜토리얼
  markTutorialSeen: (id: string) => void;
  hasTutorialSeen: (id: string) => boolean;

  // 접근성
  toggleAccessibility: (key: 'reduceMotion' | 'largerText' | 'haptic') => void;

  // OVERHAUL §3.3: 빌드 칭호 영구 적립
  recordBuildTitle: (buildId: string) => boolean;
  // OVERHAUL §3.5: 적 처치 시 조각 +1, 100 도달 시 baneActive
  addHeroFragment: (heroId: string, amount: number) => boolean;
  // 5차 — 마왕 비밀 능력 해금 (이미 해금돼 있으면 false)
  unlockSecret: (id: string) => boolean;
  // 5차 — 숨겨진 시너지 발견 마킹 (이미 발견돼 있으면 false)
  discoverHiddenSynergy: (id: string) => boolean;
  // 5차 — 시즌 메인 스토리 주차 시청 완료
  markSeasonEpisodeSeen: (seasonId: string, week: number) => boolean;
  // 5차 — 시즌 보스 처치 (이미 있으면 false). 보상 자동 지급 (호출 측이 보상 수치 전달)
  recordSeasonalBossKill: (bossId: string, reward: { stones: number; titleId?: string; interiorId?: string; recruitId?: string }) => boolean;
  // OVERHAUL §3.4: 보스 처치 시 누적
  addBossKill: () => void;
  // OVERHAUL §4.5: 인테리어 구매 + 장착
  buyInterior: (id: string, cost: number) => boolean;
  equipInterior: (category: string, id: string) => void;

  // ===== STAGE & RECRUIT actions (v6) =====
  /** 스테이지 클리어 기록 — 첫 클리어 보상 분기는 호출자(GameEngine.gameOver)가 처리 */
  recordStageClear: (stageId: string, stars: 1 | 2 | 3) => void;
  /** 모집 후보 잠금 해제 (스테이지 보상) — 중복 자동 제거 */
  unlockRecruits: (ids: string[]) => void;
  /** 영혼석 차감 후 모집 풀에 추가. 충분치 않으면 false. */
  recruitMonster: (id: string, cost: number) => boolean;
  /** 심연 방어전 잠금 해제 */
  setEndlessUnlocked: (v: boolean) => void;
  /** 도전 모드 잠금 해제 */
  setChallengeUnlocked: (v: boolean) => void;
  /** RecruitScreen에서 본 ID 마킹 (NEW 뱃지 끄기) */
  markRecruitSeen: (ids: string[]) => void;
  /** 현재 진행 중 stageId 갱신 (GameScreen 진입 시) */
  setCurrentStageId: (id: string | null) => void;
  /** StageSelect에서 카드 포커스/선택 — UI 상태 영구화 */
  setSelectedStageId: (id: string | null) => void;
  /** 모집 튜토리얼 1회 시청 표식 */
  markRecruitTutorialSeen: () => void;
  /** 스테이지 선택 튜토리얼 1회 시청 표식 */
  markStageSelectTutorialSeen: () => void;

  // ===== v7 액션 =====
  /** P0-1 EXP 적립 — 새 보상은 pendingDemonRewards 큐에 저장. 반환: 새 레벨업 수 */
  addDemonExp: (gained: number) => { newLevel: number; gainedLevels: number; gained: number };
  /** P0-1 보상 클레임 — 큐의 모든 보상을 적용 + 큐 비우기 */
  claimPendingDemonRewards: () => { stones: number; recruitsAdded: string[]; labels: string[] };
  /** P0-6 덱 갱신 (빈 배열이면 전체) */
  setSelectedDeck: (ids: string[]) => void;
  /** P0-2 시즌 XP 적립 (자동 시즌 변경 감지) */
  addSeasonXp: (xp: number) => void;
  /** P0-2 시즌 패스 보상 클레임 — 무료/유료 분리 */
  claimSeasonReward: (tier: number, track: 'free' | 'premium') => boolean;
  /** P0-2 IAP season_pass 활성화 (recordPurchase에서 자동 호출) */
  activateSeasonPremium: () => void;
  /** P0-4 일일 시드 시도 기록 */
  recordDailySeedRun: (score: number, wave: number) => void;
  /** P1-3 마왕 선택 */
  selectDemon: (id: string) => void;
  /** P1-3 마왕 잠금 해제 — 자동/수동 */
  unlockDemon: (id: string) => boolean;
  /** P1-4 카드 영구 강화 — 영혼석 차감 + 레벨 +1 */
  enhanceCard: (monsterId: string, rarity: MonsterRarity) => boolean;
  /** P1-5 챌린지 별점 기록 (W15=1 / W20=2 / W25=3, 최고치 보존) */
  recordChallengeStar: (challengeId: string, star: 1 | 2 | 3) => void;
  /** P1-6 우편함 추가 (id 중복은 무시) */
  pushMail: (mail: MailItem) => boolean;
  /** P1-6 우편 클레임 — 보상 적용 후 큐에서 제거. 반환: 적용된 보상 목록 */
  claimMail: (id: string) => MailReward | null;
  /** P1-6 우편 일괄 정리 — 7일 지난 만료 메일 제거 */
  cleanupExpiredMails: () => number;
  /** P0-2 시즌 변경 감지 → 시즌 우편 자동 발송 (호출자: 앱 시작) */
  ensureCurrentSeason: () => void;

  // P0-3 비동기 PvP 액션
  pushPvpSnapshot: (snap: PvpSnapshot) => void;
  recordPvpResult: (result: 'me' | 'opponent' | 'draw') => { newRank: number };
  incPvpDaily: () => boolean;  // 1일 5회 제한 — 한도 초과면 false
  /** 5차 — 시즌 변경 시 이전 시즌 PVP 등급 보상 자동 지급. 반환: 지급된 보상 (없으면 null) */
  claimPvpSeasonRewards: () => { seasonId: string; tierName: string; stones: number; titleId?: string; interiorId?: string } | null;
  // P1-2 친구
  addFriend: (code: string, nickname: string) => boolean;
  removeFriend: (code: string) => void;
  claimFriendVisit: (code: string) => number;  // 보상 영혼석 (이미 받았으면 0)
  // P1-7 이벤트
  addEventProgress: (eventId: string, points: number) => void;
  claimEventTier: (eventId: string, tier: number) => boolean;
  markEventBoardSeen: () => void;
  // P2-1 컷씬
  markCutsceneSeen: (id: string) => void;
  // W5 사망 누적 트랙
  bumpDeathStreak: (chapterId: string) => number;
  resetDeathStreak: (chapterId: string) => void;

  // ===== v11 액션 =====
  /** 광고 시도 가능 여부 + 카운터 증가. cap 초과 시 false */
  tryConsumeAd: (entryId: string, cap: { kind: 'daily' | 'perRun' | 'perItem' | 'unlimited'; max?: number }) => boolean;
  /** 광고 부스트 활성 */
  activateAdBoost: (kind: 'seasonXpX2Next' | 'demonExpX2Next') => void;
  /** 광고 부스트 소비 (런 시작 시) */
  consumeAdBoost: (kind: 'seasonXpX2Next' | 'demonExpX2Next') => boolean;
  /** 봉인의 탑 — 최고 층 갱신 */
  updateTowerBest: (floor: number) => void;
  /** 박물관 항목 추가 — 중복 방지 (kind+refId 동일 시 X) */
  addMuseumEntry: (entry: { id: string; kind: string; title: string; body: string; ts: number; refId?: string }) => boolean;
  /** 일기 추가 (날짜 중복 X) */
  addDiaryEntry: (entry: { date: string; body: string; wave: number; kills: number; isVictory: boolean; topMonsterId: string | null; feeling: string }) => boolean;
  /** 사이드퀘 진행도 갱신 */
  bumpSideQuest: (questId: string, amount?: number) => number;
  /** 사이드퀘 클레임 (영혼석 + 호감도) */
  claimSideQuest: (questId: string, rewardStones: number, rewardAffinity: number, npcId: string) => boolean;
  /** NG+ 진입 / 차수 ↑ */
  advanceNgPlus: () => number;
  /** PvP 시즌 보상 클레임 */
  claimPvpSeasonReward: (seasonId: string) => boolean;
  /** 미니 게임 시도 카운터 */
  bumpMiniGameAttempts: () => void;

  // ===== v10 액션 =====
  /** N1 — NPC 대화 1회 += 1 호감 */
  bumpNpcAffinity: (npcId: string, amount?: number) => number;
  /** N1 — NPC 사이드 스토리 본 마킹 */
  markNpcStorySeen: (id: string) => void;
  /** B1 — 도덕성 게이지 변동 (자비 +/잔혹 - / 균형 0) */
  shiftMorality: (delta: number) => void;
  /** B1 — 도덕성 카테고리 카운트 */
  bumpMoralityCount: (kind: 'mercy' | 'ruthless' | 'balanced') => void;
  /** B3 — 결정 기록 추가 */
  logDecision: (id: string, choice: string, effect: string) => void;
  /** A4 — 회상 추가 */
  addRecall: (id: string) => boolean;
  /** D4 — 서판 글귀 추가 */
  addTablet: (id: string) => boolean;
  /** A3 — 이름 있는 부하 추가 */
  unlockNamedMinion: (id: string) => boolean;
  /** F1 — 칭호 획득 (이미 있으면 false) */
  earnTitle: (id: string) => boolean;
  /** F1 — 칭호 장착 */
  equipTitle: (id: string | null) => void;
  /** C1 — 시즌 주차 본 마킹 */
  markSeasonStoryWeek: (seasonId: string, week: number) => void;
  /** N4 — 보스 첫 처치 컷씬 마킹 */
  markBossFirstKillSeen: (bossId: string) => boolean;
  /** G3 — hero 첫 처치 코멘트 마킹 */
  markHeroFirstKillCommentSeen: (typeId: string) => boolean;
}

const initialSkills: Record<SkillId, number> = {
  castleHp: 0, startMp: 0, cardCost: 0,
  monAtk: 0, monHp: 0, startMon: 0,
  ultiDmg: 0, ultiCharge: 0, aura: 0,
};

const today = () => new Date().toISOString().slice(0, 10);

export const useSaveStore = create<SaveState>()(
  persist(
    (set, get) => ({
      soulstones: 0,
      totalStones: 0,
      skills: { ...initialSkills },
      bestWave: 0,
      totalKills: 0,
      runs: 0,
      lastPlayedAt: 0,
      discoveredMonsters: [],
      discoveredHeroes: [],
      discoveredBosses: [],
      discoveredRelics: [],
      achievements: [],
      bossesKilled: [],
      challengesDone: [],
      daily: { date: '', missions: [] },
      attendance: { streak: 0, lastDate: '', rewardsClaimed: 0 },
      iap: { purchasedSkus: [], adsRemoved: false, starterPackShown: false, starterPackPurchased: false },
      social: { sharesCount: 0, lastShareReward: '' },
      shards: 0,
      tutorialSeen: [],
      accessibility: { reduceMotion: false, largerText: false, haptic: true },
      buildTitles: [],
      unlockedSecrets: [],
      discoveredHiddenSynergies: [],
      heroFragments: {},
      heroBaneActive: [],
      totalBossKills: 0,
      ownedInteriors: ['sign_default', 'flag_default', 'aura_default', 'circle_default'],
      equippedInteriors: { sign: 'sign_default', flag: 'flag_default', aura: 'aura_default', magic_circle: 'circle_default' },
      // ===== STAGE & RECRUIT 초기값 (v6) =====
      clearedStages: [],
      stageStars: {},
      stageFirstClearClaimed: [],
      lastClearedStageId: null,
      currentStageId: null,
      selectedStageId: null,
      recruitedMonsterIds: ['slime', 'goblin', 'skel', 'zombie'],  // 스타터 4종
      availableRecruitIds: ['imp', 'witch'],                         // 즉시 모집 가능 2종
      recruitSeenIds: [],
      recruitTutorialSeen: false,
      stageSelectTutorialSeen: false,
      endlessUnlocked: false,
      challengeUnlocked: false,

      // ===== v7 초기값 =====
      demonExp: 0,
      lastRunExp: 0,
      pendingDemonRewards: [],
      selectedDeck: [],
      seasonPass: {
        seasonId: currentSeasonId(),
        xp: 0,
        claimedFreeTiers: [],
        claimedPremiumTiers: [],
        premium: false,
      },
      dailySeed: { date: '', attempted: false, bestScore: 0, bestWave: 0 },
      selectedDemonId: 'shadow',
      unlockedDemons: ['shadow'],
      cardLevels: {},
      challengeStars: {},
      mailbox: [],
      mailboxLastDeliveryDate: '',
      pvpSnapshots: [],
      pvpRanks: {},
      pvpRecord: {},
      pvpDailyCount: { date: '', count: 0 },
      lastClaimedPvpSeason: '',
      pvpTitlesEarned: [],
      seasonStoryEpisodesSeen: [],
      seasonalBossesKilled: [],
      friends: [],
      myFriendCode: (() => {
        // 자동 생성 — 6자리 영문대문자+숫자
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let s = '';
        for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
        return s;
      })(),
      friendshipPoints: 0,
      friendVisitRewards: {},
      eventProgress: {},
      eventLastSeenDate: '',
      cutscenesSeen: [],
      deathStreakByChapter: {},
      // v11
      adDailyCounts: {},
      adBoosts: { seasonXpX2Next: false, demonExpX2Next: false },
      towerBestFloor: 0,
      museumEntries: [],
      diaryEntries: [],
      sideQuestProgress: {},
      ngPlusCycle: 0,
      pvpSeasonRewardClaimed: {},
      miniGameAttempts: { date: '', count: 0 },
      lastDiaryDate: '',
      // v10
      npcAffinity: {},
      npcStoriesSeen: [],
      moralityGauge: 0,
      moralityCounts: { mercy: 0, ruthless: 0, balanced: 0 },
      decisionLog: [],
      recallSeen: [],
      tabletsSeen: [],
      namedMinionsOwned: [],
      earnedTitles: [],
      equippedTitle: null,
      seasonStoryProgress: {},
      bossFirstKillSeen: [],
      heroFirstKillCommentSeen: [],

      addStones: (n) => {
        // BUG-017: 음수/NaN 가드
        if (!Number.isFinite(n) || n < 0) return;
        set((s) => ({ soulstones: s.soulstones + n, totalStones: s.totalStones + n }));
      },

      spendStones: (n) => {
        if (get().soulstones < n) return false;
        set((s) => ({ soulstones: s.soulstones - n }));
        return true;
      },

      upgradeSkill: (id) => {
        // 비용 계산은 호출자가 검증, 여기는 단순 +1
        set((s) => ({ skills: { ...s.skills, [id]: (s.skills[id] || 0) + 1 } }));
        return true;
      },

      resetSkills: () => set(() => ({ skills: { ...initialSkills } })),

      recordRun: (wave, kills, stones) => {
        // P0-1: 베이스 EXP를 같이 적립 (calcRunExp는 결과화면이 더 자세히 호출해서 reward만 처리)
        // v11 — adBoost demonExpX2Next 소비
        const expBoost = get().adBoosts.demonExpX2Next ? 2 : 1;
        const baseExp = Math.max(10, Math.floor(wave * 8 * expBoost));
        const runExp = applyExpGain(get().demonExp, baseExp);
        const newPending = get().pendingDemonRewards.slice();
        for (const rw of runExp.newRewards) {
          if (!newPending.includes(rw.level)) newPending.push(rw.level);
        }
        // v11 시즌 XP boost 소비
        const seasonBoost = get().adBoosts.seasonXpX2Next ? 2 : 1;
        // P0-2: 시즌 XP 동시 적립
        const cur = currentSeasonId();
        // P1-7: 이벤트 wave_master 진행도 += wave
        const wmKey = 'wave_master';
        set((s) => {
          const sp = s.seasonPass.seasonId === cur
            ? s.seasonPass
            : { seasonId: cur, xp: 0, claimedFreeTiers: [], claimedPremiumTiers: [], premium: false };
          const wm = s.eventProgress[wmKey] ?? { points: 0, claimedTiers: [] };
          return {
            bestWave: Math.max(s.bestWave, wave),
            totalKills: s.totalKills + kills,
            runs: s.runs + 1,
            soulstones: s.soulstones + stones,
            totalStones: s.totalStones + stones,
            lastPlayedAt: Date.now(),
            demonExp: runExp.newTotalExp,
            lastRunExp: baseExp,
            pendingDemonRewards: newPending,
            seasonPass: { ...sp, xp: sp.xp + Math.floor((wave * 4 + kills) * seasonBoost) },
            eventProgress: { ...s.eventProgress, [wmKey]: { ...wm, points: wm.points + wave } },
            // boost 소비
            adBoosts: { seasonXpX2Next: false, demonExpX2Next: false },
          };
        });
        // v11 일기 자동 생성 (1일 1회)
        try {
          const today = new Date().toISOString().slice(0, 10);
          if (get().lastDiaryDate !== today) {
            const entry = generateDiaryEntry({
              date: today, wave, kills, isVictory: wave >= 5, topMonsterId: null,
            });
            get().addDiaryEntry(entry);
          }
        } catch (e) {}
        // v11 자동 칭호 평가
        try {
          const s = get();
          const lvProg = progressInLevel(s.demonExp);
          const seasonId = s.seasonPass.seasonId;
          const newTitleIds = evaluateNewTitles({
            clearedStages: s.clearedStages,
            cardLevels: s.cardLevels,
            recruitedMonsterIds: s.recruitedMonsterIds,
            challengeStars: s.challengeStars,
            pvpRecord: s.pvpRecord,
            friendsCount: s.friends.length,
            tabletsSeen: s.tabletsSeen,
            recallSeen: s.recallSeen,
            demonLevel: lvProg.level,
            npcAffinity: s.npcAffinity,
            namedMinionsOwned: s.namedMinionsOwned,
            moralityCounts: s.moralityCounts,
            runs: s.runs,
            earnedTitles: s.earnedTitles,
            seasonPassMaxedSeasons: s.seasonPass.claimedFreeTiers.length >= 30 ? [seasonId] : [],
          });
          for (const id of newTitleIds) {
            get().earnTitle(id);
          }
        } catch (e) {}
      },

      discover: (kind, id) => set((s) => {
        const key = `discovered${kind.charAt(0).toUpperCase() + kind.slice(1)}` as keyof SaveState;
        const arr = (s as any)[key] as string[];
        if (arr.includes(id)) return s;
        const next = [...arr, id];
        // CORE C-3: 도감 진행도 보상 — discoveredMonsters 5/10/15/20 도달 시 영혼석 보너스
        let stoneBonus = 0;
        if (kind === 'monsters') {
          const milestones: Record<number, number> = { 5: 50, 10: 100, 15: 200, 20: 500 };
          stoneBonus = milestones[next.length] || 0;
        }
        if (stoneBonus > 0) {
          return {
            [key]: next,
            soulstones: s.soulstones + stoneBonus,
            totalStones: s.totalStones + stoneBonus,
          } as any;
        }
        return { [key]: next } as any;
      }),

      unlockAchievement: (id) => {
        const cur = get().achievements;
        if (cur.includes(id)) return false;
        set({ achievements: [...cur, id] });
        return true;
      },

      trackMission: (_type, _value, _mode) => {
        // 실제 구현은 src/game/missionTracker.ts 의 trackMissionProgress 사용
        // (useSaveStore와 missions.ts 양방향 import 회피용 stub)
      },
      markChallengeDone: (id) => {
        const cur = get().challengesDone;
        if (cur.includes(id)) return;
        set({ challengesDone: [...cur, id] });
      },

      claimAttendance: () => {
        const t = today();
        const a = get().attendance;
        if (a.lastDate === t) return null;  // 오늘 이미 받음
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const newStreak = a.lastDate === yesterday ? a.streak + 1 : 1;
        // 7일 cycle: 1일=10, 2일=20, ..., 7일=200(전설)
        const rewardTable = [10, 20, 30, 50, 75, 100, 200];
        const reward = rewardTable[(newStreak - 1) % 7];
        set((s) => ({
          soulstones: s.soulstones + reward,
          totalStones: s.totalStones + reward,
          attendance: { streak: newStreak, lastDate: t, rewardsClaimed: a.rewardsClaimed + 1 },
        }));
        return { streak: newStreak, reward };
      },

      recordPurchase: (sku) => set((s) => {
        const skus = s.iap.purchasedSkus.includes(sku) ? s.iap.purchasedSkus : [...s.iap.purchasedSkus, sku];
        let stones = s.soulstones;
        let adsRemoved = s.iap.adsRemoved;
        let starterPackPurchased = s.iap.starterPackPurchased;
        let nextSeasonPass = s.seasonPass;
        if (sku === 'starter_pack') {
          stones += 1000;
          adsRemoved = true;
          starterPackPurchased = true;
        } else if (sku === 'remove_ads') {
          adsRemoved = true;
        } else if (sku === 'stones_small') {
          stones += 500;
        } else if (sku === 'stones_medium') {
          stones += 2200;
        } else if (sku === 'season_pass') {
          stones += 500;
          // P0-2: 현재 시즌 프리미엄 즉시 활성
          const cur = currentSeasonId();
          nextSeasonPass = s.seasonPass.seasonId === cur
            ? { ...s.seasonPass, premium: true }
            : { seasonId: cur, xp: 0, claimedFreeTiers: [], claimedPremiumTiers: [], premium: true };
        }
        return {
          soulstones: stones,
          totalStones: s.totalStones + (stones - s.soulstones),
          iap: { purchasedSkus: skus, adsRemoved, starterPackShown: s.iap.starterPackShown, starterPackPurchased },
          seasonPass: nextSeasonPass,
        };
      }),

      markStarterPackShown: () => set((s) => ({
        iap: { ...s.iap, starterPackShown: true },
      })),

      rewardShare: () => {
        const t = today();
        const s = get();
        if (s.social.lastShareReward === t) return 0;
        const reward = 200;
        set({
          soulstones: s.soulstones + reward,
          totalStones: s.totalStones + reward,
          social: { sharesCount: s.social.sharesCount + 1, lastShareReward: t },
        });
        return reward;
      },

      convertStonesToShards: (amount) => {
        const s = get();
        if (s.soulstones < amount || amount < 100) return false;
        const shards = Math.floor(amount / 100);
        const used = shards * 100;
        set({ soulstones: s.soulstones - used, shards: s.shards + shards });
        return true;
      },
      spendShards: (n) => {
        if (get().shards < n) return false;
        set((st) => ({ shards: st.shards - n }));
        return true;
      },

      markTutorialSeen: (id) => set((s) => ({
        tutorialSeen: s.tutorialSeen.includes(id) ? s.tutorialSeen : [...s.tutorialSeen, id],
      })),
      hasTutorialSeen: (id) => get().tutorialSeen.includes(id),

      // OVERHAUL §3.3: 빌드 칭호 적립 (이미 있으면 false)
      recordBuildTitle: (buildId) => {
        const cur = get().buildTitles;
        if (cur.includes(buildId)) return false;
        set({ buildTitles: [...cur, buildId] });
        return true;
      },

      // 5차 — 마왕 비밀 능력 해금
      unlockSecret: (id) => {
        const cur = get().unlockedSecrets;
        if (cur.includes(id)) return false;
        set({ unlockedSecrets: [...cur, id] });
        return true;
      },

      // 5차 — 숨겨진 시너지 발견
      discoverHiddenSynergy: (id) => {
        const cur = get().discoveredHiddenSynergies;
        if (cur.includes(id)) return false;
        set({ discoveredHiddenSynergies: [...cur, id] });
        return true;
      },

      // 5차 — 시즌 메인 스토리 주차 시청 완료
      markSeasonEpisodeSeen: (seasonId, week) => {
        const key = `${seasonId}:w${week}`;
        const cur = get().seasonStoryEpisodesSeen;
        if (cur.includes(key)) return false;
        set({ seasonStoryEpisodesSeen: [...cur, key] });
        return true;
      },

      // 5차 — 시즌 보스 처치 + 보상 자동 지급
      recordSeasonalBossKill: (bossId, reward) => {
        const s = get();
        if (s.seasonalBossesKilled.includes(bossId)) return false;
        const nextOwned = reward.interiorId && !s.ownedInteriors.includes(reward.interiorId)
          ? [...s.ownedInteriors, reward.interiorId]
          : s.ownedInteriors;
        const nextRecruited = reward.recruitId && !s.recruitedMonsterIds.includes(reward.recruitId)
          ? [...s.recruitedMonsterIds, reward.recruitId]
          : s.recruitedMonsterIds;
        set({
          seasonalBossesKilled: [...s.seasonalBossesKilled, bossId],
          soulstones: s.soulstones + reward.stones,
          totalStones: s.totalStones + reward.stones,
          ownedInteriors: nextOwned,
          recruitedMonsterIds: nextRecruited,
        });
        return true;
      },

      // OVERHAUL §3.4: 보스 처치 누적 (마왕 강화 게이지) + 도전 모드 자동 해제 + 시즌XP/마왕EXP/이벤트
      addBossKill: () => {
        // P0-1 보스 처치당 +40 EXP, P0-2 시즌 +50 XP
        const exp = applyExpGain(get().demonExp, 40);
        const newPending = get().pendingDemonRewards.slice();
        for (const rw of exp.newRewards) {
          if (!newPending.includes(rw.level)) newPending.push(rw.level);
        }
        const cur = currentSeasonId();
        // P1-7 이벤트 진행도 — boss_hunter +1
        const bhKey = 'boss_hunter';
        set((s) => {
          const sp = s.seasonPass.seasonId === cur
            ? s.seasonPass
            : { seasonId: cur, xp: 0, claimedFreeTiers: [], claimedPremiumTiers: [], premium: false };
          const bh = s.eventProgress[bhKey] ?? { points: 0, claimedTiers: [] };
          return {
            totalBossKills: s.totalBossKills + 1,
            challengeUnlocked: s.challengeUnlocked || (s.totalBossKills + 1) >= 5,
            demonExp: exp.newTotalExp,
            pendingDemonRewards: newPending,
            seasonPass: { ...sp, xp: sp.xp + 50 },
            eventProgress: { ...s.eventProgress, [bhKey]: { ...bh, points: bh.points + 1 } },
          };
        });
      },

      // OVERHAUL §4.5: 인테리어 구매 (이미 보유 시 false)
      buyInterior: (id, cost) => {
        const s = get();
        if (s.ownedInteriors.includes(id)) return false;
        if (s.soulstones < cost) return false;
        set({
          soulstones: s.soulstones - cost,
          ownedInteriors: [...s.ownedInteriors, id],
        });
        return true;
      },
      equipInterior: (category, id) => {
        set((s) => ({
          equippedInteriors: { ...s.equippedInteriors, [category]: id },
        }));
      },

      // ===== STAGE & RECRUIT actions =====
      recordStageClear: (stageId, stars) => {
        set((s) => {
          const cleared = s.clearedStages.includes(stageId) ? s.clearedStages : [...s.clearedStages, stageId];
          const prevStars = s.stageStars[stageId] ?? 0;
          const newStars = Math.max(prevStars, stars) as 1 | 2 | 3;
          return {
            clearedStages: cleared,
            stageStars: { ...s.stageStars, [stageId]: newStars },
            lastClearedStageId: stageId,
            stageFirstClearClaimed: s.stageFirstClearClaimed.includes(stageId)
              ? s.stageFirstClearClaimed
              : [...s.stageFirstClearClaimed, stageId],
          };
        });
      },
      unlockRecruits: (ids) => {
        set((s) => {
          const next = s.availableRecruitIds.slice();
          for (const id of ids) {
            if (!next.includes(id) && !s.recruitedMonsterIds.includes(id)) next.push(id);
          }
          return { availableRecruitIds: next };
        });
      },
      recruitMonster: (id, cost) => {
        const s = get();
        if (s.recruitedMonsterIds.includes(id)) return false;
        if (s.soulstones < cost) return false;
        set({
          soulstones: s.soulstones - cost,
          recruitedMonsterIds: [...s.recruitedMonsterIds, id],
          availableRecruitIds: s.availableRecruitIds.filter((x) => x !== id),
        });
        return true;
      },
      setEndlessUnlocked: (v) => set({ endlessUnlocked: v }),
      setChallengeUnlocked: (v) => set({ challengeUnlocked: v }),
      markRecruitSeen: (ids) => {
        set((s) => {
          const next = s.recruitSeenIds.slice();
          for (const id of ids) if (!next.includes(id)) next.push(id);
          return { recruitSeenIds: next };
        });
      },
      setCurrentStageId: (id) => set({ currentStageId: id }),
      setSelectedStageId: (id) => set({ selectedStageId: id }),
      markRecruitTutorialSeen: () => set({ recruitTutorialSeen: true }),
      markStageSelectTutorialSeen: () => set({ stageSelectTutorialSeen: true }),

      // ===== v7 액션 구현 =====

      addDemonExp: (gained) => {
        const g = Math.max(0, Math.floor(gained || 0));
        const s = get();
        const before = progressInLevel(s.demonExp);
        const r = applyExpGain(s.demonExp, g);
        const newPending = s.pendingDemonRewards.slice();
        for (const rw of r.newRewards) {
          if (!newPending.includes(rw.level)) newPending.push(rw.level);
        }
        set({
          demonExp: r.newTotalExp,
          lastRunExp: g,
          pendingDemonRewards: newPending,
        });
        return { newLevel: r.newLevel, gainedLevels: r.newLevel - before.level, gained: g };
      },

      claimPendingDemonRewards: () => {
        const s = get();
        if (s.pendingDemonRewards.length === 0) return { stones: 0, recruitsAdded: [], labels: [] };
        let stoneSum = 0;
        const recruitsAdded: string[] = [];
        const labels: string[] = [];
        const ownedRecruits = new Set([...s.recruitedMonsterIds, ...s.availableRecruitIds]);
        for (const lv of s.pendingDemonRewards) {
          const r = DEMON_LEVEL_REWARDS.find((x) => x.level === lv);
          if (!r) continue;
          if (r.stones) stoneSum += r.stones;
          if (r.unlockRecruitIds) {
            for (const id of r.unlockRecruitIds) {
              if (!ownedRecruits.has(id)) {
                recruitsAdded.push(id);
                ownedRecruits.add(id);
              }
            }
          }
          labels.push(r.label);
        }
        set((st) => ({
          pendingDemonRewards: [],
          soulstones: st.soulstones + stoneSum,
          totalStones: st.totalStones + stoneSum,
          availableRecruitIds: [...st.availableRecruitIds, ...recruitsAdded],
        }));
        return { stones: stoneSum, recruitsAdded, labels };
      },

      setSelectedDeck: (ids) => {
        // 모집된 카드만 받아들임
        const s = get();
        const valid = ids.filter((id) => s.recruitedMonsterIds.includes(id));
        set({ selectedDeck: Array.from(new Set(valid)) });
      },

      ensureCurrentSeason: () => {
        const cur = currentSeasonId();
        const s = get();
        if (s.seasonPass.seasonId !== cur) {
          // 이전 시즌의 미수령 보상을 우편함으로 (단, 이미 만들었으면 skip)
          set({
            seasonPass: {
              seasonId: cur,
              xp: 0,
              claimedFreeTiers: [],
              claimedPremiumTiers: [],
              premium: false,
            },
          });
        }
      },

      addSeasonXp: (xp) => {
        if (!Number.isFinite(xp) || xp <= 0) return;
        const cur = currentSeasonId();
        set((s) => {
          const sp = s.seasonPass.seasonId === cur
            ? s.seasonPass
            : { seasonId: cur, xp: 0, claimedFreeTiers: [], claimedPremiumTiers: [], premium: false };
          return { seasonPass: { ...sp, xp: sp.xp + Math.floor(xp) } };
        });
      },

      claimSeasonReward: (tier, track) => {
        const s = get();
        const cur = currentSeasonId();
        if (s.seasonPass.seasonId !== cur) return false;
        const reachedTier = tierFromXp(s.seasonPass.xp);
        if (tier > reachedTier) return false;
        const tierDef = SEASON_PASS_TIERS.find((t) => t.tier === tier);
        if (!tierDef) return false;
        if (track === 'premium' && !s.seasonPass.premium) return false;
        const claimedList = track === 'free' ? s.seasonPass.claimedFreeTiers : s.seasonPass.claimedPremiumTiers;
        if (claimedList.includes(tier)) return false;
        const reward = track === 'free' ? tierDef.free : tierDef.premium;
        // 보상 적용
        let stoneAdd = 0;
        const recruitsAdded: string[] = [];
        const interiorsAdded: string[] = [];
        switch (reward.kind) {
          case 'stones': stoneAdd = reward.amount ?? 0; break;
          case 'recruit':
            if (reward.id && !s.recruitedMonsterIds.includes(reward.id) && !s.availableRecruitIds.includes(reward.id)) {
              recruitsAdded.push(reward.id);
            }
            break;
          case 'interior':
            if (reward.id && !s.ownedInteriors.includes(reward.id)) {
              interiorsAdded.push(reward.id);
            }
            break;
          case 'demonSkin':
            if (reward.id && !s.ownedInteriors.includes(reward.id)) {
              interiorsAdded.push(reward.id);
            }
            break;
          case 'mailLabel':
            break;
        }
        set({
          soulstones: s.soulstones + stoneAdd,
          totalStones: s.totalStones + stoneAdd,
          availableRecruitIds: [...s.availableRecruitIds, ...recruitsAdded],
          ownedInteriors: [...s.ownedInteriors, ...interiorsAdded],
          seasonPass: {
            ...s.seasonPass,
            claimedFreeTiers: track === 'free' ? [...s.seasonPass.claimedFreeTiers, tier] : s.seasonPass.claimedFreeTiers,
            claimedPremiumTiers: track === 'premium' ? [...s.seasonPass.claimedPremiumTiers, tier] : s.seasonPass.claimedPremiumTiers,
          },
        });
        return true;
      },

      activateSeasonPremium: () => {
        const cur = currentSeasonId();
        set((s) => ({
          seasonPass: s.seasonPass.seasonId === cur
            ? { ...s.seasonPass, premium: true }
            : { seasonId: cur, xp: 0, claimedFreeTiers: [], claimedPremiumTiers: [], premium: true },
        }));
      },

      recordDailySeedRun: (score, wave) => {
        const today = new Date().toISOString().slice(0, 10);
        set((s) => {
          const cur = s.dailySeed.date === today
            ? s.dailySeed
            : { date: today, attempted: false, bestScore: 0, bestWave: 0 };
          return {
            dailySeed: {
              date: today,
              attempted: true,
              bestScore: Math.max(cur.bestScore, score),
              bestWave: Math.max(cur.bestWave, wave),
            },
          };
        });
      },

      selectDemon: (id) => {
        const s = get();
        if (!s.unlockedDemons.includes(id)) return;
        set({ selectedDemonId: id });
      },

      unlockDemon: (id) => {
        const s = get();
        if (s.unlockedDemons.includes(id)) return false;
        set({ unlockedDemons: [...s.unlockedDemons, id] });
        return true;
      },

      enhanceCard: (monsterId, rarity) => {
        const s = get();
        if (!s.recruitedMonsterIds.includes(monsterId)) return false;
        const cur = s.cardLevels[monsterId] || 0;
        if (cur >= CARD_LEVEL_MAX) return false;
        const cost = costForLevelUp(rarity, cur);
        if (s.soulstones < cost) return false;
        set({
          soulstones: s.soulstones - cost,
          cardLevels: { ...s.cardLevels, [monsterId]: cur + 1 },
        });
        return true;
      },

      recordChallengeStar: (id, star) => {
        set((s) => {
          const prev = s.challengeStars[id] ?? 0;
          if (star <= prev) return s;
          return { challengeStars: { ...s.challengeStars, [id]: star } };
        });
      },

      pushMail: (mail) => {
        const s = get();
        if (s.mailbox.find((m) => m.id === mail.id)) return false;
        set({ mailbox: [...s.mailbox, mail] });
        return true;
      },

      claimMail: (id) => {
        const s = get();
        const m = s.mailbox.find((x) => x.id === id);
        if (!m || m.claimed) return null;
        // 보상 적용
        let stones = s.soulstones;
        let totalStones = s.totalStones;
        let demonExp = s.demonExp;
        let lastRunExp = s.lastRunExp;
        let pendingDemonRewards = s.pendingDemonRewards;
        const availableRecruitIds = s.availableRecruitIds.slice();
        const ownedInteriors = s.ownedInteriors.slice();
        const r = m.reward;
        switch (r.kind) {
          case 'stones':
            if (r.amount) {
              stones += r.amount;
              totalStones += r.amount;
            }
            break;
          case 'recruit':
            if (r.id && !s.recruitedMonsterIds.includes(r.id) && !availableRecruitIds.includes(r.id)) {
              availableRecruitIds.push(r.id);
            }
            break;
          case 'interior':
          case 'demonSkin':
            if (r.id && !ownedInteriors.includes(r.id)) ownedInteriors.push(r.id);
            break;
          case 'demonExp':
            if (r.amount) {
              const result = applyExpGain(demonExp, r.amount);
              demonExp = result.newTotalExp;
              lastRunExp = r.amount;
              const newPending = pendingDemonRewards.slice();
              for (const rw of result.newRewards) {
                if (!newPending.includes(rw.level)) newPending.push(rw.level);
              }
              pendingDemonRewards = newPending;
            }
            break;
          case 'none':
            break;
        }
        set({
          soulstones: stones,
          totalStones: totalStones,
          demonExp,
          lastRunExp,
          pendingDemonRewards,
          availableRecruitIds,
          ownedInteriors,
          mailbox: s.mailbox.filter((x) => x.id !== id),
        });
        return r;
      },

      cleanupExpiredMails: () => {
        const now = Date.now();
        const s = get();
        const kept = s.mailbox.filter((m) => !m.expiresAt || m.expiresAt > now);
        if (kept.length === s.mailbox.length) return 0;
        set({ mailbox: kept });
        return s.mailbox.length - kept.length;
      },

      // ===== P0-3 비동기 PvP =====
      pushPvpSnapshot: (snap) => {
        set((s) => {
          const next = [snap, ...s.pvpSnapshots].slice(0, 5);
          return { pvpSnapshots: next };
        });
      },
      recordPvpResult: (result) => {
        const cur = currentSeasonId();
        const s = get();
        const rec = s.pvpRecord[cur] ?? { wins: 0, losses: 0, draws: 0 };
        const points = result === 'me' ? 25 : result === 'draw' ? 5 : -10;
        const curRank = s.pvpRanks[cur] ?? 0;
        const newRank = Math.max(0, curRank + points);
        const newRec = {
          wins: rec.wins + (result === 'me' ? 1 : 0),
          losses: rec.losses + (result === 'opponent' ? 1 : 0),
          draws: rec.draws + (result === 'draw' ? 1 : 0),
        };
        set({
          pvpRanks: { ...s.pvpRanks, [cur]: newRank },
          pvpRecord: { ...s.pvpRecord, [cur]: newRec },
        });
        return { newRank };
      },
      incPvpDaily: () => {
        const today = new Date().toISOString().slice(0, 10);
        const s = get();
        const cur = s.pvpDailyCount.date === today ? s.pvpDailyCount : { date: today, count: 0 };
        if (cur.count >= 5) return false;
        set({ pvpDailyCount: { date: today, count: cur.count + 1 } });
        return true;
      },

      // 5차 — 시즌 종료 PVP 보상 자동 지급
      claimPvpSeasonRewards: () => {
        const s = get();
        const cur = currentSeasonId();
        // 동기 import 회피용 dynamic require — 실제로는 통과하지 않음 (no-op fallback)
        // 실제 호출자에서 직접 처리하므로 여기서는 lookup만:
        const lastClaimed = s.lastClaimedPvpSeason;
        if (lastClaimed === cur) return null;
        // 이전 시즌이 비어있으면 (= 신규 유저) 그냥 마킹만
        if (!lastClaimed) {
          set({ lastClaimedPvpSeason: cur });
          return null;
        }
        const prevScore = s.pvpRanks[lastClaimed] ?? 0;
        if (prevScore <= 0) {
          set({ lastClaimedPvpSeason: cur });
          return null;
        }
        // pvpTiers는 외부 import 필요 — 호출 측에서 보상을 계산해서 지급하는 형태로 변경할 것 (claim*는 사실상 lock 갱신만)
        // 여기선 점수만으로 직접 결정 (PVP_TIERS 정렬 가정)
        const TIERS = [
          { tier: 'bronze',      name: '청동',   minScore: 0,    stones: 100 },
          { tier: 'silver',      name: '은',     minScore: 100,  stones: 300 },
          { tier: 'gold',        name: '금',     minScore: 300,  stones: 700,   titleId: 't_pvp_gold' },
          { tier: 'platinum',    name: '백금',   minScore: 600,  stones: 1500,  titleId: 't_pvp_platinum' },
          { tier: 'diamond',     name: '다이아', minScore: 1000, stones: 3000,  titleId: 't_pvp_diamond' },
          { tier: 'master',      name: '마스터', minScore: 1500, stones: 6000,  titleId: 't_pvp_master',      interiorId: 'aura_amber' },
          { tier: 'grandmaster', name: '진왕',   minScore: 2500, stones: 12000, titleId: 't_pvp_grandmaster', interiorId: 'flag_blackpurple' },
        ];
        let result = TIERS[0];
        for (const t of TIERS) if (prevScore >= t.minScore) result = t;
        const newSoul = s.soulstones + result.stones;
        const newTotal = s.totalStones + result.stones;
        const newTitles = result.titleId && !s.pvpTitlesEarned.includes(result.titleId)
          ? [...s.pvpTitlesEarned, result.titleId]
          : s.pvpTitlesEarned;
        const newInteriors = result.interiorId && !s.ownedInteriors.includes(result.interiorId)
          ? [...s.ownedInteriors, result.interiorId]
          : s.ownedInteriors;
        set({
          soulstones: newSoul,
          totalStones: newTotal,
          lastClaimedPvpSeason: cur,
          pvpTitlesEarned: newTitles,
          ownedInteriors: newInteriors,
        });
        return {
          seasonId: lastClaimed,
          tierName: result.name,
          stones: result.stones,
          titleId: result.titleId,
          interiorId: result.interiorId,
        };
      },

      // ===== P1-2 친구 시스템 =====
      addFriend: (code, nickname) => {
        const s = get();
        if (!code || code.length < 4 || code === s.myFriendCode) return false;
        if (s.friends.find((f) => f.code === code)) return false;
        if (s.friends.length >= 30) return false;
        set({
          friends: [...s.friends, {
            code, nickname, addedAt: Date.now(),
            // mock — 실 SDK 연동 전 임의 생성
            bestWave: 5 + Math.floor(Math.random() * 30),
            demonLevel: 1 + Math.floor(Math.random() * 12),
          }],
        });
        return true;
      },
      removeFriend: (code) => {
        set((s) => ({ friends: s.friends.filter((f) => f.code !== code) }));
      },
      claimFriendVisit: (code) => {
        const today = new Date().toISOString().slice(0, 10);
        const s = get();
        const last = s.friendVisitRewards[code];
        if (last === today) return 0;
        const reward = 30;
        set({
          soulstones: s.soulstones + reward,
          totalStones: s.totalStones + reward,
          friendshipPoints: s.friendshipPoints + 10,
          friendVisitRewards: { ...s.friendVisitRewards, [code]: today },
        });
        return reward;
      },

      // ===== P1-7 한정 이벤트 =====
      addEventProgress: (eventId, points) => {
        if (!eventId || points <= 0) return;
        set((s) => {
          const cur = s.eventProgress[eventId] ?? { points: 0, claimedTiers: [] };
          return { eventProgress: { ...s.eventProgress, [eventId]: { ...cur, points: cur.points + Math.floor(points) } } };
        });
      },
      claimEventTier: (eventId, tier) => {
        const s = get();
        const cur = s.eventProgress[eventId];
        if (!cur || cur.claimedTiers.includes(tier)) return false;
        set({
          eventProgress: {
            ...s.eventProgress,
            [eventId]: { ...cur, claimedTiers: [...cur.claimedTiers, tier] },
          },
        });
        return true;
      },
      markEventBoardSeen: () => {
        set({ eventLastSeenDate: new Date().toISOString().slice(0, 10) });
      },

      // ===== P2-1 컷씬 =====
      markCutsceneSeen: (id) => {
        set((s) => s.cutscenesSeen.includes(id)
          ? s
          : { cutscenesSeen: [...s.cutscenesSeen, id] }
        );
      },

      // ===== W5 사망 누적 =====
      bumpDeathStreak: (chapterId) => {
        const s = get();
        const cur = s.deathStreakByChapter[chapterId] ?? 0;
        const next = cur + 1;
        set({ deathStreakByChapter: { ...s.deathStreakByChapter, [chapterId]: next } });
        return next;
      },
      resetDeathStreak: (chapterId) => {
        set((s) => {
          if (!(chapterId in s.deathStreakByChapter)) return s;
          const { [chapterId]: _, ...rest } = s.deathStreakByChapter;
          return { deathStreakByChapter: rest };
        });
      },

      // ===== v10 액션 구현 =====
      bumpNpcAffinity: (npcId, amount = 1) => {
        const s = get();
        const cur = s.npcAffinity[npcId] || 0;
        const next = Math.min(50, cur + amount);
        set({ npcAffinity: { ...s.npcAffinity, [npcId]: next } });
        return next;
      },
      markNpcStorySeen: (id) => {
        set((s) => s.npcStoriesSeen.includes(id) ? s : { npcStoriesSeen: [...s.npcStoriesSeen, id] });
      },
      shiftMorality: (delta) => {
        set((s) => ({ moralityGauge: Math.max(-100, Math.min(100, s.moralityGauge + delta)) }));
      },
      bumpMoralityCount: (kind) => {
        set((s) => ({ moralityCounts: { ...s.moralityCounts, [kind]: s.moralityCounts[kind] + 1 } }));
      },
      logDecision: (id, choice, effect) => {
        set((s) => ({
          decisionLog: [...s.decisionLog, { id, ts: Date.now(), choice, effect }].slice(-200),
        }));
      },
      addRecall: (id) => {
        const s = get();
        if (s.recallSeen.includes(id)) return false;
        set({ recallSeen: [...s.recallSeen, id] });
        return true;
      },
      addTablet: (id) => {
        const s = get();
        if (s.tabletsSeen.includes(id)) return false;
        set({ tabletsSeen: [...s.tabletsSeen, id] });
        return true;
      },
      unlockNamedMinion: (id) => {
        const s = get();
        if (s.namedMinionsOwned.includes(id)) return false;
        set({ namedMinionsOwned: [...s.namedMinionsOwned, id] });
        return true;
      },
      earnTitle: (id) => {
        const s = get();
        if (s.earnedTitles.includes(id)) return false;
        set({ earnedTitles: [...s.earnedTitles, id] });
        return true;
      },
      equipTitle: (id) => set({ equippedTitle: id }),
      markSeasonStoryWeek: (seasonId, week) => {
        set((s) => {
          const cur = s.seasonStoryProgress[seasonId] || [];
          if (cur.includes(week)) return s;
          return { seasonStoryProgress: { ...s.seasonStoryProgress, [seasonId]: [...cur, week].sort() } };
        });
      },
      markBossFirstKillSeen: (bossId) => {
        const s = get();
        if (s.bossFirstKillSeen.includes(bossId)) return false;
        set({ bossFirstKillSeen: [...s.bossFirstKillSeen, bossId] });
        return true;
      },
      markHeroFirstKillCommentSeen: (typeId) => {
        const s = get();
        if (s.heroFirstKillCommentSeen.includes(typeId)) return false;
        set({ heroFirstKillCommentSeen: [...s.heroFirstKillCommentSeen, typeId] });
        return true;
      },

      // ===== v11 액션 구현 =====
      tryConsumeAd: (entryId, cap) => {
        const today = new Date().toISOString().slice(0, 10);
        const s = get();
        if (cap.kind === 'unlimited') return true;
        const cur = s.adDailyCounts[entryId];
        if (cap.kind === 'daily') {
          const max = cap.max ?? 1;
          const todayCount = cur && cur.date === today ? cur.count : 0;
          if (todayCount >= max) return false;
          set({ adDailyCounts: { ...s.adDailyCounts, [entryId]: { date: today, count: todayCount + 1 } } });
          return true;
        }
        if (cap.kind === 'perRun' || cap.kind === 'perItem') {
          // perRun/perItem은 호출자가 별도 키로 관리. 여기서는 1회 카운터만.
          if (cur && cur.date === today) return false;
          set({ adDailyCounts: { ...s.adDailyCounts, [entryId]: { date: today, count: 1 } } });
          return true;
        }
        return true;
      },
      activateAdBoost: (kind) => {
        set((s) => ({ adBoosts: { ...s.adBoosts, [kind]: true } }));
      },
      consumeAdBoost: (kind) => {
        const s = get();
        if (!s.adBoosts[kind]) return false;
        set({ adBoosts: { ...s.adBoosts, [kind]: false } });
        return true;
      },
      updateTowerBest: (floor) => {
        set((s) => ({ towerBestFloor: Math.max(s.towerBestFloor, floor) }));
      },
      addMuseumEntry: (entry) => {
        const s = get();
        const dupKey = `${entry.kind}:${entry.refId || ''}`;
        if (s.museumEntries.some((e) => `${e.kind}:${e.refId || ''}` === dupKey)) return false;
        set({ museumEntries: [...s.museumEntries, entry].slice(-500) });
        return true;
      },
      addDiaryEntry: (entry) => {
        const s = get();
        if (s.diaryEntries.some((e) => e.date === entry.date)) return false;
        set({
          diaryEntries: [...s.diaryEntries, entry].slice(-365),
          lastDiaryDate: entry.date,
        });
        return true;
      },
      bumpSideQuest: (questId, amount = 1) => {
        const today = new Date().toISOString().slice(0, 10);
        const s = get();
        const cur = s.sideQuestProgress[questId];
        const isToday = cur && cur.date === today;
        const next = (isToday ? cur.progress : 0) + amount;
        set({
          sideQuestProgress: {
            ...s.sideQuestProgress,
            [questId]: { date: today, questId, progress: next, claimed: isToday ? cur.claimed : false },
          },
        });
        return next;
      },
      claimSideQuest: (questId, rewardStones, rewardAffinity, npcId) => {
        const s = get();
        const cur = s.sideQuestProgress[questId];
        if (!cur || cur.claimed) return false;
        set({
          soulstones: s.soulstones + rewardStones,
          totalStones: s.totalStones + rewardStones,
          sideQuestProgress: { ...s.sideQuestProgress, [questId]: { ...cur, claimed: true } },
          npcAffinity: { ...s.npcAffinity, [npcId]: Math.min(50, (s.npcAffinity[npcId] || 0) + rewardAffinity) },
        });
        return true;
      },
      advanceNgPlus: () => {
        const s = get();
        const next = s.ngPlusCycle + 1;
        set({ ngPlusCycle: next });
        return next;
      },
      claimPvpSeasonReward: (seasonId) => {
        const s = get();
        if (s.pvpSeasonRewardClaimed[seasonId]) return false;
        set({ pvpSeasonRewardClaimed: { ...s.pvpSeasonRewardClaimed, [seasonId]: true } });
        return true;
      },
      bumpMiniGameAttempts: () => {
        const today = new Date().toISOString().slice(0, 10);
        const s = get();
        const cur = s.miniGameAttempts.date === today ? s.miniGameAttempts : { date: today, count: 0 };
        set({ miniGameAttempts: { date: today, count: cur.count + 1 } });
      },

      // OVERHAUL §3.5: 적 조각 누적 + 100 도달 시 baneActive
      addHeroFragment: (heroId, amount) => {
        const s = get();
        const cur = s.heroFragments[heroId] || 0;
        const next = Math.min(100, cur + amount);
        const newFragments = { ...s.heroFragments, [heroId]: next };
        let baneActivated = false;
        let newBane = s.heroBaneActive;
        if (cur < 100 && next >= 100 && !s.heroBaneActive.includes(heroId)) {
          newBane = [...s.heroBaneActive, heroId];
          baneActivated = true;
        }
        set({ heroFragments: newFragments, heroBaneActive: newBane });
        return baneActivated;
      },

      toggleAccessibility: (key) => {
        set((s) => ({
          accessibility: { ...s.accessibility, [key]: !s.accessibility[key] },
        }));
        // window 플래그 동기화 (AitBridge.haptic에서 참조)
        try {
          (window as any).__hapticEnabled = get().accessibility.haptic;
          // ACC A-1: largerText 토글 시 root font-size 갱신
          if (key === 'largerText') {
            const lt = get().accessibility.largerText;
            document.documentElement.style.fontSize = lt ? '17px' : '14px';
            // ACC A-4: data-larger-text 속성 동기화
            document.documentElement.setAttribute('data-larger-text', String(lt));
          }
        } catch (e) {}
      },
    }),
    {
      name: 'maowang-save-v4',
      version: 11,
      partialize: (s) => ({
        soulstones: s.soulstones, totalStones: s.totalStones, skills: s.skills,
        bestWave: s.bestWave, totalKills: s.totalKills, runs: s.runs, lastPlayedAt: s.lastPlayedAt,
        discoveredMonsters: s.discoveredMonsters, discoveredHeroes: s.discoveredHeroes,
        discoveredBosses: s.discoveredBosses, discoveredRelics: s.discoveredRelics,
        achievements: s.achievements, bossesKilled: s.bossesKilled,
        challengesDone: s.challengesDone, daily: s.daily, attendance: s.attendance,
        iap: s.iap,
        social: s.social,
        shards: s.shards,
        tutorialSeen: s.tutorialSeen,
        accessibility: s.accessibility,
        buildTitles: s.buildTitles,
        unlockedSecrets: s.unlockedSecrets,
        discoveredHiddenSynergies: s.discoveredHiddenSynergies,
        lastClaimedPvpSeason: s.lastClaimedPvpSeason,
        pvpTitlesEarned: s.pvpTitlesEarned,
        seasonStoryEpisodesSeen: s.seasonStoryEpisodesSeen,
        seasonalBossesKilled: s.seasonalBossesKilled,
        heroFragments: s.heroFragments,
        heroBaneActive: s.heroBaneActive,
        totalBossKills: s.totalBossKills,
        ownedInteriors: s.ownedInteriors,
        equippedInteriors: s.equippedInteriors,
        // v6 STAGE & RECRUIT
        clearedStages: s.clearedStages,
        stageStars: s.stageStars,
        stageFirstClearClaimed: s.stageFirstClearClaimed,
        lastClearedStageId: s.lastClearedStageId,
        currentStageId: s.currentStageId,
        selectedStageId: s.selectedStageId,
        recruitedMonsterIds: s.recruitedMonsterIds,
        availableRecruitIds: s.availableRecruitIds,
        recruitSeenIds: s.recruitSeenIds,
        recruitTutorialSeen: s.recruitTutorialSeen,
        stageSelectTutorialSeen: s.stageSelectTutorialSeen,
        endlessUnlocked: s.endlessUnlocked,
        challengeUnlocked: s.challengeUnlocked,
        // v7
        demonExp: s.demonExp,
        pendingDemonRewards: s.pendingDemonRewards,
        selectedDeck: s.selectedDeck,
        seasonPass: s.seasonPass,
        dailySeed: s.dailySeed,
        selectedDemonId: s.selectedDemonId,
        unlockedDemons: s.unlockedDemons,
        cardLevels: s.cardLevels,
        challengeStars: s.challengeStars,
        mailbox: s.mailbox,
        mailboxLastDeliveryDate: s.mailboxLastDeliveryDate,
        // v8
        pvpSnapshots: s.pvpSnapshots,
        pvpRanks: s.pvpRanks,
        pvpRecord: s.pvpRecord,
        pvpDailyCount: s.pvpDailyCount,
        friends: s.friends,
        myFriendCode: s.myFriendCode,
        friendshipPoints: s.friendshipPoints,
        friendVisitRewards: s.friendVisitRewards,
        eventProgress: s.eventProgress,
        eventLastSeenDate: s.eventLastSeenDate,
        cutscenesSeen: s.cutscenesSeen,
        deathStreakByChapter: s.deathStreakByChapter,
        // v10
        npcAffinity: s.npcAffinity,
        npcStoriesSeen: s.npcStoriesSeen,
        moralityGauge: s.moralityGauge,
        moralityCounts: s.moralityCounts,
        decisionLog: s.decisionLog,
        recallSeen: s.recallSeen,
        tabletsSeen: s.tabletsSeen,
        namedMinionsOwned: s.namedMinionsOwned,
        earnedTitles: s.earnedTitles,
        equippedTitle: s.equippedTitle,
        seasonStoryProgress: s.seasonStoryProgress,
        bossFirstKillSeen: s.bossFirstKillSeen,
        heroFirstKillCommentSeen: s.heroFirstKillCommentSeen,
        // v11
        adDailyCounts: s.adDailyCounts,
        adBoosts: s.adBoosts,
        towerBestFloor: s.towerBestFloor,
        museumEntries: s.museumEntries,
        diaryEntries: s.diaryEntries,
        sideQuestProgress: s.sideQuestProgress,
        ngPlusCycle: s.ngPlusCycle,
        pvpSeasonRewardClaimed: s.pvpSeasonRewardClaimed,
        miniGameAttempts: s.miniGameAttempts,
        lastDiaryDate: s.lastDiaryDate,
      }),
      // 손상된 저장 데이터 방어 (clamp + 기본값 보강)
      migrate: (persistedState: any, _version: number) => {
        const safe = persistedState || {};
        const num = (v: any, def: number) => {
          const n = Number(v);
          return Number.isFinite(n) && n >= 0 ? n : def;
        };
        const arr = (v: any) => Array.isArray(v) ? v : [];
        const obj = <T,>(v: any, def: T): T => (v && typeof v === 'object') ? v : def;
        return {
          ...safe,
          soulstones: num(safe.soulstones, 0),
          totalStones: num(safe.totalStones, 0),
          shards: num(safe.shards, 0),
          bestWave: num(safe.bestWave, 0),
          totalKills: num(safe.totalKills, 0),
          runs: num(safe.runs, 0),
          lastPlayedAt: num(safe.lastPlayedAt, 0),
          skills: (() => {
            // v4 → v5 migration: skills.spinCost → skills.cardCost (정책 리스크 용어 정리)
            const src: any = obj(safe.skills, { ...initialSkills });
            const out: any = { ...initialSkills, ...src };
            if (typeof src.spinCost === 'number' && !src.cardCost) {
              out.cardCost = src.spinCost;
            }
            delete out.spinCost;
            return out;
          })(),
          discoveredMonsters: arr(safe.discoveredMonsters),
          discoveredHeroes: arr(safe.discoveredHeroes),
          discoveredBosses: arr(safe.discoveredBosses),
          discoveredRelics: arr(safe.discoveredRelics),
          achievements: (() => {
            // v4 → v5 migration: achievement 'jackpot' → 'luckySummon' (정책 리스크 용어 정리)
            const list = arr(safe.achievements) as string[];
            return list.map((id: string) => id === 'jackpot' ? 'luckySummon' : id);
          })(),
          bossesKilled: arr(safe.bossesKilled),
          challengesDone: arr(safe.challengesDone),
          daily: (() => {
            // v4 → v5 migration: daily.missions[*].id rename (jackpot1 → luckySummon1, spin20 → cardReveal20)
            const d: any = obj(safe.daily, { date: '', missions: [] });
            const renameMap: Record<string, string> = { jackpot1: 'luckySummon1', spin20: 'cardReveal20' };
            const missions = arr(d.missions).map((m: any) => {
              if (m && typeof m === 'object' && renameMap[m.id]) {
                return { ...m, id: renameMap[m.id] };
              }
              return m;
            });
            return { ...d, missions };
          })(),
          attendance: obj(safe.attendance, { streak: 0, lastDate: '', rewardsClaimed: 0 }),
          iap: obj(safe.iap, { purchasedSkus: [], adsRemoved: false, starterPackShown: false, starterPackPurchased: false }),
          social: obj(safe.social, { sharesCount: 0, lastShareReward: '' }),
          tutorialSeen: arr(safe.tutorialSeen),
          accessibility: obj(safe.accessibility, { reduceMotion: false, largerText: false, haptic: true }),
          buildTitles: arr(safe.buildTitles),
          unlockedSecrets: arr(safe.unlockedSecrets),
          discoveredHiddenSynergies: arr(safe.discoveredHiddenSynergies),
          lastClaimedPvpSeason: typeof safe.lastClaimedPvpSeason === 'string' ? safe.lastClaimedPvpSeason : '',
          pvpTitlesEarned: arr(safe.pvpTitlesEarned),
          seasonStoryEpisodesSeen: arr(safe.seasonStoryEpisodesSeen),
          seasonalBossesKilled: arr(safe.seasonalBossesKilled),
          heroFragments: obj(safe.heroFragments, {}),
          heroBaneActive: arr(safe.heroBaneActive),
          totalBossKills: num(safe.totalBossKills, 0),
          ownedInteriors: arr(safe.ownedInteriors).length > 0 ? arr(safe.ownedInteriors) : ['sign_default', 'flag_default', 'aura_default', 'circle_default'],
          equippedInteriors: obj(safe.equippedInteriors, { sign: 'sign_default', flag: 'flag_default', aura: 'aura_default', magic_circle: 'circle_default' }),
          // ===== v5 → v6 migration: STAGE & RECRUIT =====
          // 신규 유저: 스타터 4종 + 즉시 모집 가능 2종.
          // 기존 v5 유저: 스타터 자동 부여 + 무한 모드 즉시 잠금 해제 + bestWave 기반 ch1 일부 자동 클리어 처리.
          clearedStages: (() => {
            const cur = arr(safe.clearedStages) as string[];
            const bestW = num(safe.bestWave, 0);
            const auto: string[] = [];
            // 기존 v5 유저 진행도 인정 — bestWave 기준
            if (bestW >= 5)  auto.push('ch1_s1');
            if (bestW >= 10) auto.push('ch1_s2');
            if (bestW >= 15) auto.push('ch1_s3');
            if (bestW >= 20) auto.push('ch1_s4');
            if (bestW >= 25) auto.push('ch1_s5');
            const merged = cur.slice();
            for (const id of auto) if (!merged.includes(id)) merged.push(id);
            return merged;
          })(),
          stageStars: obj(safe.stageStars, {}),
          stageFirstClearClaimed: arr(safe.stageFirstClearClaimed),
          lastClearedStageId: typeof safe.lastClearedStageId === 'string' ? safe.lastClearedStageId : null,
          currentStageId: typeof safe.currentStageId === 'string' ? safe.currentStageId : null,
          selectedStageId: typeof safe.selectedStageId === 'string' ? safe.selectedStageId : null,
          recruitedMonsterIds: (() => {
            const cur = arr(safe.recruitedMonsterIds) as string[];
            const starters = ['slime', 'goblin', 'skel', 'zombie'];
            const merged = cur.slice();
            for (const id of starters) if (!merged.includes(id)) merged.push(id);
            return merged;
          })(),
          availableRecruitIds: (() => {
            const cur = arr(safe.availableRecruitIds) as string[];
            const recruited = arr(safe.recruitedMonsterIds) as string[];
            const fallback = ['imp', 'witch'];
            const merged = cur.slice();
            for (const id of fallback) {
              if (!merged.includes(id) && !recruited.includes(id)) merged.push(id);
            }
            return merged;
          })(),
          recruitSeenIds: arr(safe.recruitSeenIds),
          recruitTutorialSeen: typeof safe.recruitTutorialSeen === 'boolean'
            ? safe.recruitTutorialSeen
            : false,
          stageSelectTutorialSeen: typeof safe.stageSelectTutorialSeen === 'boolean'
            ? safe.stageSelectTutorialSeen
            : false,
          // 기존 유저는 무한 모드 익숙 — 즉시 잠금 해제. 신규는 ch1_s5 클리어 후.
          endlessUnlocked: typeof safe.endlessUnlocked === 'boolean'
            ? safe.endlessUnlocked
            : (num(safe.runs, 0) > 0),
          // 도전 모드 — 누적 보스 5마리 또는 기존 challengesDone 보유 시 즉시 해제
          challengeUnlocked: typeof safe.challengeUnlocked === 'boolean'
            ? safe.challengeUnlocked
            : (num(safe.totalBossKills, 0) >= 5 || arr(safe.challengesDone).length > 0),
          // ===== v6 → v7 migration =====
          demonExp: num(safe.demonExp, 0),
          pendingDemonRewards: arr(safe.pendingDemonRewards),
          selectedDeck: arr(safe.selectedDeck),
          seasonPass: (() => {
            const sp = obj(safe.seasonPass, null as any);
            const cur = currentSeasonId();
            if (!sp || sp.seasonId !== cur) {
              return { seasonId: cur, xp: 0, claimedFreeTiers: [], claimedPremiumTiers: [], premium: false };
            }
            return {
              seasonId: cur,
              xp: num(sp.xp, 0),
              claimedFreeTiers: arr(sp.claimedFreeTiers),
              claimedPremiumTiers: arr(sp.claimedPremiumTiers),
              premium: !!sp.premium,
            };
          })(),
          dailySeed: obj(safe.dailySeed, { date: '', attempted: false, bestScore: 0, bestWave: 0 }),
          selectedDemonId: typeof safe.selectedDemonId === 'string' ? safe.selectedDemonId : 'shadow',
          unlockedDemons: (() => {
            const u = arr(safe.unlockedDemons) as string[];
            return u.includes('shadow') ? u : ['shadow', ...u];
          })(),
          cardLevels: obj(safe.cardLevels, {}),
          challengeStars: obj(safe.challengeStars, {}),
          mailbox: arr(safe.mailbox),
          mailboxLastDeliveryDate: typeof safe.mailboxLastDeliveryDate === 'string' ? safe.mailboxLastDeliveryDate : '',
          // ===== v7 → v8 migration =====
          pvpSnapshots: arr(safe.pvpSnapshots).slice(0, 5),
          pvpRanks: obj(safe.pvpRanks, {}),
          pvpRecord: obj(safe.pvpRecord, {}),
          pvpDailyCount: obj(safe.pvpDailyCount, { date: '', count: 0 }),
          friends: arr(safe.friends),
          myFriendCode: typeof safe.myFriendCode === 'string' && safe.myFriendCode.length >= 4
            ? safe.myFriendCode
            : (() => {
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                let s = '';
                for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
                return s;
              })(),
          friendshipPoints: num(safe.friendshipPoints, 0),
          friendVisitRewards: obj(safe.friendVisitRewards, {}),
          eventProgress: obj(safe.eventProgress, {}),
          eventLastSeenDate: typeof safe.eventLastSeenDate === 'string' ? safe.eventLastSeenDate : '',
          cutscenesSeen: arr(safe.cutscenesSeen),
          deathStreakByChapter: obj(safe.deathStreakByChapter, {}),
          // ===== v9 → v10 migration =====
          npcAffinity: obj(safe.npcAffinity, {}),
          npcStoriesSeen: arr(safe.npcStoriesSeen),
          moralityGauge: (() => {
            const v = Number(safe.moralityGauge);
            return Number.isFinite(v) ? Math.max(-100, Math.min(100, v)) : 0;
          })(),
          moralityCounts: obj(safe.moralityCounts, { mercy: 0, ruthless: 0, balanced: 0 }),
          decisionLog: arr(safe.decisionLog).slice(-200),
          recallSeen: arr(safe.recallSeen),
          tabletsSeen: arr(safe.tabletsSeen),
          namedMinionsOwned: arr(safe.namedMinionsOwned),
          earnedTitles: arr(safe.earnedTitles),
          equippedTitle: typeof safe.equippedTitle === 'string' ? safe.equippedTitle : null,
          seasonStoryProgress: obj(safe.seasonStoryProgress, {}),
          bossFirstKillSeen: arr(safe.bossFirstKillSeen),
          heroFirstKillCommentSeen: arr(safe.heroFirstKillCommentSeen),
          // ===== v10 → v11 migration =====
          adDailyCounts: obj(safe.adDailyCounts, {}),
          adBoosts: obj(safe.adBoosts, { seasonXpX2Next: false, demonExpX2Next: false }),
          towerBestFloor: num(safe.towerBestFloor, 0),
          museumEntries: arr(safe.museumEntries).slice(-500),
          diaryEntries: arr(safe.diaryEntries).slice(-365),
          sideQuestProgress: obj(safe.sideQuestProgress, {}),
          ngPlusCycle: num(safe.ngPlusCycle, 0),
          pvpSeasonRewardClaimed: obj(safe.pvpSeasonRewardClaimed, {}),
          miniGameAttempts: obj(safe.miniGameAttempts, { date: '', count: 0 }),
          lastDiaryDate: typeof safe.lastDiaryDate === 'string' ? safe.lastDiaryDate : '',
        };
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('[saveStore] rehydrate 실패, 기본값 사용:', error);
        }
        // window haptic 플래그 동기화 (rehydrate 직후)
        try {
          if (state) (window as any).__hapticEnabled = state.accessibility.haptic;
        } catch (e) {}
      },
    },
  ),
);
