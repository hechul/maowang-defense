import { useEffect, useRef, useState } from 'react';
import { GameEngine, type GameOverStats } from '../../game/GameEngine';
import { DebugOverlay, isDebugOverlayEnabled } from '../debug/DebugOverlay';
import { MONSTERS } from '../../game/data/monsters';
import { MISSION_POOL } from '../../game/data/missions';
import { getDemonChar } from '../../game/data/demonChars';
import { getDailySeedRun, mulberry32, dailyScore } from '../../game/data/dailySeed';
import { CHALLENGES } from '../../game/data/challenges';
import { RELICS } from '../../game/data/relics';
import { EVENTS } from '../../game/data/events';
import * as Ait from '../../sdk/AitBridge';
import { useSaveStore } from '../../store/useSaveStore';
import { ENABLE_MONETIZATION } from '../../config/mvpFlags';

interface GameScreenProps {
  onGameOver: (stats: GameOverStats) => void;
  challengeId?: string | null;
  /** 스테이지 모드 진입 시 stageId. null/미지정 → 무한 모드 */
  stageId?: string | null;
  /** 'stage' | 'endless' | 'daily' (기본 endless). stageId가 있으면 'stage'로 처리. */
  mode?: 'stage' | 'endless' | 'daily';
}

/** A-1: 접근성 옵션 토글 */
function AccessibilityToggles() {
  const acc = useSaveStore((s) => s.accessibility);
  const toggle = useSaveStore((s) => s.toggleAccessibility);
  return (
    <div style={{ marginBottom: 8 }}>
      <button
        style={{
          ...styles.pauseSubBtn,
          width: '100%', marginBottom: 4,
          ...(acc.reduceMotion ? { background: 'linear-gradient(180deg,#26de81,#1a8048)', color: '#fff' } : {}),
        }}
        onClick={() => toggle('reduceMotion')}
      >
        🌫 화면 흔들림 {acc.reduceMotion ? 'OFF' : 'ON'}
      </button>
      <button
        style={{
          ...styles.pauseSubBtn,
          width: '100%', marginBottom: 4,
          ...(acc.haptic ? {} : { background: 'linear-gradient(180deg,#26de81,#1a8048)', color: '#fff' }),
        }}
        onClick={() => toggle('haptic')}
      >
        📳 햅틱 {acc.haptic ? 'ON' : 'OFF'}
      </button>
      {/* ACC A-1: 큰 글씨 토글 */}
      <button
        style={{
          ...styles.pauseSubBtn,
          width: '100%', marginBottom: 4,
          ...(acc.largerText ? { background: 'linear-gradient(180deg,#26de81,#1a8048)', color: '#fff' } : {}),
        }}
        onClick={() => toggle('largerText')}
      >
        🔍 큰 글씨 {acc.largerText ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}

/** TUT: 학습 모달 — 게임 정지 + 풀스크린, "확인" 시 markSeen */
function TutorialModal({
  item,
  onClose,
}: {
  item: { id: string; title: string; body: string; icon?: string };
  onClose: () => void;
}) {
  return (
    <div style={styles.tutOverlay}>
      <div style={styles.tutCard}>
        {item.icon && <div style={styles.tutIcon}>{item.icon}</div>}
        <h2 style={styles.tutTitle}>{item.title}</h2>
        <div style={styles.tutBody}>
          {item.body.split('\n').map((line, i) => (
            <div key={i} style={{ minHeight: line === '' ? 8 : undefined }}>
              {line}
            </div>
          ))}
        </div>
        <button style={styles.tutOkBtn} onClick={onClose}>알겠어요!</button>
      </div>
    </div>
  );
}

/** BUG-018: 부활 모달 — 광고 실패 시 재시도 가능 */
function RevivalModal({
  onAccept, onDecline, onLoadingChange,
}: {
  onAccept: () => void;
  onDecline: () => void;
  onLoadingChange?: (loading: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // QA L-5: 실시간 카운트다운 — 1초마다 줄어드는 숫자 (광고 시청 중에는 일시정지)
  const [secondsLeft, setSecondsLeft] = useState(10);
  useEffect(() => {
    if (loading) return;
    const t = setInterval(() => setSecondsLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, [loading]);

  const watch = async () => {
    setError(null);
    setLoading(true);
    onLoadingChange?.(true);
    try {
      const r = await Ait.showRewardedAd('revive');
      if (r.success) {
        onAccept();
      } else {
        setError('광고 시청이 완료되지 않았습니다. 다시 시도해 주세요.');
      }
    } catch (e: any) {
      setError('광고를 불러올 수 없습니다. 네트워크를 확인해 주세요.');
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  };

  return (
    <div style={styles.revivalOverlay}>
      <div style={styles.revivalCard}>
        <div style={styles.revivalIcon}>🔥</div>
        <h2 style={styles.revivalTitle}>마왕성 함락 직전!</h2>
        <div style={styles.revivalDesc}>
          {/* NARR N-4: 광고 reframe — 세계관 톤 "어둠의 제물" */}
          어둠의 제물을 바쳐 일어나리라:<br />
          <b style={{ color: '#FFEAA7' }}>50% HP + 적 3초 정지<br />+ 마력 풀충전 + 무료 카드</b>
        </div>
        {error && <div style={styles.revivalError}>{error}</div>}
        <div style={styles.revivalCountdown}>⏱ {secondsLeft}초 후 자동 종료</div>
        <button
          style={{ ...styles.revivalAccept, opacity: loading ? 0.5 : 1 }}
          onClick={watch}
          disabled={loading}
        >
          {loading ? '의식 진행 중...' : error ? '🔄 다시 시도' : '🎬 어둠의 제물 (광고)'}
        </button>
        <button style={styles.revivalDecline} onClick={onDecline}>
          포기하고 결과 보기
        </button>
      </div>
    </div>
  );
}

/** QA M-1: 카드 버튼 — 짧은 탭 = 픽. 잠금은 별도 🔒 버튼으로 분리 (long-press 제거) */
function CardChoiceButton({
  onPick,
  style,
  className,
  children,
}: {
  onPick: () => void;
  style: React.CSSProperties;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      style={style}
      className={className}
      onClick={onPick}
    >
      {children}
    </button>
  );
}

export function GameScreen({ onGameOver, challengeId = null, stageId = null, mode = 'endless' }: GameScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;
  const stones = useSaveStore((s) => s.soulstones);

  const [snap, setSnap] = useState<any>({
    wave: 1, hp: 1000, hpMax: 1000, mp: 100, mpMax: 300,
    kills: 0, combo: 0, cardChoices: null,
    ultiReady: false, ultiGauge: 0,
    paused: false, speed: 1, autoReveal: false, cardCost: 100,
    emergencyRevealUsed: false,
    relics: [], synergies: [],
    bossActive: false, bossHp: 0, bossName: undefined,
    slotActive: false, slotTripleReveal: false,
    version: -1,  // ★ 초기값: 첫 폴링에서 무조건 업데이트
  });
  // 폴링 직전 version 추적 — useState 비동기로 인한 race 방지
  const lastSnapVersionRef = useRef<number>(-1);
  const [synergyPulse, setSynergyPulse] = useState(false);
  const prevSynergyCountRef = useRef(0);
  // Debug 계측: GameScreen 리렌더 카운트 (DebugOverlay에 전달)
  const renderCountRef = useRef(0);
  renderCountRef.current++;
  const debugEnabled = isDebugOverlayEnabled();

  // 게임 엔진 마운트 (한 번만)
  useEffect(() => {
    if (!canvasRef.current) return;
    const eng = new GameEngine(canvasRef.current);
    engineRef.current = eng;
    if (import.meta.env.DEV) {
      (window as any).__maowangEngine = eng;
    }
    eng.on('gameover', (stats: GameOverStats) => {
      const st = useSaveStore.getState();
      // P0-4: 일일 모드면 시드 점수 기록
      if (mode === 'daily') {
        const score = dailyScore(stats.wave ?? 0, stats.killCount ?? 0);
        st.recordDailySeedRun(score, stats.wave ?? 0);
      }
      // P0-3: PvP 스냅샷 자동 저장 (모든 모드)
      try {
        const snap = {
          id: String(Date.now()),
          nickname: '나',
          wave: stats.wave ?? 0,
          kills: stats.killCount ?? 0,
          durationSec: Math.floor(stats.durationSec ?? 0),
          demonId: st.selectedDemonId,
          deckPreview: (st.selectedDeck && st.selectedDeck.length > 0
            ? st.selectedDeck
            : st.recruitedMonsterIds
          ).slice(0, 6),
          relics: stats.relics ?? [],
          seasonId: (() => {
            // import 없이 store API로 안전 접근
            return st.seasonPass.seasonId;
          })(),
        };
        st.pushPvpSnapshot(snap);
      } catch (e) {}
      onGameOverRef.current(stats);
    });
    // GameMode 기반 진입: stage > challenge > endless. 모집 풀은 saveStore에서 주입.
    const save = useSaveStore.getState();
    // P0-6: selectedDeck 우선 + P1-3: 마왕 starterCards 합산
    let baseDeck = save.selectedDeck && save.selectedDeck.length > 0
      ? save.selectedDeck
      : save.recruitedMonsterIds;
    if (!baseDeck || baseDeck.length === 0) baseDeck = save.recruitedMonsterIds;
    // 선택된 마왕의 starterCardIds 강제 포함 (자기 카드만 활성화 시에도 패시브가 보이도록)
    let recruitedPool: string[] | null = baseDeck && baseDeck.length > 0 ? baseDeck.slice() : null;
    const dch = getDemonChar(save.selectedDemonId);
    if (recruitedPool && dch.starterCardIds.length > 0) {
      for (const id of dch.starterCardIds) {
        if (save.recruitedMonsterIds.includes(id) && !recruitedPool.includes(id)) {
          recruitedPool.push(id);
        }
      }
    }
    // P0-4 일일 시드 모드: PRNG seed 결정론적 적용
    if (mode === 'daily') {
      const daily = getDailySeedRun();
      // GameEngine 내부 Math.random 사용 — 시드 적용은 prng 주입까지 필요. 임시: 시드 정보를 window에 노출.
      (window as any).__dailySeedRng = mulberry32(daily.seed);
      (window as any).__dailySeedDate = daily.date;
      (window as any).__dailyModifier = daily.modifier;
    } else {
      (window as any).__dailySeedRng = null;
    }
    // 'daily' 는 endless 와 같은 게임 흐름이지만 dailySeed/세션 기록은 종료 후 처리 (P0-4)
    const effectiveMode: 'stage' | 'endless' = stageId ? 'stage' : (mode === 'stage' ? 'stage' : 'endless');
    const gameMode = stageId
      ? { kind: 'stage' as const, stageId }
      : challengeId
        ? { kind: 'challenge' as const, challengeId }
        : { kind: 'endless' as const };
    eng.isDailyMode = mode === 'daily';
    eng.start({ mode: gameMode, recruitedPool });
    // effectiveMode는 옛 useEffect deps 호환 — 미사용이지만 lint pass
    void effectiveMode;

    // FEEL F-1: 50ms 폴링 (100→50) — 입력 후 시각 응답 지연 절감
    // 최적화: snapshot.version 비교 → 변화 없으면 setState 생략 (불필요 React rerender 방지)
    const polling = setInterval(() => {
      const s = eng.getSnapshot();
      // version unchanged → HUD/overlay 변화 없음 → setState 생략
      if (s.version === lastSnapVersionRef.current) return;
      lastSnapVersionRef.current = s.version;
      // 시너지 펄스는 version 변화에 묶여서 처리됨 (synergies.length가 sig에 포함)
      const synCount = s.synergies?.length || 0;
      if (synCount > prevSynergyCountRef.current) {
        setSynergyPulse(true);
        setTimeout(() => setSynergyPulse(false), 700);
      }
      prevSynergyCountRef.current = synCount;
      setSnap(s);
    }, 50);

    return () => {
      clearInterval(polling);
      eng.dispose();
      engineRef.current = null;
      if (import.meta.env.DEV && (window as any).__maowangEngine === eng) {
        delete (window as any).__maowangEngine;
      }
    };
  }, []);  // 빈 deps — 한 번만 mount

  const eng = () => engineRef.current;
  const hpRatio = snap.hp / snap.hpMax;
  const dangerVignette = hpRatio < 0.2;

  // HUD 다이어트: AUTO 인디케이터 5초 후 페이드
  const [autoIndicatorVisible, setAutoIndicatorVisible] = useState(true);
  useEffect(() => {
    if (!snap.autoReveal) {
      setAutoIndicatorVisible(true);
      return;
    }
    setAutoIndicatorVisible(true);
    const t = setTimeout(() => setAutoIndicatorVisible(false), 5000);
    return () => clearTimeout(t);
  }, [snap.autoReveal]);

  // 시너지 패널 (탭 시 펼침)
  const [synergyExpanded, setSynergyExpanded] = useState(false);
  const activeSynergyCount = (snap.synergies || []).length;
  const synergyProgressCount = (snap.synergyProgress || []).length;

  // BUG-016: 다른 모달 진입 시 시너지 패널 강제 닫기 (z-index 충돌 방지)
  useEffect(() => {
    if (snap.pendingRelicChoices || snap.pendingEvent || snap.pendingRevival || snap.waveBreakActive) {
      setSynergyExpanded(false);
    }
  }, [snap.pendingRelicChoices, snap.pendingEvent, snap.pendingRevival, snap.waveBreakActive]);

  // FTUE: 첫 카드 펼치기 가이드 펄스 — 첫 플레이(runs <= 1) AND 아직 한 번도 펼친 적 없는(killCount=0) AND 마력 충분 AND 모달 없음
  const firstSpinPulse =
    (snap.runs ?? 0) <= 1 &&
    (snap.kills ?? 0) === 0 &&
    (snap.cardRevealCount ?? 0) === 0 &&
    (snap.aliveMonsters ?? 0) === 0 &&
    snap.mp >= snap.cardCost &&
    !snap.cardChoices &&
    !snap.slotActive &&
    !snap.pendingRelicChoices &&
    !snap.pendingEvent;

  // QA H-4: 첫 카드 픽 화면 — 첫 카드 등장 시점에 정보량 다이어트
  // (runs <= 1) AND (cardRevealCount <= 1: 이번 런의 첫 카드 펼치기) AND 카드 모달 활성
  const isFirstCardReveal =
    (snap.runs ?? 0) <= 1 &&
    (snap.cardRevealCount ?? 0) <= 1 &&
    (!!snap.cardChoices || !!snap.slotActive);

  const eventDef = snap.pendingEvent ? EVENTS[snap.pendingEvent] : null;
  const gameplayChoiceOpen = !!snap.cardChoices || !!snap.slotActive;
  const blockingDecisionOpen =
    !!snap.pendingRelicChoices ||
    !!snap.pendingEvent ||
    !!snap.pendingRevival ||
    !!snap.waveBreakActive ||
    !!snap.pendingBranchChoices ||
    !!(snap.tutorialQueue && snap.tutorialQueue.length > 0);

  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showPauseSettings, setShowPauseSettings] = useState(false);
  const userPaused = !!(snap as any).userPaused;
  const controlsBlocked = blockingDecisionOpen || gameplayChoiceOpen || showPauseMenu;
  const showDemonSpeech =
    !!snap.demonLine &&
    (snap.bossActive || snap.demonMood === 'urgent');
  const onboardingAdvancedUnlocked =
    (snap.runs ?? 0) >= 2 ||
    (snap.stage ? snap.stage.index > 1 : true);
  const showAssistControls =
    snap.autoReveal ||
    snap.speed !== 1 ||
    (onboardingAdvancedUnlocked && (snap.wave ?? 1) >= 3);
  const showAdvancedCardTools = onboardingAdvancedUnlocked && (snap.wave ?? 1) >= 3;
  const shouldSurfaceRally =
    (snap.aliveMonsters ?? 0) > 0 &&
    (
      snap.rallyReady ||
      snap.rallyActiveT > 0 ||
      snap.heroNearCastle ||
      !!(snap.bossActive && snap.aliveHeroes && snap.aliveHeroes > 0)
    );
  const showRallyControl = shouldSurfaceRally || snap.rallyActiveT > 0;
  const showControlRow = showRallyControl || showAssistControls;
  const monsterCap = snap.monsterCap ?? 14;
  const monsterFull = (snap.aliveMonsters ?? 0) >= monsterCap;
  const topHeaderMissions = (snap.activeMissions || []) as any[];
  const topMission = (() => {
    const best = topHeaderMissions
      .filter(Boolean)
      .map((m: any) => {
        const def = MISSION_POOL.find((x) => x.id === m.id);
        if (!def) return null;
        if ((m.progress ?? 0) >= def.target) return null;
        const ratio = def.target > 0 ? (m.progress ?? 0) / def.target : 0;
        return { m, def, ratio };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.ratio - a.ratio)[0] as any;
    if (!best) return null;
    return `${best.def.icon} ${best.def.name} ${best.m.progress ?? 0}/${best.def.target}`;
  })();
  const topHeaderText = (() => {
    if (snap.challengeId && CHALLENGES[snap.challengeId]) {
      return `🏆 ${CHALLENGES[snap.challengeId].name}`;
    }
    if (snap.stage?.name) {
      return `🗝 ${snap.stage.name}`;
    }
    if (snap.stratum) {
      return `🏛 ${snap.stratum.index}층`;
    }
    return `🛡 웨이브 ${snap.wave}`;
  })();
  const waveBalanceText = (() => {
    if (snap.waveSpawned == null || !snap.waveTotal) return null;
    if (snap.waveSpawned >= snap.waveTotal && snap.aliveHeroes === 0) return `진행중`;
    if (snap.aliveHeroes === 0) return `${snap.waveSpawned}/${snap.waveTotal} · 곧 생성`;
    return `${snap.waveSpawned}/${snap.waveTotal} · 적 ${snap.aliveHeroes}`;
  })();
  const topMissionText = snap.gameMode === 'daily' && topMission ? `📜 ${topMission}` : null;
  const showTopSummary = !isFirstCardReveal && !gameplayChoiceOpen && !snap.cardChoices && !snap.slotActive;
  const waveBreakUsed = snap.waveBreakUsed ?? { heal: false, mpRefill: false, freespin: false };
  const waveBreakCosts = { heal: 50, mpRefill: 30, freespin: 40 };
  const waveBreakAffordable = {
    heal: stones >= waveBreakCosts.heal,
    mpRefill: stones >= waveBreakCosts.mpRefill,
    freespin: stones >= waveBreakCosts.freespin,
  };
  const [waveBreakDetailsOpen, setWaveBreakDetailsOpen] = useState(false);
  const waveBreakRecommendedKey: 'heal' | 'mpRefill' | 'freespin' =
    hpRatio < 0.5 && !waveBreakUsed.heal
      ? 'heal'
      : snap.mp < snap.cardCost && !waveBreakUsed.mpRefill
        ? 'mpRefill'
        : 'freespin';
  const waveBreakActions = {
    heal: {
      icon: '❤',
      name: '마왕성 +30% HP',
      tip: !waveBreakAffordable.heal && !waveBreakUsed.heal ? '영혼석 부족' : 'HP가 낮을 때 가장 안전',
      used: waveBreakUsed.heal,
      affordable: waveBreakAffordable.heal,
      recommended: hpRatio < 0.5 && waveBreakAffordable.heal && !waveBreakUsed.heal,
      cost: waveBreakCosts.heal,
      onClick: () => eng()?.waveBreakHeal(),
    },
    mpRefill: {
      icon: '⚡',
      name: '마력 풀충전',
      tip: !waveBreakAffordable.mpRefill && !waveBreakUsed.mpRefill ? '영혼석 부족' : '카드 비용이 부족할 때 추천',
      used: waveBreakUsed.mpRefill,
      affordable: waveBreakAffordable.mpRefill,
      recommended: snap.mp < snap.cardCost && waveBreakAffordable.mpRefill && !waveBreakUsed.mpRefill,
      cost: waveBreakCosts.mpRefill,
      onClick: () => eng()?.waveBreakMpRefill(),
    },
    freespin: {
      icon: '🎴',
      name: '무료 카드 준비',
      tip: waveBreakAffordable.freespin ? '다음 웨이브 전 빌드 보강' : '영혼석 부족',
      used: waveBreakUsed.freespin,
      affordable: waveBreakAffordable.freespin,
      recommended: waveBreakRecommendedKey === 'freespin' && waveBreakAffordable.freespin && !waveBreakUsed.freespin,
      cost: waveBreakCosts.freespin,
      onClick: () => eng()?.waveBreakFreeSpin(),
    },
  };
  const renderWaveBreakAction = (key: 'heal' | 'mpRefill' | 'freespin') => {
    const action = waveBreakActions[key];
    return (
      <button
        key={key}
        style={{
          ...styles.wbAction,
          ...(action.used || !action.affordable ? styles.wbActionUsed : {}),
          ...(action.recommended ? styles.wbActionRecommend : {}),
        }}
        onClick={action.onClick}
        disabled={action.used || !action.affordable}
      >
        <div style={styles.wbIcon}>{action.icon}</div>
        <div style={styles.wbBody}>
          <div style={styles.wbName}>{action.name}</div>
          <div style={styles.wbTip}>{action.recommended ? '추천' : action.tip}</div>
        </div>
        <div style={styles.wbCost}>💎 {action.cost}</div>
      </button>
    );
  };

  useEffect(() => {
    if (!snap.waveBreakActive) setWaveBreakDetailsOpen(false);
  }, [snap.waveBreakActive]);

  // MVP: paused는 카드 선택/튜토리얼/웨이브 준비 같은 시스템 정지에도 켜진다.
  // 그래서 paused=true만으로 일시정지 메뉴를 자동 노출하면 '게임 재개'가 반복해서 뜬다.
  // 재개 메뉴는 사용자가 ⏸/Esc를 누른 경우에만 열고, 강제 모달 진입 시에는 닫기만 한다.
  useEffect(() => {
    if (userPaused) {
      setShowPauseMenu(true);
      return;
    }
    setShowPauseMenu(false);
    setShowPauseSettings(false);
  }, [userPaused]);

  // INPUT I-1: PC 키보드 단축키 (모바일은 영향 없음)
  // Space=카드 펼치기 / Q=Rally / E=필살기 / Esc=일시정지
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // input/textarea 포커스 시 무시
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      // 모달 활성 시 Esc만 처리
      const modalActive =
        !!snap.cardChoices || !!snap.slotActive ||
        !!snap.pendingRelicChoices || !!snap.pendingEvent ||
        !!snap.pendingRevival || !!snap.waveBreakActive ||
        !!snap.pendingBranchChoices ||
        (snap.tutorialQueue && snap.tutorialQueue.length > 0);
      if (e.key === 'Escape') {
        if (showQuitConfirm) { setShowQuitConfirm(false); e.preventDefault(); return; }
        if (showPauseMenu) {
          setShowPauseMenu(false);
          setShowPauseSettings(false);
          eng()?.setUserPause(false);
          e.preventDefault();
          return;
        }
        if (modalActive) return;
        eng()?.setUserPause(true);
        setShowPauseMenu(true);
        e.preventDefault();
        return;
      }
      if (modalActive) return;
      if (e.key === ' ' || e.code === 'Space') {
        eng()?.beginSpin();
        e.preventDefault();
      } else if (e.key === 'q' || e.key === 'Q') {
        eng()?.rally();
        e.preventDefault();
      } else if (e.key === 'e' || e.key === 'E') {
        if (snap.ultiReady) eng()?.castUlti();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [snap.cardChoices, snap.slotActive, snap.pendingRelicChoices, snap.pendingEvent,
      snap.pendingRevival, snap.waveBreakActive, snap.tutorialQueue, snap.paused,
      snap.userPaused, showPauseMenu, showQuitConfirm]);

  // 부활 모달 10초 자동 종료 — BUG-002: 광고 시청 중일 때는 일시정지
  const [revivalAdLoading, setRevivalAdLoading] = useState(false);
  useEffect(() => {
    if (!snap.pendingRevival) return;
    if (revivalAdLoading) return;
    const t = setTimeout(() => eng()?.declineRevival(), 10_000);
    return () => clearTimeout(t);
  }, [snap.pendingRevival, revivalAdLoading]);

  // 필드 탭 = Rally / 장탭 = 어둠의 손 (P2-B)
  // SHADOW_GRASP_HOLD_MS: 장탭 발동 시간 — 향후 접근성 옵션으로 조정 가능
  const SHADOW_GRASP_HOLD_MS = 1000;
  const fieldPressTimer = useRef<any>(null);
  const fieldDidGrasp = useRef(false);
  // FEEL F-2: long-press 진행 ring 시각화
  const [fieldPressProgress, setFieldPressProgress] = useState(0);  // 0~1
  const fieldProgressRaf = useRef<any>(null);
  const fieldPressStart = useRef(0);

  const isFieldBlocked = () =>
    snap.cardChoices || snap.slotActive || snap.pendingRelicChoices ||
    snap.pendingEvent || snap.pendingRevival || snap.paused || snap.waveBreakActive ||
    (snap.pendingBranchChoices && snap.pendingBranchChoices.length > 0);

  const handleFieldDown = () => {
    fieldDidGrasp.current = false;
    if (isFieldBlocked()) return;
    fieldPressStart.current = performance.now();
    setFieldPressProgress(0.001);
    const tick = () => {
      const dt = performance.now() - fieldPressStart.current;
      const p = Math.min(1, dt / SHADOW_GRASP_HOLD_MS);
      setFieldPressProgress(p);
      if (p < 1 && fieldPressTimer.current) {
        fieldProgressRaf.current = requestAnimationFrame(tick);
      }
    };
    fieldProgressRaf.current = requestAnimationFrame(tick);
    fieldPressTimer.current = setTimeout(() => {
      fieldDidGrasp.current = true;
      eng()?.shadowGrasp();
      fieldPressTimer.current = null;
      setFieldPressProgress(0);
    }, SHADOW_GRASP_HOLD_MS);  // QA M-1: 700→1000ms로 완화 (의도치 않은 발동 감소)
  };
  const handleFieldUp = () => {
    if (fieldPressTimer.current) {
      clearTimeout(fieldPressTimer.current);
      fieldPressTimer.current = null;
    }
    if (fieldProgressRaf.current) {
      cancelAnimationFrame(fieldProgressRaf.current);
      fieldProgressRaf.current = null;
    }
    setFieldPressProgress(0);
  };
  const handleFieldTap = () => {
    if (fieldDidGrasp.current) { fieldDidGrasp.current = false; return; }
    if (isFieldBlocked()) return;
    eng()?.rally();
  };

  return (
    <div style={{ ...styles.root, ...(synergyPulse ? styles.synergyPulse : {}) }}>
      {debugEnabled && (
        <DebugOverlay engineRef={engineRef} parentRenderCountRef={renderCountRef} />
      )}
      <canvas
        ref={canvasRef}
        style={styles.canvas}
        onClick={handleFieldTap}
        onMouseDown={handleFieldDown}
        onTouchStart={handleFieldDown}
        onMouseUp={handleFieldUp}
        onMouseLeave={handleFieldUp}
        onTouchEnd={handleFieldUp}
        onTouchCancel={handleFieldUp}
      />

      {/* FEEL F-2: long-press 진행 ring (화면 중앙) — 어둠의 손 발동까지 시각 진행도
          60%+ 시 보라→골드로 컬러 전환 (발동 임박 강조) */}
      {fieldPressProgress > 0 && (() => {
        const imminent = fieldPressProgress >= 0.6;
        const ringColor = imminent ? '#FDCB6E' : '#a55eea';
        const scale = 1 + Math.min(0.15, fieldPressProgress * 0.15);
        return (
          <div style={{
            ...styles.graspRing,
            background: `conic-gradient(${ringColor} ${fieldPressProgress * 360}deg, rgba(0,0,0,0.4) 0)`,
            opacity: fieldPressProgress > 0.3 ? 1 : fieldPressProgress / 0.3,
            transform: `translate(-50%, -50%) scale(${scale})`,
            boxShadow: imminent ? `0 0 18px ${ringColor}` : 'none',
          }}>
            <div style={styles.graspRingInner}>
              {fieldPressProgress >= 1 ? '⛓' : imminent ? '✊' : '🖐'}
            </div>
          </div>
        );
      })()}

      {dangerVignette && <div style={styles.dangerVignette} />}
      {/* LD-3: 적 침투 임박 경고 (x<150 적이 있을 때) */}
      {!dangerVignette && !gameplayChoiceOpen && !blockingDecisionOpen && (snap.heroNearCastle ?? false) && (
        <>
          <div style={styles.castleWarn} />
          {/* QA M-4: 마력 부족 + 적 침투 시 ⚡돌격 추천 컨텍스트 힌트 */}
          {snap.mp < snap.cardCost && snap.rallyReady && (snap.aliveMonsters ?? 0) > 0 && !snap.cardChoices && !snap.slotActive && (
            <div style={styles.contextHint}>⚡ 돌격 추천</div>
          )}
        </>
      )}
      {snap.bossActive && <div style={styles.bossDarken} />}

      {/* 우상단: 일시정지/메뉴 버튼 (모바일 한 손 도달 가능) */}
      {/* BUG-004: 다른 모달 활성 시 ⏸ 비활성 — 중복 모달/포기 데이터 손실 방지 */}
      {(() => {
        const modalActive =
          !!snap.cardChoices || !!snap.slotActive ||
          !!snap.pendingRelicChoices || !!snap.pendingEvent ||
          !!snap.pendingRevival || !!snap.waveBreakActive ||
          !!snap.pendingBranchChoices ||
          (snap.tutorialQueue && snap.tutorialQueue.length > 0);
        return (
          <button
            style={{ ...styles.pauseBtn, opacity: modalActive ? 0.4 : 1 }}
            onClick={() => {
              if (modalActive) return;
              eng()?.setUserPause(true);
              setShowPauseMenu(true);
            }}
            disabled={modalActive}
            aria-label="일시정지"
          >
            ⏸
          </button>
        );
      })()}

      {/* AUTO 모드 인디케이터 (5초 후 페이드) */}
      {snap.autoReveal && autoIndicatorVisible && (
        <div style={{ ...styles.autoIndicator, animation: 'fadeOutLate 5s forwards' }}>
          🔁 AUTO
        </div>
      )}

      {/* MVP: 평상시 랜덤 대사는 화면을 과하게 흔들어서 위급/보스 상황에서만 노출 */}
      {showDemonSpeech && (
        <div style={{
          ...styles.demonSpeech,
          opacity: 1 - Math.max(0, (snap.demonLine.progress - 0.7) / 0.3),
        }}>
          <div style={styles.demonPortrait}>
            {snap.demonMood === 'angry' ? '😡' :
             snap.demonMood === 'urgent' ? '😨' :
             snap.demonMood === 'triumph' ? '😈' : '😈'}
          </div>
          <div style={styles.demonBubble}>
            <div style={styles.demonName}>마왕</div>
            <div style={styles.demonText}>{snap.demonLine.text}</div>
          </div>
        </div>
      )}

      {/* QO Q-1: 상단 진행 요약 한 줄 — 다중 라벨 스택 제거 */}
      {showTopSummary && !snap.bossActive && (
        <div style={styles.topSummary}>
          <div style={styles.topSummaryText}>{topHeaderText}</div>
          {topMissionText && <div style={styles.topSummarySub}>{topMissionText}</div>}
        </div>
      )}

      {/* QO Q-6: 진화 임박 (살아있는 같은 종류 evoNeed-1 도달) */}
      {/* MVP: 진화 임박은 카드 선택지 안의 배지로만 보여주고 상단 HUD에서는 숨김 */}

      {snap.bossActive && (
        <div style={styles.bossHp}>
          <div style={styles.bossLabel}>
            {snap.bossName}
            {/* UI U-1: 보스 HP % 절대치 — "필살기 한 방?" 추측 가능 */}
            <span style={styles.bossHpPct}> {Math.ceil(snap.bossHp * 100)}%</span>
          </div>
          <div style={styles.bossBar}>
            <div style={{ ...styles.bossFill, width: `${snap.bossHp * 100}%` }} />
          </div>
        </div>
      )}

      {/* 시너지 — 컴팩트 모드 (활성 개수 + 임박 시그널만 / 탭 시 펼침) */}
      {/* QA H-4: 첫 카드 픽 시 시너지 칩 숨김 */}
      {!isFirstCardReveal && !gameplayChoiceOpen && !blockingDecisionOpen && activeSynergyCount > 0 && (
        <button
          style={styles.synergyCompact}
          onClick={() => setSynergyExpanded(!synergyExpanded)}
          aria-label="시너지 보기"
        >
          🌀 {activeSynergyCount}활성
          <span style={styles.synergyTapHint}>↗</span>
        </button>
      )}
      {!isFirstCardReveal && !gameplayChoiceOpen && !blockingDecisionOpen && synergyExpanded && (
        <div style={styles.synergyExpandedPanel} onClick={() => setSynergyExpanded(false)}>
          {snap.synergyProgress?.map((sp: any) => (
            <div
              key={sp.id}
              style={{
                ...styles.synergyChip,
                ...(sp.active ? styles.synergyChipActive : {}),
                ...(!sp.active && sp.count >= sp.need - 1 ? styles.synergyChipNear : {}),
              }}
            >
              {sp.name} {sp.active ? '✓' : `${sp.count}/${sp.need}`}
            </div>
          ))}
        </div>
      )}

      {/* 웨이브 진행도 (보스 아닐 때만) */}
      {!snap.bossActive && snap.waveTotal > 0 && (
        <div style={styles.waveProgress}>
          <span style={styles.waveProgressLabel}>적</span>
          <div style={styles.waveProgressBar}>
            <div
              style={{
                ...styles.waveProgressFill,
                width: `${(snap.waveSpawned / snap.waveTotal) * 100}%`,
              }}
            />
          </div>
          <span style={styles.waveProgressCount}>
            {waveBalanceText || '로딩 중'}
          </span>
        </div>
      )}

      {/* 보스 텔레그래프 (다음 액션 안내) — 실제 카운트다운 */}
      {/* QA M-5: runs<=1 + danger=true 시 화면 중앙 큰 글씨로 강조 (학습 보장) */}
      {snap.bossActive && snap.bossNext && (
        <div style={{
          ...styles.bossTelegraph,
          ...(snap.bossNext.danger ? styles.bossTelegraphDanger : {}),
          ...((snap.runs ?? 0) <= 1 && snap.bossNext.danger ? styles.bossTelegraphFirstDanger : {}),
        }}>
          {snap.bossNext.label}
          {snap.bossNext.sec > 0 && !snap.bossNext.label.includes('s') && (
            <span style={styles.bossTelegraphCount}> {snap.bossNext.sec.toFixed(1)}s</span>
          )}
        </div>
      )}

      <div style={{ ...styles.bottom, ...(gameplayChoiceOpen ? styles.bottomChoiceOpen : {}) }}>
        {/* 카드 영역 — 봉인 중(face-down) → 카드 공개(flip) 통합 */}
        {!blockingDecisionOpen && !showPauseMenu && (snap.slotActive || snap.cardChoices) && (
            <div style={styles.cardArea}>
              <div style={styles.cardAreaLabel}>
                {snap.slotActive
                ? '봉인을 깨는 중... 탭하면 즉시 공개'
                : snap.slotTripleReveal
                  ? '✨ 같은 카드 3장 — 한 장 선택하세요'
                  : monsterFull
                    ? `⚠ ${snap.aliveMonsters}/${monsterCap} — 처치 후 다시 펼치기`
                    : snap.autoReveal && snap.cardChoices
                      ? `🔁 자동 선택 ${(snap.autoPickT ?? 0).toFixed(1)}s`
                      : '운명의 카드 — 한 장을 선택하세요'}
            </div>
          </div>
        )}

        {/* 봉인 깨는 중 — face-down 카드 3장 (PNG 마법진) — 탭 시 즉시 결과 */}
        {!blockingDecisionOpen && !showPauseMenu && snap.slotActive && !snap.cardChoices && (
          <div
            style={styles.cards}
            onClick={() => eng()?.skipSlotReveal()}
            role="button"
            aria-label="카드 즉시 공개"
          >
            {[0, 1, 2].map((i) => (
              <div
                key={`fd-${i}`}
                style={{ ...styles.cardFaceDownWrap, animationDelay: `${i * 0.12}s` }}
                className="card-flip-pulse"
              >
                <img
                  src="/sprites/card_back_sheet.png"
                  alt=""
                  style={{
                    ...styles.cardBackImg,
                    animationDelay: `${i * 0.15}s`,
                  }}
                  className="card-back-anim"
                />
              </div>
            ))}
          </div>
        )}

        {!blockingDecisionOpen && !showPauseMenu && snap.cardChoices && (
          <>
            <div
              style={{ ...styles.cards, ...(isFirstCardReveal ? styles.cardsFirstReveal : {}) }}
              className="cards-fade-in"
            >
              {snap.cardChoices.map((id: string, i: number) => {
                const def = MONSTERS[id];
                const rarity = def?.rarity || 'common';
                const rarityCol: Record<string, string> = {
                  common: '#9aa0a8', uncommon: '#26de81', rare: '#0984E3',
                  epic: '#a55eea', legendary: '#FDCB6E',
                };
                const accent = rarityCol[rarity] || '#9aa0a8';

                // 진화 임박 여부 — 살아있는 같은 type 카운트가 evoNeed - 1이면 이 카드로 진화 발동
                const aliveSame = snap.aliveCounts?.[id] || 0;
                const evoImminent = def?.evolveTo && aliveSame >= (snap.evoNeed - 1);

                // 시너지 트리거 임박 — 이 카드의 태그가 임박 시너지(count = need-1)에 기여
                const synergyTrigger = snap.synergyProgress?.find((sp: any) =>
                  !sp.active && sp.count === sp.need - 1 && def?.tags.some((t: string) =>
                    sp.id === 'magic' && t === 'magic' ||
                    sp.id === 'undead' && t === 'undead' ||
                    sp.id === 'tank' && t === 'tank' ||
                    sp.id === 'mob' && t === 'mob' ||
                    sp.id === 'rage' && (t === 'beast' || t === 'orc') ||
                    sp.id === 'inferno' && t === 'fire' ||
                    sp.id === 'fulldark' && t === 'dark' ||
                    sp.id === 'lifescream' && (t === 'undead' || t === 'zombie')
                  )
                );

                // 역할 아이콘 (tags 기반 우선순위). 첫 선택에서도 전술 차이가 보이도록 짧은 플레이 언어로 번역한다.
                const role = (() => {
                  if (!def) return { icon: '⚔', label: '공격', hint: '앞라인에서 막고 때립니다' };
                  if (def.tags.includes('support')) return { icon: '✦', label: '지원', hint: '마력/버프로 판을 굴립니다' };
                  if (def.tags.includes('tank') && (def.aoe || def.knockback)) return { icon: '💥', label: '제압', hint: '뭉친 적을 밀어냅니다' };
                  if (def.tags.includes('tank')) return { icon: '🛡', label: '버팀', hint: '성 앞을 오래 버팁니다' };
                  if (def.tags.includes('magic') && def.range > 60) return { icon: '🔮', label: '원거리', hint: '뒤에서 안전하게 녹입니다' };
                  if (def.summonCount && def.summonCount > 1) return { icon: '☠', label: '물량', hint: '여러 마리로 라인을 채웁니다' };
                  if (def.revive) return { icon: '♻', label: '부활', hint: '쓰러져도 다시 일어납니다' };
                  if (def.range > 60) return { icon: '🏹', label: '원거리', hint: '멀리서 먼저 때립니다' };
                  if (def.spd >= 22) return { icon: '⚔', label: '속공', hint: '빠르게 달려 시간을 벌어요' };
                  if (def.tags.includes('brute')) return { icon: '💥', label: '광역', hint: '근거리에서 크게 압박합니다' };
                  return { icon: '⚔', label: '전열', hint: '앞에서 적을 붙잡습니다' };
                })();

                // 등급별 시각 차이 — common 작게, legendary/epic 크고 펄스
                const rarityClass =
                  rarity === 'legendary' ? 'card-legendary' :
                  rarity === 'epic' ? 'card-epic' : '';
                const rarityScale =
                  rarity === 'legendary' ? 1.04 :
                  rarity === 'epic' ? 1.02 :
                  1.0;

                const canLock = showAdvancedCardTools && snap.mp >= 50 && snap.lockedCardId !== id;

                return (
                  <div key={`${id}-${i}-${snap.kills}`} style={styles.cardWrap}>
                  <CardChoiceButton
                    onPick={() => eng()?.chooseCard(i)}
                    style={{
                      ...styles.card,
                      ...(isFirstCardReveal ? styles.cardFirstReveal : {}),
                      borderColor: evoImminent ? '#FDCB6E' : accent,
                      borderWidth: rarity === 'legendary' ? 3 : 2,
                      transform: `scale(${rarityScale})`,
                      boxShadow: evoImminent
                        ? `0 0 22px #FDCB6E, 0 0 12px #FDCB6E, inset 0 0 18px ${accent}88, 0 3px 0 #15102a`
                        : rarity === 'legendary'
                          ? `0 0 24px ${accent}, 0 0 8px ${accent}, inset 0 0 16px ${accent}66, 0 4px 0 #15102a`
                          : rarity === 'epic'
                            ? `0 0 16px ${accent}, inset 0 0 12px ${accent}44, 0 3px 0 #15102a`
                            : `0 0 8px ${accent}66, inset 0 0 6px ${accent}22, 0 3px 0 #15102a`,
                      animationDelay: `${0.05 + i * 0.1}s`,
                    }}
                    className={isFirstCardReveal ? rarityClass : `card-flip ${rarityClass}`}
                  >
                    <div style={styles.cardHeader}>
                      <span style={{ ...styles.cardRarity, color: accent }}>
                        {role.icon} {role.label}
                      </span>
                      {!isFirstCardReveal && (
                        <span style={styles.cardStar}>{'★'.repeat(def?.star || 1)}</span>
                      )}
                    </div>
                    {/* ACC A-2: 색맹 보조 — 등급명 텍스트 라벨 (rare 이상만 노출, 정보 과부하 방지) */}
                    {!isFirstCardReveal && (rarity === 'rare' || rarity === 'epic' || rarity === 'legendary') && (
                      <div style={{ ...styles.rarityLabel, color: accent, borderColor: accent }}>
                        {rarity === 'legendary' ? '전설' : rarity === 'epic' ? '영웅' : '희귀'}
                      </div>
                    )}
                    <div style={styles.cardName}>{def?.name || id}</div>
                    {isFirstCardReveal && (
                      <div style={styles.cardRoleHint}>{role.hint}</div>
                    )}
                    {!isFirstCardReveal && (
                      <div style={styles.cardStats}>
                        <span style={styles.cardStat}>HP {def?.hp ?? '?'}</span>
                        <span style={styles.cardStat}>ATK {def?.atk ?? '?'}</span>
                      </div>
                    )}
                    {/* OVERHAUL §3.2: 리스크 카드 페널티 표시 */}
                    {snap.riskCardSlot && snap.riskCardSlot.idx === i && (
                      <div style={styles.cardRiskBadge}>
                        ⚠ {snap.riskCardSlot.name}
                      </div>
                    )}
                    {/* QA H-5: 트레이드오프는 모든 런에서 표시 — legendary 페널티 사전 경고 */}
                    {!isFirstCardReveal && rarity === 'legendary' && (
                      <div style={styles.cardTradeoff}>⚠ 픽 시 마력 -50</div>
                    )}
                    {!isFirstCardReveal && def?.tags.includes('tank') && (
                      <div style={styles.cardTradeoffPositive}>+ 다음 펼치기 할인</div>
                    )}
                    {!isFirstCardReveal && def?.tags.includes('magic') && rarity !== 'legendary' && (
                      <div style={styles.cardTradeoffPositive}>+ 다음 마법 등장률 ↑</div>
                    )}
                    {evoImminent && (
                      <>
                        <div style={styles.cardBadgeEvolveStrong}>
                          ⚡ 진화 발동!
                        </div>
                        <div style={styles.cardBadgeEvolveHint}>← 픽 = 즉시 진화</div>
                      </>
                    )}
                    {!evoImminent && synergyTrigger && (
                      <div style={styles.cardBadgeSynergy}>
                        + {synergyTrigger.name}
                      </div>
                    )}
                    {!evoImminent && !synergyTrigger && aliveSame > 0 && def?.evolveTo && (
                      <div style={styles.cardBadgeProgress}>
                        진화 {aliveSame + 1}/{snap.evoNeed} (살아있는)
                      </div>
                    )}
                    {snap.lockedCardId === id && (
                      <span style={styles.lockedTag}>🔒 잠김</span>
                    )}
                  </CardChoiceButton>
                  {/* QA M-1: 잠금은 별도 버튼으로 분리 (long-press 학습 비용 제거) */}
                  {canLock && (
                    <button
                      style={styles.lockBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        eng()?.lockCard(i);
                      }}
                      aria-label="카드 잠금"
                    >
                      🔒 잠금 50
                    </button>
                  )}
                  </div>
                );
              })}
            </div>
            {showAdvancedCardTools && snap.rerollAvailable && (
              <button style={styles.rerollBtn} onClick={() => eng()?.rerollChoices()}>
                🌀 운명의 카드 — 다시 뽑기
              </button>
            )}
          </>
        )}

        {!gameplayChoiceOpen && !blockingDecisionOpen && !showPauseMenu && (
        <>
        <div style={styles.actionRow}>
          {(() => {
            const cantReveal = snap.mp < snap.cardCost;
            const fieldFull = monsterFull && !snap.slotActive && !snap.cardChoices;
            const busy = gameplayChoiceOpen || blockingDecisionOpen || showPauseMenu;
            const lastChanceReveal =
              cantReveal &&
              !snap.emergencyRevealUsed &&
              (snap.aliveMonsters ?? 0) <= 0 &&
              (snap.aliveHeroes ?? 0) > 0;
            const disabled = (cantReveal && !lastChanceReveal) || fieldFull || busy;
            const revealLooksMuted = (cantReveal && !lastChanceReveal) || fieldFull;
            const src = disabled
              ? '/sprites/btn_reveal_disabled.png'
              : '/sprites/btn_reveal_idle.png';
            // LD-16: 마력 회복 진행도 (cantReveal 시 0 → 1로 채워짐)
            const mpProgress = cantReveal
              ? Math.max(0, Math.min(1, snap.mp / snap.cardCost))
              : 1;
            const missingMp = Math.max(0, snap.cardCost - snap.mp);
            const waitSeconds = Math.ceil(missingMp / Math.max(0.5, snap.mpRegenPerSec ?? 2.4));
            return (
              <button
                style={{
                  ...styles.btnReveal,
                  ...(revealLooksMuted ? styles.btnRevealMuted : {}),
                  ...(lastChanceReveal ? styles.btnRevealEmergency : {}),
                  backgroundImage: `url("${src}")`,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  position: 'relative',
                }}
                onClick={() => eng()?.beginSpin()}
                disabled={disabled}
                className={firstSpinPulse ? 'spin-pulse' : ''}
              >
                <span style={{
                  ...styles.btnRevealTop,
                  ...(revealLooksMuted ? styles.btnRevealTopMuted : {}),
                  ...(lastChanceReveal ? styles.btnRevealTopEmergency : {}),
                }}>
                  {snap.slotActive
                    ? '봉인 깨는 중...'
                    : fieldFull
                      ? '군단 가득 참'
                    : lastChanceReveal
                      ? '라스트 찬스'
                    : cantReveal
                      ? '마력 충전 중'
                      : '카드 펼치기'}
                </span>
                <span style={{
                  ...styles.btnRevealSub,
                  ...(revealLooksMuted ? styles.btnRevealSubMuted : {}),
                }}>
                  {snap.slotActive
                    ? '─'
                    : fieldFull
                      ? `${snap.aliveMonsters}/${monsterCap} 처치 후 가능`
                    : lastChanceReveal
                      ? '무료 카드 1회'
                    : cantReveal
                      ? (snap.aliveMonsters ?? 0) > 0
                        ? `${missingMp} 마력 더 · 처치하면 회복`
                        : `${missingMp} 마력 더 (약 ${waitSeconds}초)`
                      : (snap.cardRevealCount ?? 0) < 2
                        ? `🔮 ${snap.cardCost} 마력 ⚡할인(${(snap.cardRevealCount ?? 0) + 1}/2)`
                        : `🔮 ${snap.cardCost} 마력`}
                  {/* INPUT I-3: 잠긴 카드 표시 — 다음 펼치기 시 유지될 카드 명시 */}
                  {snap.lockedCardId && MONSTERS[snap.lockedCardId] && (
                    <span style={{ marginLeft: 6, color: '#26de81' }}>
                      🔒 {MONSTERS[snap.lockedCardId].name}
                    </span>
                  )}
                </span>
                {/* LD-16: 마력 충전 ring (하단) */}
                {cantReveal && !lastChanceReveal && (
                  <div style={{
                    ...styles.mpProgressBar,
                    width: `${mpProgress * 100}%`,
                  }} />
                )}
              </button>
            );
          })()}
          {(() => {
            const ultiSrc = snap.ultiReady
              ? '/sprites/btn_ulti_ready.png'
              : snap.ultiGauge >= 0.5
                ? '/sprites/btn_ulti_charging_50.png'
                : '/sprites/btn_ulti_charging_0.png';
            const showUltButton =
              snap.ultiReady ||
              snap.bossActive ||
              snap.ultiGauge >= 0.35 ||
              onboardingAdvancedUnlocked;
            if (!showUltButton) return null;
            // 필살기 변형 — 0:어둠 파동(🌊) / 1:지옥 소환(🔥) / 2:암흑 멸망(💀)
            const variantIcons = ['🌊', '🔥', '💀'];
            const curIcon = variantIcons[snap.ultiVariant ?? 0];
            const nextIcon = variantIcons[snap.ultiNextVariant ?? 1];
            const chargePct = Math.round((snap.ultiGauge ?? 0) * 100);
            return (
              <button
                style={{
                  ...styles.btnUltiPng,
                  backgroundImage: `url("${ultiSrc}")`,
                  // FEEL F-3: disabled 상태 명확화 — opacity 0.55 + grayscale
                  opacity: snap.ultiReady ? 1 : 0.48,
                  filter: snap.ultiReady ? 'none' : 'grayscale(0.8) brightness(0.78)',
                  position: 'relative',
                  cursor: snap.ultiReady ? 'pointer' : 'not-allowed',
                }}
                onClick={() => {
                  if (snap.ultiReady) eng()?.castUlti();
                }}
                disabled={!snap.ultiReady}
                className={snap.ultiReady ? 'ulti-ready-pulse' : ''}
                aria-label={snap.ultiReady ? '필살기 사용' : `필살기 충전 중 ${chargePct}%`}
              >
                {/* 현재 변형 아이콘 — 좌상단 */}
                <span style={{
                  position: 'absolute', top: 2, left: 4,
                  fontSize: 14, lineHeight: 1,
                  textShadow: '0 0 4px rgba(0,0,0,0.8)',
                }}>{curIcon}</span>
                {/* 다음 변형 아이콘 — 우상단 (작게, 흐리게) */}
                {snap.ultiReady ? (
                  <span style={{
                    position: 'absolute', top: 3, right: 4,
                    fontSize: 9, lineHeight: 1, opacity: 0.7,
                    color: '#FFEAA7',
                  }}>→{nextIcon}</span>
                ) : (
                  <span style={{
                    position: 'absolute', top: 5, right: 5,
                    fontSize: 8, lineHeight: 1, opacity: 0.85,
                    color: '#bbb',
                  }}>{chargePct}%</span>
                )}
                <div style={styles.btnUltiBar}>
                  <div style={{ ...styles.btnUltiBarFill, width: `${snap.ultiGauge * 100}%` }} />
                </div>
              </button>
            );
          })()}
        </div>

        {/* 컨트롤 row — 초반에는 쓸 수 없는 보조 행동을 숨겨 카드 CTA가 주인공이 되게 한다. */}
        {showControlRow && (
          <div style={styles.controlRow}>
            {showRallyControl && (() => {
              const rallyDisabled = !snap.rallyReady || controlsBlocked || snap.aliveMonsters <= 0;
              const rallyLabel = snap.aliveMonsters <= 0
                ? '⚡ 부하 필요'
                : !snap.rallyReady
                  ? `⚡ 돌격 ${snap.rallyCdT?.toFixed(1)}s`
                  : '⚡ 돌격';
              return (
                <button
                  style={{
                    ...styles.miniBtn,
                    ...(!rallyDisabled ? styles.rallyBtnReady : styles.rallyBtnCool),
                    flex: 2,
                  }}
                  onClick={() => eng()?.rally()}
                  disabled={rallyDisabled}
                >
                  {rallyLabel}
                </button>
              );
            })()}
            {showAssistControls && (
              <button
                style={{
                  ...styles.miniBtn,
                  flex: 1,
                  background: snap.autoReveal
                    ? 'linear-gradient(180deg,#26de81,#1a8048)'
                    : 'rgba(45,27,78,0.85)',
                  color: snap.autoReveal ? '#fff' : '#bbb',
                  borderWidth: snap.autoReveal ? 2 : 1,
                  borderStyle: 'solid',
                  borderColor: snap.autoReveal ? '#FDCB6E' : '#4a3a6e',
                }}
                onClick={() => {
                  if (!controlsBlocked) eng()?.toggleAuto();
                }}
                disabled={controlsBlocked}
                aria-label="AUTO 토글"
              >
                🔁 {snap.autoReveal ? 'ON' : 'AUTO'}
              </button>
            )}
            {showAssistControls && (
              <button
                style={{
                  ...styles.miniBtn,
                  flex: 1,
                  background: snap.speed !== 1
                    ? 'linear-gradient(180deg,#FDCB6E,#D63031)'
                    : 'rgba(60,40,30,0.85)',
                  color: snap.speed !== 1 ? '#fff' : '#FDCB6E',
                  borderWidth: snap.speed !== 1 ? 2 : 1,
                  borderStyle: 'solid',
                  borderColor: snap.speed !== 1 ? '#FDCB6E' : '#7a5a30',
                }}
                onClick={() => {
                  if (!controlsBlocked) eng()?.toggleSpeed();
                }}
                disabled={controlsBlocked}
                aria-label="속도 토글"
              >
                ⏩ ×{snap.speed}
              </button>
            )}
          </div>
        )}
        </>
        )}
      </div>

      {/* OVERHAUL §3.2: 분기 카드 선택 모달 (5wave마다) */}
      {snap.pendingBranchChoices && snap.pendingBranchChoices.length > 0 && (
        <div style={styles.relicModal} onClick={(e) => e.stopPropagation()}>
          <h2 style={styles.relicTitle}>🌀 운명의 분기 🌀</h2>
          <div style={styles.relicHint}>다음 5 웨이브 — 1개 선택</div>
          <div style={styles.relicChoices}>
            {snap.pendingBranchChoices.map((b: any, i: number) => (
              <button
                key={`${b.id}-${i}`}
                style={styles.relicCard}
                onClick={() => eng()?.acceptBranchCard(i)}
              >
                <div style={styles.relicIcon}>{b.icon}</div>
                <div style={styles.relicName}>{b.name}</div>
                <div style={styles.relicDesc}>{b.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 유물 선택 모달 */}
      {snap.pendingRelicChoices && (
        <div style={styles.relicModal} onClick={(e) => e.stopPropagation()}>
          <h2 style={styles.relicTitle}>✨ 유물 선택 ✨</h2>
          <div style={styles.relicHint}>웨이브 클리어 보상 — 1개 선택</div>
          <div style={styles.relicChoices}>
            {snap.pendingRelicChoices.map((id: string) => {
              const r = RELICS[id];
              if (!r) return null;
              return (
                <button
                  key={id}
                  style={styles.relicCard}
                  onClick={() => eng()?.acquireRelic(id)}
                >
                  <div style={styles.relicIcon}>{r.icon}</div>
                  <div style={styles.relicName}>{r.name}</div>
                  <div style={styles.relicDesc}>{r.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 랜덤 이벤트 모달 (GDD 핵심) */}
      {eventDef && (
        <div style={styles.relicModal} onClick={(e) => e.stopPropagation()}>
          <div style={styles.eventIcon}>{eventDef.icon}</div>
          <h2 style={styles.eventTitle}>{eventDef.title}</h2>
          <div style={styles.eventDesc}>{eventDef.desc}</div>
          <div style={styles.eventBtnRow}>
            <button
              style={{
                ...styles.eventAccept,
                opacity: eventDef.canAccept(eng() as any) ? 1 : 0.4,
                cursor: eventDef.canAccept(eng() as any) ? 'pointer' : 'not-allowed',
              }}
              onClick={() => eng()?.acceptEvent()}
              disabled={!eventDef.canAccept(eng() as any)}
            >
              {eventDef.acceptLabel}
            </button>
            {/* QA L-1: 첫 런 사용자(runs<=1)에게는 거절을 작은 텍스트 버튼으로 약화 */}
            <button
              style={(snap.runs ?? 0) <= 1 ? styles.eventDeclineWeak : styles.eventDecline}
              onClick={() => eng()?.declineEvent()}
            >
              거절
            </button>
          </div>
        </div>
      )}

      {/* 튜토리얼 모달 — 다른 모든 모달보다 우선 (z-index 250) */}
      {snap.tutorialQueue && snap.tutorialQueue.length > 0 && (
        <TutorialModal
          item={snap.tutorialQueue[0]}
          onClose={() => eng()?.consumeTutorial(snap.tutorialQueue[0].id)}
        />
      )}

      {/* 웨이브 사이 결정 단계 (P2-7) — 5웨이브마다 */}
      {snap.waveBreakActive && (
        <div style={styles.waveBreakOverlay}>
          <div style={styles.waveBreakCard}>
            <h2 style={styles.waveBreakTitle}>준비 단계</h2>
            <div style={styles.waveBreakSub}>
              다음 웨이브 — <b style={{ color: '#FFEAA7' }}>WAVE {snap.wave}</b><br />
              <span style={{ color: '#888', fontSize: 11 }}>
                보유 영혼석 {stones.toLocaleString()}개 · 스킵해도 진행 가능
              </span>
            </div>
            <button
              style={styles.wbStart}
              onClick={async () => {
                // P2-D: 인터스티셜 광고 (광고 제거 IAP 미구매 + runs >= 4 + 50% 확률)
                const adsRemoved = useSaveStore.getState().iap.adsRemoved;
                const userRuns = useSaveStore.getState().runs;
                if (ENABLE_MONETIZATION && !adsRemoved && userRuns >= 4 && Math.random() < 0.5) {
                  try { await Ait.showInterstitialAd(); } catch (e) {}
                }
                eng()?.waveBreakStart();
              }}
            >
              ⚔ 다음 웨이브 시작
            </button>
            <div style={styles.waveBreakActions}>
              {renderWaveBreakAction(waveBreakRecommendedKey)}
              <button
                style={styles.waveBreakDetailsToggle}
                onClick={() => setWaveBreakDetailsOpen((v) => !v)}
              >
                {waveBreakDetailsOpen ? '정비 접기' : '다른 정비 보기'}
              </button>
              {waveBreakDetailsOpen && (['heal', 'mpRefill', 'freespin'] as const)
                .filter((key) => key !== waveBreakRecommendedKey)
                .map((key) => renderWaveBreakAction(key))}
            </div>
          </div>
        </div>
      )}

      {/* 부활 광고 모달 — IAA 핵심 매출원 (1런당 1회만) */}
      {snap.pendingRevival && (
        <RevivalModal
          onAccept={() => eng()?.acceptRevival()}
          onDecline={() => eng()?.declineRevival()}
          onLoadingChange={setRevivalAdLoading}
        />
      )}

      {/* 접근성 토글 — 일시정지 메뉴 안 — 사용자 store 직접 접근 */}

      {/* 일시정지 메뉴 — 게임 도중 안전한 탈출 / 설정 */}
      {showPauseMenu && (
        <div style={styles.pauseOverlay} onClick={(e) => e.stopPropagation()}>
          <div style={styles.pauseCard}>
            <h2 style={styles.pauseTitle}>일시정지</h2>
            <div style={styles.pauseStats}>
              <div>웨이브 <b style={{ color: '#FFEAA7' }}>{snap.wave}</b></div>
              <div>처치 <b style={{ color: '#FFEAA7' }}>{snap.kills}</b></div>
              <div>최고 콤보 <b style={{ color: '#FFEAA7' }}>{snap.combo || 0}</b></div>
            </div>
            <button
              style={styles.pauseBtnPrimary}
              onClick={() => {
                eng()?.setUserPause(false);
                setShowPauseSettings(false);
                setShowPauseMenu(false);
              }}
            >
              ▶ 게임 재개
            </button>
            <button
              style={styles.pauseSettingsBtn}
              onClick={() => setShowPauseSettings((v) => !v)}
            >
              {showPauseSettings ? '설정 접기' : '설정 열기'}
            </button>
            {showPauseSettings && (
              <>
                <div style={styles.pauseRow}>
                  <button
                    style={styles.pauseSubBtn}
                    onClick={() => eng()?.toggleAuto()}
                  >
                    🔁 AUTO {snap.autoReveal ? 'ON' : 'OFF'}
                  </button>
                  <button
                    style={styles.pauseSubBtn}
                    onClick={() => eng()?.toggleSpeed()}
                  >
                    ⏩ 속도 ×{snap.speed}
                  </button>
                </div>
                {/* A-1: 접근성 옵션 */}
                <AccessibilityToggles />
              </>
            )}
            <button
              style={styles.pauseQuitBtn}
              onClick={() => setShowQuitConfirm(true)}
            >
              ⏏ 포기하고 나가기
            </button>
          </div>
        </div>
      )}

      {/* BUG-008: 자체 React confirm 모달 (window.confirm 의존 제거) */}
      {showQuitConfirm && (
        <div style={styles.quitConfirmOverlay}>
          <div style={styles.quitConfirmCard}>
            <div style={styles.quitConfirmTitle}>현재 진행을 포기할까요?</div>
            <div style={styles.quitConfirmDesc}>
              지금까지의 처치/콤보 보상은 영혼석으로 지급됩니다.<br />
              미선택된 카드/유물은 손실됩니다.
            </div>
            <div style={styles.quitConfirmRow}>
              <button
                style={styles.quitConfirmCancel}
                onClick={() => setShowQuitConfirm(false)}
              >
                계속 플레이
              </button>
              <button
                style={styles.quitConfirmAccept}
                onClick={() => {
                  setShowQuitConfirm(false);
                  setShowPauseMenu(false);
                  const e = eng();
                  if (e) {
                    (e as any).castleHp = 0;
                    (e as any).gameOver?.();
                  }
                }}
              >
                포기하고 나가기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FTUE: 첫 카드 펼치기 가이드 텍스트 */}
      {firstSpinPulse && (
        <div style={styles.ftueHint}>
          ↓ 카드 펼치기부터 시작하세요 ↓
        </div>
      )}

      {/* 첫 카드 선택 직후 → 진화 안내 toast (TUT-B: tut_first_pick 모달이 학습 담당하므로 보조 toast로 격하) */}
      {(snap.runs ?? 0) <= 1 && (snap.wave ?? 1) <= 2 && (snap.kills ?? 0) > 0 && (snap.kills ?? 0) <= 2 &&
        Object.values(snap.aliveCounts || {}).every((c: any) => c < 2) && !snap.cardChoices && !snap.slotActive && (
          <div style={styles.firstHint}>
            💡 같은 카드 3장을 모으면 <b>진화</b>합니다
          </div>
        )}

      <style>{`
        @keyframes cardFlipIn {
          0%   { transform: rotateY(180deg) scale(0.85); opacity: 0; }
          50%  { transform: rotateY(90deg)  scale(0.92); opacity: 0.5; }
          80%  { transform: rotateY(-12deg) scale(1.04); opacity: 1; }
          100% { transform: rotateY(0)      scale(1);    opacity: 1; }
        }
        .card-flip { animation: cardFlipIn 0.55s cubic-bezier(0.4,0,0.2,1) backwards; transform-style: preserve-3d; }
        @keyframes cardFlipPulseAnim {
          0%,100% { transform: translateY(0) rotateZ(-1deg); }
          50%     { transform: translateY(-3px) rotateZ(1deg); }
        }
        .card-flip-pulse { animation: cardFlipPulseAnim 0.7s ease-in-out infinite backwards; }
        @keyframes cardBackCycle {
          0%, 24%   { object-position: 0 0; }   /* PNG sheet: 4 frames horizontal */
          25%, 49%  { object-position: -100% 0; }
          50%, 74%  { object-position: -200% 0; }
          75%, 100% { object-position: -300% 0; }
        }
        .card-back-anim { animation: cardBackCycle 0.6s steps(1) infinite; }
        @keyframes ultiReadyPulse {
          0%,100% { transform: scale(1); filter: drop-shadow(0 0 6px #FF6B6B); }
          50%     { transform: scale(1.06); filter: drop-shadow(0 0 14px #FFEAA7); }
        }
        .ulti-ready-pulse { animation: ultiReadyPulse 0.7s ease-in-out infinite; }
        @keyframes ultiPulse {
          0%,100% { transform:scale(1); box-shadow:0 3px 0 #1a0030, 0 0 18px rgba(253,203,110,0.9); }
          50%     { transform:scale(1.05); box-shadow:0 3px 0 #1a0030, 0 0 28px rgba(253,203,110,1); }
        }
        .ulti-ready { animation: ultiPulse 0.7s infinite; border-color: #FFEAA7 !important; }
        @keyframes dangerPulse {
          0%,100% { filter: brightness(1); }
          50%     { filter: brightness(1.6); }
        }
        @keyframes synergyPulseAnim {
          0%,100% { box-shadow: 0 0 0 0 rgba(165,94,234,0); }
          50%     { box-shadow: inset 0 0 60px rgba(165,94,234,0.5); }
        }
        @keyframes spinPulseAnim {
          0%,100% { box-shadow: 0 3px 0 #4a0a0a, 0 0 14px rgba(253,121,168,0.4); }
          50%     { box-shadow: 0 3px 0 #4a0a0a, 0 0 26px rgba(253,203,110,0.95); }
        }
        .spin-pulse { animation: spinPulseAnim 1.2s ease-in-out infinite; border-color: #FFEAA7 !important; }
        @keyframes ftueHintAnim {
          0%,100% { opacity:0.7; transform:translate(-50%,0); }
          50%     { opacity:1; transform:translate(-50%,4px); }
        }
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes fadeOutLate {
          0%, 70% { opacity: 1; }
          100% { opacity: 0; pointer-events: none; }
        }
        @keyframes rallyHintPulse {
          0%,100% { transform: translateX(-50%) scale(1); }
          50%     { transform: translateX(-50%) scale(1.06); }
        }
        @keyframes evolveStrongPulse {
          0%,100% { transform: scale(1); box-shadow: 0 0 12px rgba(253,203,110,1); }
          50%     { transform: scale(1.07); box-shadow: 0 0 22px rgba(255,234,167,1); }
        }
        /* LD-6+F-4: flip 후 0.2초 입력 잠금 + 시각 transition (밝기 페이드인) */
        .cards-fade-in { pointer-events: none; animation: cardsFadeIn 0.2s linear forwards; filter: brightness(0.7); }
        @keyframes cardsFadeIn {
          0%   { pointer-events: none; filter: brightness(0.7); }
          90%  { pointer-events: none; filter: brightness(1); }
          100% { pointer-events: auto; filter: brightness(1); }
        }
        @keyframes legendaryShake {
          0%,100% { transform: scale(1.06) rotate(0); }
          25%     { transform: scale(1.08) rotate(-0.7deg); }
          50%     { transform: scale(1.10) rotate(0); }
          75%     { transform: scale(1.08) rotate(0.7deg); }
        }
        .card-legendary {
          animation: cardFlipIn 0.55s cubic-bezier(0.4,0,0.2,1) backwards,
                     legendaryShake 1.2s ease-in-out 0.55s infinite;
        }
        @keyframes epicGlow {
          0%,100% { filter: brightness(1); }
          50%     { filter: brightness(1.18); }
        }
        .card-epic {
          animation: cardFlipIn 0.55s cubic-bezier(0.4,0,0.2,1) backwards,
                     epicGlow 1.4s ease-in-out 0.55s infinite;
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { position: 'absolute', inset: 0, overflow: 'hidden', transition: 'box-shadow 0.3s' },
  synergyPulse: { animation: 'synergyPulseAnim 0.7s' },
  canvas: { width: '100%', height: '100%', imageRendering: 'pixelated', display: 'block' },
  dangerVignette: {
    position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 7,
    background: 'radial-gradient(ellipse at center, transparent 35%, rgba(214,48,49,0.5) 100%)',
    animation: 'dangerPulse 0.8s infinite',
  },
  castleWarn: {
    position: 'absolute', left: 0, top: 70, width: 110, bottom: 280,
    pointerEvents: 'none', zIndex: 7,
    background: 'linear-gradient(90deg, rgba(214,48,49,0.45) 0%, rgba(214,48,49,0) 100%)',
    animation: 'dangerPulse 1.2s infinite',
  },
  contextHint: {
    position: 'absolute',
    left: '50%',
    bottom: 178,
    transform: 'translateX(-50%)',
    zIndex: 9,
    pointerEvents: 'none',
    color: '#FDCB6E', fontSize: 10, fontWeight: 'bold',
    textShadow: '1px 1px 0 #000',
    background: 'rgba(0,0,0,0.68)', padding: '4px 10px',
    border: '1px solid #FDCB6E', borderRadius: 4,
    letterSpacing: 1,
    whiteSpace: 'nowrap',
  },
  graspRing: {
    position: 'absolute',
    left: '50%', top: '40%',
    width: 56, height: 56,
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%',
    pointerEvents: 'none',
    zIndex: 12,
    transition: 'opacity 0.1s',
    boxShadow: '0 0 12px rgba(165,94,234,0.6)',
  },
  graspRingInner: {
    position: 'absolute', inset: 6,
    borderRadius: '50%',
    background: 'rgba(20,12,42,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22,
  },
  bossDarken: {
    position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6,
    background: 'rgba(5,3,15,0.4)', transition: 'background 0.6s',
  },
  pauseBtn: {
    position: 'absolute',
    top: 'calc(8px + env(safe-area-inset-top, 0))',
    right: 8,
    width: 44, height: 44,
    background: 'rgba(20,12,42,0.85)',
    border: '1.5px solid #FDCB6E',
    borderRadius: 8,
    color: '#FFEAA7', fontSize: 22, fontWeight: 'bold',
    zIndex: 11,
    fontFamily: 'inherit',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0,
  },
  rallyHint: {
    position: 'absolute',
    left: '50%', top: 'calc(140px + env(safe-area-inset-top, 0))',
    transform: 'translateX(-50%)',
    background: 'rgba(20,12,42,0.7)',
    border: '1px solid #FDCB6E', borderRadius: 14,
    color: '#FDCB6E', fontSize: 10, fontWeight: 'bold',
    padding: '3px 10px', letterSpacing: 1,
    pointerEvents: 'none',
    zIndex: 9,
    transition: 'opacity 0.2s',
    textShadow: '1px 1px 0 #000',
    whiteSpace: 'nowrap',
  },
  rallyHintFirst: {
    background: 'linear-gradient(180deg,#3a1a1a,#1a0606)',
    border: '2px solid #FDCB6E',
    fontSize: 11,
    padding: '5px 14px',
    boxShadow: '0 0 14px rgba(253,203,110,0.7)',
    animation: 'rallyHintPulse 0.8s ease-in-out infinite',
  },
  rallyBtnReady: {
    background: 'linear-gradient(180deg,#FDCB6E,#D63031)',
    borderColor: '#FFEAA7',
    color: '#fff',
    boxShadow: '0 1px 0 rgba(0,0,0,0.6), 0 0 8px rgba(253,203,110,0.6)',
  },
  rallyBtnCool: {
    background: 'rgba(45,27,78,0.5)',
    borderColor: '#3a2d5c',
    color: '#888',
  },
  autoIndicator: {
    position: 'absolute',
    top: 'calc(54px + env(safe-area-inset-top, 0))',
    right: 8,
    background: 'rgba(123,45,142,0.9)',
    border: '1px solid #a55eea',
    borderRadius: 12,
    color: '#FFEAA7', fontSize: 10, fontWeight: 'bold',
    padding: '3px 10px',
    zIndex: 11,
    letterSpacing: 1,
    boxShadow: '0 0 8px rgba(165,94,234,0.6)',
    pointerEvents: 'none',
  },
  tutOverlay: {
    position: 'absolute', inset: 0, zIndex: 250,
    background: 'rgba(5,3,15,0.95)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 18,
    animation: 'fadeIn 0.25s ease-out',
  },
  tutCard: {
    width: '100%', maxWidth: 300,
    background: 'linear-gradient(180deg,#241a4e 0%,#0d0620 100%)',
    border: '3px solid #FDCB6E', borderRadius: 14,
    padding: '22px 20px',
    boxShadow: '0 0 40px rgba(253,203,110,0.5)',
    textAlign: 'center',
  },
  tutIcon: {
    fontSize: 56, marginBottom: 6,
    filter: 'drop-shadow(0 0 12px rgba(253,203,110,0.6))',
  },
  tutTitle: {
    color: '#FFEAA7', fontSize: 20, fontWeight: 'bold',
    marginBottom: 12, letterSpacing: 2,
    textShadow: '2px 2px 0 #000',
  },
  tutBody: {
    color: '#eaeaea', fontSize: 13, lineHeight: 1.7,
    textAlign: 'left', marginBottom: 18,
    whiteSpace: 'pre-line',
  },
  tutOkBtn: {
    width: '100%', padding: '12px 16px',
    background: 'linear-gradient(180deg,#D63031,#7a1818)',
    border: '2px solid #FDCB6E', borderRadius: 7,
    color: '#fff', fontWeight: 'bold', fontSize: 15, letterSpacing: 2,
    boxShadow: '0 3px 0 #4a0a0a',
    fontFamily: 'inherit', cursor: 'pointer',
  },
  waveBreakOverlay: {
    position: 'absolute', inset: 0, zIndex: 95,
    background: 'rgba(5,3,15,0.78)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 18,
    animation: 'fadeIn 0.25s ease-out',
  },
  waveBreakCard: {
    width: '100%', maxWidth: 280,
    background: 'linear-gradient(180deg,#241a3e 0%,#0d0620 100%)',
    border: '2px solid #26de81', borderRadius: 14,
    padding: '18px 16px',
    boxShadow: '0 0 30px rgba(38,222,129,0.4)',
    textAlign: 'center',
  },
  waveBreakTitle: {
    color: '#26de81', fontSize: 20, fontWeight: 'bold',
    marginBottom: 4, letterSpacing: 3,
    textShadow: '2px 2px 0 #000',
  },
  waveBreakSub: {
    color: '#bbb', fontSize: 12, marginBottom: 10,
  },
  waveBreakActions: {
    display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10,
  },
  wbAction: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px',
    background: 'linear-gradient(180deg,#3a2d5c,#1a1230)',
    borderWidth: 1, borderStyle: 'solid', borderColor: '#4a3a6e', borderRadius: 7,
    color: '#FFEAA7', fontFamily: 'inherit', cursor: 'pointer',
    textAlign: 'left',
  },
  wbActionUsed: {
    opacity: 0.4,
    borderColor: '#26de81',
    color: '#26de81',
  },
  wbActionRecommend: {
    borderColor: '#FDCB6E',
    boxShadow: '0 0 10px rgba(253,203,110,0.5)',
  },
  wbIcon: { fontSize: 22 },
  wbBody: { flex: 1, textAlign: 'left' },
  wbName: { fontSize: 13, fontWeight: 'bold' },
  wbTip: { fontSize: 9, color: '#FDCB6E', marginTop: 2 },
  wbCost: {
    fontSize: 11, fontWeight: 'bold', color: '#FDCB6E',
    background: 'rgba(0,0,0,0.5)', padding: '2px 7px', borderRadius: 8,
  },
  wbStart: {
    width: '100%', padding: '13px 16px',
    background: 'radial-gradient(ellipse at 50% 30%,#26de81,#128047)',
    border: '2px solid #FFEAA7', borderRadius: 8,
    color: '#fff', fontWeight: 'bold', fontSize: 14, letterSpacing: 2,
    fontFamily: 'inherit', cursor: 'pointer',
    boxShadow: '0 3px 0 #064624, 0 0 14px rgba(38,222,129,0.5)',
  },
  waveBreakDetailsToggle: {
    width: '100%', padding: '7px 12px',
    background: 'rgba(20,12,42,0.45)',
    border: '1px dashed #4a3a6e', borderRadius: 6,
    color: '#bbb', fontSize: 10, fontWeight: 'bold',
    fontFamily: 'inherit', cursor: 'pointer',
  },
  revivalOverlay: {
    position: 'absolute', inset: 0, zIndex: 200,
    background: 'rgba(35,6,20,0.88)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
    animation: 'fadeIn 0.25s ease-out',
  },
  revivalCard: {
    width: '100%', maxWidth: 280,
    background: 'linear-gradient(180deg,#3a1a1a 0%,#1a0606 100%)',
    border: '3px solid #FDCB6E', borderRadius: 14,
    padding: 20,
    boxShadow: '0 0 40px rgba(253,121,168,0.5)',
    textAlign: 'center',
  },
  revivalIcon: { fontSize: 56, marginBottom: 4 },
  revivalTitle: {
    color: '#FF7675', fontSize: 20, fontWeight: 'bold',
    marginBottom: 12, letterSpacing: 2,
    textShadow: '2px 2px 0 #000',
  },
  revivalDesc: {
    color: '#eaeaea', fontSize: 14, lineHeight: 1.6,
    marginBottom: 8,
  },
  revivalCountdown: {
    color: '#FD79A8', fontSize: 11, marginBottom: 14,
    letterSpacing: 1,
  },
  revivalError: {
    color: '#FF6B6B', fontSize: 11, marginBottom: 8,
    background: 'rgba(214,48,49,0.2)',
    border: '1px solid #FF6B6B', borderRadius: 5,
    padding: '6px 10px',
    textAlign: 'center',
  },
  revivalAccept: {
    width: '100%', padding: '14px 16px',
    background: 'linear-gradient(180deg,#FDCB6E,#D63031)',
    border: '2px solid #FFEAA7', borderRadius: 7,
    color: '#fff', fontWeight: 'bold', fontSize: 15, letterSpacing: 2,
    boxShadow: '0 4px 0 #4a0a0a, 0 0 18px rgba(253,121,168,0.5)',
    fontFamily: 'inherit', cursor: 'pointer',
    marginBottom: 8,
  },
  revivalDecline: {
    width: '100%', padding: '8px 16px',
    background: 'transparent',
    border: '1px solid #555', borderRadius: 5,
    color: '#888', fontWeight: 'bold', fontSize: 12,
    fontFamily: 'inherit', cursor: 'pointer',
  },
  roleLegend: {
    position: 'absolute',
    left: '50%', bottom: 240,
    transform: 'translateX(-50%)',
    display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 11,
  },
  roleLegendItem: {
    background: 'rgba(20,12,42,0.85)',
    border: '1px solid #a55eea', borderRadius: 10,
    color: '#FFEAA7', fontSize: 9, padding: '2px 6px',
    fontWeight: 'bold', letterSpacing: 0.5,
    boxShadow: '0 0 4px rgba(165,94,234,0.4)',
  },
  firstHint: {
    position: 'absolute',
    left: '50%', bottom: 200,
    transform: 'translateX(-50%)',
    background: 'linear-gradient(180deg,#241a3e,#0d0620)',
    border: '1px solid #FDCB6E',
    borderRadius: 10, padding: '5px 12px',
    color: '#FFEAA7', fontSize: 11, fontWeight: 'bold',
    letterSpacing: 1, textShadow: '1px 1px 0 #000',
    boxShadow: '0 0 8px rgba(253,203,110,0.4)',
    zIndex: 11, pointerEvents: 'none',
    whiteSpace: 'nowrap',
  },
  pauseOverlay: {
    position: 'absolute', inset: 0, zIndex: 100,
    background: 'rgba(5,3,15,0.92)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  },
  pauseCard: {
    width: '100%', maxWidth: 280,
    background: 'linear-gradient(180deg,#241a3e 0%,#0d0620 100%)',
    border: '2px solid #FDCB6E', borderRadius: 12,
    padding: 18,
    boxShadow: '0 0 30px rgba(253,203,110,0.4)',
  },
  pauseTitle: {
    color: '#FFEAA7', fontSize: 22, fontWeight: 'bold',
    textAlign: 'center', letterSpacing: 4, marginBottom: 12,
    textShadow: '2px 2px 0 #000',
  },
  pauseStats: {
    background: 'rgba(0,0,0,0.4)', borderRadius: 6,
    padding: '10px 14px', marginBottom: 14,
    display: 'flex', flexDirection: 'column', gap: 4,
    fontSize: 13, color: '#bbb',
  },
  pauseBtnPrimary: {
    width: '100%', padding: '14px 16px',
    background: 'linear-gradient(180deg,#D63031,#7a1818)',
    border: '2px solid #FDCB6E', borderRadius: 7,
    color: '#fff', fontWeight: 'bold', fontSize: 17, letterSpacing: 3,
    boxShadow: '0 4px 0 #4a0a0a, 0 0 18px rgba(253,121,168,0.6)',
    fontFamily: 'inherit', cursor: 'pointer',
    marginBottom: 10,
  },
  pauseRow: { display: 'flex', gap: 8, marginBottom: 10 },
  pauseSettingsBtn: {
    width: '100%', padding: '8px 12px',
    background: 'rgba(20,12,42,0.45)',
    border: '1px dashed #4a3a6e', borderRadius: 6,
    color: '#bbb', fontSize: 11, fontWeight: 'bold',
    fontFamily: 'inherit', cursor: 'pointer',
    marginBottom: 10,
  },
  pauseSubBtn: {
    flex: 1, padding: '10px 8px',
    background: 'linear-gradient(180deg,#3a2d5c,#1a1230)',
    border: '1px solid #4a3a6e', borderRadius: 5,
    color: '#FFEAA7', fontWeight: 'bold', fontSize: 12,
    fontFamily: 'inherit', cursor: 'pointer',
    boxShadow: '0 2px 0 #15102a',
  },
  pauseQuitBtn: {
    width: '100%', padding: '8px 16px',
    background: 'transparent',
    border: '1px dashed #D63031', borderRadius: 5,
    color: '#D63031', fontWeight: 'bold', fontSize: 11, letterSpacing: 1,
    fontFamily: 'inherit', cursor: 'pointer',
  },
  topSummary: {
    position: 'absolute',
    left: 60,
    right: 60,
    top: 8,
    zIndex: 8,
    pointerEvents: 'none',
    color: '#FFEAA7',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  topSummaryText: {
    background: 'rgba(20,12,42,0.8)',
    border: '1px solid #4a3a6e',
    borderRadius: 12,
    padding: '5px 10px',
    color: '#FDCB6E',
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: 700,
    textShadow: '1px 1px 0 #000',
    whiteSpace: 'nowrap',
    textAlign: 'center',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  topSummarySub: {
    background: 'rgba(0,0,0,0.45)',
    border: '1px dashed #a55eea',
    borderRadius: 10,
    padding: '4px 10px',
    color: '#bbb',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.6,
    textAlign: 'center',
    maxWidth: '85%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  bossHp: { position: 'absolute', left: 10, right: 10, top: 80, zIndex: 8 },
  bossLabel: { color: '#FD79A8', fontSize: 11, fontWeight: 'bold', textAlign: 'center', textShadow: '2px 2px 0 #000', letterSpacing: 2, marginBottom: 2 },
  missionHud: {
    position: 'absolute', left: 8, top: 106, zIndex: 8,
    pointerEvents: 'none',
    color: '#FFEAA7', fontSize: 9, fontWeight: 'bold',
    background: 'rgba(20,12,42,0.7)',
    border: '1px solid #4a3a6e', borderRadius: 10,
    padding: '2px 8px',
    display: 'flex', gap: 6, alignItems: 'center',
    letterSpacing: 0.5,
  },
  missionHudProgress: { color: '#FDCB6E', fontSize: 9 },
  evoImminent: {
    position: 'absolute', left: 8, top: 124, zIndex: 8,
    pointerEvents: 'none',
    color: '#FDCB6E', fontSize: 9, fontWeight: 'bold',
    background: 'rgba(20,12,42,0.7)',
    border: '1px solid #FDCB6E', borderRadius: 10,
    padding: '2px 8px',
    letterSpacing: 0.5,
    boxShadow: '0 0 6px rgba(253,203,110,0.4)',
  },
  demonSpeech: {
    position: 'absolute', left: 8, top: 60, zIndex: 14,
    pointerEvents: 'none',
    display: 'flex', alignItems: 'flex-start', gap: 6,
    maxWidth: '85%',
    transition: 'opacity 0.3s',
  },
  demonPortrait: {
    width: 36, height: 36,
    fontSize: 26,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(180deg, #2D1B4E, #0a0820)',
    border: '2px solid #FDCB6E',
    borderRadius: 6,
    boxShadow: '0 3px 0 #080412',
    flex: '0 0 36px',
  },
  demonBubble: {
    background: 'rgba(20,12,42,0.95)',
    border: '1.5px solid #a55eea',
    borderRadius: 10,
    padding: '5px 10px',
    color: '#FFEAA7',
    boxShadow: '0 0 10px rgba(165,94,234,0.4)',
    minWidth: 0, flex: 1,
  },
  demonName: {
    fontSize: 9, color: '#FD79A8',
    letterSpacing: 2, marginBottom: 2,
    textShadow: '1px 1px 0 #000',
  },
  demonText: {
    fontSize: 11, color: '#FFEAA7',
    lineHeight: 1.4,
    textShadow: '1px 1px 0 #000',
  },
  stratumBadge: {
    position: 'absolute', left: 74, right: 74, top: 64, zIndex: 7,
    pointerEvents: 'none',
    color: '#FDCB6E', fontSize: 9, fontWeight: 'bold',
    background: 'rgba(20,12,42,0.5)',
    padding: '1px 6px',
    textAlign: 'center',
    letterSpacing: 1.5,
    borderRadius: 8,
    border: '1px solid rgba(253,203,110,0.4)',
  },
  stageBadge: {
    position: 'absolute', left: 74, right: 74, top: 64, zIndex: 7,
    pointerEvents: 'none',
    color: '#FFEAA7', fontSize: 9, fontWeight: 'bold',
    background: 'linear-gradient(180deg,rgba(58,29,142,0.85),rgba(20,12,42,0.85))',
    padding: '2px 6px',
    textAlign: 'center',
    letterSpacing: 1,
    borderRadius: 8,
    border: '1px solid #a55eea',
    boxShadow: '0 0 6px rgba(165,94,234,0.45)',
  },
  challengeBadge: {
    position: 'absolute', left: 8, right: 8, top: 96, zIndex: 8,
    pointerEvents: 'none',
    color: '#FDCB6E', fontSize: 10, fontWeight: 'bold',
    background: 'rgba(123,45,142,0.5)',
    border: '1px solid #FDCB6E', borderRadius: 10,
    padding: '3px 8px',
    textAlign: 'center',
    letterSpacing: 1,
  },
  bossHpPct: { color: '#FFEAA7', fontSize: 10, fontWeight: 'bold', marginLeft: 6, letterSpacing: 1 },
  bossBar: { height: 14, background: '#0a0612', border: '2px solid #D63031', borderRadius: 3, padding: 1 },
  bossFill: { height: '100%', background: 'linear-gradient(180deg,#FFEAA7,#FF7675 30%,#D63031 70%,#7a1818)' },
  synergyRow: {
    position: 'absolute', left: 8, right: 8, top: 110, zIndex: 8,
    display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center',
    pointerEvents: 'none',
  },
  synergyCompact: {
    position: 'absolute',
    left: 8, top: 'calc(128px + env(safe-area-inset-top, 0))',
    background: 'rgba(20,12,42,0.85)',
    border: '1px solid #a55eea', borderRadius: 12,
    color: '#FD79A8', fontSize: 10, fontWeight: 'bold',
    padding: '4px 10px', letterSpacing: 1,
    fontFamily: 'inherit', cursor: 'pointer',
    zIndex: 9,
    boxShadow: '0 0 6px rgba(165,94,234,0.4)',
  },
  synergyNearSignal: {
    color: '#FDCB6E', fontWeight: 'bold',
    textShadow: '0 0 4px #FDCB6E',
  },
  synergyTapHint: {
    marginLeft: 4, color: '#888', fontSize: 9,
  },
  synergyExpandedPanel: {
    // BUG-016: z-index 40 (relicModal/eventModal/waveBreak/revival보다 낮게)
    position: 'absolute', inset: 0, zIndex: 40,
    background: 'rgba(5,3,15,0.94)',
    display: 'flex', flexWrap: 'wrap', gap: 6, alignContent: 'center', justifyContent: 'center',
    padding: 30,
  },
  synergyChip: {
    background: 'rgba(20,12,42,0.85)',
    border: '1px solid #4a3a6e', color: '#bbb',
    fontSize: 9, padding: '2px 7px', borderRadius: 9,
    fontWeight: 'bold', textShadow: '1px 1px 0 #000',
  },
  synergyChipNear: {
    border: '1px solid #FDCB6E', color: '#FFEAA7',
    background: 'linear-gradient(180deg,#3a1a1a,#1a0606)',
    boxShadow: '0 0 8px rgba(253,203,110,0.5)',
  },
  synergyChipActive: {
    border: '1px solid #a55eea', color: '#FD79A8',
    background: 'linear-gradient(180deg,#3d1a52,#1a0830)',
    boxShadow: '0 0 8px rgba(165,94,234,0.6)',
  },
  waveProgress: {
    position: 'absolute', left: 8, right: 8, top: 82, zIndex: 8,
    display: 'flex', alignItems: 'center', gap: 6,
    pointerEvents: 'none',
  },
  waveProgressLabel: {
    color: '#FDCB6E', fontSize: 9, fontWeight: 'bold', letterSpacing: 1,
    textShadow: '1px 1px 0 #000',
  },
  waveProgressBar: {
    flex: 1, height: 4,
    background: 'rgba(0,0,0,0.6)',
    border: '1px solid #4a3a6e', borderRadius: 2,
    overflow: 'hidden',
  },
  waveProgressFill: {
    height: '100%',
    background: 'linear-gradient(90deg,#26de81,#0984E3)',
    transition: 'width 0.25s',
    boxShadow: '0 0 4px #26de81',
  },
  waveProgressCount: {
    color: '#fff', fontSize: 9, fontWeight: 'bold',
    textShadow: '1px 1px 0 #000', minWidth: 58, textAlign: 'right',
  },
  bossTelegraph: {
    position: 'absolute', left: 8, right: 8, top: 102, zIndex: 8,
    pointerEvents: 'none',
    color: '#FFEAA7', fontSize: 10, fontWeight: 'bold', letterSpacing: 2,
    textAlign: 'center', textShadow: '0 0 6px #FF6B6B, 1px 1px 0 #000',
  },
  bossTelegraphCount: {
    color: '#FF6B6B', marginLeft: 4, fontSize: 11, fontWeight: 'bold',
  },
  bossTelegraphDanger: {
    color: '#FF7675', fontSize: 14,
    background: 'rgba(214,48,49,0.4)',
    border: '2px solid #FF7675',
    padding: '4px 12px', borderRadius: 8,
    animation: 'dangerPulse 0.5s infinite',
    textShadow: '0 0 10px #FF6B6B, 1px 1px 0 #000',
  },
  bossTelegraphFirstDanger: {
    top: '40%',
    fontSize: 22,
    letterSpacing: 4,
    padding: '10px 20px',
    background: 'rgba(214,48,49,0.7)',
    boxShadow: '0 0 24px #FF6B6B',
  },
  bottom: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingTop: 6,
    paddingRight: 8,
    paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0))',
    paddingLeft: 8,
    background: 'linear-gradient(0deg, rgba(5,3,15,0.97) 0%, rgba(5,3,15,0.85) 70%, transparent)',
    zIndex: 10,
  },
  bottomChoiceOpen: {
    bottom: 54,
    paddingTop: 8,
    background: 'linear-gradient(0deg, rgba(5,3,15,0.98) 0%, rgba(5,3,15,0.9) 78%, transparent)',
  },
  cardArea: {
    margin: '0 auto 4px',
    textAlign: 'center',
  },
  cardAreaLabel: {
    color: '#FFEAA7', fontSize: 11, fontWeight: 'bold',
    letterSpacing: 2, padding: '4px 12px',
    background: 'linear-gradient(180deg,#241a3e,#0d0620)',
    border: '1px solid #4a3a6e', borderRadius: 14,
    display: 'inline-block',
    textShadow: '1px 1px 0 #000',
    boxShadow: '0 0 10px rgba(165,94,234,0.4)',
  },
  cardFaceDownWrap: {
    flex: 1, maxWidth: 116, aspectRatio: '0.75',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))',
  },
  cardBackImg: {
    width: '400%', height: '100%',
    imageRendering: 'pixelated',
    objectFit: 'cover',
    objectPosition: '0 0',
    pointerEvents: 'none',
  },

  cards: { display: 'flex', gap: 5, marginBottom: 6, justifyContent: 'center' },
  cardsFirstReveal: {
    gap: 4,
    alignItems: 'stretch',
  },
  rerollBtn: {
    display: 'block', margin: '0 auto 6px', padding: '7px 18px',
    background: 'linear-gradient(180deg,#a55eea,#3a0d4e)',
    border: '2px solid #FD79A8', borderRadius: 6,
    color: '#FFEAA7', fontFamily: 'inherit', fontWeight: 'bold',
    fontSize: 12, letterSpacing: 1.5, cursor: 'pointer',
    boxShadow: '0 0 12px rgba(165,94,234,0.7), 0 3px 0 #1a0030',
    textShadow: '1px 1px 0 #000',
  },
  card: {
    flex: 1, width: '100%', boxSizing: 'border-box',
    padding: '7px 5px 12px', maxWidth: 106,
    background: 'linear-gradient(180deg,#2a1a4e 0%,#1a0e30 60%,#0d0620 100%)',
    borderWidth: 2, borderStyle: 'solid', borderColor: '#4a3a6e', borderRadius: 7,
    color: '#fff', fontWeight: 'bold',
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 3,
    transition: 'transform 0.1s',
    position: 'relative',
    minHeight: 124,
  },
  cardFirstReveal: {
    maxWidth: 98,
    minHeight: 108,
    padding: '6px 4px 8px',
    gap: 2,
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontSize: 9, letterSpacing: 0.5,
  },
  cardRarity: {
    fontSize: 9, letterSpacing: 0.5,
    textShadow: '1px 1px 0 #000', fontWeight: 'bold',
  },
  cardName: {
    fontSize: 12, color: '#FFEAA7',
    textShadow: '1px 1px 0 #000',
    textAlign: 'center', margin: '2px 0 1px',
  },
  cardRoleHint: {
    fontSize: 8,
    lineHeight: 1.35,
    color: '#dfe6ff',
    textAlign: 'center',
    background: 'rgba(0,0,0,0.34)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 4,
    padding: '3px 4px',
    minHeight: 24,
  },
  cardStar: { fontSize: 9, color: '#FDCB6E', textShadow: '1px 1px 0 #000' },
  cardStats: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 9, color: '#bbb',
    background: 'rgba(0,0,0,0.45)',
    padding: '2px 5px', borderRadius: 3,
    marginTop: 1,
  },
  cardStat: { letterSpacing: 0.3 },
  cardTradeoff: {
    fontSize: 8, color: '#FF7675',
    background: 'rgba(214,48,49,0.2)',
    padding: '1px 4px', borderRadius: 3,
    textAlign: 'center', marginTop: 1,
    letterSpacing: 0.3,
  },
  cardRiskBadge: {
    fontSize: 8, color: '#fff',
    background: 'linear-gradient(180deg,#D63031,#7a1818)',
    border: '1px solid #FF7675',
    padding: '2px 4px', borderRadius: 3,
    textAlign: 'center', marginTop: 2,
    letterSpacing: 0.5, fontWeight: 'bold',
    boxShadow: '0 0 4px rgba(255,107,107,0.6)',
  },
  cardTradeoffPositive: {
    fontSize: 8, color: '#74B9FF',
    background: 'rgba(116,185,255,0.15)',
    padding: '1px 4px', borderRadius: 3,
    textAlign: 'center', marginTop: 1,
    letterSpacing: 0.3,
  },
  cardBadgeEvolve: {
    fontSize: 9, color: '#15082a',
    background: 'linear-gradient(90deg,#FFEAA7,#FDCB6E)',
    padding: '2px 5px', borderRadius: 3,
    textAlign: 'center', fontWeight: 'bold',
    letterSpacing: 0.5, marginTop: 2,
    boxShadow: '0 0 8px rgba(253,203,110,0.7)',
    textShadow: 'none',
  },
  cardBadgeEvolveStrong: {
    fontSize: 10, color: '#15082a',
    background: 'linear-gradient(90deg,#FFEAA7,#FDCB6E,#FFEAA7)',
    padding: '3px 6px', borderRadius: 4,
    textAlign: 'center', fontWeight: 'bold',
    letterSpacing: 0.5, marginTop: 2,
    boxShadow: '0 0 12px rgba(253,203,110,1)',
    textShadow: 'none',
    animation: 'evolveStrongPulse 0.6s infinite',
  },
  cardBadgeEvolveHint: {
    fontSize: 8, color: '#FDCB6E',
    textAlign: 'center', fontWeight: 'bold',
    letterSpacing: 0.3, marginTop: 1,
    textShadow: '1px 1px 0 #000',
  },
  cardBadgeSynergy: {
    fontSize: 9, color: '#FFEAA7',
    background: 'rgba(165,94,234,0.4)',
    border: '1px solid #a55eea',
    padding: '2px 5px', borderRadius: 3,
    textAlign: 'center', letterSpacing: 0.5, marginTop: 2,
  },
  cardBadgeProgress: {
    fontSize: 8, color: '#888',
    padding: '1px 4px', textAlign: 'center',
    letterSpacing: 0.5, marginTop: 2,
  },
  lockedTag: {
    position: 'absolute', top: 4, right: 4,
    fontSize: 9, color: '#26de81',
    background: 'rgba(38,222,129,0.2)',
    border: '1px solid #26de81', borderRadius: 8,
    padding: '1px 5px', letterSpacing: 0.5,
    fontFamily: 'inherit', fontWeight: 'bold',
  },
  rarityLabel: {
    alignSelf: 'flex-start',
    fontSize: 8, fontWeight: 'bold',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'currentColor', borderRadius: 3,
    padding: '0 3px',
    margin: '2px 0',
    letterSpacing: 1,
  },
  cardWrap: {
    position: 'relative',
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  quitConfirmOverlay: {
    position: 'absolute', inset: 0, zIndex: 300,
    background: 'rgba(5,3,15,0.95)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  },
  quitConfirmCard: {
    background: 'linear-gradient(180deg,#241a3e,#15102a)',
    border: '2px solid #FD79A8', borderRadius: 8,
    padding: 18, width: '100%', maxWidth: 280,
    boxShadow: '0 0 18px rgba(253,121,168,0.5)',
  },
  quitConfirmTitle: {
    color: '#FFEAA7', fontSize: 16, fontWeight: 'bold',
    letterSpacing: 1, marginBottom: 10,
    textShadow: '1px 1px 0 #000',
  },
  quitConfirmDesc: {
    color: '#bbb', fontSize: 12, lineHeight: 1.6,
    marginBottom: 14,
  },
  quitConfirmRow: {
    display: 'flex', gap: 8,
  },
  quitConfirmCancel: {
    flex: 1, padding: '10px 0',
    background: 'linear-gradient(180deg,#26de81,#1a8048)',
    border: '2px solid #FDCB6E', borderRadius: 5,
    color: '#fff', fontWeight: 'bold', fontSize: 12,
    letterSpacing: 1, fontFamily: 'inherit', cursor: 'pointer',
  },
  quitConfirmAccept: {
    flex: 1, padding: '10px 0',
    background: 'linear-gradient(180deg,#3a3050,#1a1428)',
    border: '1px solid #4a3a6e', borderRadius: 5,
    color: '#888', fontSize: 11,
    fontFamily: 'inherit', cursor: 'pointer',
  },
  lockBtn: {
    marginTop: 6,
    padding: '8px 0',
    minHeight: 28,
    background: 'linear-gradient(180deg,#3a2d5c,#1a1230)',
    border: '1.5px solid #FDCB6E',
    borderRadius: 4,
    color: '#FFEAA7', fontSize: 11, fontWeight: 'bold',
    fontFamily: 'inherit', cursor: 'pointer',
    letterSpacing: 0.5,
    boxShadow: '0 0 6px rgba(253,203,110,0.5)',
  },
  actionRow: {
    display: 'flex', gap: 8, alignItems: 'center',
    marginTop: 6, padding: '0 4px',
  },
  btnReveal: {
    flex: 1, height: 64, minHeight: 64,
    backgroundColor: 'transparent',
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
    border: 'none', padding: 0,
    color: '#FFEAA7',
    fontFamily: 'inherit',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 2,
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.65))',
  },
  btnRevealMuted: {
    opacity: 0.68,
    filter: 'grayscale(0.45) brightness(0.78) drop-shadow(0 2px 4px rgba(0,0,0,0.55))',
    transform: 'scale(0.98)',
  },
  btnRevealEmergency: {
    opacity: 1,
    filter: 'drop-shadow(0 0 12px rgba(255,107,107,0.7)) drop-shadow(0 4px 8px rgba(0,0,0,0.65))',
    transform: 'scale(1.01)',
  },
  btnRevealTop: {
    fontSize: 16, fontWeight: 'bold', letterSpacing: 2,
    textShadow: '0 0 10px #FDCB6E, 2px 2px 0 #000',
  },
  btnRevealTopMuted: {
    fontSize: 13,
    letterSpacing: 1.2,
    color: '#cfc7d8',
    textShadow: '1px 1px 0 #000',
  },
  btnRevealTopEmergency: {
    color: '#FFEAA7',
    fontSize: 15,
    letterSpacing: 1.6,
    textShadow: '0 0 10px #FF6B6B, 2px 2px 0 #000',
  },
  btnRevealSub: {
    fontSize: 11, letterSpacing: 1, color: '#FFEAA7',
    minWidth: 128,
    background: 'rgba(7,4,18,0.72)',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(253,203,110,0.45)',
    padding: '2px 10px', borderRadius: 10,
    textAlign: 'center',
    textShadow: '1px 1px 0 #000',
  },
  btnRevealSubMuted: {
    fontSize: 10,
    color: '#d6cfe8',
    borderColor: 'rgba(255,255,255,0.14)',
    background: 'rgba(7,4,18,0.52)',
  },
  mpProgressBar: {
    position: 'absolute', left: 6, bottom: 4,
    height: 3,
    background: 'linear-gradient(90deg,#a55eea,#FDCB6E)',
    borderRadius: 2,
    boxShadow: '0 0 4px #a55eea',
    transition: 'width 0.2s',
  },
  btnUltiPng: {
    flex: '0 0 64px', width: 64, height: 64,
    backgroundColor: 'transparent',
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
    border: 'none', padding: 0,
    cursor: 'pointer',
    position: 'relative',
    fontFamily: 'inherit',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.65))',
  },
  btnUltiBar: {
    position: 'absolute',
    left: 6, right: 6, bottom: 4,
    height: 5,
    background: 'rgba(0,0,0,0.7)',
    border: '1px solid rgba(253,203,110,0.5)',
    borderRadius: 3, overflow: 'hidden',
  },
  btnUltiBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg,#FDCB6E,#FF7675,#FD79A8)',
    boxShadow: '0 0 4px #FDCB6E',
  },
  controlRow: { display: 'flex', gap: 10, marginTop: 6, justifyContent: 'flex-end' },
  miniBtn: {
    background: 'linear-gradient(180deg,#3a2d5c,#1a1230)',
    borderWidth: 1, borderStyle: 'solid', borderColor: '#4a3a6e',
    color: '#FFEAA7', fontFamily: 'inherit', fontWeight: 'bold',
    fontSize: 10, padding: '4px 9px', borderRadius: 4, cursor: 'pointer',
    minWidth: 50, letterSpacing: 1,
    boxShadow: 'inset 0 1px 0 rgba(255,234,167,0.15), 0 1px 0 rgba(0,0,0,0.6)',
  },
  miniBtnActive: {
    background: 'linear-gradient(180deg,#7B2D8E,#3a0d4e)',
    borderColor: '#a55eea', color: '#FFEAA7',
    boxShadow: 'inset 0 1px 0 rgba(253,121,168,0.4), 0 0 8px rgba(165,94,234,0.5)',
  },
  autoChip: {
    background: 'rgba(123,45,142,0.85)',
    border: '1px solid #a55eea', borderRadius: 10,
    color: '#FFEAA7', fontSize: 9, fontWeight: 'bold',
    padding: '3px 7px', letterSpacing: 0.5,
  },
  speedChip: {
    background: 'rgba(214,48,49,0.7)',
    border: '1px solid #FDCB6E', borderRadius: 10,
    color: '#FFEAA7', fontSize: 9, fontWeight: 'bold',
    padding: '3px 7px', letterSpacing: 0.5,
  },
  relicModal: {
    position: 'absolute', inset: 0, zIndex: 90,
    background: 'rgba(5,3,15,0.78)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: 18,
  },
  relicTitle: {
    color: '#FFEAA7', fontSize: 22, marginBottom: 4,
    textShadow: '2px 2px 0 #000', letterSpacing: 3,
  },
  relicHint: {
    color: '#FD79A8', fontSize: 11, letterSpacing: 2, marginBottom: 18,
  },
  relicChoices: { display: 'flex', gap: 10 },
  relicCard: {
    flex: 1, maxWidth: 115, minHeight: 175,
    background: 'linear-gradient(180deg,#2a1840,#15082a)',
    border: '2px solid #a55eea', borderRadius: 7,
    padding: '10px 6px', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    boxShadow: '0 0 12px rgba(165,94,234,0.4)',
    fontFamily: 'inherit', color: 'inherit',
  },
  relicIcon: { fontSize: 32, marginBottom: 6 },
  relicName: { fontSize: 12, fontWeight: 'bold', color: '#FFEAA7', marginBottom: 6, letterSpacing: 1 },
  relicDesc: { fontSize: 10, color: '#eaeaea', lineHeight: 1.4, padding: '0 4px', textAlign: 'center' },
  eventIcon: { fontSize: 56, marginBottom: 8, textShadow: '0 0 18px rgba(253,203,110,0.7)' },
  eventTitle: {
    color: '#FFEAA7', fontSize: 22, marginBottom: 12,
    textShadow: '2px 2px 0 #000', letterSpacing: 3,
  },
  eventDesc: {
    color: '#eaeaea', fontSize: 13, lineHeight: 1.6, marginBottom: 22,
    padding: '0 24px', textAlign: 'center', maxWidth: 320,
  },
  eventBtnRow: { display: 'flex', gap: 12 },
  eventAccept: {
    padding: '11px 22px', fontSize: 13, fontWeight: 'bold', letterSpacing: 1,
    background: 'linear-gradient(180deg,#D63031,#7a1818)',
    border: '2px solid #FDCB6E', borderRadius: 5,
    color: '#fff', fontFamily: 'inherit',
    boxShadow: '0 3px 0 #4a0a0a, 0 0 14px rgba(253,121,168,0.4)',
  },
  eventDecline: {
    padding: '11px 22px', fontSize: 13, fontWeight: 'bold', letterSpacing: 1,
    background: 'linear-gradient(180deg,#3a3050,#1a1428)',
    border: '2px solid #4a3a6e', borderRadius: 5,
    color: '#aaa', fontFamily: 'inherit', cursor: 'pointer',
  },
  eventDeclineWeak: {
    padding: '8px 14px', fontSize: 11, fontWeight: 'normal', letterSpacing: 0.5,
    background: 'transparent',
    border: 'none',
    color: '#666', fontFamily: 'inherit', cursor: 'pointer',
    textDecoration: 'underline',
  },
  ftueHint: {
    position: 'absolute',
    left: '50%', bottom: 165,
    transform: 'translateX(-50%)',
    color: '#FFEAA7',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    padding: '6px 14px',
    background: 'rgba(0,0,0,0.7)',
    border: '1px solid #FDCB6E',
    borderRadius: 14,
    pointerEvents: 'none',
    zIndex: 12,
    textShadow: '1px 1px 0 #000',
    boxShadow: '0 0 10px rgba(253,203,110,0.5)',
    animation: 'ftueHintAnim 1s infinite',
    whiteSpace: 'nowrap',
  },
};
