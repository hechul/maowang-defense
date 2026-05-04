import { useMemo } from 'react';
import { useSaveStore } from '../../store/useSaveStore';
import { getDailySeedRun } from '../../game/data/dailySeed';

interface Props {
  onBack: () => void;
  onStart: () => void;     // GameScreen 진입 (mode='endless' + dailySeed flag)
}

/**
 * P0-4 일일 시드 챌린지 — 1일 1회 도전, 모든 유저가 같은 시드.
 */
export function DailyChallengeScreen({ onBack, onStart }: Props) {
  const dailyState = useSaveStore((s) => s.dailySeed);
  const today = useMemo(() => getDailySeedRun(), []);
  const alreadyDone = dailyState.date === today.date && dailyState.attempted;

  return (
    <div style={s.root}>
      <div style={s.header}>
        <button style={s.back} onClick={onBack}>← 뒤로</button>
        <div style={s.title}>일일 도전</div>
        <div style={{ width: 50 }} />
      </div>

      <div style={s.card}>
        <div style={s.label}>오늘의 시드</div>
        <div style={s.seed}>{today.date}</div>
        <div style={s.modifier}>변형: {today.modifierLabel}</div>
        <div style={s.divider} />
        <div style={s.descLabel}>모든 유저가 같은 조건</div>
        <div style={s.desc}>
          오늘 단 한 번. 부활 비활성. 도달 wave + 처치수로 점수가 결정됩니다.
        </div>

        {alreadyDone ? (
          <div style={s.scoreBox}>
            <div style={s.scoreLbl}>오늘 기록</div>
            <div style={s.scoreVal}>{dailyState.bestScore.toLocaleString()} 점</div>
            <div style={s.scoreSub}>W{dailyState.bestWave} 도달</div>
            <div style={s.tomorrow}>내일 새로운 시드가 등장합니다.</div>
          </div>
        ) : (
          <button style={s.startBtn} onClick={onStart}>
            ▶ 도전 시작
          </button>
        )}
      </div>

      <div style={s.notice}>
        <span style={s.noticeIcon}>💡</span>
        매일 자정(UTC) 시드가 갱신됩니다. 보상은 시즌 패스 XP로 적립됩니다.
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { position: 'absolute', inset: 0, background: '#0a0820', color: '#FFEAA7', padding: 12, overflow: 'auto' },
  header: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  back: { background: 'transparent', border: '1px solid #4a3a6e', color: '#FFEAA7', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' },
  title: { flex: 1, fontSize: 18, fontWeight: 'bold', letterSpacing: 4, color: '#FF6B6B', textAlign: 'center' },
  card: { background: 'rgba(20,12,42,0.7)', border: '2px solid #FF6B6B', borderRadius: 8, padding: 14, marginTop: 12, boxShadow: '0 0 16px rgba(255,107,107,0.2)' },
  label: { fontSize: 9, color: '#FF6B6B', letterSpacing: 2, fontWeight: 'bold' },
  seed: { fontSize: 22, color: '#FFEAA7', textAlign: 'center', marginTop: 6, letterSpacing: 2, fontFamily: 'monospace' },
  modifier: { fontSize: 11, color: '#FDCB6E', textAlign: 'center', marginTop: 8, padding: '6px 10px', background: 'rgba(253,203,110,0.1)', borderRadius: 4 },
  divider: { height: 1, background: '#4a3a6e', margin: '12px 0' },
  descLabel: { fontSize: 9, color: '#a55eea', letterSpacing: 2, fontWeight: 'bold', marginBottom: 4 },
  desc: { fontSize: 11, color: '#bbb', lineHeight: 1.4 },
  scoreBox: { textAlign: 'center', marginTop: 14, padding: 14, background: 'rgba(123,198,126,0.1)', border: '1px solid #7BC67E', borderRadius: 6 },
  scoreLbl: { fontSize: 10, color: '#7BC67E', letterSpacing: 1 },
  scoreVal: { fontSize: 20, fontWeight: 'bold', marginTop: 4, color: '#FFEAA7' },
  scoreSub: { fontSize: 10, color: '#bbb', marginTop: 2 },
  tomorrow: { fontSize: 9, color: '#888', marginTop: 8, fontStyle: 'italic' },
  startBtn: { width: '100%', marginTop: 14, padding: '12px', background: 'linear-gradient(180deg,#FF6B6B,#7a1818)', border: '2px solid #FDCB6E', color: '#fff', borderRadius: 6, fontFamily: 'inherit', fontWeight: 'bold', fontSize: 14, cursor: 'pointer', letterSpacing: 2 },
  notice: { marginTop: 12, padding: 8, fontSize: 9, color: '#888', background: 'rgba(20,12,42,0.5)', borderRadius: 4, lineHeight: 1.4 },
  noticeIcon: { marginRight: 4 },
};
