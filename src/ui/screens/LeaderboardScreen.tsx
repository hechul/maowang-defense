import { useEffect, useState } from 'react';
import * as Ait from '../../sdk/AitBridge';
import { useSaveStore } from '../../store/useSaveStore';

/**
 * 리더보드 — AIT §전략3 D7 리텐션 ("친구보다 높은 기록")
 * SDK 미연동 시 localStorage fallback (AitBridge에서 처리)
 */
export function LeaderboardScreen({ onBack }: { onBack: () => void }) {
  const [entries, setEntries] = useState<Ait.LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const myBest = useSaveStore((s) => s.bestWave);

  useEffect(() => {
    Ait.getLeaderboard('wave', 20)
      .then((list) => { setEntries(list); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={styles.root}>
      <h2 style={styles.title}>리더보드</h2>
      <div style={styles.subtitle}>주간 최고 웨이브</div>

      <div style={styles.myCard}>
        <div style={styles.myLabel}>내 최고 기록</div>
        <div style={styles.myWave}>{myBest} 웨이브</div>
      </div>

      <div style={styles.list}>
        {loading ? (
          <div style={styles.placeholder}>불러오는 중...</div>
        ) : entries.length === 0 ? (
          <div style={styles.placeholder}>
            아직 기록이 없습니다.<br />
            첫 도전자가 되어보세요!
          </div>
        ) : (
          entries.map((e, i) => (
            <div key={i} style={{
              ...styles.row,
              ...(i === 0 ? styles.rowGold : {}),
              ...(i === 1 ? styles.rowSilver : {}),
              ...(i === 2 ? styles.rowBronze : {}),
            }}>
              <div style={styles.rank}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${e.rank}`}
              </div>
              <div style={styles.nick}>{e.nickname}</div>
              <div style={styles.score}>{e.score} 웨이브</div>
            </div>
          ))
        )}
      </div>

      <div style={styles.note}>
        ※ 토스 SDK 연동 후 실시간 글로벌 랭킹 활성화
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
    textAlign: 'center', textShadow: '2px 2px 0 #000', margin: '8px 0 0',
  },
  subtitle: {
    color: '#FD79A8', fontSize: 11, letterSpacing: 2,
    textAlign: 'center', marginBottom: 12,
  },
  myCard: {
    background: 'linear-gradient(180deg,#2a1745,#15102a)',
    border: '2px solid #FDCB6E', borderRadius: 6,
    padding: '10px 14px', marginBottom: 12,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    boxShadow: '0 0 12px rgba(253,203,110,0.3)',
  },
  myLabel: { color: '#FDCB6E', fontSize: 12, letterSpacing: 2 },
  myWave: { color: '#FFEAA7', fontSize: 18, fontWeight: 'bold' },
  list: {
    width: '100%', flex: 1, minHeight: 0, overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: 3,
  },
  row: {
    background: 'rgba(20,12,42,0.7)', border: '1px solid #4a3a6e',
    borderRadius: 5, padding: '8px 12px',
    display: 'flex', alignItems: 'center', gap: 10,
    fontSize: 12,
  },
  rowGold: { background: 'rgba(253,203,110,0.15)', borderColor: '#FDCB6E' },
  rowSilver: { background: 'rgba(189,195,199,0.1)', borderColor: '#BDC3C7' },
  rowBronze: { background: 'rgba(225,112,85,0.1)', borderColor: '#E17055' },
  rank: { width: 36, color: '#FDCB6E', fontWeight: 'bold', fontSize: 14 },
  nick: { flex: 1, color: '#fff' },
  score: { color: '#FFEAA7', fontWeight: 'bold' },
  placeholder: {
    textAlign: 'center', padding: 30, color: '#888', fontSize: 12, lineHeight: 1.6,
  },
  note: {
    fontSize: 10, color: '#666', textAlign: 'center', marginTop: 8,
  },
  backBtn: {
    width: 200, alignSelf: 'center', padding: '10px 18px',
    background: 'linear-gradient(180deg,#D63031,#7a1818)',
    border: '2px solid #FDCB6E', borderRadius: 5,
    color: '#fff', fontWeight: 'bold', fontSize: 13,
    boxShadow: '0 3px 0 #4a0a0a', cursor: 'pointer',
    fontFamily: 'inherit', marginTop: 8,
  },
};
