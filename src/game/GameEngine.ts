/**
 * GameEngine — 메인 게임 루프 + 모든 시스템
 * 단일 HTML 게임 코드를 React 친화 클래스로 이식.
 *
 * 사용법:
 *   const engine = new GameEngine(canvas);
 *   engine.start();
 *   engine.on('gameover', (stats) => { ... });
 *   engine.dispose();  // unmount 시 호출
 */
import { Audio } from '../audio/AudioEngine';
import { MASTER_PAL } from './rendering/palette';
import { MONSTERS, pickRandomMonster, MONSTER_SHEET_IDS, MONSTER_SHEET_FRAMES, type MonsterDef } from './data/monsters';
import { HEROES, heroPoolForWave, HERO_SHEET_IDS, HERO_SHEET_FRAMES, type HeroDef } from './data/heroes';
import { BOSSES, bossForWave, type BossDef } from './data/bosses';
import { SYNERGIES } from './data/synergies';
import { RELICS } from './data/relics';
import { findReadyFusions, type RelicFusionDef } from './data/relicFusions';
import { activeHiddenSynergies, HIDDEN_SYNERGIES, type HiddenSynergyDef } from './data/hiddenSynergies';
import { aggregateDemonSecrets, DEMON_SECRETS } from './data/demonSecrets';
import { getSeasonalBoss, type SeasonalBoss } from './data/seasonalBosses';
import { currentCycleIndex } from './data/seasonPass';
import { CHALLENGES, type ChallengeDef } from './data/challenges';
import { EVENTS, pickRandomEvent } from './data/events';
import { currentSeason } from './data/seasons';
import { useSaveStore } from '../store/useSaveStore';
import * as Ait from '../sdk/AitBridge';
import { trackMissionProgress, unlockAchievement, popMissionCompleted } from './missionTracker';
import { getCachedSprite, getCachedSequence, getCachedSheet } from './rendering/spriteLoader';
import { stratumForWave, isStratumEnterWave, STRATA, type StratumDef } from './data/strata';
import {
  emptyBuildStats, type BuildStats, dominantBuild,
  emptyBuildBonusState, getActiveBuildBonusState, type BuildBonusState,
} from './data/builds';
import { type BranchCardDef, pickRandomBranchCard, type RiskCardDef, type RiskEffect } from './data/riskCards';
import { todayEdict, type EdictDef } from './data/edicts';
import { aggregatedDemonPower, DEMON_POWERS } from './data/demonPowers';
import { aggregatedInteriorBonus, INTERIORS } from './data/interior';
import { getDemonChar } from './data/demonChars';
import { aggregatedDemonBonus, progressInLevel } from './data/demonLevel';
import { statMulForLevel } from './data/cardEnhance';
import { getHeroLore } from './data/heroLore';
import { getBossLore } from './data/bossLore';
import { getCardLore } from './data/cardLore';
import { MICRO_LINES, pickMicroLine } from './data/microLines';
import { getSeasonStory } from './data/seasonStories';
import { pickUnseenRecall } from './data/demonRecalls';
import {
  findPairLine, getHeroFirstKillLine,
  HERO_FAMILIAR_THRESHOLDS, getFamiliarLine,
} from './data/relationLines';
import { makeMuseumEntry } from './data/museum';
import { todaysSideQuests } from './data/dailySideQuests';
import { floorFromWave, towerHpMul, towerRewardMul, isGuardianFloor, nextMilestone, TOWER_MILESTONES } from './data/sealedTower';
import { getNgPlusMods, NG_PLUS_LINES } from './data/ngPlus';
import {
  type OverlayKind, type RawOverlayFlags,
  topOverlay, activeOverlays, shouldBlockSimulation, canResume, canOpen, requestOpen, derivePaused,
  OverlayQueue,
} from './systems/OverlayController';
import {
  calculateCardCost, pickCardCandidate, createCardChoices,
  applyCardLock, rerollCardChoices, chooseCardResult,
  computeCardPickEffects, shouldHaveRerollAvailable, shouldGrantEmergencyReveal,
  scoreCardChoices, calculateEvoNeed, resolveActivePool, STARTER_FALLBACK_POOL,
} from './systems/CardSystem';
import {
  calculateWaveSpawnInterval, calculateLiveHeroCap, isBossWave,
  shouldSpawnElite, calculateClearStars, pickHeroForSpawn, getMilestoneForWave,
} from './systems/WaveSystem';
import { computeSoulstoneReward } from './systems/EconomySystem';
import {
  calculateCastleMaxHp, calculateStartMp,
  calculateUltiChargeGain, computeUltiVariantPayload,
} from './systems/CastleSystem';
import { activeSynergyIdsFor, calculateUnitMul } from './systems/CombatSystem';
import { calculateHeroStats } from './systems/HeroStatsSystem';
import {
  calculateMonsterMax, calculateMonsterStats, computeMonsterDot,
} from './systems/MonsterStatsSystem';
import { applyDefense, isCriticalHit, calculateRevive } from './systems/DamageSystem';
import { getBossFinalBlowParams } from './systems/BossSystem';
import { type RunOptions, type GameMode, normalizeRunOptions } from './systems/StageSystem';
import { getStageById } from './data/stages';
import {
  pickDemonLine, DEMON_LINES_START, DEMON_LINES_FIRST_PICK, DEMON_LINES_EVOLVE,
  DEMON_LINES_SYNERGY, DEMON_LINES_BOSS_APPEAR, DEMON_LINES_BOSS_PHASE2,
  DEMON_LINES_BOSS_KILL, DEMON_LINES_DANGER, DEMON_LINES_DEATH,
  DEMON_LINES_NEW_STRATUM, type DemonLine,
} from './data/demonLines';

const W = 360, H = 640;
const FIELD = { x: 0, y: 78, w: W, h: H - 300 };
const GROUND_Y = FIELD.y + FIELD.h - 40;

interface UnitOpts {
  team: 'monster' | 'hero';
  typeId: string;
  name: string;
  star?: number;
  sprite: HTMLCanvasElement;
  hp: number;
  atk: number;
  range: number;
  spd: number;
  atkCd: number;
  tags: string[];
  isBoss?: boolean;
  scale?: number;
  mpReward?: number;
  aoe?: number;
  knockback?: number;
  revive?: number;
  mpGen?: number;
  auraBuff?: { atk: number; range: number };
  dot?: { dmg: number; dur: number };
  defense?: number;
  healAmt?: number;
  healRange?: number;
  x: number;
  y: number;
}

class Unit {
  team: 'monster' | 'hero';
  typeId: string;
  name: string;
  star: number;
  sprite: HTMLCanvasElement;
  scale: number;
  isBoss: boolean;
  x: number; y: number;
  hp: number; maxHp: number;
  atk: number; range: number; spd: number; atkCd: number;
  tags: string[];
  atkMul = 1; hpMul = 1; spdMul = 1;
  atkTimer = 0;
  dead = false;
  flash = 0;
  bobT = Math.random() * Math.PI * 2;
  walkT = 0;
  attackPhase: 0 | 1 | 2 | 3 = 0;
  attackPhaseT = 0;
  pendingTarget: Unit | null = null;
  spawnT = 0.3;
  deathT = 0;
  frozen = 0;
  revived = false;
  mpReward = 0;
  mpGen?: number; mpGenT = 1;
  aoe?: number;
  knockback?: number;
  revive?: number;
  auraBuff?: { atk: number; range: number };
  dot?: { dmg: number; dur: number };
  defense?: number;
  healAmt?: number; healRange?: number; healT = 1;
  dotEffects: { dmg: number; dur: number; tick: number; color: string }[] = [];
  _isMoving = false;
  // 보스 전용 스킬 타이머
  invulnT = 0;        // 무적 지속시간 (>0이면 데미지 무시)
  invulnCdT = 6;      // 무적 다음 발동까지 시간
  bossHealCdT = 5;    // 광역 회복 다음 발동까지 시간
  castleStrikeCdT = 7; // 마왕성 원거리 공격 다음 발동까지 시간
  bossPhase: 0 | 1 | 2 = 0;  // 0=normal, 1=enraged(50%), 2=desperate(25%)
  desperateT = 0;            // 페이즈 2 진입 후 5초 카운트다운 (UI 표시용)
  isElite = false;           // BAL-9: 엘리트 hero 마킹
  _healTelegraphed = false;  // BAL-6: 회복 사전 텔레그래프 1회 플래그
  _healerTelegraphed = false;  // BAL B-2: 적 healer 회복 텔레그래프 1회 플래그
  _castleStrikeTelegraphed = false;  // BAL B-5: priest castleStrike 텔레그래프 1회 플래그

  constructor(opts: UnitOpts) {
    this.team = opts.team;
    this.typeId = opts.typeId;
    this.name = opts.name;
    this.star = opts.star ?? 1;
    this.sprite = opts.sprite;
    this.scale = opts.scale ?? 1;
    this.isBoss = opts.isBoss ?? false;
    this.x = opts.x; this.y = opts.y;
    this.hp = opts.hp; this.maxHp = opts.hp;
    this.atk = opts.atk; this.range = opts.range;
    this.spd = opts.spd; this.atkCd = opts.atkCd;
    this.tags = opts.tags;
    this.mpReward = opts.mpReward ?? 0;
    this.mpGen = opts.mpGen;
    this.aoe = opts.aoe;
    this.knockback = opts.knockback;
    this.revive = opts.revive;
    this.auraBuff = opts.auraBuff;
    this.dot = opts.dot;
    this.defense = opts.defense;
    this.healAmt = opts.healAmt;
    this.healRange = opts.healRange;
  }

  effHp() { return this.maxHp * this.hpMul; }
  effAtk() { return this.atk * this.atkMul; }
  effSpd() { return this.spd * this.spdMul; }
}

interface Projectile {
  x: number; y: number;
  target: Unit | null;
  fixedTarget?: { x: number; y: number };
  atk: number;
  team: 'monster' | 'hero';
  spd: number;
  life: number;
  color: string;
  dot?: { dmg: number; dur: number };
  fire?: boolean;
  big?: boolean;
  dead?: boolean;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; age: number;
  color: string; size: number;
}

interface DamageText {
  x: number; y: number; vy: number;
  age: number; life: number;
  txt: string; color: string;
  big: boolean; crit: boolean;
  shakeT: number; rot: number;
}

/* ===== 운명의 카드 펼치기 (3장 카드 공개) ===== */
const REEL_CELL = 60;
const STRIP_LEN = 24;
interface ReelStrip {
  canvas: HTMLCanvasElement;
  items: string[];
  finalIdx: number;
}

/* ===== Effect 시스템 ===== */
type GameEffect =
  | { type: 'hitSpark'; x: number; y: number; age: number; life: number; color: string }
  | { type: 'summonCircle'; x: number; y: number; age: number; life: number; color: string; rarity: string }
  | { type: 'evolve'; x: number; y: number; age: number; life: number; sprite: HTMLCanvasElement | null }
  | { type: 'death'; x: number; y: number; age: number; life: number; ally: boolean }
  | { type: 'coinFlow'; fromX: number; fromY: number; toX: number; toY: number; age: number; life: number; color: string }
  | { type: 'aoeRing'; x: number; y: number; age: number; life: number; color: string; r: number };

type EngineEvent = 'gameover' | 'wave' | 'state';

export interface GameOverStats {
  /** 'stage' (스테이지 모드) | 'endless' (무한/심연) — 옛 호환 */
  mode?: 'stage' | 'endless';
  /** 게임 진입 모드 (discriminated union — 신규, type-safe) */
  gameMode?: import('./systems/StageSystem').GameMode;
  /** 스테이지 모드일 때 stageId */
  stageId?: string | null;
  /** 스테이지 클리어 여부 — true면 ResultScreen이 클리어 분기 사용 */
  cleared?: boolean;
  /** 이번 클리어가 해당 스테이지 첫 클리어였는지 — 보상/잠금 해제 표시용 */
  firstClear?: boolean;
  /** 클리어 별점 (1~3) — 스테이지 모드일 때만 의미 있음 */
  stars?: 1 | 2 | 3;
  /** 챌린지 첫 클리어 여부 (이번 런에서 처음 W15 도달) */
  challengeFirstClear?: boolean;
  /** 챌린지 클리어 시 적립된 영혼석 보너스 (full reward 또는 10% 재도전) */
  challengeReward?: number;
  /** 챌린지 ID — UI에서 def 조회용 (gameMode가 더 정확 — 이건 호환용) */
  challengeIdAtClear?: string;
  wave: number;
  killCount: number;
  comboBest: number;
  relics: string[];
  durationSec: number;
  soulstones: number;
  // OVERHAUL §3.3: 빌드 통계
  dominantBuildId?: string;
  dominantBuildProgress?: number;
  // ★ ResultScreen 작전 화면 — 사망 원인 추정 + MVP 카드용
  bossKills: number;                          // 이번 런 보스 처치 수
  diedDuringBoss: boolean;                    // 사망 시 보스전 여부
  diedToBossId: string | null;                // 사망 시 활성 보스 typeId
  topPickedTag: string | null;                // 가장 많이 픽한 태그
  topPickedMonsterId: string | null;          // 가장 많이 소환한 몬스터
  topPickedMonsterCount: number;              // 그 몬스터 픽 횟수
  healerEncountered: number;                  // 등장한 healer 수
  healerKills: number;                        // 처치한 healer 수
  emergencyRevealUsed: boolean;                 // 위급 무료 펼치기 사용 여부
  lowMpStreaks: number;                       // 마력 부족(<cardCost) 누적 시간 (초)
  lateGameMonsterCount: number;               // 사망 직전 살아있던 몬스터 수
  castleDamageLast10s: number;                // 사망 직전 10초 누적 받은 dmg
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rafId: number | null = null;
  private lastTime = 0;
  private listeners: Map<EngineEvent, Set<(p: any) => void>> = new Map();

  // 게임 상태
  private state: 'idle' | 'playing' | 'gameover' = 'idle';
  paused = false;
  speed: 1 | 2 | 3 = 1;
  autoReveal = false;
  wave = 1;
  waveTimer = 0;
  waveSpawned = 0;
  waveTotal = 0;
  waveCleared = false;
  waveBreak = 0;
  bossSpawned = false;
  bossActive = false;
  bossUnit: Unit | null = null;
  bossSpawnTime = 0;  // LD-13: 화살표 페이드용
  eliteSpawnedThisWave = false;  // BAL-9: 엘리트 hero 1웨이브당 1마리
  castleHp = 1000;
  castleMaxHp = 1000;
  displayHp = 1000;
  mp = 100;
  mpMax = 300;
  displayMp = 100;
  monsters: Unit[] = [];
  heroes: Unit[] = [];
  projectiles: Projectile[] = [];
  particles: Particle[] = [];
  damageTexts: DamageText[] = [];
  killCount = 0;
  combo = 0;
  comboT = 0;
  comboBest = 0;
  startTime = 0;
  shake = { amt: 0, t: 0 };
  // 카드 펼치기 결과
  cardChoices: string[] | null = null;
  evoCounts: Record<string, number> = {};
  // 카드 공개 시퀀스 상태 (3장)
  slot = {
    active: false, finished: false, tripleReveal: false,
    results: [null, null, null] as (string | null)[],
    reelStops: [0, 0, 0],
    reelScroll: [0, 0, 0],
    reelSpeeds: [0, 0, 0],
    reelStopped: [false, false, false],
    tickTimers: [0, 0, 0],
    strips: [null, null, null] as (ReelStrip | null)[],
    flashTimers: [0, 0, 0],
  };
  // 이펙트 시스템
  effects: GameEffect[] = [];
  slowMoT = 0;
  // HIT-STOP — 결정타 시점 짧은 시간 정지 (Hades/Brotato/뱀서 game-feel)
  hitStopT = 0;
  // 게임-필 이펙트 (Slay the Spire/Brotato 스타일)
  // - banner: 화면 중앙 큰 텍스트 (진화/시너지/웨이브클리어/보스등장/콤보/유물획득)
  // - screenFlash: 전체 화면 컬러 플래시 페이드
  // - edgeRing: 화면 외곽 컬러 링 (시너지 발동)
  banners: { text: string; sub: string; color: string; t: number; life: number }[] = [];
  screenFlash = { color: '', a: 0 };
  edgeRing = { color: '', a: 0 };
  // 필살기
  ulti = { gauge: 0, max: 100, ready: false };
  // 유물/시너지
  relics = new Set<string>();
  activeSynergies = new Set<string>();
  // 5차 — 유물 진화 (자동 발동된 fused 유물 id 보관 + 효과 캐시)
  fusedRelics = new Set<string>();
  private _fusedDefs: RelicFusionDef[] = [];
  // 유물 선택 (웨이브 클리어 시 3개 중 1개)
  pendingRelicChoices: string[] | null = null;
  pendingEvent: string | null = null;
  // 이벤트 효과 플래그
  bonusWaveActive = false;
  bonusWaveUsed = false;
  duelActive = false;
  // 유물 타이머 (빙결/지옥불)
  freezeTimer = 15;
  infernoTimer = 10;
  // 운명의 카드 — 현재 spin에 대해 리롤 가능한지
  rerollAvailable = false;
  // AUTO 카드 자동 선택 타이머 (0.6초 후 picks)
  private _autoPickT = 0.6;
  // 카드 펼치기 횟수 (첫 3회 할인용)
  cardRevealCount = 0;
  // BAL-7: 위급 상태 무료 펼치기 1회 (1런당)
  emergencyRevealUsed = false;
  // 다음 카드 펼치기에서 등장률 부스트 받을 태그 (마법 픽 → 다음 마법 카드 ↑)
  nextRevealBonusTag: string | null = null;
  // 카드 잠금 — 다음 카드 펼치기에 유지될 카드 인덱스 + ID
  lockedCardId: string | null = null;
  // 태그별 픽 카운트 (3회 이상 → 동적 가중치 ×1.5)
  tagPickCount: Record<string, number> = {};
  // 부활 광고 대기 — castleHp 0 시점, 1런당 1회만
  pendingRevival = false;
  revivalUsed = false;
  // 마력 풀 도달 신호 (이전 frame 마력 < cardCost AND 현재 >= cardCost일 때 1회 ping)
  private _prevMpUnderCost = true;
  private _lastMpPingAt = 0;  // L-1: ping 반복 방지 (최소 3초)
  /** 빌드 체감 — 직전 hero 처치한 attacker 태그 (마법 처치 보너스 등에서 사용) */
  private _lastKillerTags: string[] | undefined = undefined;
  /** 게임 진입 모드 (discriminated union) — 단일 진실원 */
  currentMode: GameMode = { kind: 'endless' };
  /** 스테이지/엔드리스 모드 라벨 — 옛 코드 호환용 ('challenge'은 'endless'로 매핑) */
  runMode: 'stage' | 'endless' = 'endless';
  /** 스테이지 모드일 때 stageId */
  runStageId: string | null = null;
  /** 스테이지 정의 (resolved) — 단계 3+에서 waveLimit/bossId 검증용 */
  runStageDef: import('./data/stages').StageDef | null = null;
  /** 모집된 monsterId 풀. null이면 기존 전체 풀 사용 (호환). */
  recruitedPool: string[] | null = null;
  /** P1-3 선택된 마왕 캐릭터 (start 시 셋팅) */
  _demonChar: ReturnType<typeof getDemonChar> | null = null;
  /** P1-4 카드 레벨 캐시 (start 시 store 스냅샷) */
  _cardLevels: Record<string, number> = {};
  /** W4 마이크로 내러티브 — 첫 만남 hero 캐시 (런 안) */
  _heroFirstSeen: Set<string> = new Set();
  /** W4 첫 영혼석 100 도달 마킹 */
  _firstWealthShown: boolean = false;
  /** W4 첫 시너지 발동 마킹 */
  _firstSynergyShown: boolean = false;
  /** W7 시즌 일화 멀티 (start 시 셋팅) */
  _seasonRewardMul: number = 1;
  _seasonHpMul: number = 1;
  _seasonAtkMul: number = 1;
  /** G1 카드 페어 라인 — 런 안 1회 (스팸 방지) */
  _pairLinesShown: Set<string> = new Set();
  /** 봉인의 탑 — endless 모드 시 마일스톤 banner 1회 보장 */
  _towerMilestonesShown: Set<number> = new Set();
  /** NG+ 멀티 캐시 (start 시 셋팅) */
  _ngPlusHpMul: number = 1;
  _ngPlusAtkMul: number = 1;
  _ngPlusRewardMul: number = 1;
  /** 사이드퀘 진행 — 첫 진행 시 스팸 banner 1회 */
  _sideQuestStartedShown: boolean = false;

  /** v11 사이드퀘 진행도 자동 갱신 — 오늘의 사이드퀘 중 goalKind 매칭 */
  _tickSideQuests(kind: string, amount: number): void {
    try {
      const todays = todaysSideQuests();
      const store = useSaveStore.getState();
      for (const q of todays) {
        if (q.goalKind !== kind) continue;
        const cur = store.sideQuestProgress[q.id];
        const isToday = cur && cur.date === new Date().toISOString().slice(0, 10);
        if (isToday && cur.claimed) continue;
        const before = isToday ? cur.progress : 0;
        const after = store.bumpSideQuest(q.id, amount);
        // 완료 직후 (이번 tick에서 임계 도달) banner 1회
        if (before < q.goalValue && after >= q.goalValue) {
          this.showBanner(`✦ 사이드 퀘 완료 ✦`, q.label, '#FDCB6E', 1.6);
        }
      }
    } catch (e) {}
  }
  /** 스테이지 모드에서 waveLimit 클리어 → gameOver 진입 시 true */
  stageCleared = false;
  /** 챌린지 클리어 라벨 정보 (W15 통과 시점에 캡처 — gameOver stats에 사용) */
  private _challengeClearedId: string | null = null;
  private _challengeFirstClearLabeled = false;
  /** 스테이지 modifier 합산값 (start 시점에 결정 — 매 frame 안 읽음) */
  stageMod = {
    heroHpMul: 1,
    heroAtkMul: 1,
    heroSpdMul: 1,
    mpRegenMul: 1,
    castleHpMul: 1,
    rewardMul: 1,
  };
  /** snapshot versioning — UI rerender 최적화. HUD/overlay 핵심 필드 변화 시에만 +1 */
  private _snapVersion = 0;
  private _lastSnapSig = '';
  private _hpDangerAlerted = false;  // S-1: HP 위험 1회 경고
  // 탭 액션 (Rally) — 필드 탭 시 가장 가까운 적 향해 가속 돌진. 쿨다운 2초
  rallyCdT = 0;
  rallyUsedCount = 0;  // 학습 후 인디케이터 페이드용
  rallyActiveT = 0;    // BUG-002: Rally 버프 잔존 시간 (recalcSynergies에 적용)
  rallyBonusKills = 0; // CL-1: Rally 활성 중 처치 카운트 (보너스 마력 부여)
  // 라인 시스템 — 0=front 1=middle 2=back. 카드 픽 후 결정
  pendingLine: 0 | 1 | 2 = 1;
  // 웨이브 사이 결정 단계 (P2-7)
  waveBreakActive = false;
  waveBreakUsed = { heal: false, mpRefill: false, freespin: false };
  private _waveBreakShown = false;  // 세션당 1회 안내
  // BUG-003: wave-break 종료 후 발동할 유물/이벤트 콜백
  private _pendingPostBreakOffer: (() => void) | null = null;
  private _synergyShown = false;     // 첫 시너지 안내 1회
  // TUT: 학습 모달 큐 (UI에서 polling)
  tutorialQueue: { id: string; title: string; body: string; icon?: string }[] = [];
  // 챌린지 모드
  challengeId: string | null = null;
  challengeBonusStones = 0;
  // 결투 보너스 영혼석
  queuedBonusStones = 0;
  // 메모리 안전: dispose 후 콜백 무시용
  private timers: number[] = [];
  private _disposed = false;
  // BUG-007: 백그라운드 진입 직전 paused 상태 기억 (visibility 복귀 시 복원용)
  private _pausedBeforeHidden: boolean | null = null;
  private _onVisibilityChange: (() => void) | null = null;

  // ★ OverlayController 단계 2: 큐 + 사용자 pause 추적
  overlayQueue = new OverlayQueue();

