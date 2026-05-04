import { useEffect } from 'react';
import { useSaveStore } from '../../store/useSaveStore';
import { LIMITED_EVENTS, tierFromProgress, nextTierGoal } from '../../game/data/limitedEvents';

interface Props { onBack: () => void }

/**
 * P1-7 한정 이벤트 보드 — 진행도/티어 보상.
 */
export function EventsScreen({ onBack }: Props) {
  const eventProgress = useSaveStore((s) => s.eventProgress);
  const claimEventTier = useSaveStore((s) => s.claimEventTier);
  const addStones = useSaveStore((s) => s.addStones);
  const markEventBoardSeen = useSaveStore((s) => s.markEventBoardSeen);

  useEffect(() => { markEventBoardSeen(); }, [markEventBoardSeen]);

  const handleClaim = (eventId: string, tier: number) => {
    const e = LIMITED_EVENTS.find((x) => x.id === eventId);
    if (!e) return;
    const tDef = e.tiers.find((t) => t.tier === tier);
    if (!tDef) return;
    const ok = claimEventTier(eventId, tier);
    if (!ok) return;
    if (tDef.rewardStones) addStones(tDef.rewardStones);
    if (tDef.rewardRecruitId) {
      // store 헬퍼 직접 호출
      useSaveStore.getState().unlockRecruits([tDef.rewardRecruitId]);
    }
    if (tDef.rewardInteriorId) {
      useSaveStore.setState((st) => ({
        ownedInteriors: st.ownedInteriors.includes(tDef.rewardInteriorId!)
          ? st.ownedInteriors
          : [...st.ownedInteriors, tDef.rewardInteriorId!],
      }));
    }
    alert(`보상 수령: ${tDef.rewardLabel}`);
  };

  return (
    <div style={s.root}>
      <div style={s.header}>
        <button style={s.back} onClick={onBack}>← 뒤로</button>
        <div style={s.title}>한정 이벤트</div>
        <div style={s.subtitle}>4주</div>
      </div>

      <div style={s.list}>
        {LIMITED_EVENTS.map((e) => {
          const cur = eventProgress[e.id] ?? { points: 0, claimedTiers: [] };
          const reachedTier = tierFromProgress(e, cur.points);
          const next = nextTierGoal(e, cur.points);
          return (
            <div key={e.id} style={s.event}>
              <div style={s.evHead}>
                <span style={s.evIcon}>{e.icon}</span>
                <span style={s.evName}>{e.name}</span>
                <span style={s.evPoints}>{cur.points}점</span>
              </div>
              <div style={s.evDesc}>{e.desc}</div>
              {next && (
                <div style={s.evBar}>
                  <div style={{ ...s.evBarFill, width: `${Math.min(100, (cur.points / next.goal) * 100)}%` }} />
                </div>
              )}
              <div style={s.tiers}>
                {e.tiers.map((t) => {
                  const reached = t.tier <= reachedTier;
                  const claimed = cur.claimedTiers.includes(t.tier);
                  return (
                    <button
                      key={t.tier}
                      style={{
                        ...s.tier,
                        ...(reached && !claimed ? s.tierClaim : {}),
                        ...(claimed ? s.tierDone : {}),
                      }}
                      disabled={!reached || claimed}
                      onClick={() => handleClaim(e.id, t.tier)}
                    >
                      <div style={s.tierIdx}>T{t.tier}</div>
                      <div style={s.tierGoal}>{t.goal}점</div>
                      <div style={s.tierLabel}>{t.rewardLabel}</div>
                      {claimed && <div style={s.tierCheck}>✓</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={s.notice}>
        💡 보스 처치/태그 카드 픽/wave 도달 시 자동으로 진행도가 누적됩니다.
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { position: 'absolute', inset: 0, background: '#0a0820', color: '#FFEAA7', padding: 12, overflow: 'auto' },
  header: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  back: { background: 'transparent', border: '1px solid #4a3a6e', color: '#FFEAA7', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' },
  title: { flex: 1, fontSize: 18, fontWeight: 'bold', letterSpacing: 4, color: '#FF6B6B', textAlign: 'center' },
  subtitle: { fontSize: 10, color: '#a55eea', minWidth: 40, textAlign: 'right' },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  event: { background: 'rgba(20,12,42,0.7)', border: '2px solid #4a3a6e', borderRadius: 6, padding: 10 },
  evHead: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 },
  evIcon: { fontSize: 20 },
  evName: { flex: 1, fontSize: 13, fontWeight: 'bold', color: '#FF6B6B' },
  evPoints: { fontSize: 11, color: '#FDCB6E', fontWeight: 'bold' },
  evDesc: { fontSize: 10, color: '#bbb', marginBottom: 6 },
  evBar: { height: 6, background: 'rgba(0,0,0,0.5)', border: '1px solid #4a3a6e', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  evBarFill: { height: '100%', background: 'linear-gradient(90deg,#FF6B6B,#FDCB6E)' },
  tiers: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 },
  tier: { position: 'relative', background: 'rgba(30,20,60,0.5)', border: '1px solid #4a3a6e', borderRadius: 4, padding: 4, color: '#FFEAA7', fontFamily: 'inherit', cursor: 'pointer', minHeight: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
  tierClaim: { borderColor: '#FDCB6E', boxShadow: '0 0 6px rgba(253,203,110,0.5)' },
  tierDone: { opacity: 0.4, cursor: 'not-allowed' },
  tierIdx: { fontSize: 9, color: '#a55eea', fontWeight: 'bold' },
  tierGoal: { fontSize: 9, color: '#bbb', marginTop: 2 },
  tierLabel: { fontSize: 8, color: '#FDCB6E', marginTop: 4, lineHeight: 1.2 },
  tierCheck: { position: 'absolute', top: 2, right: 4, color: '#7BC67E', fontWeight: 'bold' },
  notice: { marginTop: 12, padding: 8, fontSize: 9, color: '#888', background: 'rgba(20,12,42,0.5)', borderRadius: 4, lineHeight: 1.4 },
};
