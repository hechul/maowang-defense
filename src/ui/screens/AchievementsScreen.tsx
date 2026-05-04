import { useSaveStore } from '../../store/useSaveStore';
import { ACHIEVEMENTS } from '../../game/data/achievements';

export function AchievementsScreen({ onBack }: { onBack: () => void }) {
  const achievements = useSaveStore((s) => s.achievements);
  const total = Object.keys(ACHIEVEMENTS).length;
  const done = achievements.length;
  const totalReward = achievements.reduce((sum, id) => sum + (ACHIEVEMENTS[id]?.reward || 0), 0);

  return (
    <div style={styles.root}>
      <h2 style={styles.title}>업적</h2>
      <div style={styles.progress}>
        달성 {done} / {total} · 누적 보상 {totalReward} 영혼석
      </div>
      <div style={styles.list}>
        {Object.values(ACHIEVEMENTS).map((a) => {
          const isDone = achievements.includes(a.id);
          return (
            <div key={a.id} style={{ ...styles.row, ...(isDone ? styles.rowDone : {}) }}>
              <div style={styles.icon}>{a.icon}</div>
              <div style={styles.info}>
                <div style={{ ...styles.nm, ...(isDone ? { color: '#FDCB6E' } : {}) }}>{a.name}</div>
                <div style={styles.desc}>{a.desc}</div>
              </div>
              <div style={{ ...styles.reward, ...(isDone ? styles.rewardDone : {}) }}>
                {isDone ? '✓' : `+${a.reward}`}
              </div>
            </div>
          );
        })}
      </div>
      <button style={styles.backBtn} onClick={onBack}>닫기</button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    padding: '18px 14px', background: 'rgba(5,3,15,0.96)',
  },
  title: {
    color: '#FFEAA7', fontSize: 22, letterSpacing: 3,
    textAlign: 'center', textShadow: '2px 2px 0 #000', margin: '8px 0 4px',
  },
  progress: {
    width: '100%', padding: '5px 12px', fontSize: 11, color: '#FFEAA7',
    background: 'rgba(45,27,78,0.6)', border: '1px solid #4a3a6e',
    borderRadius: 4, marginBottom: 10, textAlign: 'center', letterSpacing: 1,
  },
  list: {
    width: '100%', flex: 1, minHeight: 0, overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  row: {
    background: 'rgba(20,12,42,0.7)', border: '1px solid #4a3a6e',
    borderRadius: 5, padding: '7px 10px',
    display: 'flex', alignItems: 'center', gap: 10,
  },
  rowDone: { borderColor: '#FDCB6E', background: 'rgba(45,27,78,0.85)' },
  icon: { fontSize: 22, flex: '0 0 auto' },
  info: { flex: 1, minWidth: 0 },
  nm: { fontSize: 12, fontWeight: 'bold', color: '#fff', letterSpacing: 1 },
  desc: { fontSize: 10, color: '#bbb', marginTop: 2 },
  reward: {
    fontSize: 11, fontWeight: 'bold', color: '#FDCB6E',
    background: 'rgba(0,0,0,0.4)', padding: '2px 7px', borderRadius: 4,
    flex: '0 0 auto',
  },
  rewardDone: { background: '#7B2D8E', color: '#fff' },
  backBtn: {
    width: 200, alignSelf: 'center', padding: '10px 18px',
    background: 'linear-gradient(180deg,#D63031,#7a1818)',
    border: '2px solid #FDCB6E', borderRadius: 5,
    color: '#fff', fontWeight: 'bold', fontSize: 13,
    boxShadow: '0 3px 0 #4a0a0a', cursor: 'pointer',
    fontFamily: 'inherit', marginTop: 8,
  },
};
