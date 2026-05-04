import { useEffect, useMemo, useState } from 'react';
import { useSaveStore } from '../../store/useSaveStore';
import { pickOpponent, buildMatch, calcPvpScore, type PvpMatch } from '../../game/data/asyncPvp';
import { currentSeasonId } from '../../game/data/seasonPass';
import { getDemonChar } from '../../game/data/demonChars';
import { tierForScore, nextTier, PVP_TIERS } from '../../game/data/pvpTiers';

interface Props { onBack: () => void }

/**
 * P0-3 비동기 PvP — 자기 빌드 vs NPC 빌드 결과 비교.
 * 1일 5회 도전, 시즌별 점수 누적.
 */
export function AsyncPvpScreen({ onBack }: Props) {
  const snapshots = useSaveStore((s) => s.pvpSnapshots);
  const recordPvpResult = useSaveStore((s) => s.recordPvpResult);
  const incPvpDaily = useSaveStore((s) => s.incPvpDaily);
  const pvpRanks = useSaveStore((s) => s.pvpRanks);
  const pvpRecord = useSaveStore((s) => s.pvpRecord);
  const pvpDailyCount = useSaveStore((s) => s.pvpDailyCount);
  const cur = currentSeasonId();
  const today = new Date().toISOString().slice(0, 10);
  const remaining = 5 - (pvpDailyCount.date === today ? pvpDailyCount.count : 0);
  const myRank = pvpRanks[cur] ?? 0;
  const rec = pvpRecord[cur] ?? { wins: 0, losses: 0, draws: 0 };

  const [match, setMatch] = useState<PvpMatch | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [seasonReward, setSeasonReward] = useState<{ seasonId: string; tierName: string; stones: number; titleId?: string; interiorId?: string } | null>(null);
  const claimPvpSeasonRewards = useSaveStore((s) => s.claimPvpSeasonRewards);

  // 5차 — 진입 시 1회 시즌 종료 보상 자동 지급 검사
  useEffect(() => {
    const reward = claimPvpSeasonRewards();
    if (reward) setSeasonReward(reward);
  }, [claimPvpSeasonRewards]);

  const myLatest = snapshots[0] ?? null;

  const handleMatch = () => {
    if (!myLatest) {
      setResultMsg('먼저 한 번 침공을 끝내야 빌드 스냅샷이 생성됩니다.');
      return;
    }
    if (!incPvpDaily()) {
      setResultMsg('오늘 도전 횟수를 모두 사용했습니다 (5/5).');
      return;
    }
    const opp = pickOpponent(myLatest, String(Date.now()));
    const m = buildMatch(myLatest, opp);
    setMatch(m);
    const r = recordPvpResult(m.winner);
    setResultMsg(
      m.winner === 'me' ? `🏆 승리! 시즌 점수 +25 → ${r.newRank}` :
      m.winner === 'draw' ? `🤝 무승부 +5 → ${r.newRank}` :
      `💀 패배 -10 → ${r.newRank}`,
    );
  };

  return (
    <div style={s.root}>
      <div style={s.header}>
        <button style={s.back} onClick={onBack}>← 뒤로</button>
        <div style={s.title}>비동기 PvP</div>
        <div style={s.season}>{cur}</div>
      </div>

      <div style={s.summary}>
        <div style={s.tierRow}>
          <TierIcon tier={tierForScore(myRank)} large />
          <div style={s.tierInfo}>
            <div style={{ fontSize: 14, fontWeight: 'bold', color: tierForScore(myRank).color }}>
              {tierForScore(myRank).name}
            </div>
            {(() => {
              const nt = nextTier(myRank);
              if (!nt) return <div style={{ fontSize: 9, color: '#FDCB6E' }}>최고 등급 도달!</div>;
              return <div style={{ fontSize: 9, color: '#888' }}>다음: {nt.name} ({nt.minScore - myRank}점 부족)</div>;
            })()}
          </div>
          <div style={s.rank}>{myRank}</div>
        </div>
        <div style={s.row2}>
          <span>{rec.wins}승 / {rec.losses}패 / {rec.draws}무</span>
          <span>오늘 {remaining}회 남음</span>
        </div>
      </div>

      <PvpTiersBar score={myRank} />

      {seasonReward && (
        <div style={s.seasonReward}>
          🏆 지난 시즌({seasonReward.seasonId}) 종료 보상 — {seasonReward.tierName} 등급
          <br />
          🪙 영혼석 +{seasonReward.stones}
          {seasonReward.titleId ? ' / 칭호 획득' : ''}
          {seasonReward.interiorId ? ' / 인테리어 획득' : ''}
          <button style={s.dismissBtn} onClick={() => setSeasonReward(null)}>확인</button>
        </div>
      )}

      {!myLatest && (
        <div style={s.hint}>
          ⚠ 빌드 스냅샷이 없습니다. 한 번 침공을 끝내면 자동 저장됩니다.
        </div>
      )}

      {myLatest && !match && (
        <MyBuildCard snap={myLatest} />
      )}

      {match && (
        <MatchView m={match} />
      )}

      {resultMsg && (
        <div style={s.result}>{resultMsg}</div>
      )}

      <button
        style={{ ...s.matchBtn, ...(remaining <= 0 || !myLatest ? s.matchBtnDisabled : {}) }}
        disabled={remaining <= 0 || !myLatest}
        onClick={handleMatch}
      >
        ▶ 매칭 시작
      </button>

      {snapshots.length > 1 && (
        <div style={s.history}>
          <div style={s.historyLbl}>최근 빌드 ({snapshots.length})</div>
          {snapshots.slice(0, 5).map((sn) => (
            <div key={sn.id} style={s.histItem}>
              <span>{getDemonChar(sn.demonId).name}</span>
              <span>W{sn.wave} / 점수 {calcPvpScore(sn)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MyBuildCard({ snap }: { snap: ReturnType<typeof getLatest> }) {
  const dc = getDemonChar(snap.demonId);
  return (
    <div style={s.buildCard}>
      <div style={s.buildHead}>나의 최신 빌드</div>
      <div style={s.buildName}>{dc.name}</div>
      <div style={s.buildStats}>W{snap.wave} · {snap.kills} 처치 · {snap.durationSec}s</div>
      <div style={s.buildDeck}>덱: {snap.deckPreview.join(', ') || '(전체)'}</div>
      <div style={s.score}>점수 {calcPvpScore(snap)}</div>
    </div>
  );
}

function MatchView({ m }: { m: PvpMatch }) {
  return (
    <div style={s.matchRoot}>
      <BuildHalf snap={m.me} score={m.myScore} mine winner={m.winner === 'me'} />
      <div style={s.vs}>VS</div>
      <BuildHalf snap={m.opponent} score={m.oppScore} mine={false} winner={m.winner === 'opponent'} />
    </div>
  );
}

function BuildHalf({ snap, score, mine, winner }: {
  snap: PvpMatch['me'] | PvpMatch['opponent'];
  score: number;
  mine: boolean;
  winner: boolean;
}) {
  const dc = getDemonChar(snap.demonId);
  return (
    <div style={{ ...s.half, ...(winner ? s.halfWin : {}) }}>
      <div style={s.halfHead}>{mine ? '나' : snap.nickname}</div>
      <div style={s.halfName}>{dc.name}</div>
      <div style={s.halfStats}>
        W{snap.wave} · {snap.kills} 처치<br/>{snap.durationSec}s
      </div>
      <div style={s.halfScore}>{score}</div>
    </div>
  );
}

// helper for typing
function getLatest(): import('../../game/data/asyncPvp').PvpSnapshot {
  return useSaveStore.getState().pvpSnapshots[0]!;
}

/** PVP 등급 아이콘 — PNG sprite 우선, 없으면 이모지 fallback */
function TierIcon({ tier, large }: { tier: import('../../game/data/pvpTiers').PvpTierDef; large?: boolean }) {
  const size = large ? 28 : 18;
  if (tier.spriteId) {
    return (
      <img
        src={`/sprites/${tier.spriteId}.png`}
        alt={tier.name}
        width={size}
        height={size}
        style={{ imageRendering: 'pixelated', flexShrink: 0 }}
      />
    );
  }
  return (
    <span style={{ fontSize: large ? 24 : 14, color: tier.color, minWidth: large ? 28 : 18 }}>
      {tier.icon}
    </span>
  );
}

function PvpTiersBar({ score }: { score: number }) {
  const cur = tierForScore(score);
  return (
    <div style={s.tiersList}>
      <div style={{ fontSize: 9, color: '#a55eea', marginBottom: 4 }}>시즌 보상 등급표</div>
      {PVP_TIERS.map((t) => {
        const reached = score >= t.minScore;
        const isCurrent = t.tier === cur.tier;
        const reward = t.endSeasonReward;
        return (
          <div
            key={t.tier}
            style={{
              ...s.tierItem,
              borderLeft: `3px solid ${reached ? t.color : '#333'}`,
              opacity: reached ? 1 : 0.5,
              background: isCurrent ? 'rgba(253,203,110,0.1)' : 'transparent',
            }}
          >
            <TierIcon tier={t} />
            <span style={{ ...s.tierName, color: reached ? t.color : '#666' }}>{t.name}</span>
            <span style={s.tierMin}>{t.minScore}점</span>
            <span style={s.tierReward}>
              🪙{reward.stones}
              {reward.titleId ? ' 🏷' : ''}
              {reward.interiorId ? ' 🎨' : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { position: 'absolute', inset: 0, background: '#0a0820', color: '#FFEAA7', padding: 12, overflow: 'auto' },
  header: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  back: { background: 'transparent', border: '1px solid #4a3a6e', color: '#FFEAA7', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' },
  title: { flex: 1, fontSize: 18, fontWeight: 'bold', letterSpacing: 4, color: '#FF6B6B', textAlign: 'center' },
  season: { fontSize: 10, color: '#a55eea', minWidth: 70, textAlign: 'right' },
  summary: { background: 'rgba(20,12,42,0.7)', border: '1px solid #4a3a6e', borderRadius: 6, padding: 10, marginBottom: 10 },
  row1: { display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 },
  rank: { color: '#FDCB6E', fontWeight: 'bold', fontSize: 14 },
  row2: { display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#bbb' },
  hint: { padding: 10, background: 'rgba(255,107,107,0.15)', border: '1px solid #FF6B6B', borderRadius: 4, fontSize: 10, marginBottom: 10 },
  buildCard: { background: 'rgba(30,20,60,0.7)', border: '1px solid #4a3a6e', borderRadius: 6, padding: 10, marginBottom: 10 },
  buildHead: { fontSize: 9, color: '#a55eea', letterSpacing: 1 },
  buildName: { fontSize: 14, fontWeight: 'bold', color: '#FD79A8', marginTop: 2 },
  buildStats: { fontSize: 10, color: '#bbb', marginTop: 4 },
  buildDeck: { fontSize: 9, color: '#888', marginTop: 4 },
  score: { fontSize: 16, color: '#FDCB6E', fontWeight: 'bold', marginTop: 6, textAlign: 'right' },
  matchBtn: { width: '100%', padding: '12px', background: 'linear-gradient(180deg,#FF6B6B,#7a1818)', border: '2px solid #FDCB6E', color: '#fff', borderRadius: 6, fontWeight: 'bold', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 2, marginTop: 10 },
  matchBtnDisabled: { opacity: 0.4, cursor: 'not-allowed', background: '#333', borderColor: '#444' },
  result: { padding: 10, marginTop: 10, background: 'rgba(253,203,110,0.15)', border: '1px solid #FDCB6E', borderRadius: 4, fontSize: 11, textAlign: 'center', color: '#FDCB6E' },
  matchRoot: { display: 'flex', alignItems: 'stretch', gap: 6, marginTop: 4 },
  half: { flex: 1, background: 'rgba(30,20,60,0.7)', border: '1px solid #4a3a6e', borderRadius: 6, padding: 10, textAlign: 'center' },
  halfWin: { borderColor: '#FDCB6E', boxShadow: '0 0 12px rgba(253,203,110,0.4)' },
  halfHead: { fontSize: 10, color: '#a55eea' },
  halfName: { fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  halfStats: { fontSize: 10, color: '#bbb', marginTop: 6, lineHeight: 1.4 },
  halfScore: { fontSize: 16, color: '#FDCB6E', fontWeight: 'bold', marginTop: 8 },
  vs: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 'bold', color: '#FF6B6B', minWidth: 30 },
  history: { marginTop: 14, padding: 10, background: 'rgba(20,12,42,0.5)', border: '1px solid #4a3a6e', borderRadius: 4 },
  historyLbl: { fontSize: 9, color: '#a55eea', marginBottom: 6 },
  histItem: { display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '4px 0', borderBottom: '1px solid rgba(74,58,110,0.3)' },
  tierRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  tierIcon: { fontSize: 24 },
  tierInfo: { flex: 1 },
  tiersList: { background: 'rgba(20,12,42,0.5)', border: '1px solid #4a3a6e', borderRadius: 4, padding: 8, marginBottom: 10 },
  tierItem: { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px', fontSize: 10, marginBottom: 2 },
  tierIconSmall: { fontSize: 14, minWidth: 18 },
  tierName: { minWidth: 50, fontWeight: 'bold' },
  tierMin: { color: '#888', fontSize: 9, minWidth: 50 },
  tierReward: { flex: 1, textAlign: 'right', color: '#FDCB6E', fontSize: 9 },
  seasonReward: { padding: 12, marginBottom: 10, background: 'linear-gradient(180deg,rgba(245,166,35,0.25),rgba(253,203,110,0.1))', border: '2px solid #FDCB6E', borderRadius: 6, fontSize: 11, color: '#FDCB6E', textAlign: 'center', lineHeight: 1.6 },
  dismissBtn: { display: 'block', margin: '8px auto 0', padding: '4px 16px', background: '#FDCB6E', color: '#0a0820', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: 'bold' },
};
