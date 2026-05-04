import { useEffect, useMemo } from 'react';
import { useSaveStore } from '../../store/useSaveStore';
import { MISSION_POOL, pickDailyMissions } from '../../game/data/missions';
import { Audio } from '../../audio/AudioEngine';

export function MissionsScreen({ onBack }: { onBack: () => void }) {
  const daily = useSaveStore((s) => s.daily);
  const setDaily = useSaveStore.setState;
  const addStones = useSaveStore((s) => s.addStones);

  // 자정 갱신 체크
  const today = new Date().toISOString().slice(0, 10);
  useEffect(() => {
    if (daily.date !== today) {
      const picked = pickDailyMissions(today, 3);
      setDaily({
        daily: {
          date: today,
          missions: picked.map((m) => ({ id: m.id, progress: 0, claimed: false })),
        },
      });
    }
  }, [daily.date, today, setDaily]);

  const missions = useMemo(() => daily.missions || [], [daily]);

  const handleClaim = (id: string) => {
    const def = MISSION_POOL.find((m) => m.id === id);
    const cur = missions.find((m) => m.id === id);
    if (!def || !cur || cur.claimed || cur.progress < def.target) return;
    addStones(def.reward);
    setDaily((s) => ({
      daily: {
        ...s.daily,
        missions: s.daily.missions.map((m) =>
          m.id === id ? { ...m, claimed: true } : m,
        ),
      },
    }));
    Audio.relic_sfx();
  };

  const nextResetMs = (() => {
    const t = new Date();
    t.setHours(24, 0, 0, 0);
    return t.getTime() - Date.now();
  })();
  const hours = Math.floor(nextResetMs / 3600000);

  return (
    <div style={styles.root}>
      <h2 style={styles.title}>일일 미션</h2>
      <div style={styles.subtitle}>{hours}시간 후 갱신</div>
      <div style={styles.list}>
        {missions.length === 0 ? (
          <div style={styles.placeholder}>미션 불러오는 중...</div>
        ) : (
          missions.map((m) => {
            const def = MISSION_POOL.find((x) => x.id === m.id);
            if (!def) return null;
            const completed = m.progress >= def.target;
            const ratio = Math.min(1, m.progress / def.target);
            return (
              <div key={m.id} style={{ ...styles.row, ...(m.claimed ? styles.rowDone : {}) }}>
                <div style={styles.top}>
                  <div style={styles.icon}>{def.icon}</div>
                  <div style={{ ...styles.nm, ...(m.claimed ? { color: '#FDCB6E' } : {}) }}>{def.name}</div>
                  <div style={styles.reward}>+{def.reward}</div>
                </div>
                <div style={styles.desc}>{def.desc(def.target)}</div>
                <div style={styles.bar}>
                  <div style={{ ...styles.barFill, width: `${ratio * 100}%` }} />
                </div>
                <div style={styles.progressText}>{Math.min(m.progress, def.target)} / {def.target}</div>
                <button
                  style={{
                    ...styles.claimBtn,
                    ...(m.claimed ? styles.btnClaimed : {}),
                    ...(!completed ? styles.btnDisabled : {}),
                  }}
                  disabled={m.claimed || !completed}
                  onClick={() => handleClaim(m.id)}
                >
                  {m.claimed ? '수령 완료' : completed ? '보상 받기' : '진행 중'}
                </button>
              </div>
            );
          })
        )}
      </div>
      <button style={styles.backBtn} onClick={onBack}>닫기</button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '18px 14px', background: 'rgba(5,3,15,0.96)' },
  title: { color: '#FFEAA7', fontSize: 22, letterSpacing: 3, textAlign: 'center', textShadow: '2px 2px 0 #000', margin: '8px 0 0' },
  subtitle: { color: '#FD79A8', fontSize: 11, letterSpacing: 2, textAlign: 'center', marginBottom: 12 },
  list: { width: '100%', flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 },
  placeholder: { textAlign: 'center', padding: 30, color: '#888' },
  row: {
    background: 'rgba(20,12,42,0.75)', border: '1px solid #4a3a6e',
    borderRadius: 6, padding: '8px 11px',
  },
  rowDone: { borderColor: '#FDCB6E' },
  top: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 },
  icon: { fontSize: 18 },
  nm: { flex: 1, fontSize: 12, fontWeight: 'bold', color: '#fff' },
  reward: { fontSize: 10, fontWeight: 'bold', color: '#FDCB6E', background: 'rgba(0,0,0,0.4)', padding: '1px 6px', borderRadius: 4 },
  desc: { fontSize: 10, color: '#bbb', marginBottom: 3 },
  bar: { position: 'relative', height: 9, background: '#0a0612', border: '1px solid #4a3a6e', borderRadius: 3, overflow: 'hidden', marginTop: 2 },
  barFill: { height: '100%', background: 'linear-gradient(90deg,#7B2D8E,#FDCB6E)', transition: 'width 0.3s' },
  progressText: { textAlign: 'center', fontSize: 10, color: '#bbb', marginTop: 2 },
  claimBtn: {
    width: '100%', padding: 5, marginTop: 4, fontSize: 11,
    background: 'linear-gradient(180deg,#D63031,#7a1818)',
    border: '1px solid #FDCB6E', borderRadius: 4,
    color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
    fontWeight: 'bold', letterSpacing: 1,
  },
  btnDisabled: { background: '#3a3a4a', borderColor: '#555', color: '#777', cursor: 'not-allowed' },
  btnClaimed: { background: '#4a3a6e', borderColor: '#FDCB6E', color: '#FFEAA7', cursor: 'default' },
  backBtn: {
    width: 200, alignSelf: 'center', padding: '10px 18px',
    background: 'linear-gradient(180deg,#D63031,#7a1818)',
    border: '2px solid #FDCB6E', borderRadius: 5,
    color: '#fff', fontWeight: 'bold', fontSize: 13,
    boxShadow: '0 3px 0 #4a0a0a', cursor: 'pointer',
    fontFamily: 'inherit', marginTop: 8,
  },
};
