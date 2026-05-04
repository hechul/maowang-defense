import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { CastleHubScreen } from './ui/screens/CastleHubScreen';
import { PrivacyScreen } from './ui/screens/PrivacyScreen';
import { SupportScreen } from './ui/screens/SupportScreen';
import { LoadingScreen } from './ui/components/LoadingScreen';
import { IntroCutscene } from './ui/components/IntroCutscene';
import { useSaveStore } from './store/useSaveStore';
import type { GameOverStats } from './game/GameEngine';

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
        {/* MVP: 회상/스토리 컷씬은 도감에서 보관하고, 허브/전투 진입 흐름은 막지 않는다. */}
      </div>
    </div>
  );
}