  // OVERHAUL §3.1 던전 층 추적
  private _currentStratum: StratumDef | null = null;
  // OVERHAUL §3.3 빌드 통계 (한 런 누적)
  buildStats: BuildStats = emptyBuildStats();
  // 5차 — 빌드 체감 보너스 (buildStats 기반 derived. 카드픽/보스킬/필살기 후 갱신)
  private _buildBonus: BuildBonusState = emptyBuildBonusState();
  // beast_wrath T1 — kill chain 마력 ×1.5 윈도우 (처치 후 1.5초)
  private _killChainT = 0;
  // tyrant_strike T2 — 필살기 후 atk ×1.4 윈도우 (6초)
  private _ultiBuffT = 0;
  // dark_mystic T2 — dark 처치 후 atk ×1.5 윈도우 (0.8초)
  private _darkProcT = 0;
  // undead_lord T2 — 보스 처치 한 번에 1회만 풀 부활 발동
  private _undeadFullReviveUsedThisCycle = false;
  // 활성 빌드 라벨 표시 — 새로 활성화된 빌드는 banner로 알림
  private _shownBuildBonuses = new Set<string>();
  // 5차 — 단골 적: 런 단위 임계 표시 캐시 (typeId:threshold)
  private _familiarShown = new Set<string>();
  // 5차 — 시즌 한정 보스 (daily 모드 spawnWave 도달 시 활성)
  private _activeSeasonalBoss: SeasonalBoss | null = null;
  // 5차 — daily 모드 플래그 (외부 GameScreen에서 set)
  isDailyMode = false;
  // 5차 — 숨겨진 시너지 활성 set (typeId 조합 기반)
  activeHiddenSynergyIds = new Set<string>();
  private _activeHiddenDefs: HiddenSynergyDef[] = [];
  // 5차 — 숨겨진 시너지 처치 마력 보너스 (sum)
  private _hiddenKillMpBonus = 0;
  // 5차 — 숨겨진 시너지 mp regen (sum, per second)
  private _hiddenMpRegenAdd = 0;
  // 5차 — 마왕 비밀 능력 누적 효과 (start 시 적용)
  private _secretsAggregate = aggregateDemonSecrets([]);
  // 5차 — secret 트래커: 한 런에 부활 횟수 / 트리플 발생 횟수
  private _runReviveCount = 0;
  private _runTripleCount = 0;
  // OVERHAUL §3.4 마왕 현재 표정
  demonMood: 'calm' | 'angry' | 'urgent' | 'triumph' = 'calm';
  // 가장 최근 마왕 대사 (HUD 표시용 + 4초 fade)
  demonLine: { text: string; t: number; life: number } | null = null;
  // OVERHAUL §3.2: 활성 분기 카드 (5wave 동안 효과 유지)
  activeBranch: { def: BranchCardDef; expireWave: number } | null = null;
  // OVERHAUL §3.2: 5wave마다 분기 카드 모달 대기
  pendingBranchChoices: BranchCardDef[] | null = null;
  // OVERHAUL §3.2: 현재 카드 슬롯 중 리스크 카드 인덱스 + 정의
  riskCardSlot: { idx: number; def: RiskCardDef } | null = null;
  // OVERHAUL §3.6: 오늘의 칙령
  todayEdictDef: EdictDef = todayEdict();
  // OVERHAUL §3.4: 마왕 강화 효과 합산 (start에서 갱신)
  demonPower = aggregatedDemonPower(0);
  // emergency 사용 카운트 (마왕 강화로 +1 가능)
  emergencyRevealUsedCount = 0;
  // ★ 작전 화면 추적용 — 픽 카운트 / healer / 마력 부족 / 받은 데미지 ring buffer
  pickedMonsterCount: Record<string, number> = {};
  healerEncountered = 0;
  healerKills = 0;
  lowMpStreakSec = 0;
  /** 받은 castle 데미지 시간 ring (timestamp ms, dmg) */
  recentCastleDamage: { t: number; d: number }[] = [];
  // 타일 패턴 캐시
  private _stonePattern: CanvasPattern | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    ctx.imageSmoothingEnabled = false;
  }

  on(ev: EngineEvent, cb: (p: any) => void) {
    if (!this.listeners.has(ev)) this.listeners.set(ev, new Set());
    this.listeners.get(ev)!.add(cb);
    return () => this.listeners.get(ev)?.delete(cb);
  }
  private emit(ev: EngineEvent, p?: any) {
    this.listeners.get(ev)?.forEach((cb) => cb(p));
  }

  /**
   * 게임 시작.
   * 호환:
   *   - start()                            → 기존 무한 모드
   *   - start(null)                        → 기존 무한 모드
   *   - start('challenge_id')              → 챌린지 (string으로 호출)
   *   - start({ mode, stageId, ... })      → 신규 RunOptions (스테이지/엔드리스)
   */
  start(opts?: RunOptions | string | null) {
    if (this.state === 'playing') return;
    const run = normalizeRunOptions(opts);
    // GameMode 단일 진실원 → 평면 필드로 분해
    this.currentMode = run.mode;
    if (run.mode.kind === 'stage') {
      this.runMode = 'stage';
      this.runStageId = run.mode.stageId;
      this.runStageDef = getStageById(run.mode.stageId) ?? null;
      this.challengeId = null;
    } else if (run.mode.kind === 'challenge') {
      this.runMode = 'endless';  // 챌린지는 무한 모드 안에 격리
      this.runStageId = null;
      this.runStageDef = null;
      this.challengeId = run.mode.challengeId;
    } else {
      this.runMode = 'endless';
      this.runStageId = null;
      this.runStageDef = null;
      this.challengeId = null;
    }
    // recruitedPool 정규화 — MONSTERS 알려진 ID만 통과 + 빈 배열이면 starter fallback 강제
    if (run.recruitedPool && run.recruitedPool.length > 0) {
      const filtered = run.recruitedPool.filter((id) => !!MONSTERS[id]);
      this.recruitedPool = filtered.length > 0 ? filtered : STARTER_FALLBACK_POOL.slice();
    } else {
      this.recruitedPool = null;
    }
    const challengeId = this.challengeId;
    const challenge: ChallengeDef | undefined = challengeId ? CHALLENGES[challengeId] : undefined;
    // 챌린지: 영구강화 비활성 옵션
    const skillsRaw = useSaveStore.getState().skills;
    const skills = challenge?.modifiers.noSkills
      ? { castleHp: 0, startMp: 0, cardCost: 0, monAtk: 0, monHp: 0, startMon: 0, ultiDmg: 0, ultiCharge: 0, aura: 0 }
      : skillsRaw;
    // OVERHAUL §3.4: 마왕 강화 power 합산 (누적 보스 처치 기반)
    const dp = aggregatedDemonPower(useSaveStore.getState().totalBossKills);
    this.demonPower = dp;
    this.emergencyRevealUsedCount = 0;
    // OVERHAUL §4.5: 인테리어 보너스 합산
    const interior = aggregatedInteriorBonus(useSaveStore.getState().equippedInteriors);
    // P0-1: 마왕 레벨 보너스
    const lvBonus = aggregatedDemonBonus(progressInLevel(useSaveStore.getState().demonExp).level);
    // P1-3: 선택된 마왕 캐릭 패시브
    const dch = getDemonChar(useSaveStore.getState().selectedDemonId);
    this._demonChar = dch;
    // P1-4: 카드 레벨 스냅샷 (런 중 변경 X)
    this._cardLevels = { ...useSaveStore.getState().cardLevels };
    // W4 hooks 리셋
    this._heroFirstSeen = new Set();
    this._firstWealthShown = false;
    this._firstSynergyShown = false;
    // G1 카드 페어 리셋
    this._pairLinesShown = new Set();
    this._towerMilestonesShown = new Set();
    this._sideQuestStartedShown = false;
    // NG+ 멀티 적용
    try {
      const cycle = useSaveStore.getState().ngPlusCycle;
      if (cycle > 0) {
        const mods = getNgPlusMods(cycle);
        this._ngPlusHpMul = mods.enemyHpMul;
        this._ngPlusAtkMul = mods.enemyAtkMul;
        this._ngPlusRewardMul = mods.rewardMul;
        // NG+ 톤 한 줄
        const lines = NG_PLUS_LINES[mods.toneOverride];
        if (lines && lines.length > 0) {
          this.safeTimeout(() => {
            this.speakDemon({ text: lines[Math.floor(Math.random() * lines.length)], mood: 'calm' });
          }, 1200);
        }
      } else {
        this._ngPlusHpMul = 1; this._ngPlusAtkMul = 1; this._ngPlusRewardMul = 1;
      }
    } catch (e) {
      this._ngPlusHpMul = 1; this._ngPlusAtkMul = 1; this._ngPlusRewardMul = 1;
    }
    // W7 시즌 일화 멀티 (storyMod * 적용)
    try {
      const seasonId = useSaveStore.getState().seasonPass.seasonId;
      const story = getSeasonStory(seasonId);
      this._seasonRewardMul = story.rewardMul ?? 1;
      this._seasonHpMul = story.enemyMod?.hpMul ?? 1;
      this._seasonAtkMul = story.enemyMod?.atkMul ?? 1;
    } catch (e) {
      this._seasonRewardMul = 1; this._seasonHpMul = 1; this._seasonAtkMul = 1;
    }
    const charStartMp = dch.passive.startMpBonus ?? 0;
    const charCastleHpFlat = dch.passive.castleHpBonus ?? 0;
    // CastleSystem: 최대 HP 산출 (칙령 mul은 아래 edict 블록에서 1번만 계산)
    this.castleMaxHp = calculateCastleMaxHp({
      base: 1000 + lvBonus.castleHpBonus + charCastleHpFlat,
      hpSkillLevel: skills.castleHp,
      demonPowerRatio: dp.castleHpRatio + this._secretsAggregate.castleHpRatioAdd,
      interiorRatio: interior.castleHpRatio,
    });
    this.castleHp = this.castleMaxHp;
    this.displayHp = this.castleHp;
    this.mpMax = 300;
    // CastleSystem: 시작 마력 (베이스 200 = 2회 펼치기 즉시 가능)
    this.mp = calculateStartMp({
      base: 200 + lvBonus.startMpBonus + charStartMp + this._secretsAggregate.startMpBonus,
      mpMax: this.mpMax,
      startMpSkillLevel: skills.startMp,
      demonPowerBonus: dp.startMpBonus,
      interiorBonus: interior.startMpBonus,
    });
    this.displayMp = this.mp;
    this.wave = 1;
    this.monsters = []; this.heroes = []; this.projectiles = [];
    this.particles = []; this.damageTexts = [];
    this.killCount = 0; this.combo = 0; this.comboT = 0; this.comboBest = 0;
    this.cardChoices = null; this.evoCounts = {};
    this.effects = []; this.slowMoT = 0;
    this.hitStopT = 0;
    this.banners = [];
    this.screenFlash = { color: '', a: 0 };
    this.edgeRing = { color: '', a: 0 };
    this.slot = {
      active: false, finished: false, tripleReveal: false,
      results: [null, null, null], reelStops: [0, 0, 0],
      reelScroll: [0, 0, 0], reelSpeeds: [0, 0, 0],
      reelStopped: [false, false, false], tickTimers: [0, 0, 0],
      strips: [null, null, null], flashTimers: [0, 0, 0],
    };
    this.ulti = { gauge: 0, max: 100, ready: false };
    this.relics = new Set();
    this.fusedRelics = new Set();
    this._fusedDefs = [];
    this.activeSynergies = new Set();
    this.pendingRelicChoices = null;
    this.pendingEvent = null;
    this.bonusWaveActive = false;
    this.bonusWaveUsed = false;
    this.duelActive = false;
    this.freezeTimer = 15;
    this.infernoTimer = 10;
    this.rerollAvailable = false;
    this.ultiVariant = 0;
    this.cardRevealCount = 0;
    this.pendingRevival = false;
    this.revivalUsed = false;
    this.rallyCdT = 0;
    this.rallyUsedCount = 0;
    this.rallyActiveT = 0;
    this.rallyBonusKills = 0;
    this.emergencyRevealUsed = false;
    this.lockedCardId = null;
    this.tagPickCount = {};
    this.nextRevealBonusTag = null;
    this.waveBreakActive = false;
    this._pendingPostBreakOffer = null;
    this.queuedBonusStones = 0;
    // ★ OverlayController: 큐/유저 pause 리셋
    this.overlayQueue.clear();
    this.overlayQueue.userPauseActive = false;
    // OVERHAUL: 빌드 통계 + 마왕 상태 리셋
    this.buildStats = emptyBuildStats();
    this._buildBonus = emptyBuildBonusState();
    this._killChainT = 0;
    this._ultiBuffT = 0;
    this._darkProcT = 0;
    this._undeadFullReviveUsedThisCycle = false;
    this._shownBuildBonuses.clear();
    this._familiarShown.clear();
    this.activeHiddenSynergyIds = new Set();
    this._activeHiddenDefs = [];
    this._hiddenKillMpBonus = 0;
    this._hiddenMpRegenAdd = 0;
    this._activeSeasonalBoss = null;
    this._runReviveCount = 0;
    this._runTripleCount = 0;
    this._secretsAggregate = aggregateDemonSecrets(useSaveStore.getState().unlockedSecrets);
    this.demonMood = 'calm';
    this.demonLine = null;
    // ★ 작전 화면 추적 리셋
    this.pickedMonsterCount = {};
    this.healerEncountered = 0;
    this.healerKills = 0;
    this.lowMpStreakSec = 0;
    this.recentCastleDamage = [];
    this._lastKillerTags = undefined;
    this.stageCleared = false;
    this._challengeClearedId = null;
    this._challengeFirstClearLabeled = false;
    // 스테이지 modifier 적용 (스테이지 모드 전용 — endless는 항상 1)
    {
      const m = (this.runMode === 'stage' && this.runStageDef?.stageModifier) || {};
      this.stageMod = {
        heroHpMul: m.heroHpMul ?? 1,
        heroAtkMul: m.heroAtkMul ?? 1,
        heroSpdMul: m.heroSpdMul ?? 1,
        mpRegenMul: m.mpRegenMul ?? 1,
        castleHpMul: m.castleHpMul ?? 1,
        rewardMul: m.rewardMul ?? 1,
      };
    }
    // castleHpMul: 마왕성 시작 HP 곱셈 (시작 직후 한 번만)
    if (this.stageMod.castleHpMul !== 1) {
      this.castleMaxHp = Math.floor(this.castleMaxHp * this.stageMod.castleHpMul);
      this.castleHp = this.castleMaxHp;
      this.displayHp = this.castleHp;
    }
    // 스테이지 모드: stageDef.stratumId가 있으면 그 stratum으로 시작
    const stageStratum = (this.runMode === 'stage' && this.runStageDef?.stratumId)
      ? STRATA.find((s) => s.id === this.runStageDef!.stratumId)
      : null;
    this._currentStratum = stageStratum ?? stratumForWave(1);
    this.activeBranch = null;
    this.pendingBranchChoices = null;
    // OVERHAUL §3.6: 오늘의 칙령 적용
    this.todayEdictDef = todayEdict();
    const edict = this.todayEdictDef.modifiers;
    if (edict.castleHpMul !== undefined) {
      this.castleMaxHp = Math.floor(this.castleMaxHp * edict.castleHpMul);
      this.castleHp = this.castleMaxHp;
      this.displayHp = this.castleHp;
    }
    if (edict.autoTomb) {
      this.relics.add('tomb');
      this.buildStats.relics.push('tomb');
    }
    this._disposed = false;
    this.timers = [];
    this.startTime = performance.now();
    this.state = 'playing';
    this.startWave();
    // ECON E-5: startMon 스킬 — 시작 시 슬라임 N체 무료 소환
    if (skills.startMon > 0) {
      for (let i = 0; i < skills.startMon; i++) {
        this.spawnMonster('slime');
      }
    }
    // OVERHAUL §4.3: 첫 BGM은 1층 트랙
    Audio.bgmCrossfade('stratum_sealed_gate', 500);
    // QO2-D: 챌린지 진입 시 modifier 안내 banner (1회)
    if (challengeId && CHALLENGES[challengeId]) {
      const ch = CHALLENGES[challengeId];
      this.safeTimeout(() => {
        this.showBanner(`🏆 ${ch.name}`, ch.desc, '#FDCB6E', 2.5);
      }, 600);
    }
    // OVERHAUL §3.4: 첫 진입 마왕 대사 (1.2초 후, 1회)
    this.safeTimeout(() => {
      this.speakDemon(pickDemonLine(DEMON_LINES_START));
      // A4 마왕 회상 — 1런마다 1개 (40% 확률)
      try {
        if (Math.random() < 0.4) {
          const seen = useSaveStore.getState().recallSeen;
          const recall = pickUnseenRecall(seen);
          if (recall) {
            this.safeTimeout(() => {
              this.showBanner(recall.flashLine, '— 회상 —', '#a55eea', 2.4);
              useSaveStore.getState().addRecall(recall.id);
            }, 2200);
          }
        }
      } catch (e) {}
    }, 1200);
    // OVERHAUL §3.6: 오늘의 칙령 안내 banner (2.4초 후)
    this.safeTimeout(() => {
      const e = this.todayEdictDef;
      this.showBanner(`${e.icon} 오늘의 칙령 — ${e.name}`, e.desc, '#a55eea', 2.6);
      this.flashEdge('#a55eea', 0.45);
    }, 2400);
    this.lastTime = performance.now();
    // BUG-007: 백그라운드 ↔ 포그라운드 전환 시 paused 자동 처리
    this._onVisibilityChange = () => {
      if (this._disposed) return;
      if (document.visibilityState === 'hidden') {
        if (this._pausedBeforeHidden === null) this._pausedBeforeHidden = this.paused;
        this.paused = true;
      } else if (document.visibilityState === 'visible') {
        // dt 점프 방지 — lastTime 재설정 + 자동 일시정지였으면 복원
        this.lastTime = performance.now();
        if (this._pausedBeforeHidden === false) {
          this.paused = false;
        }
        this._pausedBeforeHidden = null;
      }
    };
    document.addEventListener('visibilitychange', this._onVisibilityChange);
    this.loop();
  }

  dispose() {
    this._disposed = true;
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    // 모든 setTimeout cleanup
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    if (this._onVisibilityChange) {
      document.removeEventListener('visibilitychange', this._onVisibilityChange);
      this._onVisibilityChange = null;
    }
    Audio.bgmStop();
    this.state = 'idle';
  }

  // 안전한 setTimeout (dispose 후 자동 무시)
  private safeTimeout(fn: () => void, ms: number): number {
    const t = window.setTimeout(() => {
      if (this._disposed) return;
      fn();
    }, ms);
    this.timers.push(t);
    return t;
  }

  private loop = () => {
    if (this.state !== 'playing') return;
    const now = performance.now();
    const rawDt = Math.min(0.05, (now - this.lastTime) / 1000 || 0);
    this.lastTime = now;
    // 단계 4: paused를 OverlayController에서 derive
    // raw flag (cardChoices/pendingRevival/...)로부터 매 frame 결정.
    // 단, runs <= 5의 cardChoice paused는 GameEngine.finalizeSlot 결정에 따라 기존대로
    //  - 신규 5런 한정 paused, AUTO 모드는 paused X — 이 정책은 deriveOverlay에서 표현이 어려워
    //    cardChoice의 BLOCKS_SIM은 controller에선 true이지만 여기서 runs/autoReveal으로 override.
    const flagsForDerive = this.getOverlayFlags();
    const derived = derivePaused(flagsForDerive);
    if (this.cardChoices || this.slot.active) {
      // cardChoice 인 경우 — runs > 5 이거나 AUTO 면 sim block 안 함.
      // slot.active는 카드 공개 애니메이션 단계라 멈추면 finalizeSlot까지 진행되지 않는다.
      const runs = useSaveStore.getState().runs;
      const cardBlocks = !!this.cardChoices && runs <= 5 && !this.autoReveal;
      // 다른 BLOCKS_SIM overlay가 있으면 그게 우선 → derived 그대로
      const otherBlocks = activeOverlays(flagsForDerive)
        .some((o) => o !== 'cardChoice' && o !== 'riskChoice'
                     && o !== 'none' && shouldBlockSimulation({
                       ...flagsForDerive,
                       cardChoices: null, slotActive: false,
                     }));
      if (!otherBlocks) {
        this.paused = cardBlocks;
      } else {
        this.paused = derived;
      }
    } else {
      this.paused = derived;
    }
    const dt = this.paused ? 0 : rawDt * this.speed;

    // 카드 공개 애니메이션은 UI 진행이므로 simulation pause와 무관하게 흘러야 한다.
    // 초보자 카드 선택 정지, wave-break, 튜토리얼 pause 중에도 여기서 멈추면
    // "봉인 깨는 중..." 상태가 영구 지속된다.
    this.updateSlot(rawDt);

    if (!this.paused) {
      // HIT-STOP 우선 (짧은 시간 정지, slowmo와 별개)
      // ACC A-3: reduceMotion ON 시 hitStop/slowMo 효과 50% 감소 — 광민성/어지럼증 완화
      const reduceMotion = useSaveStore.getState().accessibility.reduceMotion;
      let effDt = dt;
      if (this.hitStopT > 0) {
        this.hitStopT -= rawDt * (reduceMotion ? 2 : 1);  // 빠르게 소진
        effDt = reduceMotion ? dt * 0.5 : 0;  // reduceMotion 시 완전 정지 대신 절반 속도
      } else if (this.slowMoT > 0) {
        this.slowMoT -= dt * (reduceMotion ? 2 : 1);
        effDt = dt * (reduceMotion ? 0.7 : 0.4);
      }
      // 안정성: dt가 너무 크면 sub-step (speed 3 시 dt=0.15까지 가능)
      const subSteps = Math.ceil(effDt / 0.05);
      const stepDt = effDt / Math.max(1, subSteps);
      for (let s = 0; s < subSteps; s++) {
        this.updateWave(stepDt);
        this.monsters.forEach((u) => this.updateUnit(u, stepDt));
        this.heroes.forEach((u) => this.updateUnit(u, stepDt));
        this.updateProjectiles(stepDt);
      }
      this.updateParticles(effDt);
      // 이펙트 업데이트
      for (const e of this.effects) e.age += rawDt;
      this.effects = this.effects.filter((e) => e.age < e.life);
      this.monsters = this.monsters.filter((m) => !m.dead || m.deathT < 0.3);
      this.heroes = this.heroes.filter((h) => !h.dead || h.deathT < 0.3);
      if (this.shake.t > 0) {
        this.shake.t -= dt;
        this.shake.amt *= 0.85;
        if (this.shake.t <= 0) this.shake.amt = 0;
      }
      // Rally cooldown + 버프 만료 추적
      if (this.rallyCdT > 0) this.rallyCdT = Math.max(0, this.rallyCdT - rawDt);
      if (this.rallyActiveT > 0) {
        const prev = this.rallyActiveT;
        this.rallyActiveT = Math.max(0, this.rallyActiveT - rawDt);
        if (prev > 0 && this.rallyActiveT === 0) this.recalcSynergies();
      }
      // 5차 — 빌드 보너스 윈도우 타이머
      if (this._killChainT > 0) this._killChainT = Math.max(0, this._killChainT - rawDt);
      if (this._ultiBuffT > 0) {
        const prev = this._ultiBuffT;
        this._ultiBuffT = Math.max(0, this._ultiBuffT - rawDt);
        if (prev > 0 && this._ultiBuffT === 0) this.recalcSynergies();
      }
      if (this._darkProcT > 0) {
        const prev = this._darkProcT;
        this._darkProcT = Math.max(0, this._darkProcT - rawDt);
        if (prev > 0 && this._darkProcT === 0) this.recalcSynergies();
      }
      // FX 타이머 — rawDt(슬로모 무관) 기준으로 페이드
      if (this.screenFlash.a > 0) {
        this.screenFlash.a = Math.max(0, this.screenFlash.a - rawDt * 1.6);
      }
      if (this.edgeRing.a > 0) {
        this.edgeRing.a = Math.max(0, this.edgeRing.a - rawDt * 1.4);
      }
      for (const b of this.banners) b.t += rawDt;
      this.banners = this.banners.filter((b) => b.t < b.life);
      // OVERHAUL §3.4: 마왕 대사 fade
      if (this.demonLine) {
        this.demonLine.t += rawDt;
        if (this.demonLine.t >= this.demonLine.life) this.demonLine = null;
      }
      const surge = this.relics.has('surge') ? 3 : 1;
      const ch = this.challengeId ? CHALLENGES[this.challengeId] : undefined;
      const mpRegenMul = ch?.modifiers.mpRegenMul ?? 1;
      // 마력 자연회복 — 100억 권위자 비판 #2: 코어 루프 대기 시간 16% 단축
      // 기존 2.5/sec (40초/100MP) → 3.5/sec (28초/100MP)
      // 스테이지 modifier mpRegenMul 합산
      this.addMP(dt * 3.5 * surge * mpRegenMul * this.stageMod.mpRegenMul);
      // 5차 — 진화 유물 prophecy/necropolis/karma: 추가 마력 회복 (per second)
      const fusedMpAdd = this.fusedEffectAdd('mpRegenAdd');
      if (fusedMpAdd > 0) this.addMP(dt * fusedMpAdd);
      // 5차 — 마왕 비밀 능력 mp regen (영구)
      if (this._secretsAggregate.mpRegenAdd > 0) {
        this.addMP(dt * this._secretsAggregate.mpRegenAdd);
      }
      // 5차 — 숨겨진 시너지 mp regen
      if (this._hiddenMpRegenAdd > 0) this.addMP(dt * this._hiddenMpRegenAdd);
      // 마력 풀 도달 신호 (자연 충전으로 cardCost 도달 순간 1회만 ping)
      const cost = this.currentCardCost();
      const hasEnough = this.mp >= cost;
      const now = performance.now();
      if (hasEnough && this._prevMpUnderCost && !this.cardChoices && !this.slot.active
          && now - this._lastMpPingAt > 3000) {
        Audio.ui_tap();
        Ait.haptic('light');
        this.flashEdge('#FDCB6E', 0.35);
        this._lastMpPingAt = now;
      }
      this._prevMpUnderCost = !hasEnough;
      // ★ 작전 화면: 마력 부족 누적 시간 + recentCastleDamage 정리
      if (!hasEnough) this.lowMpStreakSec += rawDt;
      const cutT = now - 10000;
      if (this.recentCastleDamage.length > 0 && this.recentCastleDamage[0].t < cutT) {
        this.recentCastleDamage = this.recentCastleDamage.filter((e) => e.t >= cutT);
      }
      // S-1: HP 위험(20% 미만) 첫 진입 1회 경고음
      const hpRatio = this.castleHp / this.castleMaxHp;
      if (hpRatio < 0.2 && !this._hpDangerAlerted && this.state === 'playing') {
        this._hpDangerAlerted = true;
        Audio.boss_alert();
        Ait.haptic('heavy');
        this.showBanner('⚠ 마왕성 위급!', 'HP 20% 미만', '#FF6B6B', 1.2);
        // OVERHAUL §3.4: 마왕 위급 대사
        this.speakDemon(pickDemonLine(DEMON_LINES_DANGER));
        // TUT-C: 첫 HP 위험 도달 시 대응 학습 (한 번만)
        const userRuns = useSaveStore.getState().runs;
        if (userRuns >= 3) {
          this.queueTutorial(
            'tut_hp_danger',
            '⚠ 마왕성 위급',
            'HP 20% 미만 — 화면 가장자리 빨간 비네트.\n\n💡 ⚡ 돌격으로 시간 벌기\n💡 필살기 충전됐다면 즉시 사용\n\nHP 0이 되면 광고 보고 부활할 수 있어요.',
            '⚠',
          );
        }
      } else if (hpRatio > 0.4 && this._hpDangerAlerted) {
        this._hpDangerAlerted = false;  // HP 회복 시 reset
      }
      // 빙결의 결정 유물 (15초마다 적 1.5초 동결)
      if (this.relics.has('freeze')) {
        this.freezeTimer -= dt;
        if (this.freezeTimer <= 0) {
          this.freezeTimer = 15;
          for (const h of this.heroes) {
            if (!h.dead) h.frozen = 1.5;
          }
          this.shakeFx(6);
          Audio.relic_sfx();
        }
      }
      // 지옥불 유물 (10초마다 전체 적 화염 데미지 + DOT)
      if (this.relics.has('inferno')) {
        this.infernoTimer -= dt;
        if (this.infernoTimer <= 0) {
          this.infernoTimer = 10;
          for (const h of this.heroes) {
            if (h.dead) continue;
            this.takeDamage(h, 60);
            h.dotEffects.push({ dmg: 12, dur: 2, tick: 0.5, color: '#ff6b35' });
          }
          this.shakeFx(8);
          Audio.ultimate_sfx();
        }
      }
      if (this.comboT > 0) {
        this.comboT -= dt;
        if (this.comboT <= 0) this.combo = 0;
      }
      // AUTO 모드 — 카드 펼치기 + 자동 선택 (decision fatigue 제거)
      if (this.autoReveal && !this.slot.active && !this.pendingRelicChoices && !this.pendingEvent) {
        if (this.cardChoices) {
          // 카드 등장 → 0.6초 후 자동 선택 (사용자가 확인할 시간)
          this._autoPickT -= dt;
          if (this._autoPickT <= 0) {
            this.autoPickCard();
            this._autoPickT = 0.6;
          }
        } else {
          this._autoPickT = 0.6;  // 다음 카드 펼치기 후 사용할 타이머 리셋
          if (this.mp >= this.currentCardCost()) this.beginSpin();
        }
      }
    }

    // QO Q-2: 미션 완료 알림 큐 소비
    const completed = popMissionCompleted();
    if (completed) {
      // QO2-B: 수령 경로 명시 (타이틀 → 일일 미션)
      this.showBanner(`🎯 ${completed.name} 완료!`, `타이틀 → 일일 미션에서 +${completed.reward} 영혼석 수령`, '#FDCB6E', 2.0);
      Audio.evolve_sfx();
      Ait.haptic('medium');
    }

    this.draw();
    this.rafId = requestAnimationFrame(this.loop);
  };

  /* ===== Wave ===== */
  private startWave() {
    this.waveSpawned = 0;
    this.eliteSpawnedThisWave = false;
    this.waveTotal = Math.floor(3 + this.wave * 1.5);
    this.waveCleared = false;
    this.waveTimer = 1.0;
    this.bossSpawned = false;
    this.bossActive = false;
    // tide: 웨이브 시작 시 마력 +50
    if (this.relics.has('tide')) this.addMP(50);
    // nightfall: 웨이브 시작 3초간 모든 적 동결 (현재 적 + 첫 3초 내 spawn 적용은 복잡 → 현존 적만)
    // 5차 — 진화 유물 eternal_winter: +2초 추가
    const fusedFreezeAdd = this.fusedEffectAdd('waveStartFreezeAdd');
    if (this.relics.has('nightfall') || fusedFreezeAdd > 0) {
      const dur = (this.relics.has('nightfall') ? 3 : 0) + fusedFreezeAdd;
      if (dur > 0) {
        for (const h of this.heroes) {
          if (h.dead) continue;
          h.frozen = Math.max(h.frozen, dur);
        }
      }
    }
    const isBoss = isBossWave(this.wave);
    if (!isBoss) Audio.wave_start();
    this.emit('wave', { wave: this.wave, isBoss });

    // OVERHAUL §3.1: 던전 층 진입 처리
    const newStratum = stratumForWave(this.wave);
    if (isStratumEnterWave(this.wave) || !this._currentStratum || this._currentStratum.id !== newStratum.id) {
      const isFirstStratum = !this._currentStratum;
      this._currentStratum = newStratum;
      // 첫 wave(W1)는 start()의 첫 대사가 우선 — banner는 W6+부터
      if (this.wave > 1) {
        this.showBanner(
          `🏛 ${newStratum.name}`,
          `${newStratum.subtitle}${newStratum.modifierLabel ? ' / ' + newStratum.modifierLabel : ''}`,
          '#FDCB6E',
          2.4,
        );
        this.flashEdge('#FDCB6E', 0.5);
        // 마왕 대사
        this.safeTimeout(() => {
          if (newStratum.enterDialog) {
            this.speakDemon({ text: newStratum.enterDialog, mood: 'calm' });
          } else {
            this.speakDemon(pickDemonLine(DEMON_LINES_NEW_STRATUM));
          }
        }, 800);
      }
      // OVERHAUL §4.3: 층별 BGM 전환 (첫 진입은 start()에서 battle, 그 외 층 변경 시 crossfade)
      if (!isFirstStratum) {
        const trackName = `stratum_${newStratum.id}`;
        Audio.bgmCrossfade(trackName, 800);
      }
    }
  }
  private updateWave(dt: number) {
    if (this.waveBreak > 0) {
      this.waveBreak -= dt;
      if (this.waveBreak <= 0) this.startWave();
      return;
    }
    if (this.waveSpawned < this.waveTotal) {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        // WaveSystem: 동시 hero 수 cap
        const liveHeroes = this.heroes.filter((h) => !h.dead && !h.isBoss).length;
        const liveCap = calculateLiveHeroCap(this.wave);
        if (liveHeroes < liveCap) {
          // WaveSystem: 풀 + 층 boost 반영해 hero 1체 결정
          // 스테이지 모드에서 heroPool이 정의되어 있으면 우선 사용 (단계 보정)
          const stagePool = (this.runMode === 'stage' && this.runStageDef && this.runStageDef.heroPool.length > 0)
            ? this.runStageDef.heroPool
            : null;
          const t = pickHeroForSpawn({
            basePool: stagePool ?? heroPoolForWave(this.wave),
            stratumBoost: stagePool ? undefined : this._currentStratum?.heroPoolBoost,
          });
          // WaveSystem: 엘리트 spawn 조건
          const eliteThisWave = shouldSpawnElite({
            wave: this.wave,
            alreadySpawnedThisWave: this.eliteSpawnedThisWave,
            waveSpawned: this.waveSpawned,
          });
          this.spawnHero(t, false, { elite: eliteThisWave });
          if (eliteThisWave) this.eliteSpawnedThisWave = true;
          this.waveSpawned++;
          this.waveTimer = calculateWaveSpawnInterval(this.wave);
        } else {
          // 캡 도달 — 반 박자 대기
          this.waveTimer = 0.3;
        }
      }
    } else if (!this.bossSpawned && isBossWave(this.wave)) {
      if (this.heroes.length === 0) {
        // 5차 — daily 모드 시즌 보스 등장 (cycleIndex 매핑 시즌 보스 spawnWave)
        let seasonalBoss: SeasonalBoss | null = null;
        if (this.isDailyMode) {
          const sb = getSeasonalBoss(currentCycleIndex());
          if (sb && this.wave === sb.spawnWave) seasonalBoss = sb;
        }
        if (seasonalBoss) {
          this._activeSeasonalBoss = seasonalBoss;
          this.spawnHero(seasonalBoss.baseBossId, true);
          // 보스 unit name 오버라이드 — 시즌 한정 이름
          if (this.bossUnit) {
            this.bossUnit.name = seasonalBoss.name;
            this.bossUnit.hp *= 1.5;
            this.bossUnit.maxHp *= 1.5;
            // V2 — 시즌 한정 sprite override (PNG 있으면 사용)
            if (seasonalBoss.spriteId) {
              const sbPng = getCachedSprite(seasonalBoss.spriteId, 2);
              if (sbPng) this.bossUnit.sprite = sbPng;
            }
          }
          this.showBanner(`✦ 시즌 보스 — ${seasonalBoss.name} ✦`, seasonalBoss.epithet, '#FF6B6B', 2.5);
          this.flashScreen('#FF6B6B', 0.7);
          this.shakeFx(20);
          this.safeTimeout(() => this.speakDemon({ text: seasonalBoss!.entranceLine, mood: 'urgent' }), 800);
        } else {
          // 스테이지 모드: 스테이지가 지정한 보스를 그 스테이지의 마지막 wave에 사용
          const stageBossOverride = (
            this.runMode === 'stage' && this.runStageDef &&
            this.runStageDef.bossId &&
            this.wave === this.runStageDef.waveLimit
          ) ? this.runStageDef.bossId : null;
          this.spawnHero(stageBossOverride ?? bossForWave(this.wave), true);
        }
        this.bossSpawned = true;
        this.shakeFx(12);
      }
    } else if (this.heroes.length === 0 && !this.waveCleared) {
      this.waveCleared = true;
      // 결투 이벤트 보상
      if (this.duelActive) {
        this.duelActive = false;
        this.queueBonusStones(150);
      }
      // 보너스 웨이브 사용 후 해제
      if (this.bonusWaveUsed) {
        this.bonusWaveActive = false;
        this.bonusWaveUsed = false;
      }
      if (this.bonusWaveActive) this.bonusWaveUsed = true;
      this.addMP(50);
      // E-1: 매 웨이브 클리어 시 영혼석 +5 보너스
      this.queueBonusStones(5);
      // WaveSystem: 클리어 별점
      const stars = calculateClearStars(this.castleHp / this.castleMaxHp);
      const starText = '★ '.repeat(stars).trim() + ' ☆ '.repeat(3 - stars).trim();
      this.showBanner(`WAVE ${this.wave} CLEAR`, starText, '#26de81', 1.4);
      this.flashScreen('#26de81', 0.4);
      this.shakeFx(8);
      Audio.evolve_sfx();
      // WaveSystem: 마일스톤 (W10/W15/W20/W25/W50/W100)
      const milestone = getMilestoneForWave(this.wave);
      if (milestone) {
        const m = milestone;
        this.showBanner(m.title, m.sub, '#FDCB6E', 3.5);
        this.flashScreen('#FDCB6E', 0.85);
        this.shakeFx(24);
        this.hitStopT = 0.25;
        this.queueBonusStones(m.bonus);
        Audio.luckySummon_sfx();
        Ait.haptic('heavy');
        if (m.achievementId) unlockAchievement(m.achievementId);
        // 황금 입자 폭발
        for (let i = 0; i < 100; i++) {
          this.spawnParticles(Math.random() * W, Math.random() * FIELD.h + FIELD.y, '#FDCB6E', 1);
        }
        // NARR N-3: 챕터 클리어 시 마왕 반응 dialog (3.5초 후 1.5초간)
        const demonReaction: Record<number, string> = {
          25: '"이제 시작일 뿐이다..."',
          50: '"세상이 어둠에 잠긴다..."',
          100: '"어둠이 곧 질서다."',
        };
        const reaction = demonReaction[this.wave];
        if (reaction) {
          this.safeTimeout(() => {
            this.showBanner('— 마왕 —', reaction, '#a55eea', 1.8);
          }, 3600);
        }
      }
      const clearedWave = this.wave;
      // 단계 6: 스테이지 모드 클리어 판정 — waveLimit 도달 시 gameOver(cleared)
      if (this.runMode === 'stage' && this.runStageDef && clearedWave >= this.runStageDef.waveLimit) {
        this.stageCleared = true;
        this.showBanner('✦ 스테이지 클리어 ✦', this.runStageDef.name, '#FDCB6E', 1.8);
        this.flashScreen('#FDCB6E', 0.85);
        this.shakeFx(20);
        this.safeTimeout(() => this.gameOver(), 1600);
        return;
      }
      this.wave++;
      this.waveBreak = 2.5;
      // 봉인의 탑 — endless 모드일 때만 floor 추적 + 마일스톤 banner
      if (this.runMode === 'endless') {
        const floor = floorFromWave(this.wave);
        try {
          useSaveStore.getState().updateTowerBest(floor);
        } catch (e) {}
        // 마일스톤 banner
        for (const m of TOWER_MILESTONES) {
          if (m.floor === floor && !this._towerMilestonesShown.has(floor)) {
            this._towerMilestonesShown.add(floor);
            this.showBanner(`🗼 봉인의 탑 — ${floor}층`, m.label, '#FDCB6E', 2.4);
            // 박물관 first_tower_floor (10층 첫 도달)
            if (floor === 10) {
              try {
                useSaveStore.getState().addMuseumEntry(makeMuseumEntry(
                  'first_tower_floor', '첫 — 탑 — 10층', `${floor}층에 — 첫 도달.`, 'tower_10'
                ));
              } catch (e) {}
            }
            break;
          }
        }
        // 수호자 층 banner
        if (isGuardianFloor(floor) && !this._towerMilestonesShown.has(floor)) {
          this._towerMilestonesShown.add(floor);
          this.showBanner(`⚔ 한 층의 — 수호자`, `${floor}층 — 강화된 보스`, '#FF6B6B', 2.0);
        }
        void towerHpMul; void towerRewardMul; void nextMilestone;  // 사용 보장
      }
      // OVERHAUL §3.2: 5wave마다 분기 카드 강제 등장 (clearedWave가 5의 배수, 보스 처치 후)
      // 단 clearedWave=5는 첫 보스라 다음 wave에 분기, clearedWave % 5 == 0 && clearedWave > 0
      if (clearedWave % 5 === 0 && clearedWave > 0 && clearedWave <= 25) {
        // 분기 카드 3종 중 1개 선택 모달
        const all = [
          pickRandomBranchCard(),
          pickRandomBranchCard(),
          pickRandomBranchCard(),
        ];
        // 중복 제거
        const seen = new Set<string>();
        const uniq = all.filter((b) => {
          if (seen.has(b.id)) return false;
          seen.add(b.id);
          return true;
        });
        // 단계 2: 우선순위 더 높은 overlay 활성 시 큐 적재 → 닫힐 때 자동 활성
        requestOpen(
          this.getOverlayFlags(),
          this.overlayQueue,
          'branchChoice',
          () => {
            this.pendingBranchChoices = uniq;
            this.paused = true;
          },
          'branchChoice',
        );
      }
      // OVERHAUL §3.2: 분기 카드 만료 처리
      if (this.activeBranch && this.wave > this.activeBranch.expireWave) {
        this.activeBranch = null;
      }
      // QO Q-3: 첫 wave 클리어 안내 (1회만)
      if (clearedWave === 1 && (useSaveStore.getState().runs ?? 0) <= 1) {
        this.showBanner('✅ 웨이브 1 클리어!', '5웨이브마다 보스가 등장합니다', '#26de81', 2.0);
      } else {
        // QO Q-4: 다음 wave가 보스 wave면 사전 안내
        const nextIsBoss = isBossWave(this.wave);
        const subText = nextIsBoss ? `⚡ 보스 등장 — ${BOSSES[bossForWave(this.wave)]?.name ?? ''}` : '준비!';
        this.showBanner(`다음: WAVE ${this.wave}`, subText, nextIsBoss ? '#FF6B6B' : '#FFEAA7', nextIsBoss ? 1.6 : 1.0);
      }
      // 결정 단계 활성화 — runs >= 3 + 영혼석 30 이상일 때만 (첫 런 좌절 방지)
      // 매 5웨이브 단위 (wave 6/11/16...)
      // QA M-3: 첫 보스(W5) 처치 직후 W6에서는 조건 무시하고 1회 강제 노출 (스킵 가능)
      const userStones = useSaveStore.getState().soulstones;
      const userRuns = useSaveStore.getState().runs;
      const firstBossBreak = this.wave === 6 && !this._waveBreakShown;
      const regularBreak = this.wave >= 6 && this.wave % 5 === 1 && userRuns >= 3 && userStones >= 30;
      if (firstBossBreak || regularBreak) {
        // 단계 3: requestOpen — 더 높은 overlay 활성 시 큐 적재
        requestOpen(
          this.getOverlayFlags(),
          this.overlayQueue,
          'waveBreak',
          () => {
            this.waveBreakActive = true;
            this.waveBreakUsed = { heal: false, mpRefill: false, freespin: false };
            this.paused = true;
            if (!this._waveBreakShown) {
              this._waveBreakShown = true;
              this.showBanner('💡 준비 단계', '영혼석으로 강화 가능 (스킵 OK)', '#26de81', 1.5);
            }
          },
          'waveBreak',
        );
      }
      trackMissionProgress('wave', this.wave, 'max');
      if (this.wave >= 5) unlockAchievement('firstBlood');
      if (this.wave >= 10) unlockAchievement('waveMaster');
      if (this.wave >= 20) unlockAchievement('waveLegend');
      if (this.wave >= 30) unlockAchievement('infinity');
      // 챌린지 모드: 웨이브 15 클리어 시 보상
      // ECON E-3: 첫 클리어는 full reward, 재도전은 10% 지급
      if (this.challengeId && this.wave >= 15) {
        const ch = CHALLENGES[this.challengeId];
        if (ch) {
          const alreadyDone = useSaveStore.getState().challengesDone.includes(this.challengeId);
          if (!alreadyDone) {
            useSaveStore.getState().markChallengeDone(this.challengeId);
            this.challengeBonusStones = ch.reward;
            this._challengeFirstClearLabeled = true;
          } else {
            this.challengeBonusStones = Math.floor(ch.reward * 0.1);
            this._challengeFirstClearLabeled = false;
          }
          this._challengeClearedId = this.challengeId;  // gameOver에서 라벨용
          this.challengeId = null;  // 1회만 (재도전 보상도 단일 적립)
        }
      }
      // 25% 이벤트, 75% 유물
      // BUG-003: wave-break 활성 시 즉시 띄우지 않고 wave-break 종료 후로 지연 (직렬화)
      if (this.wave > 2 && this.wave <= 25) {
        const fire = () => {
          if (Math.random() < 0.25) {
            this.offerEvent();
          } else {
            this.offerRelics();
          }
        };
        if (this.waveBreakActive) {
          // ★ OverlayController 큐 통합 — 분기에 따라 relicChoice 또는 eventChoice
          this.overlayQueue.push({
            kind: 'relicChoice',  // event/relic은 우선순위 같음 (PRIORITY 30)
            apply: () => this.safeTimeout(fire, 400),
            key: 'postBreakOffer',
          });
          this._pendingPostBreakOffer = fire;  // 호환성 (legacy reader 있을 경우 대비)
        } else {
          this.safeTimeout(fire, 800);
        }
      }
    }
  }

  /* ===== 이벤트 시스템 ===== */
  offerEvent() {
    const id = pickRandomEvent(this);
    if (!id) {
      this.offerRelics();  // fallback
      return;
    }
    // 단계 3: requestOpen — 더 높은 overlay 활성 시 큐 적재
    requestOpen(
      this.getOverlayFlags(),
      this.overlayQueue,
      'eventChoice',
      () => {
        this.pendingEvent = id;
        this.paused = true;
      },
      'eventChoice',
    );
  }

  acceptEvent() {
    if (!this.pendingEvent) return;
    const def = EVENTS[this.pendingEvent];
    if (def && def.canAccept(this)) {
      def.apply(this);
      Audio.relic_sfx();
      Ait.haptic('medium');
    }
    this.pendingEvent = null;
    if (this.canResumeFrom('eventChoice')) this.paused = false;
    this.tryFlushOverlayQueue();
  }

  declineEvent() {
    this.pendingEvent = null;
    if (this.canResumeFrom('eventChoice')) this.paused = false;
    this.tryFlushOverlayQueue();
  }

  // 이벤트에서 사용
  queueBonusStones(n: number) { this.queuedBonusStones += n; }
  spawnHeroPublic(typeId: string, isBoss: boolean) { this.spawnHero(typeId, isBoss); }

  /* ===== 유물 시스템 ===== */
  offerRelics() {
    if (this.pendingRelicChoices) return;  // 이미 제안 중
    const available = Object.keys(RELICS).filter((k) => !this.relics.has(k));
    if (available.length === 0) return;
    const choices: string[] = [];
    while (choices.length < Math.min(3, available.length)) {
      const r = available[Math.floor(Math.random() * available.length)];
      if (!choices.includes(r)) choices.push(r);
    }
    // 단계 3: requestOpen — 더 높은 overlay 활성 시 큐 적재
    requestOpen(
      this.getOverlayFlags(),
      this.overlayQueue,
      'relicChoice',
      () => {
        this.pendingRelicChoices = choices;
        this.paused = true;
        // TUT-6: 첫 유물 모달 학습 — 모달 띄울 때만 큐
        this.queueTutorial(
          'tut_relic',
          '💎 유물 선택',
          '웨이브 클리어 보상 — 1개 선택.\n\n• 이번 런 동안 영구 효과\n• 재선택 불가\n\n💡 자주 픽한 카드와 어울리는 유물을 고르세요.',
          '💎',
        );
      },
      'relicChoice',
    );
  }

  acquireRelic(id: string) {
    if (!this.pendingRelicChoices?.includes(id)) return;
    this.relics.add(id);
    // OVERHAUL §3.3: 빌드 통계 갱신
    if (!this.buildStats.relics.includes(id)) this.buildStats.relics.push(id);
    this.updateBuildBonus('relic');
    // 5차 — 유물 진화 검사 (이번 추가로 페어 완성 시 자동 발동)
    this.checkRelicFusions();
    useSaveStore.getState().discover('relics', id);
    Audio.relic_sfx();
    Ait.haptic('heavy');
    // 유물 획득 임팩트 (Hades boon / Slay the Spire relic 톤)
    const def = RELICS[id];
    if (def) {
      this.showBanner(`✨ ${def.name} ✨`, def.desc, '#FDCB6E', 1.5);
      this.flashScreen('#FDCB6E', 0.55);
      this.shakeFx(10);
      this.slowMoT = 0.35;
      // 황금 입자 폭발
      for (let i = 0; i < 60; i++) {
        this.spawnParticles(W / 2, FIELD.y + FIELD.h / 2, '#FDCB6E', 1);
      }
    }
    // 즉시 효과 적용
    if (id === 'vault') {
      // 마력 최대치 +200
      this.mpMax += 200;
    } else if (id === 'heart') {
      // 마왕성 HP +50%
      const ratio = this.castleHp / this.castleMaxHp;
      this.castleMaxHp = Math.floor(this.castleMaxHp * 1.5);
      this.castleHp = Math.min(this.castleMaxHp, this.castleMaxHp * ratio + this.castleMaxHp * 0.33);
    } else if (id === 'mask') {
      // mask는 recalcSynergies 안에서 자동 적용 (이미 코드에 있음)
      this.recalcSynergies();
    }
    // 유물 8개 업적
    if (this.relics.size >= 8) unlockAchievement('relicHoard');
    this.pendingRelicChoices = null;
    if (this.canResumeFrom('relicChoice')) this.paused = false;
    this.tryFlushOverlayQueue();
  }

  skipRelic() {
    this.pendingRelicChoices = null;
    if (this.canResumeFrom('relicChoice')) this.paused = false;
    this.tryFlushOverlayQueue();
  }

  /* ===== Spawn ===== */
  spawnMonster(typeId: string, opts?: { force?: boolean }) {
    if (this.state !== 'playing') return;
    const def = MONSTERS[typeId];
    if (!def) return;
    useSaveStore.getState().discover('monsters', typeId);
    const live = this.monsters.filter((m) => !m.dead).length;
    const ch = this.challengeId ? CHALLENGES[this.challengeId] : undefined;
    // MonsterStatsSystem: 동시 배치 cap
    const maxMon = calculateMonsterMax({
      challengeMaxMonsters: ch?.modifiers.maxMonsters,
      hasSwarmRelic: this.relics.has('swarm'),
    });
    // BUG-005: force=true 시 maxMon 우회 (진화 결과 손실 방지)
    if (live >= maxMon && !opts?.force) return;
    const sprite = def.buildSprite();
    // LD-A: 14마리 클러스터 분산 — 6마리당 1줄로 묶고 z-row마다 6px y 오프셋
    const col = live % 6;
    const row = Math.floor(live / 6);
    const baseX = 100 + col * 14 + row * 4;
    // MonsterStatsSystem: relic/challenge 멀티
    const mstats = calculateMonsterStats({
      challengeHpMul: ch?.modifiers.monsterHpMul ?? 1,
      hasIronRelic: this.relics.has('iron'),
      hasWrathRelic: this.relics.has('wrath'),
      hasSprintRelic: this.relics.has('sprint'),
      hasRazorRelic: this.relics.has('razor'),
    });
    // MonsterStatsSystem: serpent DoT
    const dotPayload = computeMonsterDot({
      hasSerpentRelic: this.relics.has('serpent'),
      hasInherentDot: !!def.dot,
      baseAtk: def.atk,
    });
    // P1-4: 카드 영구 강화 — HP/ATK 멀티 적용
    const cardLv = this._cardLevels[typeId] || 0;
    const cardMul = statMulForLevel(cardLv);
    const u = new Unit({
      team: 'monster', typeId, name: def.name, star: def.star,
      sprite,
      hp: def.hp * mstats.hpMul * cardMul.hp,
      atk: def.atk * mstats.atkMul * cardMul.atk,
      range: def.range,
      spd: def.spd * mstats.spdMul,
      atkCd: def.atkCd / mstats.atkSpdDivisor,
      tags: def.tags, aoe: def.aoe, knockback: def.knockback, revive: def.revive,
      mpGen: def.mpGen, auraBuff: def.auraBuff,
      dot: def.dot ?? dotPayload.dot,
      scale: 0.75,
      x: Math.min(baseX, 240), y: GROUND_Y,
    });
    // 라인 시스템 (P2-9) — 태그 기반 자동 배치 (LD-2: 16px 분리로 시각적 명확화)
    // LD-A: row 오프셋으로 클러스터 시 y 분산 추가
    const isRanged = def.tags.includes('magic') || def.range > 60;
    const isTank = def.tags.includes('tank') || def.tags.includes('brute');
    const lineY = isTank ? GROUND_Y - 16 : isRanged ? GROUND_Y + 16 : GROUND_Y;
    u.y = lineY + (Math.floor(live / 6) % 2 === 1 ? 4 : 0);
    const lineX = isTank ? -10 : isRanged ? 14 : 0;
    u.x += lineX;

    this.monsters.push(u);
    // 소환 마법진 (등급별 색)
    const rarityCol: Record<string, string> = { common: '#888', uncommon: '#26de81', rare: '#0984E3', epic: '#a55eea', legendary: '#FDCB6E' };
    this.spawnSummonCircle(u.x, GROUND_Y - 8, rarityCol[def.rarity] || '#FD79A8', def.rarity);
    this.spawnParticles(u.x, u.y - 22, MASTER_PAL.pinkAccent, 14);

    // G1 카드 페어 hook — 살아있는 다른 monster들과 페어 검사
    try {
      const aliveOthers = this.monsters.filter((m) => !m.dead && m !== u);
      for (const other of aliveOthers) {
        const pair = findPairLine(typeId, other.typeId);
        if (pair && !this._pairLinesShown.has(`${pair.ids[0]}|${pair.ids[1]}`)) {
          this._pairLinesShown.add(`${pair.ids[0]}|${pair.ids[1]}`);
          this.safeTimeout(() => {
            this.speakDemon({ text: pair.line, mood: 'calm' });
          }, 800);
          break;  // 한 번에 하나만
        }
      }
    } catch (e) {}

    // 첫 소환 = "와 모먼트" 강조 (UXUI §60초 이내 첫 와)
    // 신규 유저 첫 소환에 큰 임팩트 — 카드 펼치기 → 즉시 큰 시각/청각 보상
    if (this.killCount === 0 && this.monsters.filter((m) => !m.dead).length === 1) {
      this.shakeFx(10);
      this.flashScreen('#FDCB6E', 0.45);
      this.showBanner(`✨ ${def.name} 등장 ✨`, '용사를 막아라!', '#FDCB6E', 1.2);
      Ait.haptic('heavy');
      // QA-9: 첫 소환 후 마력 회복 안내 (1.5초 지연 후)
      this.safeTimeout(() => {
        this.showBanner('💡 마력은 자동 회복', '용사를 처치하면 더 빠르게', '#a55eea', 2.0);
      }, 2500);
    }

    // 등급별 임팩트 차별화
    if (def.rarity === 'epic' || def.rarity === 'legendary') {
      Audio.summon_epic();
      this.shakeFx(8);
      this.flashEdge(rarityCol[def.rarity], 0.55);
    } else if (def.rarity === 'rare' || def.rarity === 'uncommon') {
      Audio.summon_rare();
      this.flashEdge(rarityCol[def.rarity], 0.35);
    } else {
      Audio.summon_common();
      // W4 일반 카드 픽 — 30% 확률 마왕 한 줄 (스팸 방지: speakDemon 자체 throttle 있음)
      if (this.killCount > 0 && Math.random() < 0.3) {
        try {
          this.speakDemon({ text: pickMicroLine(MICRO_LINES.cardPick), mood: 'calm' });
        } catch (e) {}
      }
    }
    this.recalcSynergies();
  }

  private spawnHero(typeId: string, isBoss: boolean, opts?: { elite?: boolean }) {
    const def: HeroDef | BossDef | undefined = isBoss ? BOSSES[typeId] : HEROES[typeId];
    if (!def) return;
    useSaveStore.getState().discover(isBoss ? 'bosses' : 'heroes', typeId);
    const wave = this.wave;
    const ch = this.challengeId ? CHALLENGES[this.challengeId] : undefined;
    const userRunsRaw = useSaveStore.getState().runs;
    // HeroStatsSystem: wave 스케일링 + relic/edict/elite 멀티 산출
    const stats = calculateHeroStats({
      wave,
      isBoss,
      isElite: !!opts?.elite,
      isNewbieEarlyWave: userRunsRaw < 3 && wave <= 3,
      hasHourglassRelic: this.relics.has('hourglass'),
      hasHexRelic: this.relics.has('hex'),
      hasReaperRelic: this.relics.has('reaper'),
      // 스테이지 modifier 합산 (1배가 기본 — endless 영향 없음)
      challengeHeroSpdMul: (ch?.modifiers.heroSpdMul ?? 1) * this.stageMod.heroSpdMul,
      challengeHeroAtkSpdMul: ch?.modifiers.heroAtkSpdMul ?? 1,
      edictEnemyHpMul: (this.todayEdictDef.modifiers.enemyHpMul ?? 1) * this.stageMod.heroHpMul,
      edictEnemyAtkMul: (this.todayEdictDef.modifiers.enemyAtkMul ?? 1) * this.stageMod.heroAtkMul,
      hasBaneAgainstThisHero: useSaveStore.getState().heroBaneActive.includes(typeId),
    });
    const sprite = def.buildSprite();
    // Hero tags — 사운드 차별화 + 잠재 시너지/디버프용
    const heroTags: Record<string, string[]> = {
      mage: ['magic'], healer: ['holy', 'support'],
      archer: ['ranged'], spear: ['melee'],
      apprentice: ['melee'], swordsman: ['melee'],
      shield: ['tank'], rogue: ['melee'],
      archmage: ['magic'], saint: ['holy'], priest: ['holy'],
    };
    // W7 시즌 일화 적 멀티 (HP/ATK) + NG+ 멀티
    const u = new Unit({
      team: 'hero', typeId, name: def.name,
      sprite,
      hp: def.hp * stats.hpMul * this._seasonHpMul * this._ngPlusHpMul,
      atk: def.atk * stats.atkMul * this._seasonAtkMul * this._ngPlusAtkMul,
      range: def.range,
      // 5차 — 진화 유물 eternal_pact: 적 이속 ×0.85
      spd: def.spd * stats.spdMul * this.fusedEffectMul('heroSpdMul'),
      atkCd: def.atkCd / stats.atkSpdDivisor,
      tags: heroTags[typeId] || [],
      isBoss,
      scale: isBoss ? ((def as BossDef).scale ?? 1.1) : (opts?.elite ? 0.9 : 0.75),
      mpReward: Math.floor(def.mp * stats.mpRewardMul),
      defense: (def as HeroDef).defense,
      healAmt: (def as HeroDef).healAmt,
      healRange: (def as HeroDef).healRange,
      x: W + 30, y: GROUND_Y,
    });
    // BAL-9: 엘리트 표시
    if (opts?.elite) {
      u.isElite = true;
      this.spawnParticles(u.x, u.y - 16, '#FF6B6B', 12);
    }
    // BAL B-2: 위험 hero 첫 등장 시 1회 학습 안내
    if (!isBoss) {
      if (typeId === 'healer') {
        this.queueTutorial(
          'tut_enemy_healer',
          '✚ 적 힐러 등장',
          '주변 동료를 회복합니다 (2초마다 30 HP).\n\n💡 다른 적보다 우선 처치하세요.',
          '✚',
        );
      } else if (typeId === 'shield') {
        this.queueTutorial(
          'tut_enemy_shield',
          '🛡 방패기사 등장',
          '받는 데미지 -40% (단단함).\n\n💡 시간이 걸리지만 반드시 처치 가능. 광역 공격 카드 추천.',
          '🛡',
        );
      } else if (typeId === 'rogue') {
        this.queueTutorial(
          'tut_enemy_rogue',
          '🗡 도적 등장',
          '매우 빠르고 공격 빠름 (다른 적보다 약 2배 spd).\n\n💡 ⚡ 돌격으로 따라잡거나 원거리 카드로 견제.',
          '🗡',
        );
      }
    }
    // FEEL F-5: 적 spawn 우측 가장자리 시각 신호 (보스 외 일반 hero 등장 예고)
    if (!isBoss) {
      this.flashEdge('#FF6B6B', 0.25);
      // W2 hero 첫 만남 — 한 줄 명대사 banner (런 안 1회)
      if (!this._heroFirstSeen.has(typeId)) {
        this._heroFirstSeen.add(typeId);
        const lore = getHeroLore(typeId);
        if (lore) {
          this.showBanner(`「${lore.epithet}」`, lore.firstEncounterLine, '#FF6B6B', 1.5);
        }
      }
    }
    if (isBoss) {
      this.bossUnit = u;
      this.bossSpawnTime = performance.now();
      u.maxHp = u.hp;
      this.bossActive = true;
      // 5차 — undead_lord T2: 다음 보스마다 사이클 리셋 (1보스에 1회 풀 부활)
      this._undeadFullReviveUsedThisCycle = false;
      // abyss: 보스 등장 시 마왕성 풀회복
      if (this.relics.has('abyss')) {
        this.castleHp = this.castleMaxHp;
      }
      // 보스 등장 컷 — W2 bossLore.entranceLine 사용 (백스토리 톤)
      const bossLore = getBossLore(typeId);
      const dialog = bossLore?.entranceLine || '⚠ 보스 등장 ⚠';
      // NARR N-2: largerText ON 시 보스 dialog 노출 시간 ×1.5 (가독성)
      const dialogDur = useSaveStore.getState().accessibility.largerText ? 3.0 : 2.0;
      this.showBanner(def.name, dialog, '#FF6B6B', dialogDur);
      // P0-5: 보스 등장 시그니처 컷 — 검보라 화면 플래시 + slowMo 0.7 + legendary 소환진 + 외곽 vignette
      this.flashScreen('#7B2D8E', 0.6);
      this.shakeFx(20);
      this.spawnSummonCircle(u.x, GROUND_Y - 8, '#FDCB6E', 'legendary');
      this.flashEdge('#1a0a1a', 0.7);
      // OVERHAUL §3.4: 보스 등장 시 마왕 측 반응 (1.4초 후)
      const demonReaction = DEMON_LINES_BOSS_APPEAR[typeId];
      if (demonReaction) {
        this.safeTimeout(() => this.speakDemon(demonReaction), 1400);
      }
      this.slowMoT = 0.7;
      Audio.boss_alert();
      Audio.bgmCrossfade('boss', 300);
      Ait.haptic('heavy');
    }
    this.heroes.push(u);
    // ★ 작전 화면: healer 등장 카운트
    if (typeId === 'healer') this.healerEncountered++;
  }

  /* ===== Unit Update ===== */
  private updateUnit(u: Unit, dt: number) {
    if (u.dead) { u.deathT += dt; return; }
    if (u.spawnT > 0) u.spawnT -= dt;
    u.bobT += dt * 4;
    u.flash = Math.max(0, u.flash - dt);
    u.frozen = Math.max(0, u.frozen - dt);
    // BAL-4: 보스 invuln 중에는 frozen 무시 (race 방지 — 무행동+무적 상태 회피)
    if (u.frozen > 0 && u.invulnT <= 0) return;

    // 보스 전용 스킬 (정의되어있던 dead code 활성화)
    if (u.isBoss && u.team === 'hero') {
      const bossDef = BOSSES[u.typeId];
      // desperate 카운트다운 tick
      if (u.desperateT > 0) u.desperateT = Math.max(0, u.desperateT - dt);

      // 페이즈 전환 — HP 50% / 25% 시점 변환 (Hades 보스 패턴)
      const hpRatio = u.hp / u.maxHp;
      if (u.bossPhase === 0 && hpRatio <= 0.5) {
        u.bossPhase = 1;
        u.atkCd *= 0.7;  // 공속 ×1.43
        u.atkMul *= 1.2;
        // 모든 쿨다운 절반 (분노 모드)
        u.invulnCdT *= 0.5;
        u.bossHealCdT *= 0.5;
        u.castleStrikeCdT *= 0.5;
        this.showBanner(`${u.name} 분노!`, '공속 ↑ 데미지 ↑', '#FF6B6B', 1.4);
        this.flashScreen('#D63031', 0.6);
        this.shakeFx(16);
        this.hitStopT = 0.12;
        Audio.boss_alert();
        Ait.haptic('heavy');
      } else if (u.bossPhase === 1 && hpRatio <= 0.25) {
        u.bossPhase = 2;
        u.desperateT = 5.0;  // 5초 카운트다운 시작 (UI 표시)
        u.atkCd *= 0.7;  // 한 번 더 가속
        u.spdMul *= 1.3;
        u.atkMul *= 1.2;
        // BAL-8: 페이즈 2 진입 시 대응 자원 자동 부여 (anti-stall)
        this.addMP(50);
        this.ulti.gauge = Math.min(this.ulti.max, this.ulti.gauge + this.ulti.max * 0.20);
        if (this.ulti.gauge >= this.ulti.max) this.ulti.ready = true;
        this.spawnDamageText(W / 2, FIELD.y + 40, '⚡ 마력 +50, 필살기 +20%', '#FDCB6E', false, true);
        // 카운트다운 위협: 5초 후 마왕성 -200 (회피 가능 — 그 전에 죽이기)
        this.showBanner(`${u.name} 최후의 일격!`, '5초 내 처치 — 안 그러면 -200 HP', '#FF6B6B', 2.0);
        // TUT-8: 첫 페이즈 2 진입 학습
        this.queueTutorial(
          'tut_boss_phase2',
          '💥 보스 최후의 일격',
          '5초 안에 처치하지 못하면 마왕성에 -200 HP!\n\n💡 ⚡ 돌격 + 필살기로 빠르게 마무리하세요.',
          '💥',
        );
        this.flashScreen('#FF6B6B', 0.85);
        this.shakeFx(22);
        this.hitStopT = 0.2;
        // 5초 타이머
        u.castleStrikeCdT = Math.min(u.castleStrikeCdT, 5);
        if (!bossDef?.castleStrike) {
          // BossSystem: BAL B-3 — 캡틴 한정 완화 파라미터
          const fb = getBossFinalBlowParams({ bossTypeId: u.typeId });
          const finalDmg = fb.finalDmg;
          const countdownMs = fb.countdownMs;
          if (fb.desperateSec > 0) u.desperateT = fb.desperateSec;
          // 원래 castleStrike 없는 보스도 마지막 폭발 부여
          this.safeTimeout(() => {
            // BUG-003: 부활/사망/페이즈 강등으로 폭발 취소
            if (u.dead) return;
            if (u.bossPhase !== 2) return;
            if (this.pendingRevival) return;
            this.castleHp = Math.max(0, this.castleHp - finalDmg);
            this.recentCastleDamage.push({ t: performance.now(), d: finalDmg });
            this.flashScreen('#D63031', 0.85);
            this.shakeFx(24);
            this.showBanner('💥 보스의 최후 일격', `마왕성 -${finalDmg} HP`, '#FF6B6B', 1.5);
            Audio.hit_damage();
            Ait.haptic('heavy');
            if (this.castleHp <= 0) this.tryRevivalOrGameOver();
          }, countdownMs);
        }
        Audio.boss_alert();
        Ait.haptic('heavy');
      }

      if (bossDef?.invuln) {
        u.invulnT = Math.max(0, u.invulnT - dt);
        u.invulnCdT -= dt;
        // BAL B-1: 페이즈 2 카운트다운(desperateT > 0) 중에는 무적 발동 금지 — 회피 불가 방지
        if (u.invulnCdT <= 0 && u.invulnT <= 0 && u.desperateT <= 0) {
          u.invulnT = bossDef.invuln.dur;
          u.invulnCdT = bossDef.invuln.cd;
          this.spawnParticles(u.x, u.y - 24, '#74B9FF', 18);
          this.showBanner(`⛨ ${u.name} 무적!`, '잠시 데미지 무시', '#74B9FF', 0.9);
          Audio.boss_alert();
        }
      }
      if (bossDef?.bossHeal) {
        u.bossHealCdT -= dt;
        // BAL-6: 회복 1초 전 텔레그래프 (1.05~0.95 윈도우에서 1회)
        if (u.bossHealCdT < 1.05 && u.bossHealCdT > 0.95 && !u._healTelegraphed) {
          u._healTelegraphed = true;
          this.showBanner('✚ 회복 임박!', '1초 안에 처치하면 무산', '#FF6B6B', 0.9);
          this.spawnParticles(u.x, u.y - 16, '#26de81', 12);
        }
        if (u.bossHealCdT <= 0) {
          u._healTelegraphed = false;
          u.bossHealCdT = bossDef.bossHeal.cd;
          // 범위 내 모든 동료(hero) 회복
          let healed = 0;
          for (const h of this.heroes) {
            if (h.dead) continue;
            if (Math.abs(h.x - u.x) < bossDef.bossHeal.range && h.hp < h.maxHp) {
              h.hp = Math.min(h.maxHp, h.hp + bossDef.bossHeal.amt);
              this.spawnParticles(h.x, h.y - 16, '#26de81', 6);
              healed++;
            }
          }
          if (healed > 0) {
            this.showBanner(`✚ ${u.name} 광역 회복`, `${healed}명 회복`, '#26de81', 0.8);
            this.flashEdge('#26de81', 0.5);
            Audio.evolve_sfx();
          }
        }
      }
      if (bossDef?.castleStrike) {
        u.castleStrikeCdT -= dt;
        // BAL B-5: 1초 전 텔레그래프 (한 사이클당 1회)
        if (u.castleStrikeCdT < 1.05 && u.castleStrikeCdT > 0.95 && !u._castleStrikeTelegraphed) {
          u._castleStrikeTelegraphed = true;
          this.showBanner('☄ 마왕성 공격 임박!', '1초', '#FF6B6B', 0.9);
          this.flashEdge('#FF6B6B', 0.4);
        }
        if (u.castleStrikeCdT <= 0) {
          u._castleStrikeTelegraphed = false;
          u.castleStrikeCdT = bossDef.castleStrike.cd;
          let dmg = bossDef.castleStrike.dmg;
          if (this.relics.has('titan')) dmg *= 0.7;
          // 5차 — 진화 유물 fortress: castleDmgTakenMul ×0.85
          dmg *= this.fusedEffectMul('castleDmgTakenMul');
          this.castleHp = Math.max(0, this.castleHp - dmg);
          this.recentCastleDamage.push({ t: performance.now(), d: dmg });
          // 시각: 보스 → 마왕성 빔
          this.showBanner('☄ 원거리 공격!', `마왕성 -${Math.ceil(dmg)} HP`, '#FF6B6B', 1.1);
          this.flashScreen('#D63031', 0.5);
          this.shakeFx(12);
          Audio.hit_damage();
          Ait.haptic('heavy');
          if (this.castleHp <= 0) this.tryRevivalOrGameOver();
        }
      }
    }

    // DoT
    for (const d of u.dotEffects) {
      d.tick -= dt; d.dur -= dt;
      if (d.tick <= 0) { this.takeDamage(u, d.dmg, false, d.color); d.tick = 0.5; }
    }
    u.dotEffects = u.dotEffects.filter((d) => d.dur > 0);

    // 미믹: MP 생산
    if (u.mpGen) {
      u.mpGenT -= dt;
      if (u.mpGenT <= 0) { u.mpGenT = 1; this.addMP(u.mpGen); }
    }

    // 적 힐러
    if (u.healAmt) {
      u.healT -= dt;
      // BAL B-2: 회복 0.7초 전 ✚ 텔레그래프 (한 사이클당 1회)
      if (u.healT < 0.75 && u.healT > 0.65 && !u._healerTelegraphed) {
        u._healerTelegraphed = true;
        this.spawnDamageText(u.x, u.y - 30, '✚', '#26de81', false, true);
        this.spawnParticles(u.x, u.y - 16, '#26de81', 4);
      }
      if (u.healT <= 0) {
        u.healT = 2.0;
        u._healerTelegraphed = false;
        for (const h of this.heroes) {
          if (h.dead || h === u) continue;
          if (Math.abs(h.x - u.x) < (u.healRange ?? 80) && h.hp < h.maxHp) {
            h.hp = Math.min(h.maxHp, h.hp + u.healAmt);
          }
        }
      }
    }

    // 공격 페이즈 머신
    if (u.attackPhase > 0) {
      u.attackPhaseT -= dt;
      if (u.attackPhaseT <= 0) {
        if (u.attackPhase === 1) {
          u.attackPhase = 2; u.attackPhaseT = 0.05;
          this.applyAttack(u, u.pendingTarget);
        } else if (u.attackPhase === 2) {
          u.attackPhase = 3; u.attackPhaseT = 0.15;
        } else {
          u.attackPhase = 0; u.pendingTarget = null;
        }
      }
    }

    u.atkTimer = Math.max(0, u.atkTimer - dt);
    u._isMoving = false;

    // 버그 #1 수정: hero가 마왕성 사거리(x<80)에 도달하면 monster 무시하고 마왕성 우선 공격
    // 이전 로직: target이 null일 때만 마왕성 공격 → monster 살아있으면 영원히 안 깨짐
    if (u.team === 'hero' && u.x < 80) {
      // F-2: 마왕성 앞 도달 시 walk 애니 정지 + 라인 정렬
      u._isMoving = false;
      u.x = 80;  // 정확한 라인에 snap
      if (u.atkTimer <= 0 && u.attackPhase === 0) {
        let dmg = u.effAtk();
        // titan: 마왕성 받는 데미지 ×0.7
        if (this.relics.has('titan')) dmg *= 0.7;
        // 5차 — 진화 유물 fortress: 추가 ×0.85
        dmg *= this.fusedEffectMul('castleDmgTakenMul');
        this.castleHp = Math.max(0, this.castleHp - dmg);
        this.recentCastleDamage.push({ t: performance.now(), d: dmg });
        u.atkTimer = u.atkCd;
        this.spawnParticles(80, GROUND_Y - 24, MASTER_PAL.crimson, 9);
        this.spawnDamageText(80, GROUND_Y - 32, '-' + Math.ceil(dmg), MASTER_PAL.crimson, true);
        this.shakeFx(5);
        Audio.hit_damage();
        Ait.haptic('medium');
        if (this.castleHp <= 0) this.tryRevivalOrGameOver();
      }
      // hero는 마왕성 앞에서 멈춤 (이동 X)
      return;
    }

    const target = this.findTarget(u);
    if (target) {
      const dx = target.x - u.x;
      const dist = Math.abs(dx);
      if (dist <= u.range) {
        if (u.atkTimer <= 0 && u.attackPhase === 0) {
          u.attackPhase = 1; u.attackPhaseT = 0.20;
          u.pendingTarget = target;
          u.atkTimer = u.atkCd;
          // P0-2: 격돌 시점 dust — 두 단위 사이 중간 지점에 흙먼지 1개 (cap 자동 보호)
          if (u.range < 50 && Math.random() < 0.4) {
            const midX = (u.x + target.x) / 2;
            this.spawnParticles(midX, GROUND_Y - 2, '#5c3a18', 1);
          }
        }
      } else if (u.attackPhase === 0) {
        u.x += Math.sign(dx) * u.effSpd() * dt;
        u.walkT += dt;
        u._isMoving = true;
      }
    } else if (u.team === 'hero') {
      // monster 모두 처치된 경우: 마왕성으로 진격
      u.x -= u.effSpd() * dt;
      u.walkT += dt;
      u._isMoving = true;
    }
  }

  private findTarget(u: Unit): Unit | null {
    const enemies = u.team === 'monster' ? this.heroes : this.monsters;
    let best: Unit | null = null, bestDist = Infinity;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = Math.abs(e.x - u.x);
      if (d < bestDist) { bestDist = d; best = e; }
    }
    return best;
  }

  private applyAttack(u: Unit, target: Unit | null) {
    if (!target || target.dead) return;
    const dmg = u.effAtk();
    const isMagic = u.tags.includes('magic') || u.tags.includes('fire');
    if (u.range > 50) {
      this.projectiles.push({
        x: u.x, y: u.y - 18, target, atk: dmg, team: u.team,
        spd: 240, life: 1.5,
        color: u.tags.includes('fire') ? '#ff6b35' : (u.team === 'monster' ? MASTER_PAL.pinkAccent : MASTER_PAL.blueLight),
        dot: u.dot, fire: u.tags.includes('fire'),
      });
      if (isMagic) Audio.attack_magic(); else Audio.attack_ranged();
    } else {
      this.takeDamage(target, dmg, true, undefined, u);
      if (u.aoe) {
        const enemies = u.team === 'monster' ? this.heroes : this.monsters;
        for (const e of enemies) {
          if (e.dead || e === target) continue;
          if (Math.abs(e.x - target.x) < u.aoe) this.takeDamage(e, dmg * 0.5, true, undefined, u);
        }
        // FEEL F-6: AOE 범위 시각화 — 0.25초 ring effect
        this.effects.push({
          type: 'aoeRing',
          x: target.x, y: target.y - 16,
          r: u.aoe,
          color: u.team === 'monster' ? MASTER_PAL.pinkAccent : MASTER_PAL.blueLight,
          age: 0, life: 0.25,
        } as any);
      }
      if (u.knockback && !target.isBoss) {
        target.x += (u.team === 'monster' ? u.knockback : -u.knockback);
      }
      // 히트스파크 (PIXEL §파트4)
      this.spawnHitSpark(target.x, target.y - 14, u.team === 'monster' ? '#FD79A8' : '#FDCB6E');
      Audio.attack_melee();
    }
    if (u.team === 'monster' && this.relics.has('fang')) {
      u.hp = Math.min(u.maxHp * u.hpMul, u.hp + dmg * 0.05);
    }
  }

  private takeDamage(u: Unit, amt: number, showText = true, color?: string, attacker?: Unit) {
    if (u.dead) return;
    // 보스 무적 — 데미지 무시 + 시각 표시
    if (u.invulnT > 0) {
      u.flash = 0.08;
      if (showText) {
        this.spawnDamageText(u.x, u.y - 26, 'MISS', '#74B9FF', false, false);
      }
      return;
    }
    // DamageSystem: 방어력 적용
    amt = applyDefense(amt, u.defense);
    u.hp -= amt;
    // 빌드 체감 — 탱크 시너지 + tank 태그가 데미지 받을 때 흰 광택 (방패로 받아치는 느낌)
    if (u.team === 'monster' && u.tags.includes('tank') && this.activeSynergies.has('tank')) {
      u.flash = 0.06;  // 짧게 → 빠르게 사라지는 deflection
      this.spawnParticles(u.x, u.y - 14, '#74B9FF', 3);
    } else {
      u.flash = 0.12;
    }
    // DamageSystem: 크리트 판정
    const isCrit = isCriticalHit({
      finalDamage: amt,
      targetMaxHp: u.maxHp,
      attackerHasAoe: attacker?.aoe != null,
    });
    // 빌드 체감 — 화염 시너지(inferno) + fire 태그 공격이 hero에 적중 시 작은 화염 splash
    // (주변 30px 안 hero에 chip 데미지 + 빨간 ring 1개) — 너무 잦지 않게 25%
    if (u.team === 'hero' && attacker?.tags.includes('fire')
        && this.activeSynergies.has('inferno') && Math.random() < 0.25) {
      this.effects.push({
        type: 'aoeRing',
        x: u.x, y: u.y - 14,
        age: 0, life: 0.35, color: '#FF6B6B', r: 30,
      });
      for (const h2 of this.heroes) {
        if (h2.dead || h2 === u) continue;
        const dx = h2.x - u.x;
        if (Math.abs(dx) <= 30) {
          h2.hp -= h2.maxHp * 0.04;  // 4% maxHp chip
          h2.flash = 0.10;
        }
      }
    }
    // 빌드 체감 — hero 사망 추적용: 처치한 attacker의 태그 저장 (onUnitDeath에서 사용)
    if (u.team === 'hero' && u.hp <= 0 && attacker) {
      this._lastKillerTags = attacker.tags;
    }
    if (showText) {
      this.spawnDamageText(u.x, u.y - 26, '-' + Math.ceil(amt), color || (u.team === 'hero' ? '#FFEAA7' : MASTER_PAL.pinkAccent), isCrit, isCrit);
      if (isCrit) {
        Audio.critical_hit(); Ait.haptic('medium'); this.shakeFx(4);
        // HIT-STOP: 결정타에 짧은 시간 정지 (Hades/Brotato 패턴)
        this.hitStopT = Math.max(this.hitStopT, 0.06);
      }
    }
    if (u.hp <= 0) {
      // DamageSystem: 부활 판정
      if (u.team === 'monster' && !u.revived) {
        const isUndeadKind = u.tags.includes('undead') || u.tags.includes('zombie');
        const rev = calculateRevive({
          baseReviveRatio: u.revive || 0,
          hasTombRelic: this.relics.has('tomb'),
          maxHp: u.maxHp,
          hpMul: u.hpMul,
          buildReviveExtraRatio: isUndeadKind ? this._buildBonus.reviveHpExtraRatio : 0,
        });
        if (rev.canRevive) {
          u.revived = true;
          u.hp = rev.revivedHp;
          u.flash = 0.3;
          this._runReviveCount++;
          // 5차 — secret_undying: 한 런 50체 부활
          if (this._runReviveCount >= 50) this.tryUnlockSecret('secret_undying');
          Audio.evolve_sfx();
          // 빌드 체감 — 언데드: 부활 시 보라/초록 영혼 입자 + 부활 링
          this.spawnParticles(u.x, u.y - 18, '#a55eea', 14);
          this.spawnParticles(u.x, u.y - 18, '#7bed9f', 8);
          this.effects.push({
            type: 'aoeRing',
            x: u.x, y: u.y - 14,
            age: 0, life: 0.5, color: '#7bed9f', r: 28,
          });
          return;
        }
      }
      u.dead = true;
      this.onUnitDeath(u);
    }
  }

  private onUnitDeath(u: Unit) {
    this.spawnParticles(u.x, u.y - 18, u.team === 'monster' ? MASTER_PAL.purpleMain : MASTER_PAL.yellow, 18);
    this.spawnDeathEffect(u.x, u.y - 16, u.team === 'monster');
    if (u.team === 'monster') Audio.death_ally(); else Audio.death_enemy();
    // P0-5: 보스 처치 시그니처 컷 — 황금/빨강 입자 누적 + 거대 ring + slowMo + hitStop + 보스 격파 banner
    if (u.team === 'hero' && u.isBoss) {
      this.spawnParticles(u.x, u.y - 16, '#FDCB6E', 60);
      this.spawnParticles(u.x, u.y - 16, '#FF6B6B', 40);
      this.effects.push({
        type: 'aoeRing',
        x: u.x, y: u.y - 14,
        age: 0, life: 1.0, color: '#FDCB6E', r: 80,
      });
      this.slowMoT = Math.max(this.slowMoT, 0.55);
      this.hitStopT = Math.max(this.hitStopT, 0.25);
      this.flashScreen('#FDCB6E', 0.55);
      this.showBanner('✦ 보스 격파 ✦', u.name, '#FDCB6E', 1.6);
      // W2 보스 lore.defeatLine — 격파 1.2초 후 보스 마지막 한 줄
      const blore = getBossLore(u.typeId);
      if (blore) {
        this.safeTimeout(() => {
          this.showBanner(`「${u.name}의 마지막 말」`, blore.defeatLine, '#a55eea', 2.0);
        }, 1300);
      }
      // N4 보스 첫 처치 마킹 — App.tsx pendingCutscene이 자동 발동
      try {
        useSaveStore.getState().markBossFirstKillSeen(u.typeId);
      } catch (e) {}
      Ait.haptic('heavy');
    }
    // G3 hero(non-boss) 첫 처치 시 마왕 한 줄 — 런 + 영구 1회
    if (u.team === 'hero' && !u.isBoss) {
      try {
        const seenStore = useSaveStore.getState().heroFirstKillCommentSeen;
        if (!seenStore.includes(u.typeId)) {
          const line = getHeroFirstKillLine(u.typeId);
          if (line) {
            this.safeTimeout(() => {
              this.speakDemon({ text: line, mood: 'calm' });
            }, 600);
            useSaveStore.getState().markHeroFirstKillCommentSeen(u.typeId);
          }
        }
        // 박물관 — first_kill 자동 추가 (영구 중복 방지)
        useSaveStore.getState().addMuseumEntry(makeMuseumEntry(
          'first_kill', `첫 처치 — ${u.name}`, `${u.name}을(를) 처음 막아냈다.`, u.typeId
        ));
        // 사이드퀘 — kills 진행
        this._tickSideQuests('kills', 1);
      } catch (e) {}
    }
    // 박물관 — first_boss_kill
    if (u.team === 'hero' && u.isBoss) {
      try {
        useSaveStore.getState().addMuseumEntry(makeMuseumEntry(
          'first_boss_kill', `첫 보스 — ${u.name}`, `${u.name}을(를) 처음 격파했다.`, u.typeId
        ));
        this._tickSideQuests('bossKills', 1);
      } catch (e) {}
    }
    // 빌드 체감 — 언데드/좀비 죽을 때 위로 떠오르는 영혼 입자 (lifescream / undead 시너지 활성 시 강화)
    if (u.team === 'monster' && (u.tags.includes('undead') || u.tags.includes('zombie'))) {
      const intense = this.activeSynergies.has('lifescream') || this.activeSynergies.has('undead');
      this.spawnParticles(u.x, u.y - 18, '#7bed9f', intense ? 14 : 6);
      if (intense) this.spawnDamageText(u.x, u.y - 32, '👻', '#7bed9f', false, false);
    }
    if (u.team === 'hero') {
      this.killCount++;
      // 보너스 웨이브 ×2 / echo 유물: 콤보 5+ 시 ×2 (스택)
      let mpReward = this.bonusWaveActive ? u.mpReward * 2 : u.mpReward;
      if (this.relics.has('echo') && this.combo >= 5) mpReward *= 2;
      // CL-1: Rally 활성 중 처치 = 마력 +10 추가 (능동 행동 보상)
      if (this.rallyActiveT > 0) {
        mpReward += 10;
        this.rallyBonusKills++;
        this.spawnDamageText(u.x, u.y - 36, '⚡+10 마력', '#FDCB6E', false, true);
      }
      // 빌드 체감 — 마법 시너지 활성 + 마법 태그 처치 시 마력 +2 + 룬 입자
      // (마법 빌드 = mpGen + 마력 경제 차별화)
      if (this.activeSynergies.has('magic') && this._lastKillerTags?.includes('magic')) {
        mpReward += 2;
        this.spawnDamageText(u.x, u.y - 36, '🔮+2', '#a55eea', false, false);
        this.spawnParticles(u.x, u.y - 16, '#a55eea', 4);
      }
      // 5차 — beast_wrath T1: kill-chain 윈도우 활성 시 마력 ×1.5
      if (this._killChainT > 0 && this._buildBonus.killMpChainMul > 1) {
        const before = mpReward;
        mpReward = Math.floor(mpReward * this._buildBonus.killMpChainMul);
        const delta = mpReward - before;
        if (delta > 0) {
          this.spawnDamageText(u.x, u.y - 36, `🐺+${delta}`, '#FF6B6B', false, false);
          this.spawnParticles(u.x, u.y - 14, '#FF6B6B', 4);
        }
      }
      // 5차 — greedy_path T1: 처치당 flat +N 마력
      if (this._buildBonus.killMpBonusFlat > 0) {
        mpReward += this._buildBonus.killMpBonusFlat;
        this.spawnDamageText(u.x, u.y - 50, `🪙+${this._buildBonus.killMpBonusFlat}`, '#FDCB6E', false, false);
      }
      // 5차 — 숨겨진 시너지 killMpBonus
      if (this._hiddenKillMpBonus > 0) {
        mpReward += this._hiddenKillMpBonus;
      }
      // 5차 — secret_centurion: 한 런 100처치 트리거
      if (this.killCount >= 100) this.tryUnlockSecret('secret_centurion');
      // 5차 — beast_wrath T1: 처치 시 1.5초 윈도우 ON (다음 처치까지)
      if (this._buildBonus.killMpChainMul > 1) this._killChainT = 1.5;
      // 5차 — dark_mystic T2: dark 태그 처치 시 0.8초 fulldark 강화 윈도우
      if (this._buildBonus.darkKillProc && this._lastKillerTags?.includes('dark')) {
        if (this._darkProcT === 0) {
          this.spawnParticles(u.x, u.y - 16, '#7B2D8E', 8);
          this.flashEdge('#7B2D8E', 0.4);
        }
        this._darkProcT = 0.8;
        this.recalcSynergies();
      }
      this._lastKillerTags = undefined;  // 1회 사용 후 리셋
      this.addMP(mpReward);
      // 코인 흐름 (캐릭터 → 마력바)
      const coinCount = Math.min(5, Math.ceil(u.mpReward / 8));
      for (let i = 0; i < coinCount; i++) {
        this.safeTimeout(() => this.spawnCoinFlow(u.x, u.y - 18, W / 2 + (Math.random() - 0.5) * 40, 55), i * 60);
      }
      this.combo++;
      this.comboT = 5.0;
      if (this.combo > this.comboBest) this.comboBest = this.combo;
      // 콤보 마일스톤 — 액티브 보상 (Vampire Survivors 킬 스트릭 톤)
      if (this.combo === 5 || this.combo === 10 || this.combo === 20 || this.combo === 30 || this.combo === 50) {
        const tone = this.combo >= 50 ? '#FF7675' : this.combo >= 20 ? '#FDCB6E' : '#FFEAA7';
        let subText = '연쇄 처치';

        // 5콤보 — 마력 +20 즉시
        if (this.combo === 5) {
          this.addMP(20);
          subText = '마력 +20!';
          // TUT-5a: 첫 5콤보 도달 학습 — 핵심만, 후속 마일스톤은 발동 시점에 banner로 안내
          this.queueTutorial(
            'tut_combo5',
            '🔥 5 COMBO!',
            '연속 처치를 이어가면 콤보가 쌓입니다.\n\n방금 5콤보 보상: 마력 +20!\n5초 안에 다음 적을 처치하면 콤보 유지.',
            '🔥',
          );
        }
        // 10콤보 — 모든 적 0.5초 freeze
        else if (this.combo === 10) {
          for (const h of this.heroes) {
            if (h.dead) continue;
            h.frozen = Math.max(h.frozen, 0.5);
          }
          subText = '⛇ 시간 정지!';
          this.flashScreen('#74B9FF', 0.5);
        }
        // 20콤보 — 화면 전체 화염 폭발 (모든 적 maxHp 8% 데미지)
        else if (this.combo === 20) {
          for (const h of this.heroes) {
            if (h.dead) continue;
            this.takeDamage(h, h.maxHp * 0.08);
            h.dotEffects.push({ dmg: h.maxHp * 0.02, dur: 2, tick: 0, color: '#FF6B6B' });
          }
          subText = '🔥 화염 폭발!';
          this.flashScreen('#D63031', 0.65);
          this.shakeFx(18);
        }
        // 30콤보 — 마력 풀 + 다음 카드 펼치기 비용 0
        else if (this.combo === 30) {
          this.mp = this.mpMax;
          this.cardRevealCount = 0;  // 다음 3회 비용 ×0.5 재발동
          subText = '⚡ 마력 풀충전!';
        }
        // 50콤보 — 필살기 게이지 풀충전
        else if (this.combo === 50) {
          this.ulti.gauge = this.ulti.max;
          this.ulti.ready = true;
          subText = '★ 필살기 충전 ★';
          this.flashScreen('#FDCB6E', 0.85);
          this.shakeFx(22);
          this.hitStopT = 0.18;
        }

        this.showBanner(`${this.combo} COMBO!`, subText, tone, 1.0);
        this.flashEdge(tone, 0.5);
        this.shakeFx(Math.min(14, this.combo / 4));
        Audio.critical_hit();
        Ait.haptic('heavy');
      }
      // CastleSystem: 필살기 게이지 가산량
      const baseGain = calculateUltiChargeGain({
        isBoss: !!u.isBoss,
        hasOracleRelic: this.relics.has('oracle'),
        demonPowerChargeRate: this.demonPower.ultiChargeRate,
      });
      // 5차 — 진화 유물 prophecy/solar_crown: 충전 곱
      const gain = baseGain * this.fusedEffectMul('ultiChargeMul');
      const wasReady = this.ulti.ready;
      this.ulti.gauge = Math.min(this.ulti.max, this.ulti.gauge + gain);
      if (this.ulti.gauge >= this.ulti.max) {
        this.ulti.ready = true;
        // TUT-10: 첫 필살기 충전 학습
        if (!wasReady) {
          this.queueTutorial(
            'tut_ulti_ready',
            '✨ 필살기 충전!',
            '우측 보라색 버튼이 빛납니다 — 탭으로 발동.\n\n위급한 순간 또는 보스에 사용하세요.',
            '✨',
          );
        }
      }
      // greed: 용사 처치 시 영혼석 +1 (gameOver에서 합산되도록 큐에 누적)
      if (this.relics.has('greed')) this.queuedBonusStones += 1;
      // bloodmoon: 보스 처치 +30 영혼석 (진화 유물 necropolis/midas: ×1.5/×1.3)
      if (u.isBoss && this.relics.has('bloodmoon')) {
        this.queuedBonusStones += Math.floor(30 * this.fusedEffectMul('bossSoulstoneMul'));
      }
      // 5차 — 진화 유물 venomfang: 처치 시 마왕성 +N% HP 흡혈
      const lifesteal = this.fusedEffectAdd('castleLifestealOnKill');
      if (lifesteal > 0) {
        const heal = this.castleMaxHp * lifesteal;
        this.castleHp = Math.min(this.castleMaxHp, this.castleHp + heal);
      }
      // 미션/업적 트래킹
      trackMissionProgress('kill', 1, 'add');
      if (u.isBoss) trackMissionProgress('boss', 1, 'add');
      // ★ 작전 화면: healer 처치 카운트
      if (u.typeId === 'healer') this.healerKills++;
      // OVERHAUL §3.5: 적 도감 조각 — 일반 hero +1, 보스 +5 (보스도 typeId로 구분)
      if (!u.isBoss) {
        const activated = useSaveStore.getState().addHeroFragment(u.typeId, 1);
        if (activated) {
          this.showBanner('🩸 적 분석 완료!', `${u.name} — 영구 약화 -10%`, '#FDCB6E', 2.0);
          this.flashEdge('#FDCB6E', 0.6);
          Audio.evolve_sfx();
        }
        // 5차 — 단골 적: 누적 처치 임계 도달 시 sympathetic 대사 (런 단위 1회)
        const totalFragments = useSaveStore.getState().heroFragments[u.typeId] || 0;
        for (const th of HERO_FAMILIAR_THRESHOLDS) {
          if (totalFragments < th) break;
          const key = `${u.typeId}:${th}`;
          if (this._familiarShown.has(key)) continue;
          const line = getFamiliarLine(u.typeId, th);
          if (!line) { this._familiarShown.add(key); continue; }
          this._familiarShown.add(key);
          this.safeTimeout(() => this.speakDemon({ text: line, mood: 'calm' }), 700);
          break;  // 한 번에 한 임계만
        }
      }
      trackMissionProgress('combo', this.combo, 'max');
      if (this.combo >= 20) unlockAchievement('combo20');
      if (this.combo >= 50) {
        unlockAchievement('combo50');
        // 5차 — secret_combo_master 해금
        this.tryUnlockSecret('secret_combo_master');
      }
      if (u.isBoss) {
        // 5차 — 시즌 보스 처치 보상 자동 지급
        if (this._activeSeasonalBoss) {
          try {
            const isNew = useSaveStore.getState().recordSeasonalBossKill(
              this._activeSeasonalBoss.id,
              this._activeSeasonalBoss.reward,
            );
            if (isNew) {
              const sb = this._activeSeasonalBoss;
              this.safeTimeout(() => {
                this.showBanner(`🏆 시즌 보스 처치 — ${sb.name}`, `영혼석 +${sb.reward.stones}${sb.reward.recruitId ? ` / 모집: ${sb.reward.recruitId}` : ''}`, '#FDCB6E', 2.6);
                this.flashScreen('#FDCB6E', 0.8);
              }, 1800);
              this.safeTimeout(() => this.speakDemon({ text: sb.defeatLine, mood: 'triumph' }), 2400);
            }
          } catch (e) {}
          this._activeSeasonalBoss = null;
        }
        this.bossUnit = null; this.bossActive = false;
        this.shakeFx(14); Ait.haptic('heavy');
        // 보스 처치 = 강한 HIT-STOP (Hades 보스 컷 패턴)
        this.hitStopT = 0.18;
        this.flashScreen('#FFEAA7', 0.7);
        this.showBanner('보스 처치!', `${u.name} 격파`, '#FFEAA7', 1.6);
        // OVERHAUL §4.3: 보스 처치 후 stratum BGM 복귀
        const cur = this._currentStratum;
        if (cur) Audio.bgmCrossfade(`stratum_${cur.id}`, 500);
        else Audio.bgmCrossfade('battle', 500);
        // OVERHAUL §3.3 + §3.4: 빌드 통계 + 마왕 승리 대사
        this.buildStats.bossKills++;
        this.updateBuildBonus('bossKill');
        // 5차 — greedy_path T2: 보스 처치 영혼석 보너스
        if (this._buildBonus.bossSoulstoneMul > 1) {
          const extra = Math.floor(30 * (this._buildBonus.bossSoulstoneMul - 1));
          this.queuedBonusStones += extra;
          this.spawnDamageText(u.x, u.y - 60, `🪙+${extra} 영혼석`, '#FDCB6E', false, true);
        }
        // 5차 — undead_lord T2: 보스 처치 시 죽은 undead/zombie 모두 풀 부활 (사이클당 1회)
        if (this._buildBonus.fullReviveOnBossKill && !this._undeadFullReviveUsedThisCycle) {
          let revived = 0;
          for (const m of this.monsters) {
            if (!m.dead) continue;
            if (!(m.tags.includes('undead') || m.tags.includes('zombie'))) continue;
            if (m.revived) continue;
            m.dead = false;
            m.revived = true;
            m.hp = m.maxHp * m.hpMul;
            m.flash = 0.5;
            this.spawnParticles(m.x, m.y - 18, '#a55eea', 18);
            this.spawnParticles(m.x, m.y - 18, '#7bed9f', 12);
            this.effects.push({ type: 'aoeRing', x: m.x, y: m.y - 14, age: 0, life: 0.8, color: '#7bed9f', r: 36 });
            revived++;
          }
          if (revived > 0) {
            this._undeadFullReviveUsedThisCycle = true;
            this.showBanner('☠ 죽음의 권능', `${revived}체 부활`, '#7bed9f', 1.8);
            this.flashScreen('#7bed9f', 0.55);
            Audio.evolve_sfx();
            Ait.haptic('heavy');
            this.recalcSynergies();
          }
        }
        this.safeTimeout(() => this.speakDemon(pickDemonLine(DEMON_LINES_BOSS_KILL)), 1500);
        // OVERHAUL §3.4: 누적 보스 처치 + 마왕 강화 해금 알림
        const beforeKills = useSaveStore.getState().totalBossKills;
        useSaveStore.getState().addBossKill();
        const afterKills = beforeKills + 1;
        // 새로 해금된 power 있는지 확인
        const newPower = DEMON_POWERS.find((p) => p.unlockBossKills === afterKills);
        if (newPower) {
          this.safeTimeout(() => {
            this.showBanner(`✨ 마왕 강화 — ${newPower.name}`, newPower.desc, '#F5A623', 2.4);
            this.flashEdge('#F5A623', 0.6);
            Audio.evolve_sfx();
          }, 2200);
        }
        // BAL-5: 신규 5런 anti-frustration — 보스 처치 시 마왕성 +30% HP 자동
        const userRuns = useSaveStore.getState().runs;
        if (userRuns < 5) {
          const heal = Math.floor(this.castleMaxHp * 0.3);
          this.castleHp = Math.min(this.castleMaxHp, this.castleHp + heal);
          this.spawnDamageText(40, GROUND_Y - 40, `+${heal} HP`, '#26de81', false, true);
        }
      }
    } else {
      this.recalcSynergies();
    }
  }

  /**
   * 5차 — 마왕 비밀 능력 해금 시도. 이미 해금돼 있으면 noop.
   * 새로 해금되면 임팩트 연출 + banner.
   */
  private tryUnlockSecret(secretId: string) {
    try {
      const isNew = useSaveStore.getState().unlockSecret(secretId);
      if (!isNew) return;
      const def = DEMON_SECRETS.find((s) => s.id === secretId);
      if (!def) return;
      this.showBanner(`✦ 마왕 비밀 능력 해금 — ${def.icon} ${def.name}`, def.effectDesc, '#FDCB6E', 2.6);
      this.flashScreen('#F5A623', 0.7);
      this.flashEdge('#F5A623', 0.85);
      this.shakeFx(18);
      Audio.evolve_sfx();
      Ait.haptic('heavy');
      this.slowMoT = Math.max(this.slowMoT, 0.5);
      // 황금 입자 폭발
      for (let i = 0; i < 80; i++) {
        this.spawnParticles(W / 2, FIELD.y + FIELD.h / 2, '#F5A623', 1);
      }
    } catch (e) {}
  }

  /**
   * 5차 — 유물 진화 자동 발동 검사.
   * 새로 추가된 유물 1개 + 기존 유물 1개로 페어가 완성되면 자동 발동 + 임팩트 연출.
   * 발동 즉시 onFuseInstantMp 효과 적용 (예: midas 즉시 +200).
   */
  private checkRelicFusions() {
    const ready = findReadyFusions(this.relics, this.fusedRelics);
    for (const f of ready) {
      this.fusedRelics.add(f.id);
      this._fusedDefs.push(f);
      // 즉시 효과
      if (f.effects.onFuseInstantMp) {
        this.addMP(f.effects.onFuseInstantMp);
        this.spawnDamageText(W / 2, FIELD.y + 30, `+${f.effects.onFuseInstantMp} MP`, '#FDCB6E', false, true);
      }
      // 큰 임팩트 — Slay the Spire boss relic 톤
      this.showBanner(`✦ 유물 진화 — ${f.icon} ${f.name} ✦`, f.desc, '#FDCB6E', 2.4);
      this.flashScreen('#FDCB6E', 0.7);
      this.flashEdge('#FDCB6E', 0.85);
      this.shakeFx(16);
      this.slowMoT = Math.max(this.slowMoT, 0.5);
      this.hitStopT = Math.max(this.hitStopT, 0.18);
      Audio.evolve_sfx();
      Ait.haptic('heavy');
      // 황금 입자 폭발
      for (let i = 0; i < 100; i++) {
        this.spawnParticles(W / 2, FIELD.y + FIELD.h / 2, '#FDCB6E', 1);
      }
      // 박물관 — 유물 진화 발견
      try {
        useSaveStore.getState().addMuseumEntry(makeMuseumEntry(
          'first_synergy', `유물 진화 — ${f.name}`, `${f.parents[0]} + ${f.parents[1]} = ${f.name}`, f.id
        ));
      } catch (e) {}
    }
  }

  /** 진화 유물 효과 합산 (per-frame caching 없이 즉석 — 진화는 보통 1~3개) */
  private fusedEffectMul(key: 'globalAtkMul' | 'castleDmgTakenMul' | 'heroSpdMul' | 'ultiChargeMul' | 'cardCostMul' | 'bossSoulstoneMul'): number {
    let m = 1;
    for (const f of this._fusedDefs) {
      const v = f.effects[key];
      if (typeof v === 'number') m *= v;
    }
    return m;
  }
  private fusedEffectAdd(key: 'mpRegenAdd' | 'waveStartFreezeAdd' | 'castleLifestealOnKill'): number {
    let s = 0;
    for (const f of this._fusedDefs) {
      const v = f.effects[key];
      if (typeof v === 'number') s += v;
    }
    return s;
  }

  /**
   * 빌드 보너스 재계산 — buildStats가 갱신될 때마다 호출 (카드픽/보스킬/필살기 후).
   * 새로 활성화된 빌드(Tier 1 첫 진입 / Tier 2 첫 진입)는 banner + flash + Audio.relic_sfx.
   */
  private updateBuildBonus(reason: string = '') {
    const next = getActiveBuildBonusState(this.buildStats);
    // 새로 활성된 라벨 — banner
    for (const lbl of next.activeLabels) {
      const key = `${lbl.id}:t${lbl.tier}`;
      if (this._shownBuildBonuses.has(key)) continue;
      this._shownBuildBonuses.add(key);
      const tierTxt = lbl.tier === 2 ? '완성' : '활성';
      this.showBanner(`${lbl.icon} ${lbl.name} ${tierTxt}!`, lbl.tier === 2 ? '🌟 빌드 보너스 풀 발동' : '⚡ 빌드 보너스 발동', '#FDCB6E', 1.6);
      this.flashEdge('#FDCB6E', 0.7);
      Audio.relic_sfx();
      Ait.haptic('medium');
      // 5차 — secret_full_magic: magic_school 100% 시 해금
      if (lbl.id === 'magic_school' && lbl.tier === 2) {
        this.tryUnlockSecret('secret_full_magic');
      }
    }
    this._buildBonus = next;
    void reason;
  }

  /* ===== Synergy ===== */
  private recalcSynergies() {
    // 살아있는 몬스터의 태그 카운트 집계
    const counts: Record<string, number> = {};
    const aliveTypeIds = new Set<string>();
    for (const m of this.monsters) {
      if (m.dead) continue;
      for (const tag of m.tags) counts[tag] = (counts[tag] || 0) + 1;
      aliveTypeIds.add(m.typeId);
    }
    // 5차 — 숨겨진 시너지 평가 (typeId 조합)
    const newHiddenDefs = activeHiddenSynergies(aliveTypeIds);
    const newHiddenIds = new Set(newHiddenDefs.map((h) => h.id));
    // 새 발동 — banner + 발견 마킹
    for (const def of newHiddenDefs) {
      if (this.activeHiddenSynergyIds.has(def.id)) continue;
      this.showBanner(`✨ 숨겨진 시너지 — ${def.name}`, def.desc, '#a55eea', 2.0);
      this.flashScreen('#a55eea', 0.55);
      this.flashEdge('#a55eea', 0.7);
      Audio.evolve_sfx();
      Ait.haptic('heavy');
      try {
        const isNew = useSaveStore.getState().discoverHiddenSynergy(def.id);
        if (isNew) {
          // 박물관 — 첫 발견 마킹
          useSaveStore.getState().addMuseumEntry(makeMuseumEntry(
            'first_synergy', `숨겨진 시너지 — ${def.name}`, def.desc, def.id
          ));
          // 6종 모두 발견 시 secret_genesis 해금
          const total = useSaveStore.getState().discoveredHiddenSynergies.length;
          if (total >= HIDDEN_SYNERGIES.length) {
            this.tryUnlockSecret('secret_genesis');
          }
        }
      } catch (e) {}
    }
    this.activeHiddenSynergyIds = newHiddenIds;
    this._activeHiddenDefs = newHiddenDefs;
    this._hiddenKillMpBonus = 0;
    this._hiddenMpRegenAdd = 0;
    for (const def of newHiddenDefs) {
      if (def.effects.killMpBonus) this._hiddenKillMpBonus += def.effects.killMpBonus;
      if (def.effects.mpRegenAdd) this._hiddenMpRegenAdd += def.effects.mpRegenAdd;
    }
    // CombatSystem: 활성 시너지 set
    const prevActive = this.activeSynergies;
    const active = activeSynergyIdsFor(counts);
    // CombatSystem: 단위별 mul 산출 후 mutation
    const skills = useSaveStore.getState().skills;
    const branchInfo = this.activeBranch ? {
      tagBoost: this.activeBranch.def.tagBoost,
      buff: this.activeBranch.def.buff,
    } : undefined;
    // 5차 — 진화 유물 globalAtkMul (bloodmask / solar_crown)
    let fusedGlobalAtk = this.fusedEffectMul('globalAtkMul');
    // 5차 — 마왕 비밀 능력 globalAtkMul (centurion / genesis)
    fusedGlobalAtk *= this._secretsAggregate.globalAtkMul;
    // 5차 — 숨겨진 시너지 — 활성화된 hidden synergies 효과 합성
    let hiddenAtkMul = 1;
    let hiddenHpMul = 1;
    let hiddenSpdMul = 1;
    for (const h of this._activeHiddenDefs) {
      if (h.effects.globalAtkMul) hiddenAtkMul *= h.effects.globalAtkMul;
      if (h.effects.globalHpMul) hiddenHpMul *= h.effects.globalHpMul;
      if (h.effects.globalSpdMul) hiddenSpdMul *= h.effects.globalSpdMul;
    }
    fusedGlobalAtk *= hiddenAtkMul;
    for (const m of this.monsters) {
      const muls = calculateUnitMul({
        tags: m.tags,
        activeSynergyIds: active,
        hasMaskRelic: this.relics.has('mask'),
        edictDarkSynergyMul: this.todayEdictDef.modifiers.darkSynergyMul,
        activeBranch: branchInfo,
        monAtkSkillLevel: skills.monAtk,
        monHpSkillLevel: skills.monHp,
        rallyActive: this.rallyActiveT > 0,
        buildTagAtkMul: this._buildBonus.tagAtkMul,
        buildTagHpMul: this._buildBonus.tagHpMul,
        buildTagSpdMul: this._buildBonus.tagSpdMul,
        ultiBuffAtkMul: this._ultiBuffT > 0 ? this._buildBonus.ultiBuffAtkMul : undefined,
        darkKillProcAtkMul: this._darkProcT > 0 ? 1.5 : undefined,
      });
      m.atkMul = muls.atkMul * fusedGlobalAtk;
      m.hpMul = muls.hpMul * hiddenHpMul;
      m.spdMul = muls.spdMul * hiddenSpdMul;
    }
    this.activeSynergies = active;
    trackMissionProgress('synergy', active.size, 'max');
    if (active.size >= 4) unlockAchievement('synergyAll');
    // 새로 활성화된 시너지 → 임팩트 (Slay the Spire 카드 시너지 톤)
    let firstSynergyEver = !this._synergyShown;
    for (const id of active) {
      if (!prevActive.has(id)) {
        const syn = SYNERGIES.find((s) => s.id === id);
        if (!syn) continue;
        this.showBanner(`${syn.name} 발동!`, syn.desc, '#a55eea', 1.0);
        this.flashEdge('#a55eea', 0.85);
        this.shakeFx(7);
        Audio.relic_sfx();
        Ait.haptic('medium');
        // OVERHAUL §3.3: 시너지 활성 처치 누적 (런 끝나면 buildStats로 사용)
        this.buildStats.synergyActiveProcs[id] = (this.buildStats.synergyActiveProcs[id] || 0) + 1;
        // v11 박물관 — first_synergy 자동 추가
        try {
          useSaveStore.getState().addMuseumEntry(makeMuseumEntry(
            'first_synergy', `첫 시너지 — ${syn.name}`, syn.desc, id
          ));
        } catch (e) {}
        // OVERHAUL §3.4: 첫 시너지 발동 시 마왕 대사
        if (firstSynergyEver) {
          this.safeTimeout(() => this.speakDemon(pickDemonLine(DEMON_LINES_SYNERGY)), 800);
        }
        // TUT-3: 첫 시너지 풀모달 학습
        if (firstSynergyEver) {
          this.queueTutorial(
            'tut_synergy',
            '🌀 시너지 발동!',
            `같은 태그 카드를 모으면 시너지가 발동됩니다.\n\n방금: ${syn.name} — ${syn.desc}\n\n좌상단 🌀 칩 탭으로 진행도 확인.`,
            '🌀',
          );
          this._synergyShown = true;
          firstSynergyEver = false;
        }
      }
    }
  }

  /* ===== Spin ===== */
  /** 카드 펼치기 비용 — 첫 3회는 50% 할인 (Brotato/뱀서 초반 가속 패턴) */
  currentCardCost() {
    const ch = this.challengeId ? CHALLENGES[this.challengeId] : undefined;
    let c = calculateCardCost({
      baseCost: 100,
      cardCount: this.cardRevealCount,
      hasPactRelic: this.relics.has('pact'),
      costSkillLevel: useSaveStore.getState().skills.cardCost,
      demonPowerCostReduction: this.demonPower.cardCostReduction,
      challengeCostMul: ch?.modifiers.cardCostMul,
    });
    // 5차 — greedy_path T2: 카드 비용 추가 곱
    if (this._buildBonus.cardCostExtraMul < 1) {
      c = Math.ceil(c * this._buildBonus.cardCostExtraMul);
    }
    // 5차 — 진화 유물 효과 (eternal_pact / karma)
    const fusedMul = this.fusedEffectMul('cardCostMul');
    if (fusedMul < 1) c = Math.ceil(c * fusedMul);
    // 5차 — 마왕 비밀 능력 secret_jackpot_legend: ×0.95
    if (this._secretsAggregate.cardCostMul < 1) {
      c = Math.ceil(c * this._secretsAggregate.cardCostMul);
    }
    return c;
  }
  beginSpin() {
    if (this.cardChoices || this.slot.active) return false;
    const cost = this.currentCardCost();
    const aliveCount = this.monsters.filter((m) => !m.dead).length;
    // CardSystem: 위급 무료 펼치기 판정
    const emergency = shouldGrantEmergencyReveal({
      mp: this.mp,
      cost,
      castleHpPct: this.castleHp / this.castleMaxHp,
      aliveMonsterCount: aliveCount,
      emergencyUsedCount: this.emergencyRevealUsedCount,
      emergencyMaxUses: 1 + this.demonPower.emergencyRevealExtra,
    });
    let isEmergency = false;
    if (!emergency.hasEnoughMp) {
      if (emergency.emergencyAllowed) {
        this.emergencyRevealUsed = true;
        this.emergencyRevealUsedCount++;
        isEmergency = true;
        this.showBanner('⚡ 위급 자원!', '무료 카드 펼치기 (1회)', '#FDCB6E', 1.4);
        Audio.relic_sfx();
      } else {
        Audio.ui_error();
        return false;
      }
    } else {
      this.mp -= cost;
    }
    // BUG-005: emergency 무료 펼치기는 cardRevealCount(할인 카운터)에 포함하지 않음
    if (!isEmergency) this.cardRevealCount++;
    Audio.cardReveal_start();
    trackMissionProgress('cardReveal', 1, 'add');
    // QA H-3: 5회 카드 펼치기 후 AUTO 모드 안내 1회 (autoReveal OFF 상태 + tut 미시청)
    if (this.cardRevealCount === 5 && !this.autoReveal) {
      this.queueTutorial(
        'tut_auto',
        '🔁 AUTO 모드',
        '하단 🔁 AUTO 버튼을 켜면 카드를 자동으로 펼쳐서 자동으로 선택합니다.\n\n• 카드 등장 후 0.6초 뒤 최적의 카드 자동 선택\n• 진화/시너지 우선 알고리즘 사용\n• 언제든 다시 끌 수 있어요',
        '🔁',
      );
    }
    // CardSystem: 후보 3장 생성 위임
    const ch = this.challengeId ? CHALLENGES[this.challengeId] : undefined;
    const bonusTag = this.nextRevealBonusTag;
    this.nextRevealBonusTag = null;  // 1회 사용
    const pickFn = (): string => pickCardCandidate({
      challengePool: ch?.modifiers.monsterPool,
      recruitedPool: this.recruitedPool,
      bonusTag,
      activeBranchTag: this.activeBranch ? this.activeBranch.def.tagBoost : null,
      fallbackPick: pickRandomMonster,
    });
    const choiceResult = createCardChoices({
      pickFn,
      lockedCardId: this.lockedCardId,
      challengePool: ch?.modifiers.monsterPool,
      recruitedPool: this.recruitedPool,
      tagPickCount: this.tagPickCount,
      wave: this.wave,
    });
    const results: string[] = choiceResult.results.slice();
    this.lockedCardId = null;  // lock은 1회 사용 (lockApplied 여부와 무관 — 풀 외면 폐기)
    const tripleReveal = choiceResult.tripleReveal;
    this.riskCardSlot = choiceResult.riskCardSlot;
    // 릴 스트립 생성
    for (let i = 0; i < 3; i++) {
      this.slot.strips[i] = this.buildReelStrip(results[i]);
    }
    this.slot.active = true;
    this.slot.finished = false;
    this.slot.tripleReveal = tripleReveal;
    this.slot.results = results;
    // 카드 펼치기 시간 단축 — 모바일 즉시성 우선 (기존 2.0초 → 1.1초)
    this.slot.reelStops = [0.5, 0.8, 1.1];
    this.slot.reelScroll = [0, 0, 0];
    this.slot.reelSpeeds = [1500, 1600, 1700];
    this.slot.reelStopped = [false, false, false];
    this.slot.tickTimers = [0, 0, 0];
    this.slot.flashTimers = [0, 0, 0];
    return true;
  }

  /** 릴 스트립 (긴 세로 띠) — 24셀 × 60px = 1440px */
  private buildReelStrip(finalType: string): ReelStrip {
    const items: string[] = [];
    // 슬롯 릴 시각용 — resolveActivePool 통일 (challenge > recruited > starter fallback / null)
    const ch = this.challengeId ? CHALLENGES[this.challengeId] : undefined;
    const visualPool = resolveActivePool(ch?.modifiers.monsterPool, this.recruitedPool);
    for (let i = 0; i < STRIP_LEN; i++) {
      items.push(visualPool ? visualPool[Math.floor(Math.random() * visualPool.length)] : pickRandomMonster());
    }
    const finalIdx = STRIP_LEN - 4;
    items[finalIdx] = finalType;
    const c = document.createElement('canvas');
    c.width = REEL_CELL; c.height = REEL_CELL * STRIP_LEN;
    const cx = c.getContext('2d')!;
    cx.imageSmoothingEnabled = false;
    const rarityCol: Record<string, string> = {
      common: '#9aa0a8', uncommon: '#26de81', rare: '#0984E3',
      epic: '#a55eea', legendary: '#FDCB6E',
    };
    for (let i = 0; i < STRIP_LEN; i++) {
      const cellY = i * REEL_CELL;
      const def = MONSTERS[items[i]];
      const rarity = def?.rarity || 'common';
      const accent = rarityCol[rarity] || '#888';
      // 셀 배경 — 등급별 미세한 색상 톤(다크 베이스)
      const bgGrad = cx.createLinearGradient(0, cellY, 0, cellY + REEL_CELL);
      bgGrad.addColorStop(0, '#1f0f38');
      bgGrad.addColorStop(0.5, '#15082a');
      bgGrad.addColorStop(1, '#1a0c30');
      cx.fillStyle = bgGrad;
      cx.fillRect(0, cellY, REEL_CELL, REEL_CELL);
      // 셀 구분선 (얇은 광택)
      cx.fillStyle = 'rgba(165,94,234,0.35)';
      cx.fillRect(0, cellY, REEL_CELL, 1);
      cx.fillStyle = 'rgba(0,0,0,0.6)';
      cx.fillRect(0, cellY + REEL_CELL - 1, REEL_CELL, 1);
      // 등급 후광 (radial)
      const rg = cx.createRadialGradient(
        REEL_CELL / 2, cellY + REEL_CELL / 2, 4,
        REEL_CELL / 2, cellY + REEL_CELL / 2, REEL_CELL * 0.6,
      );
      rg.addColorStop(0, accent + '55');
      rg.addColorStop(1, accent + '00');
      cx.fillStyle = rg;
      cx.fillRect(0, cellY, REEL_CELL, REEL_CELL);
      if (def) {
        const sp = def.buildSprite();
        // 정비율 letterbox — 큰 native sprite를 셀 안에 맞춤 (squash 금지)
        const padding = 4;
        const cellInner = REEL_CELL - padding * 2;
        const ratio = Math.min(cellInner / sp.width, cellInner / sp.height);
        const sw = Math.max(1, Math.floor(sp.width * ratio));
        const sh = Math.max(1, Math.floor(sp.height * ratio));
        const dx = (REEL_CELL - sw) / 2;
        const dy = cellY + (REEL_CELL - sh) / 2;
        // 발 그림자
        cx.fillStyle = 'rgba(0,0,0,0.45)';
        cx.beginPath();
        cx.ellipse(REEL_CELL / 2, cellY + REEL_CELL - 5, sw * 0.35, 2.5, 0, 0, Math.PI * 2);
        cx.fill();
        cx.drawImage(sp, dx, dy, sw, sh);
        // 등급 닷 (오른쪽 위, 보석 스타일)
        cx.fillStyle = accent;
        cx.beginPath();
        cx.arc(REEL_CELL - 5, cellY + 5, 2.5, 0, Math.PI * 2);
        cx.fill();
        cx.fillStyle = 'rgba(255,255,255,0.7)';
        cx.beginPath();
        cx.arc(REEL_CELL - 5.5, cellY + 4.5, 1, 0, Math.PI * 2);
        cx.fill();
        // 별 갯수 (왼쪽 위)
        if (def.star >= 2) {
          cx.fillStyle = '#FDCB6E';
          cx.font = 'bold 7px sans-serif';
          cx.textAlign = 'left';
          cx.fillText('★'.repeat(def.star), 3, cellY + 9);
        }
      }
    }
    return { canvas: c, items, finalIdx };
  }

  private updateSlot(dt: number) {
    if (!this.slot.active) return;
    let allStopped = true;
    for (let i = 0; i < 3; i++) {
      if (this.slot.reelStopped[i]) {
        this.slot.flashTimers[i] = Math.max(0, this.slot.flashTimers[i] - dt);
        continue;
      }
      allStopped = false;
      this.slot.reelStops[i] -= dt;
      if (this.slot.reelStops[i] > 0.4) {
        this.slot.reelSpeeds[i] = 1500 + i * 100;
      } else {
        const strip = this.slot.strips[i];
        if (!strip) continue;
        const targetScrollY = (strip.finalIdx - 1) * REEL_CELL;
        const remainTime = Math.max(0.001, this.slot.reelStops[i]);
        const stripH = REEL_CELL * STRIP_LEN;
        let curY = this.slot.reelScroll[i] % stripH;
        let dy = targetScrollY - curY;
        if (dy < 0) dy += stripH;
        if (dy < 200 && this.slot.reelStops[i] > 0.15) dy += stripH;
        this.slot.reelSpeeds[i] = dy / remainTime;
      }
      this.slot.reelScroll[i] += this.slot.reelSpeeds[i] * dt;
      this.slot.tickTimers[i] -= dt;
      if (this.slot.tickTimers[i] <= 0 && this.slot.reelSpeeds[i] > 100) {
        Audio.cardReveal_tick();
        this.slot.tickTimers[i] = Math.max(0.04, 30 / this.slot.reelSpeeds[i]);
      }
      if (this.slot.reelStops[i] <= 0) {
        const strip = this.slot.strips[i];
        if (strip) this.slot.reelScroll[i] = (strip.finalIdx - 1) * REEL_CELL;
        this.slot.reelStopped[i] = true;
        this.slot.flashTimers[i] = 0.28;
        Audio.cardReveal_stop();
        this.shakeFx(3);
      }
    }
    if (allStopped && !this.slot.finished) {
      this.slot.finished = true;
      this.slot.active = false;
      this.safeTimeout(() => this.finalizeSlot(), 380);
    }
  }

  private finalizeSlot() {
    const choices = this.slot.results.filter((x): x is string => x != null);
    // 혼돈의 주사위(dice) — 4번째 보너스 카드 추가 (resolveActivePool 통일)
    if (this.relics.has('dice')) {
      const ch = this.challengeId ? CHALLENGES[this.challengeId] : undefined;
      const pool = resolveActivePool(ch?.modifiers.monsterPool, this.recruitedPool);
      const extra = pool ? pool[Math.floor(Math.random() * pool.length)] : pickRandomMonster();
      choices.push(extra);
    }
    this.cardChoices = choices;
    // CardSystem: 리롤 가능 여부 결정 위임
    this.rerollAvailable = shouldHaveRerollAvailable({
      hasFateRelic: this.relics.has('fate'),
      isNewbie: useSaveStore.getState().runs <= 5,
      unlimitedRerollEdict: !!this.todayEdictDef.modifiers.unlimitedReroll,
    });
    if (this.slot.tripleReveal) {
      Audio.luckySummon_sfx();
      Ait.haptic('heavy');
      this.shakeFx(15);
      unlockAchievement('luckySummon');
      trackMissionProgress('luckySummon', 1, 'add');
      // 5차 — secret_jackpot_legend: 한 런 트리플 5회
      this._runTripleCount++;
      if (this._runTripleCount >= 5) this.tryUnlockSecret('secret_jackpot_legend');
      // 희귀 발견 임팩트
      this.showBanner('✨ 희귀 발견 ✨', '같은 카드 3장!', '#FDCB6E', 1.4);
      this.flashScreen('#FDCB6E', 0.55);
      this.slowMoT = 0.35;
    }
    // QA H-1: 신규 5런 동안은 카드 선택 동안 게임 정지 (읽을 시간 보장)
    // AUTO 모드에서는 정지하지 않음 (자동 픽이 동작해야 하므로)
    if (useSaveStore.getState().runs <= 5 && !this.autoReveal) {
      this.paused = true;
    } else if (!this.autoReveal) {
      // BAL B-7: 6런 이후에는 paused 대신 0.4x 슬로모로 검토 시간 확보 (학습 의도 보존)
      this.slowMoT = Math.max(this.slowMoT, 1.5);
    }
  }

  /** Rally 사용 카운트 증가 (학습 추적) */
  private incrRallyUsed() { this.rallyUsedCount++; }

  /** TUT: 학습 모달 한 번만 큐에 추가. 이미 본 것은 무시 */
  private queueTutorial(id: string, title: string, body: string, icon?: string) {
    const seen = useSaveStore.getState().hasTutorialSeen(id);
    if (seen) return;
    if (this.tutorialQueue.find((t) => t.id === id)) return;
    this.tutorialQueue.push({ id, title, body, icon });
    this.paused = true;
  }
  /** UI에서 호출 — 모달 닫기 */
  consumeTutorial(id: string) {
    useSaveStore.getState().markTutorialSeen(id);
    this.tutorialQueue = this.tutorialQueue.filter((t) => t.id !== id);
    // BUG-001 + OverlayController: 다른 BLOCKS_SIM overlay가 살아있으면 paused 유지
    if (this.tutorialQueue.length === 0) {
      if (this.canResumeFrom('tutorial')) this.paused = false;
      this.tryFlushOverlayQueue();
    }
  }

  /** 웨이브 사이 — HP 회복 (영혼석 50) */
  waveBreakHeal() {
    if (!this.waveBreakActive || this.waveBreakUsed.heal) return false;
    if (!useSaveStore.getState().spendStones(50)) { Audio.ui_error(); return false; }
    this.castleHp = Math.min(this.castleMaxHp, this.castleHp + this.castleMaxHp * 0.3);
    this.waveBreakUsed.heal = true;
    this.spawnDamageText(40, GROUND_Y - 30, '+30% HP', '#26de81', false, true);
    Audio.evolve_sfx();
    Ait.haptic('medium');
    return true;
  }
  /** 웨이브 사이 — 마력 풀 (영혼석 30) */
  waveBreakMpRefill() {
    if (!this.waveBreakActive || this.waveBreakUsed.mpRefill) return false;
    if (!useSaveStore.getState().spendStones(30)) { Audio.ui_error(); return false; }
    this.mp = this.mpMax;
    this.waveBreakUsed.mpRefill = true;
    Audio.relic_sfx();
    Ait.haptic('medium');
    return true;
  }
  /** 웨이브 사이 — 즉시 카드 펼치기 (영혼석 40) */
  waveBreakFreeSpin() {
    if (!this.waveBreakActive || this.waveBreakUsed.freespin) return false;
    if (!useSaveStore.getState().spendStones(40)) { Audio.ui_error(); return false; }
    this.waveBreakUsed.freespin = true;
    // 강제 펼치기 (마력 차감 X — 무료 효과)
    const save = this.mp;
    this.mp = this.currentCardCost();
    this.beginSpin();
    this.mp = Math.max(0, save);  // 비용 무료
    return true;
  }
  /** 웨이브 사이 — 다음 웨이브 시작 */
  waveBreakStart() {
    if (!this.waveBreakActive) return;
    this.waveBreakActive = false;
    this.paused = false;
    // BUG-003: 보류된 유물/이벤트 노출
    // 단계 2: 큐에 deferred overlay 있으면 자동 활성화 시도 (postBreakOffer 포함)
    this._pendingPostBreakOffer = null;  // legacy 필드 정리 — 큐가 권위 source
    this.tryFlushOverlayQueue();
  }

  /** P2-B: 어둠의 손 — 장탭 시 가장 가까운 적 1명 0.7초 정지. 마력 30 소모 */
  shadowGrasp() {
    if (this.mp < 30) {
      Audio.ui_error();
      // 비활성 사유 — 마력 부족 (필요 30)
      this.showBanner('⛓ 마력 부족', `30 마력 필요 (현재 ${Math.floor(this.mp)})`, '#888', 0.7);
      return false;
    }
    // 가장 마왕성에 가까운 (x 가장 작은) 살아있는 적 찾기
    let target: Unit | null = null;
    for (const h of this.heroes) {
      if (h.dead) continue;
      if (!target || h.x < target.x) target = h;
    }
    if (!target) {
      Audio.ui_error();
      this.showBanner('⛓ 대상 없음', '잡을 적이 없습니다', '#888', 0.7);
      return false;
    }
    // 보스 패턴 차단 감지 — 무적 임박/회복 임박/castle strike 임박 중 하나면 차단 표시
    let interruptedPattern: string | null = null;
    if (target.isBoss) {
      const bossDef = BOSSES[target.typeId];
      if (bossDef?.castleStrike && target.castleStrikeCdT > 0 && target.castleStrikeCdT < 1.5) {
        interruptedPattern = '☄ 마왕성 타격 차단!';
      } else if (bossDef?.bossHeal && target.bossHealCdT > 0 && target.bossHealCdT < 1.5) {
        interruptedPattern = '✚ 광역 회복 차단!';
      } else if (bossDef?.invuln && target.invulnCdT > 0 && target.invulnCdT < 1.5) {
        interruptedPattern = '⛨ 무적 차단!';
      }
    }
    this.mp -= 30;
    target.frozen = Math.max(target.frozen, 0.7);
    // 시각: 어둠의 손 효과 — 보라 입자 + 충격 + 정지 링
    for (let i = 0; i < 16; i++) {
      this.spawnParticles(target.x, target.y - 16, '#7B2D8E', 1);
    }
    // 정지 표시 — 보라 ring 0.7초 (frozen 지속시간과 동기)
    this.effects.push({
      type: 'aoeRing',
      x: target.x, y: target.y - 14,
      age: 0, life: 0.7, color: '#a55eea', r: 22,
    });
    this.spawnDamageText(target.x, target.y - 30, '⛓ 정지', '#a55eea', false, true);
    if (interruptedPattern) {
      this.showBanner(interruptedPattern, '결정적 개입', '#FDCB6E', 1.2);
      this.flashEdge('#a55eea', 0.5);
      this.shakeFx(8);
      Ait.haptic('heavy');
    } else {
      Ait.haptic('medium');
    }
    Audio.evolve_sfx();
    return true;
  }

  /** 탭 액션 (Rally) — 모든 살아있는 몬스터에게 1.5초간 이속/공속 +50%. 쿨 2초 */
  rally() {
    if (this.rallyCdT > 0) {
      Audio.ui_error();
      // 비활성 사유 즉시 표시 — "쿨다운 X.Xs"
      this.showBanner('⚡ 쿨다운', `${this.rallyCdT.toFixed(1)}초 후 사용 가능`, '#888', 0.7);
      return false;
    }
    this.rallyCdT = Math.max(0.5, 2.0 - this.demonPower.rallyCdReduction);
    this.rallyActiveT = 1.5;  // BUG-002: 1.5초 동안 buff 활성
    this.incrRallyUsed();
    let count = 0;
    let nearestX = 0, nearestY = 0, found = false;
    for (const h of this.heroes) {
      if (h.dead) continue;
      if (!found || h.x > nearestX) {
        nearestX = h.x; nearestY = h.y; found = true;
      }
    }
    for (const m of this.monsters) {
      if (m.dead) continue;
      this.spawnParticles(m.x, m.y - 16, '#FDCB6E', 6);
      // 빌드 체감 — 각 몬스터에 짧은 황금 aura ring (가속 발동 시각)
      this.effects.push({
        type: 'aoeRing',
        x: m.x, y: m.y - 14,
        age: 0, life: 0.4, color: '#FDCB6E', r: 18,
      });
      // QA-1: 시각화 — 몬스터에서 가장 먼 적 방향으로 황금 라인 (particles)
      if (found) {
        for (let i = 0; i < 5; i++) {
          const t = i / 5;
          this.spawnParticles(
            m.x + (nearestX - m.x) * t,
            m.y - 16 + (nearestY - m.y - 16) * t,
            '#FFEAA7', 1,
          );
        }
      }
      count++;
    }
    if (count === 0) {
      Audio.ui_error();
      this.rallyCdT = 0; this.rallyActiveT = 0; this.rallyUsedCount--;
      // 비활성 사유 — 몬스터 부재
      this.showBanner('⚡ 사용 불가', '아군 몬스터 없음', '#888', 0.7);
      return false;
    }
    // BUG-002: 즉시 recalcSynergies로 rallyActiveT 반영
    this.recalcSynergies();
    this.flashEdge('#FDCB6E', 0.4);
    this.shakeFx(4);
    Audio.ui_confirm();
    Ait.haptic('medium');
    // 항상 짧은 발동 배너 (첫 사용은 더 길게 + 튜토리얼)
    this.showBanner('⚡ 돌격!', `몬스터 ${count}체 가속 1.5초`, '#FDCB6E', 0.8);
    if (this.rallyUsedCount === 1) {
      // TUT-1: 첫 Rally 사용 시 학습 모달
      this.queueTutorial(
        'tut_rally',
        '⚡ 돌격!',
        '몬스터가 1.5초 동안 가속 + 공격력 ↑.\n쿨다운 2초.\n\n적이 마왕성에 가까울 때 사용하세요.',
        '⚡',
      );
    }
    return true;
  }

  /** Tap-to-skip — 카드 공개 즉시 종료 (runs > 3 + 0.5초 경과 후만 허용) */
  skipSlotReveal() {
    if (!this.slot.active) return;
    const runs = useSaveStore.getState().runs;
    if (runs <= 3) { Audio.ui_error(); return; }
    // 0.5초 경과 후만 (가장 마지막 reelStop이 1.1 → 0.6 이하면 허용)
    if (this.slot.reelStops[2] > 0.6) { Audio.ui_error(); return; }
    // 모든 릴 타이머 0 + 결과 위치로 점프
    for (let i = 0; i < 3; i++) {
      this.slot.reelStops[i] = 0;
      const strip = this.slot.strips[i];
      if (strip) this.slot.reelScroll[i] = (strip.finalIdx - 1) * REEL_CELL;
      this.slot.reelStopped[i] = true;
      this.slot.flashTimers[i] = 0.15;
    }
    this.slot.active = false;
    this.safeTimeout(() => this.finalizeSlot(), 100);
    Audio.ui_tap();
  }

  /** 카드 잠금 — 마력 50 소모, 다음 카드 펼치기에서 유지 */
  lockCard(idx: number) {
    // CardSystem: 잠금 가능 여부 판정 위임
    const lock = applyCardLock({
      cardChoices: this.cardChoices,
      idx,
      mp: this.mp,
      lockCost: 50,
    });
    if (!lock.ok) {
      if (lock.reason === 'insufficientMp') Audio.ui_error();
      return false;
    }
    this.mp += lock.mpDelta!;
    this.lockedCardId = lock.lockedCardId!;
    Audio.ui_confirm();
    Ait.haptic('light');
    // TUT-7: 첫 카드 잠금 학습
    this.queueTutorial(
      'tut_lock',
      '🔒 카드 잠금',
      '카드 아래의 🔒 50 버튼을 누르면 카드를 잠글 수 있습니다 (마력 -50).\n\n잠긴 카드는 다음 카드 펼치기에 그대로 유지됩니다.\n\n💡 강한 빌드를 만드는 핵심 — 좋은 카드를 놓치지 마세요!',
      '🔒',
    );
    return true;
  }

  /** 운명의 카드 — 카드 선택 전 1회 다시 뽑기 */
  rerollChoices() {
    const ch = this.challengeId ? CHALLENGES[this.challengeId] : undefined;
    // CardSystem: 리롤 위임
    const result = rerollCardChoices({
      rerollAvailable: this.rerollAvailable,
      cardChoices: this.cardChoices,
      challengePool: ch?.modifiers.monsterPool,
      recruitedPool: this.recruitedPool,
      fallbackPick: pickRandomMonster,
      unlimitedReroll: !!this.todayEdictDef.modifiers.unlimitedReroll,
    });
    if (!result.ok) return;
    this.cardChoices = result.newChoices!;
    this.rerollAvailable = result.newRerollAvailable;
    Audio.ui_tap();
    Ait.haptic('light');
  }
  chooseCard(idx: number) {
    // CardSystem: 선택 검증 + risk 트리거 결정 위임
    const r = chooseCardResult({
      cardChoices: this.cardChoices,
      idx,
      aliveMonsterCount: this.monsters.filter((m) => !m.dead).length,
      maxMonsters: 14,
      riskCardSlot: this.riskCardSlot,
    });
    if (!r.ok) {
      if (r.reason === 'unknownMonster') this.cardChoices = null;
      if (r.reason === 'fieldFull') Audio.ui_error();
      return;
    }
    const t = r.pickedMonsterId!;
    if (r.triggeredRiskCard) {
      const risk = r.triggeredRiskCard;
      for (const eff of risk.risks) this.applyRiskEffect(eff);
      this.showBanner(`⚠ ${risk.name}`, risk.desc, '#FF6B6B', 1.6);
      this.flashEdge('#FF6B6B', 0.5);
    }
    this.riskCardSlot = null;
    const def = MONSTERS[t];
    // TUT-B: 첫 카드 픽 직후 학습 — 진화 규칙 1회 안내
    const isFirstPickEver = !useSaveStore.getState().hasTutorialSeen('tut_first_pick')
      && this.killCount === 0;
    if (isFirstPickEver) {
      this.queueTutorial(
        'tut_first_pick',
        '✅ 몬스터 소환!',
        '카드를 골라 몬스터가 소환됐습니다.\n\n💡 같은 몬스터 3마리를 모으면 진화합니다.\n다음 카드에서 같은 종류를 노려보세요.',
        '✅',
      );
    }

    // 태그 픽 카운트 갱신 (P2-8 동적 가중치)
    if (def) {
      for (const tag of def.tags) {
        this.tagPickCount[tag] = (this.tagPickCount[tag] || 0) + 1;
      }
    }
    // 사이드퀘 — cardPicks 진행
    this._tickSideQuests('cardPicks', 1);
    // OVERHAUL §3.3: 빌드 통계 누적
    this.trackPickStats(t);
    // ★ 작전 화면: MVP 카드 추적
    this.pickedMonsterCount[t] = (this.pickedMonsterCount[t] || 0) + 1;
    // OVERHAUL §3.4: 첫 카드 픽 시 마왕 대사 (1회)
    if (this.killCount === 0 && Object.keys(this.tagPickCount).length === 1) {
      this.speakDemon(pickDemonLine(DEMON_LINES_FIRST_PICK));
    }

    // CardSystem: 등급/태그별 픽 효과 산출 — 호출자가 적용
    const fx = computeCardPickEffects({ pickedMonsterId: t });
    if (fx.mpDelta !== 0) {
      this.mp = Math.max(0, this.mp + fx.mpDelta);
      this.spawnDamageText(W / 2, FIELD.y + 30, `${fx.mpDelta} 마력`, '#FF7675', false, true);
    }
    if (fx.cardRevealCountDelta !== 0) {
      this.cardRevealCount = Math.max(0, this.cardRevealCount + fx.cardRevealCountDelta);
      this.spawnDamageText(W / 2, FIELD.y + 30, '+다음 카드 할인', '#74B9FF', false, false);
    }
    if (fx.nextRevealBonusTag) {
      this.nextRevealBonusTag = fx.nextRevealBonusTag;
    }
    if (fx.castleHpHeal > 0) {
      this.castleHp = Math.min(this.castleMaxHp, this.castleHp + fx.castleHpHeal);
      this.spawnDamageText(40, GROUND_Y - 30, `+${fx.castleHpHeal} HP`, '#26de81', false, true);
    }

    this.spawnMonster(t);
    if (def?.evolveTo) {
      this.evoCounts[t] = (this.evoCounts[t] || 0) + 1;
      // CardSystem: 진화 필요 수 (칙령 > wisdom > 기본 3)
      const evoNeed = calculateEvoNeed({
        edictOverride: this.todayEdictDef.modifiers.evoNeedOverride,
        hasWisdomRelic: this.relics.has('wisdom'),
      });
      if (this.evoCounts[t] >= evoNeed) {
        const same = this.monsters.filter((m) => m.typeId === t && !m.dead).slice(0, evoNeed);
        if (same.length >= evoNeed) {
          for (const m of same) m.dead = true;
          // 진화 5프레임 연출 (떨림→화이트아웃→폭발→등장→오라)
          const evolvedDef = MONSTERS[def.evolveTo];
          const evolvedSprite = evolvedDef ? evolvedDef.buildSprite() : null;
          this.spawnEvolveEffect(same[Math.floor(evoNeed / 2)].x, same[Math.floor(evoNeed / 2)].y - 16, evolvedSprite);
          // 게임-필 임팩트 (Brotato/Random Dice 머지 톤)
          const tier = evolvedDef?.star === 3 ? 'legendary' : 'epic';
          this.showBanner(
            `✨ ${evolvedDef?.name ?? '진화'} ✨`,
            evolvedDef?.star === 3 ? '★ 최종 진화 ★' : `${evolvedDef?.star ?? 2}성 합성 성공`,
            tier === 'legendary' ? '#FDCB6E' : '#a55eea',
            1.4,
          );
          this.flashScreen(tier === 'legendary' ? '#FDCB6E' : '#a55eea', 0.55);
          this.shakeFx(tier === 'legendary' ? 22 : 16);
          this.slowMoT = tier === 'legendary' ? 0.55 : 0.4;
          // OVERHAUL §3.4: 진화 시 마왕 대사 (빈도 조절 — 25%)
          if (Math.random() < 0.25) {
            this.safeTimeout(() => this.speakDemon(pickDemonLine(DEMON_LINES_EVOLVE)), 700);
          }
          // 0.4s 지연 후 실제 합성 (dispose 안전, force로 maxMon 우회)
          this.safeTimeout(() => {
            if (def.evolveTo) {
              this.spawnMonster(def.evolveTo, { force: true });
              this.evoCounts[t] = (this.evoCounts[t] || 0) - evoNeed;
            }
          }, 400);
          Audio.evolve_sfx();
          this.shakeFx(10);
          Ait.haptic('heavy');
          trackMissionProgress('evolve', 1, 'add');
          unlockAchievement('evolved');
          if (evolvedDef && evolvedDef.star === 3) unlockAchievement('ascended');
          // v11 박물관 + 사이드퀘 — 첫 진화
          try {
            useSaveStore.getState().addMuseumEntry(makeMuseumEntry(
              'first_evolve', `첫 진화 — ${def.evolveTo}`, `${def.name}이(가) 진화했다.`, def.evolveTo
            ));
            this._tickSideQuests('evolves', 1);
          } catch (e) {}
        }
      }
    }
    this.cardChoices = null;
    this.rerollAvailable = false;
    // QA H-1 + OverlayController: cardChoice 종료 시 다른 BLOCKS_SIM overlay 없으면 해제.
    // BUG-018: 진화 컷씬(slowMoT/hitStopT) 활성 시 지연 해제.
    const evolveCutsceneActive = this.slowMoT > 0 || this.hitStopT > 0;
    if (this.paused && !evolveCutsceneActive && this.canResumeFrom('cardChoice')) {
      this.paused = false;
    } else if (this.paused && evolveCutsceneActive) {
      const delay = Math.max(this.slowMoT, this.hitStopT) * 1000 + 100;
      this.safeTimeout(() => {
        // 지연 후 재검사 (cardChoice는 이미 닫힌 상태)
        if (this.canResumeFrom('cardChoice')) this.paused = false;
      }, delay);
    }
  }

  /** AUTO 모드: 카드 점수 매겨 최적의 카드 선택
   *  우선순위: 진화 발동 > 시너지 트리거 > 진화 진행 > 등급/별 */
  private autoPickCard() {
    if (!this.cardChoices) return;
    // CardSystem: 진화 필요 수
    const evoNeed = calculateEvoNeed({
      edictOverride: this.todayEdictDef.modifiers.evoNeedOverride,
      hasWisdomRelic: this.relics.has('wisdom'),
    });
    // 살아있는 몬스터 카운트 집계
    const aliveCounts: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};
    for (const m of this.monsters) {
      if (m.dead) continue;
      aliveCounts[m.typeId] = (aliveCounts[m.typeId] || 0) + 1;
      for (const t of m.tags) tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
    // CardSystem: 점수화 위임
    const scored = scoreCardChoices({
      cardChoices: this.cardChoices,
      evoNeed,
      aliveCounts,
      tagCounts,
      activeSynergyIds: this.activeSynergies,
    });
    this.chooseCard(scored.bestIdx);
  }

  /* ===== Ultimate ===== */
  /** 필살기 3종 (GDD §6) — wave 진행에 따라 자동 선택, 사용 시 다음 변형으로 cycle
   *  0: 어둠의 파동 (모든 용사에 maxHp×30% 데미지) — 안정적
   *  1: 지옥 소환진 (epic 몬스터 1체 즉시 소환 + 화염 폭발 광역) — 변수
   *  2: 암흑 멸망 (모든 용사 즉사 / 마왕성 -120HP) — 일발역전 */
  ultiVariant = 0;
  castUlti() {
    if (!this.ulti.ready) {
      // 비활성 사유 — 충전 부족 (즉시 표시)
      Audio.ui_error();
      const pct = Math.floor((this.ulti.gauge / this.ulti.max) * 100);
      this.showBanner('💀 충전 부족', `필살기 ${pct}% — 적 처치로 충전`, '#888', 0.9);
      return;
    }
    this.ulti.gauge = 0; this.ulti.ready = false;
    // 변형별 signature flash — 어둠(보라)/지옥(붉은)/멸망(검보라)
    const variantNow = this.ultiVariant % 3;
    const sigFlash = variantNow === 0 ? '#a55eea'
                   : variantNow === 1 ? '#FF6B6B'
                   : '#7B2D8E';
    const sigName = variantNow === 0 ? '어둠의 파동'
                  : variantNow === 1 ? '지옥 소환진'
                  : '암흑 멸망';
    this.showBanner(`💀 ${sigName}`, '광역 역전!', sigFlash, 1.0);
    this.flashScreen(sigFlash, 0.5);
    // OVERHAUL §3.3: 빌드 통계
    this.buildStats.ultiUses++;
    this.updateBuildBonus('ulti');
    const skills = useSaveStore.getState().skills;
    // CastleSystem: 변형별 데미지 페이로드 산출
    const payload = computeUltiVariantPayload({
      variant: this.ultiVariant,
      ultiDmgSkillLevel: skills.ultiDmg,
      hasCrownRelic: this.relics.has('crown'),
    });
    // 5차 — tyrant_strike T1: 필살기 데미지 추가 곱
    const tyrantMul = this._buildBonus.ultiDmgExtraMul;
    // 5차 — tyrant_strike T2: 사용 후 6초간 atk×1.4 윈도우 ON
    if (this._buildBonus.ultiBuffAtkMul > 1) {
      this._ultiBuffT = 6.0;
      this.flashEdge('#FDCB6E', 0.6);
      this.spawnDamageText(W / 2, FIELD.y + 30, '👑 폭군 강림 — 6초 ATK ×1.4', '#FDCB6E', false, true);
      this.recalcSynergies();
    }
    if (payload.variant === 0) {
      for (const h of this.heroes) {
        if (h.dead) continue;
        this.takeDamage(h, h.maxHp * payload.pulseDmgMul * tyrantMul);
      }
      for (let i = 0; i < 80; i++) {
        this.spawnParticles(Math.random() * W, Math.random() * FIELD.h + FIELD.y, MASTER_PAL.pinkAccent, 1);
      }
    } else if (payload.variant === 1) {
      const epicPool = ['dwitch', 'orcb', 'devil'];
      if (this.monsters.filter((m) => !m.dead).length < 14) {
        this.spawnMonster(epicPool[Math.floor(Math.random() * epicPool.length)]);
      }
      for (const h of this.heroes) {
        if (h.dead) continue;
        this.takeDamage(h, payload.flatDmg * tyrantMul);
        h.dotEffects.push({ dmg: payload.dotDmgPerTick * tyrantMul, dur: 3, tick: 0, color: '#FF6B6B' });
        this.spawnParticles(h.x, h.y - 16, '#FF6B6B', 12);
      }
    } else {
      // 암흑 멸망 — 모든 용사 즉사 + 마왕성 자해
      for (const h of this.heroes) {
        if (h.dead) continue;
        this.takeDamage(h, h.maxHp * 9999);
      }
      this.castleHp = Math.max(1, this.castleHp - payload.selfHarm);
      for (let i = 0; i < 160; i++) {
        this.spawnParticles(Math.random() * W, Math.random() * FIELD.h + FIELD.y, '#7B2D8E', 1);
      }
    }
    this.ultiVariant = (this.ultiVariant + 1) % 3;
    this.shakeFx(20); Audio.ultimate_sfx(); Ait.haptic('heavy');
  }

  /* ===== Helpers ===== */
  private addMP(amt: number) { this.mp = Math.min(this.mpMax, this.mp + amt); }
  private _lastShakeAt = 0;
  private shakeFx(amt: number) {
    // A-1: 접근성 reduceMotion → shake 비활성
    if (useSaveStore.getState().accessibility.reduceMotion) return;
    // F-3: shake 강도 ×0.7 + 발동 간 0.15초 쿨다운 (모바일 멀미 완화)
    // FEEL F-4: 강한 shake(현재 진행 중 shake의 1.5배 이상)는 쿨다운 무시 — 큰 임팩트 누락 방지
    const now = performance.now();
    const scaled = amt * 0.7;
    const isStrongOverride = scaled > this.shake.amt * 1.5;
    if (now - this._lastShakeAt < 150 && !isStrongOverride) return;
    this._lastShakeAt = now;
    this.shake.amt = Math.max(this.shake.amt, scaled);
    this.shake.t = 0.3;
  }

  /** 화면 중앙 큰 배너 텍스트 (스탬프 스케일 커브로 등장) */
  private showBanner(text: string, sub = '', color = '#FFEAA7', life = 1.1) {
    // 큐에 쌓이지만 동시에 1개만 보여 — 가장 최근 것이 우선
    this.banners.push({ text, sub, color, t: 0, life });
    if (this.banners.length > 3) this.banners.shift();
  }
  /** 전체 화면 컬러 플래시 (페이드 아웃) */
  private flashScreen(color: string, intensity = 0.5) {
    // A-1: reduceMotion → 강도 50%
    if (useSaveStore.getState().accessibility.reduceMotion) intensity *= 0.4;
    if (intensity > this.screenFlash.a) {
      this.screenFlash.color = color;
      this.screenFlash.a = intensity;
    }
  }
  /** 화면 외곽 컬러 링 (시너지 발동 등) */
  private flashEdge(color: string, intensity = 0.7) {
    this.edgeRing.color = color;
    this.edgeRing.a = Math.max(this.edgeRing.a, intensity);
  }
  private spawnParticles(x: number, y: number, color: string, count: number) {
    // P-1: particle cap 250 (저사양 보호)
    const room = Math.max(0, 250 - this.particles.length);
    const actualCount = Math.min(count, room);
    for (let i = 0; i < actualCount; i++) {
      this.particles.push({
        x, y, vx: (Math.random() - 0.5) * 140, vy: (Math.random() - 1.2) * 110,
        life: 0.5 + Math.random() * 0.4, age: 0, color, size: 1.2 + Math.random() * 2.2,
      });
    }
  }
  private spawnHitSpark(x: number, y: number, color: string) {
    this.effects.push({ type: 'hitSpark', x, y, age: 0, life: 0.12, color });
  }
  private spawnSummonCircle(x: number, y: number, color: string, rarity: string) {
    this.effects.push({ type: 'summonCircle', x, y, age: 0, life: 0.5, color, rarity });
  }
  private spawnEvolveEffect(x: number, y: number, sprite: HTMLCanvasElement | null) {
    this.effects.push({ type: 'evolve', x, y, age: 0, life: 0.8, sprite });
    this.slowMoT = 0.3;
  }
  private spawnCoinFlow(fromX: number, fromY: number, toX: number, toY: number) {
    this.effects.push({ type: 'coinFlow', fromX, fromY, toX, toY, age: 0, life: 0.6, color: '#FFEAA7' });
  }
  private spawnDeathEffect(x: number, y: number, ally: boolean) {
    this.effects.push({ type: 'death', x, y, age: 0, life: 0.45, ally });
  }

  private spawnDamageText(x: number, y: number, txt: string, color = '#FFEAA7', big = false, crit = false) {
    // P-2: damageTexts cap 80
    if (this.damageTexts.length >= 80) return;
    // P0-4: spawn 시 x ±8 jitter — 같은 위치 누적 가독성 ↑
    const jx = x + (Math.random() - 0.5) * 16;
    this.damageTexts.push({
      x: jx, y: y - 8, vy: -40 - Math.random() * 15,
      age: 0, life: crit ? 1.0 : 0.7,
      txt, color: crit ? '#FDCB6E' : color, big, crit,
      shakeT: crit ? 0.3 : 0, rot: crit ? (Math.random() - 0.5) * 0.2 : 0,
    });
  }
  private updateProjectiles(dt: number) {
    for (const p of this.projectiles) {
      p.life -= dt;
      if (!p.target || p.target.dead) { p.dead = true; continue; }
      const dx = p.target.x - p.x, dy = (p.target.y - 16) - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6 || p.life <= 0) {
        this.takeDamage(p.target, p.atk);
        if (p.dot) p.target.dotEffects.push({ dmg: p.dot.dmg, dur: p.dot.dur, tick: 0.5, color: '#ff6b35' });
        this.spawnParticles(p.target.x, p.target.y - 14, p.color, 7);
        p.dead = true; continue;
      }
      p.x += (dx / dist) * p.spd * dt;
      p.y += (dy / dist) * p.spd * dt;
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }
  private updateParticles(dt: number) {
    for (const p of this.particles) {
      p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);
  }

  /* ===== Render ===== */
  private draw() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shake.amt > 0.3) {
      ctx.translate((Math.random() - 0.5) * this.shake.amt, (Math.random() - 0.5) * this.shake.amt);
    }
    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(0, 0, W, H);
    this.drawBackground();
    this.drawCastle();
    this.drawDemonLord();

    // 카운팅 애니메이션
    this.displayMp += (this.mp - this.displayMp) * 0.18;
    this.displayHp += (this.castleHp - this.displayHp) * 0.22;
    if (Math.abs(this.displayMp - this.mp) < 0.5) this.displayMp = this.mp;
    if (Math.abs(this.displayHp - this.castleHp) < 0.5) this.displayHp = this.castleHp;

    const all = [...this.monsters, ...this.heroes].sort((a, b) => a.y - b.y);
    for (const u of all) this.drawUnit(u);
    this.drawProjectiles();
    this.drawParticles();
    this.drawEffects();
    this.drawDamageTexts();
    // LD-13 + Q-3: 보스 위 화살표 (4초) / 보스가 화면 밖일 때 가장자리 화살표
    if (this.bossUnit && !this.bossUnit.dead) {
      const bossAge = (performance.now() - this.bossSpawnTime) / 1000;
      // Q-3: 보스가 화면 밖에 있으면 가장자리 화살표 (지속)
      if (this.bossUnit.x > W - 20) {
        const ctx2 = this.ctx;
        const t = performance.now();
        ctx2.save();
        ctx2.fillStyle = '#FF6B6B';
        ctx2.font = 'bold 14px sans-serif';
        ctx2.shadowColor = '#FF6B6B';
        ctx2.shadowBlur = 8 + 4 * Math.sin(t / 200);
        ctx2.textAlign = 'right';
        ctx2.fillText('▶', W - 6, this.bossUnit.y - 20);
        ctx2.restore();
        ctx2.textAlign = 'left';
      }
      if (bossAge < 4) {
        const ctx2 = this.ctx;
        const t = performance.now();
        const bobY = Math.sin(t / 200) * 4;
        const alpha = Math.max(0, 1 - bossAge / 4);
        ctx2.save();
        ctx2.globalAlpha = alpha * 0.9;
        ctx2.fillStyle = '#FF6B6B';
        ctx2.font = 'bold 18px sans-serif';
        ctx2.textAlign = 'center';
        ctx2.shadowColor = '#FF6B6B';
        ctx2.shadowBlur = 12;
        ctx2.fillText('▼', this.bossUnit.x, this.bossUnit.y - 70 + bobY);
        ctx2.shadowBlur = 0;
        ctx2.font = 'bold 9px sans-serif';
        ctx2.fillText('보스', this.bossUnit.x, this.bossUnit.y - 80 + bobY);
        ctx2.restore();
        ctx2.textAlign = 'left';
      }
    }
    this.drawHUD();
    ctx.restore();
    // 카메라 흔들림 외부 — 풀스크린 오버레이
    this.drawScreenFlash();
    this.drawEdgeRing();
    this.drawBanners();
  }

  /** 화면 전체 컬러 플래시 (페이드 아웃) */
  private drawScreenFlash() {
    if (this.screenFlash.a <= 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = this.screenFlash.a;
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = this.screenFlash.color;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /** 화면 외곽 컬러 링 (시너지 발동 등) */
  private drawEdgeRing() {
    if (this.edgeRing.a <= 0) return;
    const ctx = this.ctx;
    const a = this.edgeRing.a;
    const grd = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(0.6, this.edgeRing.color + '00');
    grd.addColorStop(1, this.edgeRing.color + Math.floor(a * 200).toString(16).padStart(2, '0'));
    ctx.save();
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /** 화면 중앙 배너 (스탬프 스케일 커브) — U-1: 직전 배너 작게 표시 */
  private drawBanners() {
    if (this.banners.length === 0) return;
    // 직전 배너 (작게, 위에)
    if (this.banners.length >= 2) {
      const prev = this.banners[this.banners.length - 2];
      const ctx2 = this.ctx;
      ctx2.save();
      ctx2.globalAlpha = 0.5 * (1 - prev.t / prev.life);
      ctx2.font = 'bold 14px sans-serif';
      ctx2.textAlign = 'center';
      ctx2.shadowColor = '#000';
      ctx2.shadowBlur = 3;
      ctx2.fillStyle = prev.color;
      ctx2.fillText(prev.text, W / 2, 168);
      ctx2.restore();
      ctx2.textAlign = 'left';
    }
    // 가장 최근 배너 (큰 표시)
    const b = this.banners[this.banners.length - 1];
    const ctx = this.ctx;
    const t = b.t / b.life;
    if (t >= 1) return;
    // 스탬프 커브: 0~0.18 줌인(over), 0.18~0.85 유지, 0.85~1 페이드 아웃
    let scale: number, alpha: number;
    if (t < 0.18) {
      const k = t / 0.18;
      scale = 0.4 + k * 1.0;       // 0.4 → 1.4 (overshoot)
      alpha = k;
    } else if (t < 0.32) {
      const k = (t - 0.18) / 0.14;
      scale = 1.4 - k * 0.4;        // 1.4 → 1.0 (settle)
      alpha = 1;
    } else if (t < 0.85) {
      scale = 1;
      alpha = 1;
    } else {
      const k = (t - 0.85) / 0.15;
      scale = 1 + k * 0.2;
      alpha = 1 - k;
    }
    ctx.save();
    const cx = W / 2, cy = 200;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    // 메인 텍스트
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000';
    ctx.fillText(b.text, 2, 2);  // 그림자
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = b.color;
    ctx.fillText(b.text, 0, 0);
    // 서브 텍스트
    if (b.sub) {
      ctx.shadowBlur = 6;
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText(b.sub, 0, 22);
    }
    ctx.restore();
    ctx.textAlign = 'left';
  }

  private drawEffects() {
    const ctx = this.ctx;
    for (const e of this.effects) {
      const t = e.age / e.life;
      ctx.save();
      if (e.type === 'aoeRing') {
        // FEEL F-6: AOE 범위 시각화 — 짧은 ring 페이드
        const alpha = 1 - t;
        const r = (e as any).r * (0.7 + 0.5 * t);  // 약간 확장
        ctx.globalAlpha = alpha * 0.7;
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = alpha * 0.15;
        ctx.fillStyle = e.color;
        ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.fill();
      } else if (e.type === 'hitSpark') {
        // PNG 시퀀스 우선 (속성별 4종, 각 3프레임)
        // 색상 → 속성 자동 선택: 화염=ff6b35계열/금=physical/파랑=ice/핑크=physical
        const attr =
          e.color === '#ff6b35' || e.color === '#FF6B35' ? 'fire' :
          e.color === '#74B9FF' || e.color === '#74b9ff' ? 'ice' :
          e.color === '#FD79A8' || e.color === '#a55eea' ? 'dark' :
          'physical';
        const seq = getCachedSequence(`hit_${attr}`, 3, 1);
        if (seq) {
          const idx = Math.min(2, Math.floor(t * 3));
          const img = seq[idx];
          ctx.imageSmoothingEnabled = false;
          // 16×16 PNG → 24×24로 그리기 (시인성)
          ctx.drawImage(img, e.x - 12, e.y - 12, 24, 24);
        } else {
          // Fallback (procedural)
          if (t < 0.33) {
            const len = 8 + t * 4;
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(e.x - 1, e.y - len, 2, 2);
            ctx.fillRect(e.x - 1, e.y + len - 2, 2, 2);
            ctx.fillRect(e.x - len, e.y - 1, 2, 2);
            ctx.fillRect(e.x + len - 2, e.y - 1, 2, 2);
            ctx.fillRect(e.x - 2, e.y - 2, 4, 4);
          } else if (t < 0.75) {
            const radius = 6 + (t - 0.33) * 30;
            ctx.globalAlpha = 1 - (t - 0.33) / 0.42;
            ctx.strokeStyle = e.color;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(e.x, e.y, radius, 0, Math.PI * 2); ctx.stroke();
          } else {
            ctx.globalAlpha = 1 - (t - 0.75) / 0.25;
            ctx.fillStyle = e.color;
            ctx.fillRect(e.x - 2, e.y - 2, 4, 4);
          }
        }
      } else if (e.type === 'summonCircle') {
        // PNG 시퀀스 우선 (등급별 4종, 각 6프레임 48×48)
        const tier =
          e.rarity === 'legendary' ? 'legend' :
          e.rarity === 'epic' ? 'epic' :
          e.rarity === 'rare' || e.rarity === 'uncommon' ? 'rare' :
          'common';
        const seq = getCachedSequence(`summon_${tier}`, 6, 1);
        if (seq) {
          const idx = Math.min(5, Math.floor(t * 6));
          const img = seq[idx];
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, e.x - 24, e.y - 24, 48, 48);
        } else {
          // Fallback (procedural)
          const stage5 = 0.84;
          const baseR = e.rarity === 'epic' ? 24 : e.rarity === 'rare' ? 20 : 16;
          let r;
          if (t < 0.16) r = (t / 0.16) * baseR;
          else if (t < stage5) r = baseR + Math.sin((t - 0.16) * 30) * 2;
          else r = baseR * (1 - (t - stage5) / (1 - stage5));
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.stroke();
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(e.x, e.y, r * 0.7, 0, Math.PI * 2); ctx.stroke();
        }
      } else if (e.type === 'evolve') {
        // PNG 시퀀스 우선 (8프레임 64×64)
        const seq = getCachedSequence('evolve', 8, 1);
        if (seq) {
          const idx = Math.min(7, Math.floor(t * 8));
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(seq[idx], e.x - 32, e.y - 32, 64, 64);
          // 새 캐릭터 등장 (5~7 프레임에서 sprite 나타남)
          if (t >= 0.5625 && t < 0.85 && e.sprite) {
            const r3 = (t - 0.5625) / 0.2875;
            const sw = e.sprite.width, sh = e.sprite.height;
            const sc = 1 + (1 - r3) * 0.3;
            ctx.globalAlpha = r3;
            ctx.drawImage(e.sprite, e.x - sw * sc / 2, e.y - sh * sc / 2, sw * sc, sh * sc);
          }
        } else {
          // Fallback (procedural 5단계)
          if (t < 0.25) {
            // 떨림
          } else if (t < 0.4375) {
            ctx.fillStyle = `rgba(255,255,255,${(t - 0.25) / 0.1875 * 0.6})`;
            ctx.fillRect(0, 0, W, H);
          } else if (t < 0.5625) {
            const r2 = (t - 0.4375) / 0.125;
            const radius = r2 * 80;
            ctx.globalAlpha = 1 - r2;
            const grd = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, radius);
            grd.addColorStop(0, '#FFFFFF');
            grd.addColorStop(0.5, '#FDCB6E');
            grd.addColorStop(1, 'rgba(253,121,168,0)');
            ctx.fillStyle = grd;
            ctx.fillRect(e.x - radius, e.y - radius, radius * 2, radius * 2);
          } else if (t < 0.75) {
            if (e.sprite) {
              const r3 = (t - 0.5625) / 0.1875;
              const sw = e.sprite.width, sh = e.sprite.height;
              const sc = 1 + (1 - r3) * 0.3;
              ctx.globalAlpha = r3;
              ctx.drawImage(e.sprite, e.x - sw * sc / 2, e.y - sh * sc, sw * sc, sh * sc);
            }
          } else {
            const r4 = (t - 0.75) / 0.25;
            ctx.globalAlpha = 1 - r4;
            ctx.strokeStyle = '#FDCB6E';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(e.x, e.y - 16, 20 + r4 * 16, 0, Math.PI * 2); ctx.stroke();
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(e.x, e.y - 16, 30 + r4 * 20, 0, Math.PI * 2); ctx.stroke();
          }
        }
      } else if (e.type === 'death') {
        // PNG 시퀀스 (3프레임 32×32)
        const seq = getCachedSequence(e.ally ? 'death_ally' : 'death_enemy', 3, 1);
        if (seq) {
          const idx = Math.min(2, Math.floor(t * 3));
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(seq[idx], e.x - 16, e.y - 16, 32, 32);
        }
      } else if (e.type === 'coinFlow') {
        const ease = t * t;
        const cx = e.fromX + (e.toX - e.fromX) * ease;
        const arcY = e.fromY - 30 - 40 * Math.sin(t * Math.PI);
        const cy = arcY + (e.toY - arcY) * ease;
        ctx.globalAlpha = 0.6 * (1 - t * 0.3);
        ctx.fillStyle = e.color;
        ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
        ctx.fillStyle = e.color;
        ctx.fillRect(cx - 1, cy - 1, 2, 2);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  private drawBackground() {
    const ctx = this.ctx;
    // OVERHAUL §3.1: 던전 층별 배경 색조 (LD-D 대체)
    const grd = ctx.createLinearGradient(0, FIELD.y, 0, FIELD.y + FIELD.h);
    const stratum = this._currentStratum || stratumForWave(this.wave);
    grd.addColorStop(0, stratum.bgGradient[0]);
    grd.addColorStop(0.6, stratum.bgGradient[1]);
    grd.addColorStop(1, stratum.bgGradient[2]);
    ctx.fillStyle = grd;
    ctx.fillRect(FIELD.x, FIELD.y, FIELD.w, FIELD.h);
    // 별
    ctx.fillStyle = 'rgba(255,234,167,0.7)';
    for (let i = 0; i < 35; i++) {
      const sx = (i * 47 + 13) % W;
      const sy = (i * 23 + 7) % (FIELD.h - 70) + FIELD.y + 5;
      ctx.fillRect(sx, sy, 1, 1);
    }
    // 지면 — stone 타일 패턴 (PNG, 16×16 반복)
    const stoneTile = getCachedSprite('tile_stone', 1);
    if (stoneTile) {
      if (!this._stonePattern) {
        this._stonePattern = ctx.createPattern(stoneTile, 'repeat');
      }
      if (this._stonePattern) {
        ctx.save();
        ctx.translate(0, GROUND_Y);
        ctx.fillStyle = this._stonePattern;
        ctx.fillRect(0, 0, W, FIELD.h - (GROUND_Y - FIELD.y));
        ctx.restore();
      }
    } else {
      ctx.fillStyle = '#1d1530';
      ctx.fillRect(0, GROUND_Y, W, FIELD.h - (GROUND_Y - FIELD.y));
    }
    // 지면 상단 그라디언트 그림자 (자연스러움)
    const groundGrd = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + 10);
    groundGrd.addColorStop(0, 'rgba(0,0,0,0.5)');
    groundGrd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = groundGrd;
    ctx.fillRect(0, GROUND_Y, W, 10);

    // LD-1: 영토 시각 분리 (좌=마왕 보라톤 / 우=용사 회녹톤)
    const territoryGrd = ctx.createLinearGradient(0, FIELD.y, W, FIELD.y);
    territoryGrd.addColorStop(0, 'rgba(123,45,142,0.18)');     // 좌 마왕 영토
    territoryGrd.addColorStop(0.45, 'rgba(0,0,0,0)');
    territoryGrd.addColorStop(0.55, 'rgba(0,0,0,0)');
    territoryGrd.addColorStop(1, 'rgba(116,185,255,0.12)');    // 우 용사 영토
    ctx.fillStyle = territoryGrd;
    ctx.fillRect(0, FIELD.y, W, FIELD.h);

    // LD-1 + LD-C: 마왕성 앞 방어선 — 마왕성(8~94) 본체 밖으로 이동(x=110), 점선 길이 확장
    const t = performance.now();
    const dashOffset = (t / 100) % 12;
    ctx.save();
    ctx.strokeStyle = `rgba(214,48,49,${0.5 + 0.25 * Math.sin(t / 300)})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -dashOffset;
    ctx.beginPath();
    ctx.moveTo(110, GROUND_Y - 80);
    ctx.lineTo(110, GROUND_Y);
    ctx.stroke();
    ctx.restore();

    // LD-14 + LD-E: 우측 끝 적 진영 — 시각 매스 강화 (grad alpha + 큰 깃발 2개)
    const enemyCampGrd = ctx.createLinearGradient(W - 50, FIELD.y, W, FIELD.y);
    enemyCampGrd.addColorStop(0, 'rgba(0,0,0,0)');
    enemyCampGrd.addColorStop(1, 'rgba(116,185,255,0.4)');
    ctx.fillStyle = enemyCampGrd;
    ctx.fillRect(W - 50, FIELD.y, 50, FIELD.h);
    // 깃대 2개 (앞/뒤)
    const flagWave = Math.sin(t / 250) * 2;
    const flagWave2 = Math.sin(t / 250 + 1.2) * 2;
    // 뒤 깃대 (작음)
    ctx.fillStyle = '#3a2d5c';
    ctx.fillRect(W - 16, GROUND_Y - 42, 1, 42);
    ctx.fillStyle = '#0984E3';
    ctx.beginPath();
    ctx.moveTo(W - 15, GROUND_Y - 42);
    ctx.lineTo(W - 7 + flagWave2, GROUND_Y - 38);
    ctx.lineTo(W - 15, GROUND_Y - 34);
    ctx.closePath();
    ctx.fill();
    // 앞 깃대 (큼)
    ctx.fillStyle = '#4a3a6e';
    ctx.fillRect(W - 6, GROUND_Y - 50, 2, 50);
    ctx.fillStyle = '#0984E3';
    ctx.beginPath();
    ctx.moveTo(W - 4, GROUND_Y - 50);
    ctx.lineTo(W + 6 + flagWave, GROUND_Y - 44);
    ctx.lineTo(W - 4, GROUND_Y - 38);
    ctx.closePath();
    ctx.fill();
    // 적 진영 작은 텐트 실루엣
    ctx.fillStyle = 'rgba(45,40,80,0.85)';
    ctx.beginPath();
    ctx.moveTo(W - 30, GROUND_Y);
    ctx.lineTo(W - 22, GROUND_Y - 14);
    ctx.lineTo(W - 14, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    // LD-2 + LD-B: 라인 시각 분리 (앞/중/뒤 가로선) — 알파 0.08→0.18, 라벨 추가
    ctx.save();
    ctx.strokeStyle = 'rgba(165,94,234,0.18)';
    ctx.lineWidth = 1;
    [-16, 0, 16].forEach((dy) => {
      ctx.beginPath();
      ctx.moveTo(115, GROUND_Y + dy);
      ctx.lineTo(W - 35, GROUND_Y + dy);
      ctx.stroke();
    });
    // 라인 좌측 끝 라벨 (탱커=🛡 / 근거리=⚔ / 원거리=🏹)
    ctx.fillStyle = 'rgba(165,94,234,0.45)';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🛡', 100, GROUND_Y - 14);
    ctx.fillText('⚔', 100, GROUND_Y + 2);
    ctx.fillText('🏹', 100, GROUND_Y + 18);
    ctx.restore();
    // P0-2: 격돌 위치 발자국 라인 — 가장 앞선 hero ~ 가장 앞선 monster 중간 영역 ±20px
    let frontHeroX = -1;
    for (const h of this.heroes) { if (!h.dead && (frontHeroX < 0 || h.x < frontHeroX)) frontHeroX = h.x; }
    let frontMonX = -1;
    for (const m of this.monsters) { if (!m.dead && m.x > frontMonX) frontMonX = m.x; }
    if (frontHeroX > 0 && frontMonX > 0 && frontHeroX > frontMonX - 200) {
      const midX = (frontHeroX + frontMonX) / 2;
      ctx.fillStyle = 'rgba(80,60,40,0.25)';
      ctx.fillRect(midX - 20, GROUND_Y + 24, 40, 1);
      ctx.fillRect(midX - 14, GROUND_Y + 27, 28, 1);
    }
  }

  private drawCastle() {
    const ctx = this.ctx;
    const t = performance.now();
    const x = 8, y = GROUND_Y - 100, w = 86, h = 100;
    // 마왕성 발 아래 마법진 (4프레임 회전 PNG)
    const magicFrame = Math.floor(t / 200) % 4;
    const magicTile = getCachedSprite(`tile_magic_f${magicFrame + 1}`, 1);
    if (magicTile) {
      ctx.imageSmoothingEnabled = false;
      const cx = x + w / 2 - 24;
      const cy = y + h - 8;
      ctx.globalAlpha = 0.7;
      ctx.drawImage(magicTile, cx, cy, 48, 48);
      ctx.globalAlpha = 1;
    }
    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h + 3, w / 2, 5, 0, 0, Math.PI * 2); ctx.fill();
    // V2 — 마왕성 PNG 우선 (HP 위급 시 destroyed 변형)
    const castleHpRatio = this.castleHp / this.castleMaxHp;
    const castleSpriteId = castleHpRatio < 0.3 ? 'castle_destroyed' : 'castle_main';
    const castlePng = getCachedSprite(castleSpriteId, 2);
    if (castlePng) {
      ctx.imageSmoothingEnabled = false;
      // PNG 96×128 — 절차적 영역(86×100)보다 약간 넓음. 중앙 정렬.
      const pw = 96, ph = 128;
      const px = x + w / 2 - pw / 2;
      const py = y + h - ph;
      ctx.drawImage(castlePng, px, py, pw, ph);
      return;  // 절차적 그리기 스킵
    }
    // 본체
    ctx.fillStyle = MASTER_PAL.purpleDarkest;
    ctx.fillRect(x + 4, y + 24, w - 8, h - 32);
    ctx.fillStyle = MASTER_PAL.purpleMain;
    ctx.fillRect(x + 8, y + 26, w - 16, h - 34);
    // 벽돌 패턴
    ctx.fillStyle = MASTER_PAL.purpleDarkest;
    for (let by = y + 32; by < y + h - 14; by += 8) {
      const off = ((by - y - 32) / 8) % 2 === 0 ? 0 : 6;
      for (let bx = x + 10 + off; bx < x + w - 10; bx += 12) ctx.fillRect(bx, by, 1, 6);
    }
    // 첨탑 3개 (삼각형 머리 + 깃발 + 깜빡이는 창)
    for (let i = 0; i < 3; i++) {
      const tx = x + 12 + i * (w - 24) / 2 - 5;
      ctx.fillStyle = MASTER_PAL.purpleDarkest;
      ctx.fillRect(tx, y + 8, 14, 20);
      ctx.fillStyle = MASTER_PAL.purpleMain;
      ctx.fillRect(tx + 1, y + 10, 12, 18);
      // 첨탑 머리 (삼각)
      ctx.fillStyle = MASTER_PAL.purpleDarkest;
      ctx.beginPath();
      ctx.moveTo(tx - 2, y + 10); ctx.lineTo(tx + 7, y + 1); ctx.lineTo(tx + 16, y + 10);
      ctx.closePath(); ctx.fill();
      // 깃발
      ctx.fillStyle = MASTER_PAL.crimson;
      ctx.fillRect(tx + 6, y - 4, 1, 9);
      ctx.fillRect(tx + 7, y - 4, 5, 4);
      // 첨탑 창 (깜빡)
      if ((Math.floor(t / 220) + i) % 4 !== 0) {
        ctx.fillStyle = '#FFEAA7';
        ctx.fillRect(tx + 6, y + 14, 2, 4);
      }
    }
    // 정문 (큰)
    const gx = x + w / 2 - 10, gy = y + h - 30;
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(gx, gy, 20, 30);
    const flick = 0.6 + Math.sin(t / 120) * 0.3;
    ctx.fillStyle = `rgba(214,48,49,${flick})`;
    ctx.fillRect(gx + 2, gy + 5, 16, 22);
    ctx.fillStyle = MASTER_PAL.crimson;
    ctx.fillRect(gx + 5, gy + 10, 10, 12);
    ctx.fillStyle = MASTER_PAL.purpleDarkest;
    ctx.fillRect(gx - 3, gy - 3, 26, 3);
    // 횃불 양옆 (글로우)
    for (const wx of [x + 18, x + w - 22]) {
      ctx.fillStyle = '#5c3a18';
      ctx.fillRect(wx, y + 38, 6, 10);
      const fl = 0.5 + Math.random() * 0.5;
      ctx.fillStyle = `rgba(255,107,53,${fl})`;
      ctx.fillRect(wx + 1, y + 36, 4, 4);
      ctx.fillStyle = `rgba(255,234,167,${fl * 0.8})`;
      ctx.fillRect(wx + 2, y + 37, 2, 2);
      const grd = ctx.createRadialGradient(wx + 3, y + 38, 1, wx + 3, y + 38, 18);
      grd.addColorStop(0, 'rgba(255,107,53,0.55)');
      grd.addColorStop(1, 'rgba(255,107,53,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(wx - 15, y + 25, 36, 36);
    }
    // 보라 글로우
    const grd2 = ctx.createRadialGradient(x + w / 2, y + h / 2, 12, x + w / 2, y + h / 2, 80);
    grd2.addColorStop(0, 'rgba(123,45,142,0.22)');
    grd2.addColorStop(1, 'rgba(123,45,142,0)');
    ctx.fillStyle = grd2; ctx.fillRect(x - 30, y - 30, w + 60, h + 60);
    // P0-1: 마왕성 HP 단계별 시각 변형 — 50% / 25% / 10% 임계
    const hpPct = this.castleHp / Math.max(1, this.castleMaxHp);
    if (hpPct < 0.5) {
      // 정문 위 균열 1줄
      ctx.strokeStyle = 'rgba(20,8,12,0.85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 20, y + 38);
      ctx.lineTo(x + 28, y + 50);
      ctx.lineTo(x + 22, y + 62);
      ctx.lineTo(x + 32, y + 78);
      ctx.stroke();
    }
    if (hpPct < 0.25) {
      // 균열 2줄 + 첨탑 1개 깃발 검정 + 약한 흰 연기 입자
      ctx.strokeStyle = 'rgba(20,8,12,0.9)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 60, y + 32);
      ctx.lineTo(x + 52, y + 48);
      ctx.lineTo(x + 58, y + 64);
      ctx.lineTo(x + 50, y + 82);
      ctx.stroke();
      // 첫 첨탑 깃발 검정 덮어쓰기
      const flagX = x + 12 - 5 + 6;
      ctx.fillStyle = '#1a0a0a';
      ctx.fillRect(flagX, y - 4, 1, 9);
      ctx.fillRect(flagX + 1, y - 4, 5, 4);
      // 1초당 1회 정도 흰 연기 (cap 보호 — 매 frame X)
      if ((Math.floor(t / 600) % 2) === 0 && Math.random() < 0.08) {
        this.spawnParticles(x + 30 + Math.random() * 30, y + 40, '#dddddd', 1);
      }
    }
    if (hpPct < 0.1) {
      // 균열 3줄 + 정문 외곽 빨간 글로우 + 흙먼지 + 둘째 깃발도 검정
      ctx.strokeStyle = 'rgba(30,8,8,0.95)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 50);
      ctx.lineTo(x + 24, y + 70);
      ctx.lineTo(x + 14, y + 88);
      ctx.stroke();
      // 정문 외곽 빨간 글로우
      const gx2 = x + w / 2 - 10, gy2 = y + h - 30;
      const dangerPulse = 0.5 + 0.3 * Math.sin(t / 140);
      const dangerGrd = ctx.createRadialGradient(gx2 + 10, gy2 + 15, 4, gx2 + 10, gy2 + 15, 30);
      dangerGrd.addColorStop(0, `rgba(255,107,107,${0.4 * dangerPulse})`);
      dangerGrd.addColorStop(1, 'rgba(255,107,107,0)');
      ctx.fillStyle = dangerGrd;
      ctx.fillRect(gx2 - 16, gy2 - 8, 50, 50);
      // 둘째 깃발도 검정
      const flagX2 = x + 12 + (w - 24) / 2 - 5 + 6;
      ctx.fillStyle = '#1a0a0a';
      ctx.fillRect(flagX2, y - 4, 1, 9);
      ctx.fillRect(flagX2 + 1, y - 4, 5, 4);
      // 흙먼지 — 4 frame당 1개 정도
      if ((Math.floor(t / 250) % 4) === 0 && Math.random() < 0.15) {
        this.spawnParticles(x + 10 + Math.random() * (w - 20), y + h - 6, '#5c3a18', 1);
      }
    }
    // HP 바
    if (this.castleHp < this.castleMaxHp) {
      const hpw = w; const hpr = Math.max(0, this.castleHp / this.castleMaxHp);
      ctx.fillStyle = '#0a0612';
      ctx.fillRect(x, y - 12, hpw, 5);
      ctx.fillStyle = MASTER_PAL.crimson;
      ctx.fillRect(x + 1, y - 11, (hpw - 2) * hpr, 3);
    }
  }

  /** 마왕 본체 (PIXEL §파트2) — 마왕성 위에 떠 있는 마스코트, 부드러운 bob */
  private drawDemonLord() {
    const ctx = this.ctx;
    const t = performance.now();
    const cx = 8 + 86 / 2;
    const baseY = GROUND_Y - 100 - 30;  // 첨탑 위
    const bob = Math.sin(t / 600) * 3;
    const y = baseY + bob;
    // OVERHAUL §4.4: 챕터별 마왕 외형 변화 (bestWave 기반)
    const bestWave = useSaveStore.getState().bestWave;
    const tier = bestWave >= 100 ? 'mythic' : bestWave >= 50 ? 'lord' : bestWave >= 25 ? 'crowned' : 'base';
    // OVERHAUL §4.5/§4.6: 인테리어 + 시즌 스킨 (인테리어 우선, 시즌은 fallback)
    const eq = useSaveStore.getState().equippedInteriors;
    const flagDef = INTERIORS.find((i) => i.id === eq.flag);
    const auraDef = INTERIORS.find((i) => i.id === eq.aura);
    const seasonSkin = currentSeason().demonSkin;
    const overrideCape = (flagDef && flagDef.id !== 'flag_default') ? flagDef.visual.color : seasonSkin?.capeColor;
    const overrideAura = (auraDef && auraDef.id !== 'aura_default')
      ? `rgba(${this._hexToRgb(auraDef.visual.color || '#a55eea')},`
      : seasonSkin?.auraColor;
    // V2 — tier별 PNG 우선 (48×48). bestWave 진행에 따라 외형 점진 변화
    const tierSpriteId = tier === 'mythic' ? 'demon_lord_48_mythic'
      : tier === 'lord' ? 'demon_lord_48_lord'
      : tier === 'crowned' ? 'demon_lord_48_crowned'
      : 'demon_lord_48';
    const png = getCachedSprite(tierSpriteId, 2) || getCachedSprite('demon_lord_48', 2);
    if (png) {
      ctx.imageSmoothingEnabled = false;
      const sw = 48, sh = 48;
      ctx.drawImage(png, cx - sw / 2, y - sh + 8, sw, sh);
    } else {
      // 절차적 fallback: 작은 마왕 마스코트 (망토 + 뿔 + 빨간 눈)
      const dx = cx, dy = y;
      // 챕터별 색조 — 인테리어/시즌 스킨이 override
      const cape = overrideCape || (tier === 'mythic' ? '#0a3a2a' : tier === 'lord' ? '#3a0d0d' : tier === 'crowned' ? '#3a0d4e' : MASTER_PAL.purpleDarkest);
      const head = tier === 'mythic' ? '#1abc9c' : tier === 'lord' ? '#7B2D8E' : tier === 'crowned' ? '#a55eea' : MASTER_PAL.purpleMain;
      // 망토
      ctx.fillStyle = cape;
      ctx.beginPath();
      ctx.moveTo(dx - 12, dy - 6);
      ctx.lineTo(dx + 12, dy - 6);
      ctx.lineTo(dx + 8, dy + 8);
      ctx.lineTo(dx - 8, dy + 8);
      ctx.closePath();
      ctx.fill();
      // 머리
      ctx.fillStyle = head;
      ctx.fillRect(dx - 8, dy - 18, 16, 14);
      // 뿔
      ctx.fillStyle = cape;
      ctx.beginPath();
      ctx.moveTo(dx - 8, dy - 18); ctx.lineTo(dx - 11, dy - 26); ctx.lineTo(dx - 5, dy - 18);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(dx + 8, dy - 18); ctx.lineTo(dx + 11, dy - 26); ctx.lineTo(dx + 5, dy - 18);
      ctx.closePath(); ctx.fill();
      // 챕터별 장식
      if (tier === 'crowned' || tier === 'lord' || tier === 'mythic') {
        // 왕관 (황금)
        ctx.fillStyle = MASTER_PAL.amber;
        ctx.fillRect(dx - 7, dy - 22, 14, 3);
        ctx.fillRect(dx - 6, dy - 25, 2, 3);
        ctx.fillRect(dx - 1, dy - 26, 2, 4);
        ctx.fillRect(dx + 4, dy - 25, 2, 3);
      }
      if (tier === 'lord' || tier === 'mythic') {
        // 갑옷 라인 (은색)
        ctx.fillStyle = MASTER_PAL.silver;
        ctx.fillRect(dx - 8, dy - 5, 16, 1);
      }
      if (tier === 'mythic') {
        // 신화 — 광배 (회전 별)
        const angle = t / 800;
        for (let i = 0; i < 4; i++) {
          const a = angle + (i * Math.PI / 2);
          const sx = dx + Math.cos(a) * 18;
          const sy = (dy - 12) + Math.sin(a) * 6;
          ctx.fillStyle = '#F1C40F';
          ctx.fillRect(sx - 1, sy - 1, 2, 2);
        }
      }
      // 빨간 눈 (깜빡)
      const eyeOn = (Math.floor(t / 120) % 18) !== 17;
      if (eyeOn) {
        ctx.fillStyle = tier === 'mythic' ? '#F1C40F' : MASTER_PAL.crimson;
        ctx.fillRect(dx - 5, dy - 12, 3, 2);
        ctx.fillRect(dx + 2, dy - 12, 3, 2);
        ctx.fillStyle = '#FFEAA7';
        ctx.fillRect(dx - 4, dy - 12, 1, 1);
        ctx.fillRect(dx + 3, dy - 12, 1, 1);
      }
    }
    // 발 아래 오라 — 인테리어/시즌 우선, 그 외 챕터별
    const auraColor = overrideAura
      || (tier === 'mythic' ? 'rgba(241,196,15,' : tier === 'lord' ? 'rgba(214,48,49,' : 'rgba(165,94,234,');
    const grd = ctx.createRadialGradient(cx, y + 2, 4, cx, y + 2, 22);
    grd.addColorStop(0, auraColor + '0.35)');
    grd.addColorStop(1, auraColor + '0)');
    ctx.fillStyle = grd;
    ctx.fillRect(cx - 22, y - 18, 44, 32);
  }

  /** Hex(#rrggbb) → "r,g,b" rgba 합성용 */
  private _hexToRgb(hex: string): string {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return '165,94,234';
    return `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}`;
  }

  private drawUnit(u: Unit) {
    const ctx = this.ctx;
    if (u.dead) {
      const t = u.deathT;
      if (t > 0.3) return;
      ctx.save();
      ctx.globalAlpha = 1 - t / 0.3;
      // 시트 보유 캐릭터는 살아있을 때와 동일한 RENDER_H 정규화 적용
      let dframe: HTMLCanvasElement = u.sprite;
      let dscale = u.scale;
      if (u.team === 'hero' && HERO_SHEET_IDS.has(u.typeId)) {
        const sheet = getCachedSheet(u.typeId, HERO_SHEET_FRAMES, 1);
        if (sheet && sheet[0]) {
          dframe = sheet[0];
          dscale = (44 / dframe.height) * u.scale;
        }
      } else if (u.team === 'monster' && MONSTER_SHEET_IDS.has(u.typeId)) {
        const sheet = getCachedSheet(u.typeId, MONSTER_SHEET_FRAMES, 1);
        if (sheet && sheet[0]) {
          dframe = sheet[0];
          dscale = (40 / dframe.height) * u.scale;
        }
      }
      const sw = dframe.width * dscale, sh = dframe.height * dscale;
      ctx.drawImage(dframe, u.x - sw / 2, u.y - sh + Math.sin(u.bobT) * 1.5, sw, sh * (1 - t));
      ctx.restore();
      return;
    }
    let offsetX = 0, scaleY = 1, scaleX = 1;
    const idleBob = Math.sin(u.bobT) * 1.5;
    const walkBounce = u._isMoving ? Math.sin(u.walkT * 12) * 1.2 : 0;
    if (u.attackPhase === 1) {
      const t = 1 - u.attackPhaseT / 0.20;
      offsetX = (u.team === 'monster' ? -2 : 2) * t;
      scaleY = 1 - 0.04 * t; scaleX = 1 + 0.02 * t;
    } else if (u.attackPhase === 2) {
      offsetX = u.team === 'monster' ? 4 : -4;
      scaleY = 1.05; scaleX = 0.97;
    } else if (u.attackPhase === 3) {
      const t = u.attackPhaseT / 0.15;
      offsetX = (u.team === 'monster' ? 4 : -4) * t;
      scaleY = 1 + 0.05 * t; scaleX = 1 - 0.03 * t;
    }
    // Walk sheet 보유 캐릭터(용사/몬스터): walkT 기반 프레임 선택 + 화면 높이 정규화
    let frame: HTMLCanvasElement = u.sprite;
    let normalizedScale = 1;
    let useNormalized = false;
    let isMonsterSheet = false;
    if (u.team === 'hero' && HERO_SHEET_IDS.has(u.typeId)) {
      const sheet = getCachedSheet(u.typeId, HERO_SHEET_FRAMES, 1);
      if (sheet) {
        const idx = u._isMoving
          ? Math.floor(u.walkT * 8) % HERO_SHEET_FRAMES
          : (Math.floor(u.bobT * 1.5) % 2);
        frame = sheet[idx] ?? sheet[0];
        const HERO_RENDER_H = 44;
        normalizedScale = (HERO_RENDER_H / frame.height) * u.scale;
        useNormalized = true;
      }
    } else if (u.team === 'monster' && MONSTER_SHEET_IDS.has(u.typeId)) {
      const sheet = getCachedSheet(u.typeId, MONSTER_SHEET_FRAMES, 1);
      if (sheet) {
        const idx = u._isMoving
          ? Math.floor(u.walkT * 8) % MONSTER_SHEET_FRAMES
          : (Math.floor(u.bobT * 1.5) % 2);
        frame = sheet[idx] ?? sheet[0];
        const MONSTER_RENDER_H = 40;
        normalizedScale = (MONSTER_RENDER_H / frame.height) * u.scale;
        useNormalized = true;
        isMonsterSheet = true;
      }
    }
    const sw = useNormalized ? frame.width * normalizedScale : frame.width * u.scale;
    const sh = useNormalized ? frame.height * normalizedScale : frame.height * u.scale;
    const swA = sw * scaleX, shA = sh * scaleY;
    let dy = u.y - shA + idleBob + walkBounce;
    if (u.spawnT > 0) { dy -= u.spawnT * 60; ctx.save(); ctx.globalAlpha = 1 - u.spawnT * 2; }
    if (u.flash > 0) { ctx.save(); ctx.filter = 'brightness(3.5) saturate(0)'; }
    // F-1: Rally 활성 중 몬스터 머리 위 ⚡ 표시
    if (u.team === 'monster' && this.rallyActiveT > 0) {
      const t = performance.now();
      const bob = Math.sin(t / 100) * 2;
      ctx.save();
      ctx.fillStyle = '#FFEAA7';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#FDCB6E';
      ctx.shadowBlur = 6;
      ctx.fillText('⚡', u.x, dy - 2 + bob);
      ctx.restore();
      ctx.textAlign = 'left';
    }
    // BAL-9: 엘리트 외곽 빨간 발광
    if (u.isElite && u.flash <= 0) {
      const t = performance.now();
      const glow = 0.6 + 0.3 * Math.sin(t / 200);
      ctx.save();
      ctx.shadowColor = '#FF6B6B';
      ctx.shadowBlur = 8 * glow;
      // 엘리트 표시 원
      ctx.fillStyle = `rgba(255,107,107,${0.35 * glow})`;
      ctx.beginPath();
      ctx.ellipse(u.x, u.y + 2, swA * 0.4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // 렌더링 분기:
    //   - 용사 시트: 소스가 이미 좌측 향 → 미러 X (offsetX 부호 반전)
    //   - 용사 절차적 fallback: 우측 향 → 미러
    //   - 몬스터 시트: 소스가 좌측 향 / 게임에선 우측 향(용사 측) → 미러 적용
    //   - 몬스터 절차적: 그대로
    if (u.team === 'hero' && useNormalized) {
      ctx.drawImage(frame, u.x - swA / 2 - offsetX, dy, swA, shA);
    } else if (u.team === 'hero') {
      ctx.save(); ctx.translate(u.x, 0); ctx.scale(-1, 1);
      ctx.drawImage(frame, -swA / 2 + offsetX, dy, swA, shA);
      ctx.restore();
    } else if (isMonsterSheet) {
      ctx.save(); ctx.translate(u.x, 0); ctx.scale(-1, 1);
      ctx.drawImage(frame, -swA / 2 - offsetX, dy, swA, shA);
      ctx.restore();
    } else {
      ctx.drawImage(frame, u.x - swA / 2 + offsetX, dy, swA, shA);
    }
    if (u.flash > 0) ctx.restore();
    if (u.spawnT > 0) ctx.restore();
    if (u.hp < u.effHp() && !u.isBoss) {
      const bw = sw * 0.85, bx = u.x - bw / 2, by = dy - 5;
      ctx.fillStyle = '#000';
      ctx.fillRect(bx, by, bw, 3);
      ctx.fillStyle = u.team === 'monster' ? MASTER_PAL.pinkAccent : MASTER_PAL.salmon;
      ctx.fillRect(bx + 1, by + 1, (bw - 2) * Math.max(0, u.hp / u.effHp()), 1);
    }
    // P0-3: 적 직업 헤드 아이콘 — hero 한정, 보스 제외, typeId별 항시 표시
    if (u.team === 'hero' && !u.isBoss) {
      const headIcon: Record<string, { txt: string; color: string }> = {
        healer: { txt: '✚', color: '#26de81' },
        shield: { txt: '🛡', color: '#74B9FF' },
        rogue:  { txt: '🗡', color: '#FF6B6B' },
        archer: { txt: '🏹', color: '#FFEAA7' },
        mage:   { txt: '✦', color: '#a55eea' },
      };
      const ic = headIcon[u.typeId];
      if (ic) {
        ctx.save();
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = 'center';
        ctx.shadowColor = ic.color;
        ctx.shadowBlur = 4;
        ctx.fillStyle = ic.color;
        ctx.fillText(ic.txt, u.x, dy - 4);
        ctx.restore();
      }
    }
  }

  private drawProjectiles() {
    const ctx = this.ctx;
    for (const p of this.projectiles) {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
    }
  }

  private drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const a = 1 - p.age / p.life;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawDamageTexts() {
    const ctx = this.ctx;
    for (const t of this.damageTexts) {
      t.age += 1 / 60; t.y += t.vy * (1 / 60); t.vy += 80 * (1 / 60);
    }
    this.damageTexts = this.damageTexts.filter((t) => t.age < t.life);
    for (const t of this.damageTexts) {
      const a = 1 - t.age / t.life;
      ctx.globalAlpha = a;
      ctx.save();
      ctx.textAlign = 'center';
      if (t.crit) {
        ctx.font = `900 20px 'Malgun Gothic', sans-serif`;
        ctx.translate(t.x, t.y); ctx.rotate(t.rot);
        ctx.fillStyle = '#000';
        ctx.fillText(t.txt, 2, 2); ctx.fillText(t.txt, -2, 2);
        ctx.fillText(t.txt, 2, -2); ctx.fillText(t.txt, -2, -2);
        ctx.fillStyle = MASTER_PAL.crimson;
        ctx.fillText(t.txt, 0, 0);
        ctx.fillStyle = t.color;
        ctx.fillText(t.txt, -1, -1);
      } else {
        // P0-4: 데미지 등급 시각 차등 — 숫자 크기에 따라 4단 (10/13/17/22px)
        // t.txt 형태: '-NN' 또는 '+NN HP' — 첫 숫자 추출
        const m = /[-+]?(\d+)/.exec(t.txt);
        const n = m ? parseInt(m[1], 10) : 0;
        const tier = n <= 10 ? 10 : n <= 30 ? 13 : n <= 80 ? 17 : 22;
        const fontSize = t.big ? Math.max(15, tier) : tier;
        ctx.font = `bold ${fontSize}px 'Malgun Gothic', sans-serif`;
        ctx.fillStyle = '#000';
        ctx.fillText(t.txt, t.x + 1, t.y + 1);
        ctx.fillStyle = t.color;
        ctx.fillText(t.txt, t.x, t.y);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  private drawHUD() {
    const ctx = this.ctx;
    const t = performance.now();

    // ===== 상단 좌측: 웨이브 배지 (보석 카르투시) =====
    {
      const bx = 6, by = 4, bw = 78, bh = 22;
      // 외부 그림자
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(bx + 1, by + 2, bw, bh);
      // 본체 그라디언트
      const grd = ctx.createLinearGradient(bx, by, bx, by + bh);
      grd.addColorStop(0, '#3a1a1a');
      grd.addColorStop(0.5, '#7a1818');
      grd.addColorStop(1, '#3a0a0a');
      ctx.fillStyle = grd;
      ctx.fillRect(bx, by, bw, bh);
      // 황금 테두리
      ctx.strokeStyle = '#FDCB6E';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
      // 광택
      ctx.fillStyle = 'rgba(255,234,167,0.18)';
      ctx.fillRect(bx + 2, by + 2, bw - 4, 4);
      // 보스 웨이브 글로우
      const isBoss = isBossWave(this.wave);
      if (isBoss) {
        const pulse = 0.4 + 0.3 * Math.sin(t / 200);
        ctx.shadowColor = '#FF6B6B';
        ctx.shadowBlur = 10 * pulse;
      }
      // 텍스트
      ctx.fillStyle = '#FFEAA7';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('WAVE', bx + 6, by + 10);
      ctx.fillStyle = isBoss ? '#FF6B6B' : '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`${this.wave}`, bx + 38, by + 17);
      ctx.shadowBlur = 0;
      // 보스 표식
      if (isBoss) {
        ctx.fillStyle = '#FF6B6B';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText('★ BOSS', bx + 50, by + 16);
      }
    }

    // ===== 상단 우측: 처치 + 콤보 카운터 =====
    {
      const kx = W - 88, ky = 4, kw = 82, kh = 22;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(kx + 1, ky + 2, kw, kh);
      const grd = ctx.createLinearGradient(kx, ky, kx, ky + kh);
      grd.addColorStop(0, '#241a3e'); grd.addColorStop(1, '#0e0820');
      ctx.fillStyle = grd; ctx.fillRect(kx, ky, kw, kh);
      ctx.strokeStyle = '#a55eea';
      ctx.lineWidth = 2;
      ctx.strokeRect(kx + 0.5, ky + 0.5, kw - 1, kh - 1);
      ctx.fillStyle = 'rgba(253,121,168,0.18)';
      ctx.fillRect(kx + 2, ky + 2, kw - 4, 4);
      ctx.fillStyle = '#FD79A8';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('KILL', kx + 6, ky + 10);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`${this.killCount}`, kx + 32, ky + 17);
      // 콤보
      if (this.combo >= 2) {
        ctx.fillStyle = '#FDCB6E';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText(`x${this.combo}`, kx + 60, ky + 10);
      }
    }

    // ===== HP 바 (붉은 보석) — 마왕성 명시 =====
    // LD-4: HP 위험 시 거대화 (20% 미만)
    const hpRatio = this.displayHp / this.castleMaxHp;
    const hpDanger = hpRatio < 0.2;
    // UI U-2: HP < 50% 시 % 우선 라벨 (가독성)
    const hpPct = Math.ceil(hpRatio * 100);
    const hpLabel = hpRatio < 0.5
      ? `🏰 ${hpPct}%  (${Math.ceil(this.displayHp)})`
      : `🏰 마왕성 ${Math.ceil(this.displayHp)} / ${this.castleMaxHp}`;
    this.drawJeweledBar({
      x: 6, y: 30, w: W - 12, h: hpDanger ? 22 : 14,
      v: this.displayHp, max: this.castleMaxHp,
      colorMain: '#D63031', colorTop: '#FF7675', colorBot: '#7a1818',
      label: hpLabel,
      borderColor: hpDanger ? '#FF6B6B' : '#FDCB6E',
    });
    // ===== MP 바 (보라 보석) — 마력 명시. HP 위험 시 페이드 =====
    // UI U-6: 라벨은 즉시값(this.mp)으로 — fill만 lerp 애니메이션 사용
    if (!hpDanger) {
      this.drawJeweledBar({
        x: 6, y: 47, w: W - 12, h: 14,
        v: this.displayMp, max: this.mpMax,
        colorMain: '#7B2D8E', colorTop: '#a55eea', colorBot: '#3a0d4e',
        label: `🔮 마력 ${Math.floor(this.mp)} / ${this.mpMax}`,
        borderColor: '#a55eea',
      });
    } else {
      // HP 위험 시 MP 바 작게/dim
      ctx.save();
      ctx.globalAlpha = 0.4;
      this.drawJeweledBar({
        x: 6, y: 55, w: W - 12, h: 8,
        v: this.displayMp, max: this.mpMax,
        colorMain: '#7B2D8E', colorTop: '#a55eea', colorBot: '#3a0d4e',
        label: `🔮 ${Math.floor(this.mp)}`,
        borderColor: '#a55eea',
      });
      ctx.restore();
    }

    // ===== 콤보 큰 표시 (5+ 시) =====
    if (this.combo >= 5) {
      ctx.save();
      const pulse = 1 + 0.06 * Math.sin(t / 120);
      ctx.translate(W / 2, 105);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = '#FDCB6E';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#FFEAA7';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.combo}`, 0, 0);
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#FD79A8';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('COMBO', 0, 14);
      ctx.restore();
      ctx.textAlign = 'left';
    }
  }

  /** HUD bars — 광택/그림자/보석 외곽 */
  private drawJeweledBar(opts: {
    x: number; y: number; w: number; h: number;
    v: number; max: number;
    colorMain: string; colorTop: string; colorBot: string;
    label: string; borderColor: string;
  }) {
    const ctx = this.ctx;
    const { x, y, w, h, v, max, colorTop, colorMain, colorBot, label, borderColor } = opts;
    const ratio = Math.max(0, Math.min(1, v / max));
    // 외부 드롭 섀도우
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x + 1, y + 2, w, h);
    // 트랙 (어두운 홈)
    const trackGrd = ctx.createLinearGradient(x, y, x, y + h);
    trackGrd.addColorStop(0, '#0a0612');
    trackGrd.addColorStop(1, '#1a0c30');
    ctx.fillStyle = trackGrd;
    ctx.fillRect(x, y, w, h);
    // 채움 (보석 그라디언트)
    if (ratio > 0) {
      const fillW = (w - 4) * ratio;
      const fillGrd = ctx.createLinearGradient(x, y, x, y + h);
      fillGrd.addColorStop(0,    colorTop);
      fillGrd.addColorStop(0.45, colorMain);
      fillGrd.addColorStop(1,    colorBot);
      ctx.fillStyle = fillGrd;
      ctx.fillRect(x + 2, y + 2, fillW, h - 4);
      // 상단 광택 라인
      ctx.fillStyle = 'rgba(255,255,255,0.30)';
      ctx.fillRect(x + 2, y + 2, fillW, 2);
      // 하단 그림자 라인
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x + 2, y + h - 4, fillW, 2);
    }
    // 보석 외곽 (황금/보라)
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    // 라벨
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 2;
    ctx.fillText(label, x + w / 2, y + h - 4);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
  }

  /** 부활 게이트 — castleHp 0 도달 시 1회만 부활 모달 표시
   *  첫 3세션 광고 없음 정책 (UXUI §전략3) — runs <= 2 시점에는 부활 광고 노출 X */
  private tryRevivalOrGameOver() {
    if (this.state === 'gameover') return;
    const runs = useSaveStore.getState().runs;
    if (!this.revivalUsed && runs >= 3) {
      // 단계 3 예외: 부활은 큐 적재 시 영영 못 뜰 위험이 있어 강제 즉시 open.
      // 우선순위 70(revival) < 90(tutorial)이지만, paused 상태에서 hero damage 없으므로
      // tutorial 활성 + castleHp=0 도달 동시 시나리오는 사실상 발생 0.
      this.pendingRevival = true;
      this.paused = true;
      this.castleHp = 0;
      Audio.boss_alert();
      return;
    }
    this.gameOver();
  }

  /** 광고 시청 성공 → 부활 (QA M-2: 패키지 — 50% HP + 적 3초 freeze + 마력 풀 + 무료 카드 1회) */
  acceptRevival() {
    if (!this.pendingRevival) return;
    this.pendingRevival = false;
    this.revivalUsed = true;
    // BUG-006: 부활은 새 라이프 — emergency 무료 펼치기 1회 다시 허용
    this.emergencyRevealUsed = false;
    this.castleHp = Math.floor(this.castleMaxHp * this.demonPower.revivalHpRatio);
    this.displayHp = this.castleHp;
    // QA M-2: freeze 1.5→3.0s — 회복할 시간을 충분히 제공
    for (const h of this.heroes) {
      if (h.dead) continue;
      h.frozen = Math.max(h.frozen, 3.0);
      // BUG-003: 페이즈 2 desperate 카운트다운 + castleStrike 쿨다운 재초기화
      if (h.bossPhase === 2) {
        h.desperateT = 0;        // 폭발 타이머 취소
        h.bossPhase = 1 as 0 | 1 | 2;  // 페이즈 1로 되돌림 (다음 25%까지 안전)
      }
      h.castleStrikeCdT = Math.max(h.castleStrikeCdT, 5);
    }
    // QA M-2: 마력 풀충전
    this.mp = this.mpMax;
    this.displayMp = this.mp;
    this.flashScreen('#FDCB6E', 0.7);
    this.shakeFx(14);
    this.showBanner('✨ 마왕 부활 ✨', '50% HP + 마력 풀 + 무료 카드', '#FDCB6E', 1.6);
    Audio.relic_sfx();
    Ait.haptic('heavy');
    if (this.canResumeFrom('revival')) this.paused = false;
    this.tryFlushOverlayQueue();
    // QA M-2: 무료 카드 1회 즉시 발동 (0.5초 지연으로 freeze 시각 우선 노출)
    this.safeTimeout(() => {
      if (!this.cardChoices && !this.slot.active) {
        const save = this.mp;
        this.mp = this.currentCardCost();
        this.beginSpin();
        this.mp = save;  // 비용 무료
      }
    }, 500);
  }

  /** 부활 거절 → 게임 종료 */
  declineRevival() {
    if (!this.pendingRevival) return;
    this.pendingRevival = false;
    this.paused = false;
    this.gameOver();
  }

  /* ===== Game Over ===== */
  private gameOver() {
    if (this.state === 'gameover') return;
    this.state = 'gameover';
    Audio.game_over_sfx();
    // LD-9: 결과 화면 진입 동선 단축 (1000ms+800ms → 400ms+400ms)
    this.safeTimeout(() => Audio.bgmCrossfade('result', 400), 400);
    const sec = (performance.now() - this.startTime) / 1000;
    // EconomySystem: 영혼석 보상 산출 위임 (스테이지 modifier rewardMul 합산)
    const reward = computeSoulstoneReward({
      wave: this.wave,
      killCount: this.killCount,
      comboBest: this.comboBest,
      seasonMul: currentSeason().stoneMul,
      edictStoneMul: (this.todayEdictDef.modifiers.stoneMul ?? 1) * this.stageMod.rewardMul,
      interiorStoneMul: aggregatedInteriorBonus(useSaveStore.getState().equippedInteriors).stoneMul,
      queuedBonusStones: this.queuedBonusStones,
      challengeBonusStones: this.challengeBonusStones,
      isNewbieFirstFiveRuns: useSaveStore.getState().runs < 5,
    });
    const stones = reward.total;
    useSaveStore.getState().recordRun(this.wave, this.killCount, stones);
    Ait.submitScore(this.wave, 'wave').catch(() => {});
    // D1/D3/D7 리텐션 푸시 (AIT_SENIOR_DEV §리텐션)
    const ONE_DAY = 24 * 60 * 60 * 1000;
    Ait.schedulePush({
      title: '⚔ 마왕성이 너를 기다린다',
      body: '어제의 기록을 깨러 가자!',
      afterMs: ONE_DAY,
    }).catch(() => {});
    Ait.schedulePush({
      title: '👑 새로운 유물이 발견됐다',
      body: `웨이브 ${this.wave} 갱신을 노려보세요`,
      afterMs: 3 * ONE_DAY,
    }).catch(() => {});
    Ait.schedulePush({
      title: '🔥 일주일 만의 부활',
      body: '잊혀진 마왕이여, 다시 군림할 시간이다',
      afterMs: 7 * ONE_DAY,
    }).catch(() => {});
    // OVERHAUL §3.3: 가장 진행도 높은 빌드 계산
    const dominant = dominantBuild(this.buildStats);
    // ★ 작전 화면: MVP 카드 / 가장 많이 픽한 태그
    let topMonId: string | null = null;
    let topMonCount = 0;
    for (const [id, c] of Object.entries(this.pickedMonsterCount)) {
      if (c > topMonCount) { topMonCount = c; topMonId = id; }
    }
    let topTag: string | null = null;
    let topTagCount = 0;
    for (const [tag, c] of Object.entries(this.buildStats.tagPicks)) {
      if (c > topTagCount) { topTagCount = c; topTag = tag; }
    }
    const last10sDmg = this.recentCastleDamage.reduce((a, e) => a + e.d, 0);
    const stageStars = this.stageCleared
      ? calculateClearStars(this.castleHp / Math.max(1, this.castleMaxHp))
      : undefined;
    // 첫 클리어 여부는 stats 빌드 시점에 결정 (recordStageClear는 아래 actions에서 호출됨)
    const wasFirstClear = this.stageCleared
      && this.runStageId
      && !useSaveStore.getState().clearedStages.includes(this.runStageId);
    const stats: GameOverStats = {
      // 단계 6: 모드/스테이지/클리어 페이로드
      mode: this.runMode,
      gameMode: this.currentMode,
      stageId: this.runStageId,
      cleared: this.stageCleared,
      firstClear: !!wasFirstClear,
      stars: stageStars,
      // 챌린지 클리어 라벨 (W15 통과 시 캡처)
      challengeFirstClear: this._challengeFirstClearLabeled,
      challengeReward: this.challengeBonusStones > 0 && this._challengeClearedId
        ? this.challengeBonusStones
        : undefined,
      challengeIdAtClear: this._challengeClearedId ?? undefined,
      wave: this.wave, killCount: this.killCount, comboBest: this.comboBest,
      relics: Array.from(this.relics), durationSec: sec, soulstones: stones,
      dominantBuildId: dominant?.build.id,
      dominantBuildProgress: dominant?.progress,
      // ★ 작전 화면 페이로드
      bossKills: this.buildStats.bossKills,
      diedDuringBoss: this.bossActive,
      diedToBossId: this.bossUnit?.typeId ?? null,
      topPickedTag: topTag,
      topPickedMonsterId: topMonId,
      topPickedMonsterCount: topMonCount,
      healerEncountered: this.healerEncountered,
      healerKills: this.healerKills,
      emergencyRevealUsed: this.emergencyRevealUsedCount > 0,
      lowMpStreaks: this.lowMpStreakSec,
      lateGameMonsterCount: this.monsters.filter((m) => !m.dead).length,
      castleDamageLast10s: last10sDmg,
    };
    // OVERHAUL §3.4: 마왕 사망 대사 + 빌드 칭호 100% 시 reward 적립
    if (!this.stageCleared) this.speakDemon(pickDemonLine(DEMON_LINES_DEATH));
    if (dominant && dominant.progress >= 1) {
      // 영혼석 보상 + 영구 칭호 (첫 달성 시에만 추가 보너스 100)
      useSaveStore.getState().addStones(dominant.build.reward);
      const isNew = useSaveStore.getState().recordBuildTitle(dominant.build.id);
      if (isNew) useSaveStore.getState().addStones(100);
    }
    // 단계 6: 스테이지 클리어 시 영구 진행도 기록 (첫 클리어 보상 + 모집 잠금 해제)
    if (this.stageCleared && this.runStageDef && stageStars) {
      const save = useSaveStore.getState();
      const def = this.runStageDef;
      const isFirstClear = !save.clearedStages.includes(def.id);
      save.recordStageClear(def.id, stageStars);
      if (isFirstClear) {
        // 새 StageDefinition shape: firstClearReward는 객체
        save.addStones(def.firstClearReward.soulstones ?? 0);
        const unlockIds = def.firstClearReward.unlockRecruitIds ?? [];
        if (unlockIds.length > 0) save.unlockRecruits(unlockIds);
        const featureIds = def.firstClearReward.unlockFeatureIds ?? [];
        if (featureIds.includes('endless')) save.setEndlessUnlocked(true);
        if (featureIds.includes('challenges')) save.setChallengeUnlocked(true);
      } else {
        // 반복 클리어 보상: 영혼석 + 도감 조각
        save.addStones(def.repeatReward.soulstones ?? 0);
        const frags = def.repeatReward.heroFragments;
        if (frags) {
          for (const [heroId, n] of Object.entries(frags)) {
            save.addHeroFragment(heroId, n);
          }
        }
      }
    }
    this.emit('gameover', stats);
  }

  /** OVERHAUL §3.2: 리스크 카드 페널티 적용 */
  private applyRiskEffect(r: RiskEffect) {
    if (r.kind === 'mp_drain') {
      this.mp = Math.max(0, this.mp - r.amount);
      this.spawnDamageText(W / 2, FIELD.y + 30, `-${r.amount} 마력`, '#FF7675', false, true);
    } else if (r.kind === 'castle_hp_drain') {
      const dmg = Math.floor(this.castleMaxHp * r.pct);
      this.castleHp = Math.max(1, this.castleHp - dmg);
      this.spawnDamageText(40, GROUND_Y - 30, `-${dmg} HP`, '#FF6B6B', true);
    } else if (r.kind === 'spawn_extra_enemy') {
      for (let i = 0; i < r.count; i++) {
        const pool = heroPoolForWave(this.wave);
        const t = pool[Math.floor(Math.random() * pool.length)];
        this.safeTimeout(() => this.spawnHero(t, false), i * 200);
      }
    } else if (r.kind === 'sacrifice_ally') {
      const alive = this.monsters.filter((m) => !m.dead);
      if (alive.length > 0) {
        const target = alive[Math.floor(Math.random() * alive.length)];
        target.dead = true;
        this.spawnParticles(target.x, target.y - 16, '#7B2D8E', 12);
      }
    }
  }

  /** OVERHAUL §3.2: 분기 카드 픽 — 다음 5wave 동안 효과 적용 */
  acceptBranchCard(idx: number) {
    if (!this.pendingBranchChoices) return;
    const def = this.pendingBranchChoices[idx];
    if (!def) return;
    this.activeBranch = { def, expireWave: this.wave + 4 };
    this.showBanner(`${def.icon} ${def.name}`, def.desc, '#FDCB6E', 1.8);
    this.flashScreen(def.tagBoost === 'fire' ? '#FF6B6B' : '#FDCB6E', 0.45);
    this.shakeFx(10);
    this.pendingBranchChoices = null;
    // 분기 카드 태그 매칭 풀이 0이면 안내 (모집 보강 권유)
    if (this.recruitedPool && this.recruitedPool.length > 0) {
      const matched = this.recruitedPool.filter((id) => MONSTERS[id]?.tags.includes(def.tagBoost));
      if (matched.length === 0) {
        this.safeTimeout(() => {
          this.showBanner('⚠ 모집 부족', `${def.tagBoost} 계열 부하가 없습니다`, '#FF6B6B', 1.6);
        }, 2000);
      }
    }
    if (this.canResumeFrom('branchChoice')) this.paused = false;
    this.tryFlushOverlayQueue();
    Audio.relic_sfx();
    Ait.haptic('heavy');
  }

  /**
   * ★ OverlayController 연동 — raw flag 스냅샷
   * 기존 상태 필드는 그대로 두고, 컨트롤러에 read-only로 넘긴다.
   * pausedByUser는 명시 사용자 pause만 — overlay-induced paused는 별도 (현재 미구분, TODO).
   */
  getOverlayFlags(): RawOverlayFlags {
    return {
      cardChoices: this.cardChoices,
      slotActive: this.slot.active,
      pendingRelicChoices: this.pendingRelicChoices,
      pendingEvent: this.pendingEvent,
      pendingRevival: this.pendingRevival,
      waveBreakActive: this.waveBreakActive,
      pendingBranchChoices: this.pendingBranchChoices,
      tutorialQueueLength: this.tutorialQueue.length,
      // 단계 2: togglePause로 명시된 사용자 pause만 인식
      pausedByUser: this.overlayQueue.userPauseActive,
      resultActive: this.state === 'gameover',
      // slowMo/hitStop은 시간 배율 연출이지 모달 pause가 아니다.
      // overlay로 취급하면 paused 상태에서 타이머가 줄지 않아 영구 정지될 수 있다.
      cutsceneActive: false,
      riskCardInSlot: !!this.riskCardSlot,
    };
  }

  /** 현재 가장 우선순위 높은 overlay (read-only 진단) */
  getTopOverlay(): OverlayKind {
    return topOverlay(this.getOverlayFlags());
  }

  /** simulation block 여부 (read-only) */
  isSimulationBlocked(): boolean {
    return shouldBlockSimulation(this.getOverlayFlags());
  }

  /**
   * paused를 풀어도 안전한가? (해당 overlay 종류는 자기 자신 제외)
   * GameEngine 내부의 paused 해제 분기에서 가드로 사용한다.
   */
  canResumeFrom(except: OverlayKind): boolean {
    return canResume(this.getOverlayFlags(), except);
  }

  /**
   * 새 overlay를 띄워도 되는지 사전 검사 (advisor only).
   * 현재 GameEngine 코드 흐름은 이 결과를 강제하지 않고 진단용으로만 사용한다.
   * 향후 단계에서 open API를 컨트롤러로 옮기면 강제 가드 적용 가능.
   */
  canOpenOverlay(candidate: OverlayKind): boolean {
    return canOpen(this.getTopOverlay(), candidate);
  }

  /** OVERHAUL §3.4: 마왕 대사 표시 — HUD에 4초 fade */
  speakDemon(line: DemonLine) {
    this.demonLine = { text: line.text, t: 0, life: 4.0 };
    this.demonMood = line.mood;
    Audio.ui_tap();
  }

  /** OVERHAUL §3.3: 카드 픽 시 빌드 통계 갱신 */
  trackPickStats(monsterId: string) {
    const def = MONSTERS[monsterId];
    if (!def) return;
    for (const tag of def.tags) {
      this.buildStats.tagPicks[tag] = (this.buildStats.tagPicks[tag] || 0) + 1;
    }
    this.updateBuildBonus('pick');
  }

  // 외부에서 호출 (UI 버튼)
  togglePause() {
    this.paused = !this.paused;
    // 단계 2: 사용자 pause 명시 추적 (overlay-induced paused와 구분)
    this.overlayQueue.userPauseActive = this.paused;
    // 사용자가 pause 해제 시 큐에 deferred overlay 있으면 자동 활성화
    if (!this.paused) this.tryFlushOverlayQueue();
  }

  /** ★ 큐에 쌓인 deferred overlay 1개 활성화 시도 (없으면 noop) */
  private tryFlushOverlayQueue() {
    const top = this.getTopOverlay();
    this.overlayQueue.popAndApply(top);
  }
  toggleSpeed() { this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1; }
  toggleAuto()  {
    this.autoReveal = !this.autoReveal;
    // BUG-012 + OverlayController: AUTO ON 시 cardChoice만 활성이라면 paused 해제
    if (this.autoReveal && this.paused && this.canResumeFrom('cardChoice')) {
      this.paused = false;
    }
  }

  // 상태 조회 (UI 렌더링용)
  getSnapshot() {
    // 살아있는 몬스터의 typeId별 카운트 (진화 힌트용)
    const aliveCounts: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};
    for (const m of this.monsters) {
      if (m.dead) continue;
      aliveCounts[m.typeId] = (aliveCounts[m.typeId] || 0) + 1;
      for (const t of m.tags) tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
    // CardSystem: 진화 필요 수 (칙령 > wisdom > 기본 3)
    const evoNeed = calculateEvoNeed({
      edictOverride: this.todayEdictDef.modifiers.evoNeedOverride,
      hasWisdomRelic: this.relics.has('wisdom'),
    });

    // 시너지 진행도 — count >= 1인 시너지 모두 (UI에서 ACTIVE 분리)
    const synergyProgress = SYNERGIES.map((s) => {
      // need 추출: test() 내부의 임계값을 계산하기 위해 1..6 시도
      let need = 0;
      for (let n = 1; n <= 8; n++) {
        const probe: Record<string, number> = {};
        for (const k in tagCounts) probe[k] = n;
        if (s.test(probe)) { need = n; break; }
      }
      // 현재 카운트 = synergy 트리거에 기여하는 태그 합 중 max
      let count = 0;
      // test()에 사용되는 태그 범위는 s.id에 따라 다름 — 임의의 단일 태그로 추정
      // 4종 코드 시너지: magic/undead/tank/mob — 그 외 GDD 4종
      const maybeTags: Record<string, string[]> = {
        magic: ['magic'],
        undead: ['undead'],
        tank: ['tank'],
        mob: ['mob'],
        rage: ['beast', 'orc'],
        inferno: ['fire'],
        fulldark: ['dark'],
        lifescream: ['undead', 'zombie'],
      };
      const tagsForId = maybeTags[s.id] || [];
      for (const tag of tagsForId) count += tagCounts[tag] || 0;
      return {
        id: s.id, name: s.name,
        count, need: need || 1,
        active: this.activeSynergies.has(s.id),
      };
    }).filter((sp) => sp.count > 0);

    // 보스 다음 액션 telegraph (실제 남은 시간)
    let bossNext: { label: string; sec: number; danger?: boolean } | null = null;
    const b = this.bossUnit;
    if (b) {
      // QA-7: 페이즈 2 (desperate) 시 카운트다운 무조건 우선
      if (b.bossPhase === 2 && b.desperateT > 0) {
        bossNext = {
          label: `⏱ 최후의 일격`,
          sec: b.desperateT,
          danger: true,
        };
      } else {
        const bossDef = BOSSES[b.typeId];
        const candidates: { label: string; sec: number }[] = [];
        if (bossDef?.invuln) {
          if (b.invulnT > 0) {
            candidates.push({ label: `⛨ 무적 ${b.invulnT.toFixed(1)}s`, sec: b.invulnT });
          } else {
            candidates.push({ label: '⛨ 무적 임박', sec: Math.max(0, b.invulnCdT) });
          }
        }
        if (bossDef?.castleStrike) {
          candidates.push({ label: '☄ 마왕성 공격', sec: Math.max(0, b.castleStrikeCdT) });
        }
        if (bossDef?.bossHeal) {
          candidates.push({ label: '✚ 광역 회복', sec: Math.max(0, b.bossHealCdT) });
        }
        if (candidates.length > 0) {
          candidates.sort((a, c) => a.sec - c.sec);
          bossNext = candidates[0];
        }
      }
    }

    const snap = {
      wave: this.wave,
      hp: this.displayHp, hpMax: this.castleMaxHp,
      mp: Math.floor(this.displayMp), mpMax: this.mpMax,
      kills: this.killCount, combo: this.combo,
      cardChoices: this.cardChoices,
      ultiReady: this.ulti.ready,
      ultiGauge: this.ulti.gauge / this.ulti.max,
      paused: this.paused, speed: this.speed, autoReveal: this.autoReveal,
      cardCost: this.currentCardCost(),
      relics: Array.from(this.relics),
      synergies: Array.from(this.activeSynergies),
      synergyProgress,
      bossActive: this.bossActive,
      bossHp: this.bossUnit ? this.bossUnit.hp / this.bossUnit.maxHp : 0,
      bossName: this.bossUnit?.name,
      bossNext,
      slotActive: this.slot.active,
      slotTripleReveal: this.slot.tripleReveal,
      pendingRelicChoices: this.pendingRelicChoices,
      pendingEvent: this.pendingEvent,
      bonusWaveActive: this.bonusWaveActive,
      duelActive: this.duelActive,
      rerollAvailable: this.rerollAvailable,
      pendingRevival: this.pendingRevival,
      rallyCdT: this.rallyCdT,
      rallyReady: this.rallyCdT <= 0,
      rallyActiveT: this.rallyActiveT,  // > 0 일 때 버프 활성 — UI 가속 표시용
      rallyUsedCount: this.rallyUsedCount,
      // 필살기 변형 (0/1/2) — 현재/다음 시각 구분
      ultiVariant: this.ultiVariant,
      ultiNextVariant: (this.ultiVariant + 1) % 3,
      waveBreakActive: this.waveBreakActive,
      waveBreakUsed: this.waveBreakUsed,
      lockedCardId: this.lockedCardId,
      tagPickCount: this.tagPickCount,
      tutorialQueue: this.tutorialQueue,
      heroNearCastle: this.heroes.some((h) => !h.dead && h.x < 150),
      // 카드 결정 보조 정보
      aliveCounts,
      evoNeed,
      tagCounts,
      // 웨이브 진행도
      waveSpawned: this.waveSpawned,
      waveTotal: this.waveTotal,
      runs: useSaveStore.getState().runs,
      cardRevealCount: this.cardRevealCount,
      autoPickT: this._autoPickT,
      // FEEL F-7: 살아있는 monster 수 (cap 14)
      aliveMonsters: this.monsters.filter((m) => !m.dead).length,
      // OVERHAUL §3.1 + §3.4
      stratum: this._currentStratum ? {
        id: this._currentStratum.id,
        name: this._currentStratum.name,
        index: this._currentStratum.index,
      } : null,
      demonLine: this.demonLine ? {
        text: this.demonLine.text,
        progress: this.demonLine.t / this.demonLine.life,
      } : null,
      demonMood: this.demonMood,
      // OVERHAUL §3.2: 리스크 카드 (현재 cardChoices 내 슬롯 idx)
      riskCardSlot: this.riskCardSlot ? {
        idx: this.riskCardSlot.idx,
        name: this.riskCardSlot.def.name,
        desc: this.riskCardSlot.def.desc,
      } : null,
      // OVERHAUL §3.2: 분기 카드 모달 + 활성 분기
      pendingBranchChoices: this.pendingBranchChoices,
      activeBranch: this.activeBranch ? {
        id: this.activeBranch.def.id,
        icon: this.activeBranch.def.icon,
        name: this.activeBranch.def.name,
        expireWave: this.activeBranch.expireWave,
      } : null,
      // OVERHAUL §3.6: 오늘의 칙령
      todayEdict: {
        id: this.todayEdictDef.id,
        icon: this.todayEdictDef.icon,
        name: this.todayEdictDef.name,
      },
      // ★ OverlayController 진단 정보 (UI에서 직접 사용은 안 함, devtools/QA용)
      _overlay: {
        top: this.getTopOverlay(),
        active: activeOverlays(this.getOverlayFlags()),
      },
      // QO Q-1: 활성 일일 미션 진행도 (HUD 표시용)
      activeMissions: useSaveStore.getState().daily.missions
        .filter((m) => !m.claimed)
        .slice(0, 3),
      // QO Q-6: 진화 임박 (살아있는 같은 종류가 evoNeed - 1)
      evoImminentTypes: Object.entries(aliveCounts)
        .filter(([id, c]) => c >= evoNeed - 1 && (MONSTERS as any)[id]?.evolveTo)
        .map(([id]) => id),
      // QO Q-5: 챌린지 활성 여부
      challengeId: this.challengeId,
      // 모집 풀 정보 (UI 노출용 — recruitedPool null이면 fallback 전체)
      deckSize: this.recruitedPool ? this.recruitedPool.length : null,
      // 게임 모드 (discriminated union — UI 분기용)
      gameMode: this.currentMode,
      // 스테이지 진행 정보 (스테이지 모드 전용 — endless는 null)
      stage: this.runMode === 'stage' && this.runStageDef ? {
        id: this.runStageDef.id,
        chapterId: this.runStageDef.chapterId,
        index: this.runStageDef.index,
        name: this.runStageDef.name,
        subtitle: this.runStageDef.subtitle,
        icon: this.runStageDef.icon,
        waveLimit: this.runStageDef.waveLimit,
        recommendedTags: this.runStageDef.recommendedTags ?? [],
      } : null,
      runMode: this.runMode,
      // versioning은 아래 시그니처 비교 후 채움
      version: 0,
    };
    // ── snapshot versioning ─────────────────────────────────────────
    // HUD/overlay에서 실제로 화면을 바꿀 수 있는 핵심 필드만 cheap signature로 합성.
    // 연속 변하는 float은 quantize (rallyCdT 0.1s, bossHp 1%, ultiGauge 1%, demonLine 5%).
    // 시그니처가 같으면 version 동결 → GameScreen이 setState 생략 → React rerender 절감.
    const sig =
      `${snap.wave}|${Math.floor(snap.hp)}|${snap.mp}|${snap.kills}|${snap.combo}` +
      `|${snap.ultiReady ? 1 : 0}|${(snap.ultiGauge * 100) | 0}|${snap.ultiVariant}` +
      `|${snap.paused ? 1 : 0}|${snap.speed}|${snap.autoReveal ? 1 : 0}|${snap.cardCost}` +
      `|${snap.bossActive ? 1 : 0}|${(snap.bossHp * 100) | 0}` +
      `|${snap.slotActive ? 1 : 0}|${snap.slotTripleReveal ? 1 : 0}` +
      `|${snap.cardChoices ? snap.cardChoices.length : 0}` +
      `|${snap.pendingRelicChoices ? snap.pendingRelicChoices.length : 0}` +
      `|${snap.pendingEvent ? 1 : 0}|${snap.pendingRevival ? 1 : 0}` +
      `|${snap.waveBreakActive ? 1 : 0}|${snap.bonusWaveActive ? 1 : 0}` +
      `|${(snap.rallyCdT * 10) | 0}|${(snap.rallyActiveT * 10) | 0}` +
      `|${snap.aliveMonsters}|${snap.waveSpawned}|${snap.waveTotal}` +
      `|${snap.synergies.length}|${snap.relics.length}` +
      `|${snap.heroNearCastle ? 1 : 0}|${snap.rerollAvailable ? 1 : 0}` +
      `|${snap.lockedCardId || '-'}|${snap.riskCardSlot ? snap.riskCardSlot.idx : -1}` +
      `|${snap.pendingBranchChoices ? snap.pendingBranchChoices.length : 0}` +
      `|${snap.activeBranch ? snap.activeBranch.id : '-'}` +
      `|${snap.tutorialQueue.length}` +
      `|${snap.demonLine ? Math.floor((snap.demonLine.progress || 0) * 20) : -1}` +
      `|${snap.bossNext ? `${snap.bossNext.label}:${(snap.bossNext.sec * 10) | 0}` : '-'}` +
      `|${snap._overlay.top}` +
      `|${snap.activeMissions.map((m: any) => `${m.id}:${m.progress}`).join(',')}` +
      `|${snap.evoImminentTypes.join(',')}` +
      `|${snap.runMode}|${snap.stage ? snap.stage.id : '-'}`;
    if (sig !== this._lastSnapSig) {
      this._snapVersion++;
      this._lastSnapSig = sig;
    }
    snap.version = this._snapVersion;
    return snap;
  }

  /**
   * Debug 계측 — production 빌드에서도 호출 가능하지만 호출자가 import.meta.env.DEV로 가드.
   * 30분 soak test에서 메모리/누수/카운트 추적.
   * 가벼운 read-only — 매 frame 호출해도 영향 없음.
   */
  getDebugStats() {
    return {
      // 게임 객체 카운트 (배열 길이 — alive/dead 모두 포함)
      monsters: this.monsters.length,
      monstersAlive: this.monsters.filter((m) => !m.dead).length,
      heroes: this.heroes.length,
      heroesAlive: this.heroes.filter((h) => !h.dead).length,
      projectiles: this.projectiles.length,
      particles: this.particles.length,
      damageTexts: this.damageTexts.length,
      effects: this.effects.length,
      banners: this.banners.length,
      // 진행 상태
      wave: this.wave,
      runtimeSec: (performance.now() - this.startTime) / 1000,
      // snapshot version — 누적 증가 횟수 (rerender 빈도 가늠)
      snapVersion: this._snapVersion,
      // 게임 상태
      state: this.state,
      paused: this.paused,
    };
  }

  // 카드 공개 캔버스 + scrollY 노출 (GameScreen에서 직접 렌더용)
  getSlotState() {
    return {
      active: this.slot.active,
      strips: this.slot.strips,
      reelScroll: this.slot.reelScroll,
      reelStopped: this.slot.reelStopped,
      flashTimers: this.slot.flashTimers,
    };
  }
}
