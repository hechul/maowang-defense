import { lazy, Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { CastleHubScreen } from './ui/screens/CastleHubScreen';
import { PrivacyScreen } from './ui/screens/PrivacyScreen';
import { SupportScreen } from './ui/screens/SupportScreen';
import { LoadingScreen } from './ui/components/LoadingScreen';
import { IntroCutscene } from './ui/components/IntroCutscene';
import { CutsceneOverlay } from './ui/components/CutsceneOverlay';
import { useSaveStore } from './store/useSaveStore';
import type { GameOverStats } from './game/GameEngine';
import { findCutscene } from './game/data/cutscenes';
import { progressInLevel } from './game/data/demonLevel';

// 코드 스플리팅 (AIT §번들 최적화):
// - 전투/스테이지/모집/스킬트리/도감 등 모두 lazy import
// - 허브/검수 페이지만 메인 번들에 포함 (진입 즉시 렌더 필요)
const GameScreen = lazy(() => import('./ui/screens/GameScreen').then(m => ({ default: m.GameScreen })));
const StageSelectScreen = lazy(() => import('./ui/screens/StageSelectScreen').then(m => ({ default: m.StageSelectScreen })));
const RecruitScreen = lazy(() => import('./ui/screens/RecruitScreen').then(m => ({ default: m.RecruitScreen })));
const SkillTreeScreen = lazy(() => import('./ui/screens/SkillTreeScreen').then(m => ({ default: m.SkillTreeScreen })));
const BestiaryScreen = lazy(() => import('./ui/screens/BestiaryScreen').then(m => ({ default: m.BestiaryScreen })));
const ResultScreen = lazy(() => import('./ui/screens/ResultScreen').then(m => ({ default: m.ResultScreen })));
const AchievementsScreen = lazy(() => import('./ui/screens/AchievementsScreen').then(m => ({ default: m.AchievementsScreen })));
const LeaderboardScreen = lazy(() => import('./ui/screens/LeaderboardScreen').then(m => ({ default: m.LeaderboardScreen })));
const ChallengesScreen = lazy(() => import('./ui/screens/ChallengesScreen').then(m => ({ default: m.ChallengesScreen })));
const MissionsScreen = lazy(() => import('./ui/screens/MissionsScreen').then(m => ({ default: m.MissionsScreen })));
const ShopScreen = lazy(() => import('./ui/screens/ShopScreen').then(m => ({ default: m.ShopScreen })));
const InteriorScreen = lazy(() => import('./ui/screens/InteriorScreen').then(m => ({ default: m.InteriorScreen })));
const DeckScreen = lazy(() => import('./ui/screens/DeckScreen').then(m => ({ default: m.DeckScreen })));
const SeasonPassScreen = lazy(() => import('./ui/screens/SeasonPassScreen').then(m => ({ default: m.SeasonPassScreen })));
const DailyChallengeScreen = lazy(() => import('./ui/screens/DailyChallengeScreen').then(m => ({ default: m.DailyChallengeScreen })));
const DemonSelectScreen = lazy(() => import('./ui/screens/DemonSelectScreen').then(m => ({ default: m.DemonSelectScreen })));
const CardEnhanceScreen = lazy(() => import('./ui/screens/CardEnhanceScreen').then(m => ({ default: m.CardEnhanceScreen })));
const InboxScreen = lazy(() => import('./ui/screens/InboxScreen').then(m => ({ default: m.InboxScreen })));
const AsyncPvpScreen = lazy(() => import('./ui/screens/AsyncPvpScreen').then(m => ({ default: m.AsyncPvpScreen })));
const FriendsScreen = lazy(() => import('./ui/screens/FriendsScreen').then(m => ({ default: m.FriendsScreen })));
const EventsScreen = lazy(() => import('./ui/screens/EventsScreen').then(m => ({ default: m.EventsScreen })));
const ThroneRoomScreen = lazy(() => import('./ui/screens/ThroneRoomScreen').then(m => ({ default: m.ThroneRoomScreen })));
const MemoryGameScreen = lazy(() => import('./ui/screens/MemoryGameScreen').then(m => ({ default: m.MemoryGameScreen })));

export type ScreenId =
  | 'title'
  | 'castleHub'
  | 'stageSelect'
  | 'recruit'
  | 'game'
  | 'result'
  | 'skills'
  | 'bestiary'
  | 'achievements'
  | 'stats'
  | 'leaderboard'
  | 'challenges'
  | 'missions'
  | 'shop'
  | 'interior'
  | 'deck'
  | 'seasonPass'
  | 'daily'
  | 'demonSelect'
  | 'cardEnhance'
  | 'inbox'
  | 'pvp'
  | 'friends'
  | 'events'
  | 'throneRoom'
  | 'memoryGame'
  | 'privacy'
  | 'support';

export default function App() {
  const runs = useSaveStore((s) => s.runs);
  const introSeen = useSaveStore((s) => s.tutorialSeen.includes('intro'));
  const markSeen = useSaveStore((s) => s.markTutorialSeen);
  const setCurrentStageId = useSaveStore((s) => s.setCurrentStageId);
  const [showIntro, setShowIntro] = useState(runs === 0 && !introSeen);
  const [screen, setScreen] = useState<ScreenId>('castleHub');
  const [lastResult, setLastResult] = useState<GameOverStats | null>(null);
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'stage' | 'endless' | 'daily'>('endless');

  // P2-1: 컷씬 자동 트리거
  const clearedStages = useSaveStore((s) => s.clearedStages);
  const demonExp = useSaveStore((s) => s.demonExp);
  const cutscenesSeen = useSaveStore((s) => s.cutscenesSeen);
  const markCutsceneSeen = useSaveStore((s) => s.markCutsceneSeen);
  const bossFirstKillSeen = useSaveStore((s) => s.bossFirstKillSeen);
  const pendingCutsceneId = useMemo(() => {
    // [W5] 챕터 시작 컷씬 — 그 챕터 어떤 스테이지든 클리어한 적 있으면 = 진입했음
    const chapterStartTriggers: { chapter: string; csId: string; firstStage: string }[] = [
      { chapter: 'ch1', csId: 'cs_ch1_start', firstStage: 'ch1_s1' },
      { chapter: 'ch2', csId: 'cs_ch2_start', firstStage: 'ch2_s1' },
      { chapter: 'ch3', csId: 'cs_ch3_start', firstStage: 'ch3_s1' },
      { chapter: 'ch4', csId: 'cs_ch4_start', firstStage: 'ch4_s1' },
      { chapter: 'ch5', csId: 'cs_ch5_start', firstStage: 'ch5_s1' },
      { chapter: 'ch6', csId: 'cs_ch6_start', firstStage: 'ch6_s1' },
    ];
    for (const t of chapterStartTriggers) {
      // 그 챕터의 어떤 스테이지든 클리어 = 진입한 적 있음
      const hasEntered = clearedStages.some((sid) => sid.startsWith(t.chapter + '_'));
      if (hasEntered && !cutscenesSeen.includes(t.csId)) return t.csId;
    }
    // N4 보스 첫 처치 컷씬 — 5편
    const bossRecallTriggers: { boss: string; csId: string }[] = [
      { boss: 'captain',  csId: 'cs_boss_recall_captain' },
      { boss: 'archmage', csId: 'cs_boss_recall_archmage' },
      { boss: 'saint',    csId: 'cs_boss_recall_saint' },
      { boss: 'king',     csId: 'cs_boss_recall_king' },
      { boss: 'priest',   csId: 'cs_boss_recall_priest' },
    ];
    for (const t of bossRecallTriggers) {
      if (bossFirstKillSeen.includes(t.boss) && !cutscenesSeen.includes(t.csId)) return t.csId;
    }
    // chapter clear 컷씬 — 마지막 스테이지 클리어 직후
    const chapterFinals: Record<string, string> = {
      ch1_s5: 'cs_ch1_clear', ch2_s5: 'cs_ch2_clear', ch3_s5: 'cs_ch3_clear',
      ch4_s5: 'cs_ch4_clear', ch5_s5: 'cs_ch5_clear', ch6_s5: 'cs_ch6_clear',
    };
    for (const [stage, csId] of Object.entries(chapterFinals)) {
      if (clearedStages.includes(stage) && !cutscenesSeen.includes(csId)) return csId;
    }
    // 마왕 레벨 마일스톤
    const lv = progressInLevel(demonExp).level;
    const lvMilestones: { lv: number; cs: string }[] = [
      { lv: 50, cs: 'cs_demon_level_50' },
      { lv: 25, cs: 'cs_demon_level_25' },
      { lv: 10, cs: 'cs_demon_level_10' },
    ];
    for (const m of lvMilestones) {
      if (lv >= m.lv && !cutscenesSeen.includes(m.cs)) return m.cs;
    }
    return null;
  }, [clearedStages, demonExp, cutscenesSeen, bossFirstKillSeen]);
  const pendingCutscene = pendingCutsceneId ? findCutscene(pendingCutsceneId.includes(':') ? pendingCutsceneId : (() => {
    const c = pendingCutsceneId;
    // 매핑 — id로 조회
    return (c === 'cs_ch1_start' ? 'chapter_start:ch1' :
            c === 'cs_ch2_start' ? 'chapter_start:ch2' :
            c === 'cs_ch3_start' ? 'chapter_start:ch3' :
            c === 'cs_ch4_start' ? 'chapter_start:ch4' :
            c === 'cs_ch5_start' ? 'chapter_start:ch5' :
            c === 'cs_ch6_start' ? 'chapter_start:ch6' :
            c === 'cs_ch1_clear' ? 'chapter_clear:ch1' :
            c === 'cs_ch2_clear' ? 'chapter_clear:ch2' :
            c === 'cs_ch3_clear' ? 'chapter_clear:ch3' :
            c === 'cs_ch4_clear' ? 'chapter_clear:ch4' :
            c === 'cs_ch5_clear' ? 'chapter_clear:ch5' :
            c === 'cs_ch6_clear' ? 'chapter_clear:ch6' :
            c === 'cs_boss_recall_captain' ? 'boss_first_kill:captain' :
            c === 'cs_boss_recall_archmage' ? 'boss_first_kill:archmage' :
            c === 'cs_boss_recall_saint' ? 'boss_first_kill:saint' :
            c === 'cs_boss_recall_king' ? 'boss_first_kill:king' :
            c === 'cs_boss_recall_priest' ? 'boss_first_kill:priest' :
            c === 'cs_demon_level_10' ? 'demon_level:10' :
            c === 'cs_demon_level_25' ? 'demon_level:25' :
            c === 'cs_demon_level_50' ? 'demon_level:50' : '');
  })()) : null;

  // GameScreen mount/unmount 폭주 방지: 콜백 안정화
  const handleGameOver = useCallback((s: GameOverStats) => {
    setLastResult(s);
    setScreen('result');
  }, []);
  const goHub = useCallback(() => setScreen('castleHub'), []);
  const startChallenge = useCallback((id: string) => {
    setActiveChallengeId(id);
    setActiveStageId(null);
    setActiveMode('endless');
    setScreen('game');
  }, []);
  const startStage = useCallback((id: string) => {
    setActiveStageId(id);
    setActiveChallengeId(null);
    setActiveMode('stage');
    setCurrentStageId(id);
    setScreen('game');
  }, [setCurrentStageId]);
  const startEndless = useCallback(() => {
    setActiveChallengeId(null);
    setActiveStageId(null);
    setActiveMode('endless');
    setScreen('game');
  }, []);
  const startDaily = useCallback(() => {
    setActiveChallengeId(null);
    setActiveStageId(null);
    setActiveMode('daily');
    setScreen('game');
  }, []);

  // 백그라운드 → 포그라운드 전환 처리 (AIT §검수영역3)
  useEffect(() => {
    const onVisibilityChange = () => {
      // AudioContext resume은 AudioEngine 내부에서 처리됨
      // 게임 상태 보존은 zustand store에서 자동
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  return (
    <div id="wrap">
      <div id="stage">
        {showIntro && (
          <IntroCutscene
            onDone={() => {
              markSeen('intro');
              setShowIntro(false);
            }}
          />
        )}
        {!showIntro && screen === 'castleHub' && <CastleHubScreen onNavigate={(s) => {
          if ((s as string) === 'game') startEndless();
          else setScreen(s);
        }} />}
        {!showIntro && screen === 'privacy' && <PrivacyScreen onBack={goHub} />}
        {!showIntro && screen === 'support' && <SupportScreen onBack={goHub} />}
        <Suspense fallback={<LoadingScreen />}>
          {/* 옛 'title' 라우팅은 castleHub로 폴백 — TitleScreen은 데드코드 정리됨 */}
          {screen === 'title' && <CastleHubScreen onNavigate={(s) => {
            if ((s as string) === 'game') startEndless();
            else setScreen(s);
          }} />}
          {screen === 'stageSelect' && <StageSelectScreen
            onBack={goHub}
            onStartStage={startStage}
            onStartEndless={startEndless}
          />}
          {screen === 'recruit' && <RecruitScreen
            onBack={goHub}
            onGoStageSelect={() => setScreen('stageSelect')}
          />}
          {screen === 'game' && <GameScreen
            onGameOver={handleGameOver}
            challengeId={activeChallengeId}
            stageId={activeStageId}
            mode={activeMode}
          />}
          {screen === 'result' && <ResultScreen
            stats={lastResult}
            onNavigate={setScreen}
            onStartStage={startStage}
            onRetryStage={startStage}
          />}
          {screen === 'skills' && <SkillTreeScreen onBack={goHub} />}
          {screen === 'bestiary' && <BestiaryScreen onBack={goHub} onGoRecruit={() => setScreen('recruit')} />}
          {screen === 'achievements' && <AchievementsScreen onBack={goHub} />}
          {screen === 'leaderboard' && <LeaderboardScreen onBack={goHub} />}
          {screen === 'challenges' && <ChallengesScreen onBack={goHub} onStart={startChallenge} />}
          {screen === 'missions' && <MissionsScreen onBack={goHub} />}
          {screen === 'shop' && <ShopScreen onBack={goHub} />}
          {screen === 'interior' && <InteriorScreen onBack={goHub} />}
          {screen === 'deck' && <DeckScreen onBack={goHub} />}
          {screen === 'seasonPass' && <SeasonPassScreen onBack={goHub} onGoShop={() => setScreen('shop')} />}
          {screen === 'daily' && <DailyChallengeScreen onBack={goHub} onStart={startDaily} />}
          {screen === 'demonSelect' && <DemonSelectScreen onBack={goHub} />}
          {screen === 'cardEnhance' && <CardEnhanceScreen onBack={goHub} />}
          {screen === 'inbox' && <InboxScreen onBack={goHub} />}
          {screen === 'pvp' && <AsyncPvpScreen onBack={goHub} />}
          {screen === 'friends' && <FriendsScreen onBack={goHub} />}
          {screen === 'events' && <EventsScreen onBack={goHub} />}
          {screen === 'throneRoom' && <ThroneRoomScreen onBack={goHub} />}
          {screen === 'memoryGame' && <MemoryGameScreen onBack={goHub} />}
        </Suspense>
        {/* P2-1 컷씬 — 허브에서만 자동 발동 (게임 중 방해 X) */}
        {pendingCutscene && screen === 'castleHub' && (
          <CutsceneOverlay
            cutscene={pendingCutscene}
            onDone={() => markCutsceneSeen(pendingCutscene.id)}
          />
        )}
      </div>
    </div>
  );
}
