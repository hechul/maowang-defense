import { useSaveStore } from '../../store/useSaveStore';
import { CHALLENGES } from '../../game/data/challenges';

export function ChallengesScreen({ onBack, onStart }: { onBack: () => void; onStart: (id: string) => void }) {
  const done = useSaveStore((s) => s.challengesDone);
  const challengeUnlocked = useSaveStore((s) => s.challengeUnlocked);
  const challengeStars = useSaveStore((s) => s.challengeStars);

  if (!challengeUnlocked) {
    return (
      <div style={styles.root}>
        <h2 style={styles.title}>도 전</h2>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          color: '#888', padding: 20,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 14, color: '#FFEAA7', marginBottom: 6, fontWeight: 'bold' }}>
            도전 모드 잠겨 있음
          </div>
          <div style={{ fontSize: 11, color: '#888', lineHeight: 1.5 }}>
            보스 5마리를 누적 처치하면<br/>
            도전 모드가 잠금 해제됩니다.
          </div>
        </div>
        <button style={styles.backBtn} onClick={onBack}>← 마왕성</button>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <h2 style={styles.title}>도 전</h2>
      <div style={styles.subtitle}>★ W15 / ★★ W20 / ★★★ W25 도달</div>
      <div style={styles.list}>
        {Object.values(CHALLENGES).map((c) => {
          const isDone = done.includes(c.id);
          const stars = challengeStars[c.id] ?? 0;
          return (
            <button
              key={c.id}
              style={{ ...styles.row, ...(isDone ? styles.rowDone : {}) }}
              onClick={() => onStart(c.id)}
            >
              <div style={styles.top}>
                <div style={styles.icon}>{c.icon}</div>
                <div style={{ ...styles.nm, ...(isDone ? { color: '#FDCB6E' } : {}) }}>{c.name}</div>
                <div style={styles.reward}>
                  {isDone
                    ? `✓ +${Math.floor(c.reward * 0.1)} (재도전)`
                    : `+${c.reward}`}
                </div>
              </div>
              <div style={styles.desc}>{c.desc}</div>
              <div style={styles.stars}>
                <span style={{ color: stars >= 1 ? '#FDCB6E' : '#444' }}>★</span>
                <span style={{ color: stars >= 2 ? '#FDCB6E' : '#444' }}>★</span>
                <span style={{ color: stars >= 3 ? '#FDCB6E' : '#444' }}>★</span>
                <span style={styles.starHint}>
                  {stars === 3 ? '완전 정복' : stars > 0 ? `다음: W${stars === 1 ? 20 : 25}` : '★ 도전 시작'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <button style={styles.backBtn} onClick={onBack}>닫기</button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '18px 14px', background: 'rgba(5,3,15,0.96)' },
  title: { color: '#FFEAA7', fontSize: 22, letterSpacing: 3, textAlign: 'center', textShadow: '2px 2px 0 #000', margin: '8px 0 0' },
  subtitle: { color: '#FD79A8', fontSize: 11, letterSpacing: 2, textAlign: 'center', marginBottom: 12 },
  list: { width: '100%', flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 },
  row: {
    background: 'rgba(20,12,42,0.75)', border: '2px solid #4a3a6e',
    borderRadius: 6, padding: '9px 11px', cursor: 'pointer',
    color: 'inherit', fontFamily: 'inherit', textAlign: 'left',
  },
  rowDone: { borderColor: '#FDCB6E', background: 'rgba(45,27,78,0.85)' },
  top: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 },
  icon: { fontSize: 24 },
  nm: { flex: 1, fontSize: 13, fontWeight: 'bold', color: '#fff', letterSpacing: 1 },
  reward: { fontSize: 10, fontWeight: 'bold', color: '#FDCB6E', background: 'rgba(0,0,0,0.4)', padding: '2px 7px', borderRadius: 4 },
  desc: { fontSize: 10, color: '#bbb', lineHeight: 1.4, paddingLeft: 32 },
  stars: { display: 'flex', alignItems: 'center', gap: 2, marginTop: 6, paddingLeft: 32, fontSize: 14, letterSpacing: 1 },
  starHint: { fontSize: 9, color: '#888', marginLeft: 8, letterSpacing: 0 },
  backBtn: {
    width: 200, alignSelf: 'center', padding: '10px 18px',
    background: 'linear-gradient(180deg,#D63031,#7a1818)',
    border: '2px solid #FDCB6E', borderRadius: 5,
    color: '#fff', fontWeight: 'bold', fontSize: 13,
    boxShadow: '0 3px 0 #4a0a0a', cursor: 'pointer',
    fontFamily: 'inherit', marginTop: 8,
  },
};
