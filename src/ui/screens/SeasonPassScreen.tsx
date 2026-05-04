import { useEffect, useMemo, useState } from 'react';
import { useSaveStore } from '../../store/useSaveStore';
import {
  SEASON_PASS_TIERS, SEASON_PASS_TIER_COUNT, SEASON_PASS_XP_PER_TIER,
  tierFromXp, daysUntilSeasonEnd, currentSeasonId, currentCycleIndex, currentSeasonWeek,
} from '../../game/data/seasonPass';
import { getSeasonStory } from '../../game/data/seasonStories';
import { SEASON_MAIN_STORIES } from '../../game/data/seasonMainStories';
import { SEASONAL_BOSSES } from '../../game/data/seasonalBosses';

interface Props { onBack: () => void; onGoShop: () => void }

/**
 * P0-2 시즌 패스 — 무료/유료 듀얼 트랙. 30티어.
 */
export function SeasonPassScreen({ onBack, onGoShop }: Props) {
  const sp = useSaveStore((s) => s.seasonPass);
  const claimSeasonReward = useSaveStore((s) => s.claimSeasonReward);
  const ensureCurrentSeason = useSaveStore((s) => s.ensureCurrentSeason);

  useEffect(() => { ensureCurrentSeason(); }, [ensureCurrentSeason]);

  const reachedTier = useMemo(() => tierFromXp(sp.xp), [sp.xp]);
  const xpInCurrent = sp.xp - reachedTier * SEASON_PASS_XP_PER_TIER;
  const xpToNext = SEASON_PASS_XP_PER_TIER - xpInCurrent;
  const daysLeft = daysUntilSeasonEnd();
  const story = useMemo(() => getSeasonStory(sp.seasonId), [sp.seasonId]);

  return (
    <div style={s.root}>
      <div style={s.header}>
        <button style={s.back} onClick={onBack}>← 뒤로</button>
        <div style={s.title}>시즌 패스</div>
        <div style={s.season}>{currentSeasonId()}</div>
      </div>

      {/* W7 시즌 일화 — 컨셉 / 마왕 한 줄 */}
      <div style={{ ...s.story, borderColor: story.themeColor }}>
        <div style={{ ...s.storyName, color: story.themeColor }}>{story.name}</div>
        <div style={s.storySub}>{story.subtitle}</div>
        <div style={s.storyLine}>{story.greeting}</div>
      </div>

      {/* 5차 — 시즌 메인 스토리 + 시즌 보스 */}
      <SeasonMainStorySection />
      <SeasonalBossSection />

      <div style={s.summary}>
        <div style={s.row1}>
          <span>티어 {reachedTier} / {SEASON_PASS_TIER_COUNT}</span>
          <span>{daysLeft}일 남음</span>
        </div>
        <div style={s.bar}>
          <div style={{ ...s.barFill, width: `${(xpInCurrent / SEASON_PASS_XP_PER_TIER) * 100}%` }} />
        </div>
        <div style={s.row2}>다음 티어까지 {xpToNext} XP</div>
        {!sp.premium && (
          <button style={s.premiumBtn} onClick={onGoShop}>
            🎫 프리미엄 트랙 활성화 (보물고)
          </button>
        )}
      </div>

      <div style={s.tierList}>
        <div style={s.legend}>
          <span style={s.legendFree}>무료</span>
          <span style={s.legendPrem}>{sp.premium ? '프리미엄 ON' : '프리미엄 OFF'}</span>
        </div>
        {SEASON_PASS_TIERS.map((t) => {
          const reached = t.tier <= reachedTier;
          const freeClaimed = sp.claimedFreeTiers.includes(t.tier);
          const premiumClaimed = sp.claimedPremiumTiers.includes(t.tier);
          return (
            <div key={t.tier} style={{ ...s.tierRow, ...(reached ? s.tierReached : {}) }}>
              <div style={s.tierIdx}>T{t.tier}</div>
              <button
                style={{ ...s.rewardCell, ...(freeClaimed ? s.claimed : {}), ...(reached && !freeClaimed ? s.claimable : {}) }}
                disabled={!reached || freeClaimed}
                onClick={() => claimSeasonReward(t.tier, 'free')}
              >
                <div style={s.rewardLbl}>{t.free.label}</div>
                <div style={s.trackLbl}>무료</div>
                {freeClaimed && <div style={s.checked}>✓</div>}
              </button>
              <button
                style={{
                  ...s.rewardCell,
                  ...(premiumClaimed ? s.claimed : {}),
                  ...(reached && !premiumClaimed && sp.premium ? s.claimable : {}),
                  ...(sp.premium ? {} : s.lockedCell),
                }}
                disabled={!reached || premiumClaimed || !sp.premium}
                onClick={() => claimSeasonReward(t.tier, 'premium')}
              >
                <div style={s.rewardLbl}>{t.premium.label}</div>
                <div style={s.trackLbl}>{sp.premium ? '프리미엄' : '🔒 프리미엄'}</div>
                {premiumClaimed && <div style={s.checked}>✓</div>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 5차 — 시즌 메인 스토리 4주차 카드 + 컷씬 모달 */
function SeasonMainStorySection() {
  const cycle = currentCycleIndex();
  const week = currentSeasonWeek();
  const seasonId = currentSeasonId();
  const seenList = useSaveStore((s) => s.seasonStoryEpisodesSeen);
  const markSeen = useSaveStore((s) => s.markSeasonEpisodeSeen);
  const [openWeek, setOpenWeek] = useState<1 | 2 | 3 | 4 | null>(null);

  const episodes = useMemo(
    () => SEASON_MAIN_STORIES.filter((e) => e.seasonCycle === cycle).sort((a, b) => a.week - b.week),
    [cycle],
  );

  const ep = openWeek ? episodes.find((e) => e.week === openWeek) : null;

  return (
    <div style={s.mainStoryRoot}>
      <div style={s.sectionLbl}>📖 시즌 메인 스토리</div>
      <div style={s.weekGrid}>
        {episodes.map((e) => {
          const unlocked = e.week <= week;
          const seenKey = `${seasonId}:w${e.week}`;
          const seen = seenList.includes(seenKey);
          return (
            <button
              key={e.week}
              style={{
                ...s.weekCard,
                opacity: unlocked ? 1 : 0.4,
                borderColor: seen ? '#7BC67E' : (unlocked ? '#FDCB6E' : '#4a3a6e'),
              }}
              disabled={!unlocked}
              onClick={() => setOpenWeek(e.week)}
            >
              <div style={s.weekIdx}>W{e.week}</div>
              <div style={s.weekTitle}>{e.title}</div>
              {seen && <div style={s.weekSeen}>✓</div>}
            </button>
          );
        })}
      </div>
      {ep && (
        <div style={s.modalRoot} onClick={() => setOpenWeek(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHead}>{ep.title}</div>
            {ep.panels.map((p, i) => (
              <div key={i} style={{ ...s.panel, background: p.bg }}>
                <div style={{ fontSize: 28 }}>{p.icon}</div>
                {p.title && <div style={{ fontSize: 11, color: '#bbb', marginBottom: 4 }}>{p.title}</div>}
                <div style={{ fontSize: 12, color: p.color || '#FFEAA7', whiteSpace: 'pre-line', lineHeight: 1.6 }}>{p.body}</div>
              </div>
            ))}
            <div style={s.missionsHead}>주차 미션</div>
            {ep.missions.map((m) => (
              <div key={m.id} style={s.missionRow}>
                <span>{m.label}</span>
                <span style={{ color: '#FDCB6E' }}>+{m.rewardStones}</span>
              </div>
            ))}
            <div style={s.weekClearReward}>주차 종결 보상: {ep.weekClearReward}</div>
            <button
              style={s.modalBtn}
              onClick={() => {
                markSeen(seasonId, openWeek!);
                setOpenWeek(null);
              }}
            >확인</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** 5차 — 현재 시즌의 시즌 보스 카드 */
function SeasonalBossSection() {
  const cycle = currentCycleIndex();
  const killed = useSaveStore((s) => s.seasonalBossesKilled);
  const sb = SEASONAL_BOSSES.find((b) => b.cycleIndex === cycle);
  if (!sb) return null;
  const isKilled = killed.includes(sb.id);
  return (
    <div style={s.seasonalBossRoot}>
      <div style={s.sectionLbl}>👹 시즌 보스</div>
      <div style={{ ...s.bossCard, borderColor: isKilled ? '#7BC67E' : '#FF6B6B' }}>
        {sb.spriteId && (
          <img
            src={`/sprites/${sb.spriteId}.png`}
            alt={sb.name}
            width={64}
            height={64}
            style={{ imageRendering: 'pixelated', display: 'block', margin: '0 auto 6px' }}
          />
        )}
        <div style={s.bossName}>{sb.name}</div>
        <div style={s.bossEpithet}>{sb.epithet}</div>
        <div style={s.bossLine}>"{sb.entranceLine}"</div>
        <div style={s.bossInfo}>
          📍 일일 도전 모드 W{sb.spawnWave} 등장
        </div>
        <div style={s.bossReward}>
          🪙 영혼석 +{sb.reward.stones}
          {sb.reward.titleId ? ' / 칭호' : ''}
          {sb.reward.recruitId ? ` / 모집: ${sb.reward.recruitId}` : ''}
          {sb.reward.interiorId ? ' / 인테리어' : ''}
        </div>
        {isKilled && <div style={s.bossKilled}>✓ 처치 완료</div>}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { position: 'absolute', inset: 0, background: '#0a0820', color: '#FFEAA7', padding: 12, overflow: 'auto' },
  header: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  back: { background: 'transparent', border: '1px solid #4a3a6e', color: '#FFEAA7', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' },
  title: { flex: 1, fontSize: 18, fontWeight: 'bold', letterSpacing: 4, color: '#FDCB6E', textAlign: 'center' },
  season: { fontSize: 10, color: '#a55eea', minWidth: 70, textAlign: 'right' },
  story: { background: 'rgba(20,12,42,0.7)', border: '1.5px solid #4a3a6e', borderRadius: 6, padding: 10, marginBottom: 8 },
  storyName: { fontSize: 13, fontWeight: 'bold' },
  storySub: { fontSize: 9, color: '#bbb', marginTop: 2 },
  storyLine: { fontSize: 11, color: '#FFEAA7', marginTop: 6, fontStyle: 'italic', lineHeight: 1.5 },
  summary: { background: 'rgba(20,12,42,0.7)', border: '1px solid #4a3a6e', borderRadius: 6, padding: 10, marginBottom: 10 },
  row1: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#FDCB6E', marginBottom: 4 },
  row2: { fontSize: 9, color: '#bbb', marginTop: 4, textAlign: 'right' },
  bar: { height: 8, background: 'rgba(0,0,0,0.5)', borderRadius: 4, overflow: 'hidden', border: '1px solid #4a3a6e' },
  barFill: { height: '100%', background: 'linear-gradient(90deg,#FDCB6E,#FF6B6B)', transition: 'width 0.3s' },
  premiumBtn: { width: '100%', marginTop: 8, padding: '8px', background: 'linear-gradient(180deg,#FDCB6E,#D63031)', border: 'none', color: '#fff', borderRadius: 4, fontWeight: 'bold', fontFamily: 'inherit', cursor: 'pointer' },
  tierList: { display: 'flex', flexDirection: 'column', gap: 4 },
  legend: { display: 'flex', justifyContent: 'space-around', fontSize: 9, padding: '4px 0', color: '#bbb' },
  legendFree: {},
  legendPrem: { color: '#FDCB6E' },
  tierRow: { display: 'grid', gridTemplateColumns: '32px 1fr 1fr', gap: 4, alignItems: 'stretch' },
  tierReached: { opacity: 1 },
  tierIdx: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 'bold', color: '#FD79A8', background: 'rgba(20,12,42,0.5)', border: '1px solid #4a3a6e', borderRadius: 4 },
  rewardCell: {
    position: 'relative', background: 'rgba(30,20,60,0.5)', border: '1px solid #4a3a6e', borderRadius: 4,
    padding: '6px 8px', color: '#FFEAA7', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer',
    minHeight: 36,
  },
  claimable: { borderColor: '#FDCB6E', boxShadow: '0 0 6px rgba(253,203,110,0.5)' },
  claimed: { opacity: 0.4 },
  lockedCell: { opacity: 0.5, cursor: 'not-allowed' },
  rewardLbl: { fontSize: 10, fontWeight: 'bold' },
  trackLbl: { fontSize: 8, color: '#bbb', marginTop: 2 },
  checked: { position: 'absolute', top: 2, right: 4, color: '#7BC67E', fontWeight: 'bold' },
  // 5차 — Season Main Story
  mainStoryRoot: { background: 'rgba(20,12,42,0.6)', border: '1px solid #4a3a6e', borderRadius: 6, padding: 10, marginBottom: 8 },
  sectionLbl: { fontSize: 11, fontWeight: 'bold', color: '#a55eea', marginBottom: 8 },
  weekGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
  weekCard: { position: 'relative', background: 'rgba(30,20,60,0.6)', border: '1.5px solid #4a3a6e', borderRadius: 4, padding: '8px 6px', textAlign: 'left', color: '#FFEAA7', fontFamily: 'inherit', cursor: 'pointer', minHeight: 50 },
  weekIdx: { fontSize: 9, color: '#FD79A8', fontWeight: 'bold' },
  weekTitle: { fontSize: 10, marginTop: 4, lineHeight: 1.3 },
  weekSeen: { position: 'absolute', top: 4, right: 6, color: '#7BC67E', fontWeight: 'bold' },
  modalRoot: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  modal: { background: '#0a0820', border: '2px solid #4a3a6e', borderRadius: 8, padding: 16, maxWidth: 360, width: '100%', maxHeight: '90vh', overflowY: 'auto' },
  modalHead: { fontSize: 14, fontWeight: 'bold', color: '#FDCB6E', marginBottom: 10, textAlign: 'center' },
  panel: { padding: 14, marginBottom: 8, borderRadius: 6, textAlign: 'center' },
  missionsHead: { fontSize: 11, color: '#a55eea', marginTop: 12, marginBottom: 6 },
  missionRow: { display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '4px 0', borderBottom: '1px solid rgba(74,58,110,0.3)' },
  weekClearReward: { fontSize: 10, color: '#FDCB6E', marginTop: 8, padding: '6px 8px', background: 'rgba(253,203,110,0.1)', borderRadius: 4 },
  modalBtn: { width: '100%', marginTop: 10, padding: 10, background: '#FDCB6E', color: '#0a0820', border: 'none', borderRadius: 4, fontWeight: 'bold', fontFamily: 'inherit', cursor: 'pointer' },
  // 5차 — Seasonal Boss
  seasonalBossRoot: { background: 'rgba(20,12,42,0.6)', border: '1px solid #4a3a6e', borderRadius: 6, padding: 10, marginBottom: 10 },
  bossCard: { background: 'rgba(40,20,30,0.7)', border: '1.5px solid #FF6B6B', borderRadius: 6, padding: 10 },
  bossName: { fontSize: 14, fontWeight: 'bold', color: '#FF6B6B' },
  bossEpithet: { fontSize: 10, color: '#bbb', marginTop: 2 },
  bossLine: { fontSize: 10, color: '#FFEAA7', fontStyle: 'italic', marginTop: 6, lineHeight: 1.5 },
  bossInfo: { fontSize: 9, color: '#a55eea', marginTop: 6 },
  bossReward: { fontSize: 9, color: '#FDCB6E', marginTop: 4 },
  bossKilled: { fontSize: 11, color: '#7BC67E', fontWeight: 'bold', marginTop: 8, textAlign: 'center' },
};
